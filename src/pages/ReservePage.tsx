import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useEventDetail } from '@/hooks/useEventData';
import { api } from '@/lib/api';
import type { Restaurant, PointsSummary } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const BUDGET_OPTIONS = [
  { value: '', label: '指定なし' },
  { value: 'B001', label: '～500円' },
  { value: 'B002', label: '501～1000円' },
  { value: 'B003', label: '1001～1500円' },
  { value: 'B004', label: '1501～2000円' },
  { value: 'B005', label: '2001～3000円' },
  { value: 'B006', label: '3001～4000円' },
  { value: 'B007', label: '4001～5000円' },
  { value: 'B008', label: '5001～7000円' },
  { value: 'B009', label: '7001～10000円' },
  { value: 'B010', label: '10001～15000円' },
  { value: 'B011', label: '15001～20000円' },
];

const RANGE_OPTIONS = [
  { value: '', label: '指定なし' },
  { value: '1', label: '300m以内' },
  { value: '2', label: '500m以内' },
  { value: '3', label: '1000m以内' },
  { value: '4', label: '2000m以内' },
  { value: '5', label: '3000m以内' },
];

function buildAffiliateUrl(shopUrl: string): string {
  // Append affiliate tracking if URL is from hotpepper
  if (!shopUrl) return shopUrl;
  try {
    const u = new URL(shopUrl);
    u.searchParams.set('vos', 'nomilive');
    return u.toString();
  } catch {
    return shopUrl;
  }
}

export function ReservePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eventId = id ? parseInt(id, 10) : null;
  const { event, loading: eventLoading, error: eventError, refetch } = useEventDetail(eventId);

  // Search state - initialize from URL params
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [budget, setBudget] = useState(searchParams.get('budget') || '');
  const [range, setRange] = useState(searchParams.get('range') || '');
  const [partySize, setPartySize] = useState(searchParams.get('party_size') || '');
  const [freeDrink, setFreeDrink] = useState(false);
  const [cardPayment, setCardPayment] = useState(false);
  const [results, setResults] = useState<Restaurant[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // Points state
  const [points, setPoints] = useState<PointsSummary | null>(null);
  const [earnAmount, setEarnAmount] = useState('');
  const [earnDesc, setEarnDesc] = useState('');
  const [contributeAmount, setContributeAmount] = useState('');
  const [pointsLoading, setPointsLoading] = useState(false);

  // Login prompt
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loginPromptUrl, setLoginPromptUrl] = useState('');

  useEffect(() => {
    if (eventId) {
      api.getPoints(eventId).then(setPoints).catch(() => {});
    }
  }, [eventId]);

  if (eventLoading) {
    return <div className="flex items-center justify-center p-12"><p className="text-muted-foreground">読み込み中...</p></div>;
  }
  if (eventError || !event) {
    return <div className="mx-auto max-w-2xl p-4"><p className="text-destructive">{eventError || 'イベントが見つかりません'}</p></div>;
  }

  const attending = event.participants.filter((p) => p.status === 'attending');
  const primaryVenues = (event.venue_selections || []).filter((v) => v.venue_type === 'primary');

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setTotal(null);

    try {
      const baseParams: Parameters<typeof api.searchRestaurants>[0] = {
        keyword: keyword.trim(),
        count: 10,
        budget: budget || undefined,
        free_drink: freeDrink || undefined,
        card: cardPayment || undefined,
      };

      const initialData = await api.searchRestaurants(baseParams);

      if (range && initialData.shops.length > 0) {
        const firstShop = initialData.shops[0];
        if (firstShop.lat && firstShop.lng) {
          try {
            const geoData = await api.searchRestaurants({
              ...baseParams,
              lat: firstShop.lat,
              lng: firstShop.lng,
              range,
            });
            let filteredShops = geoData.shops;
            if (partySize) {
              const minCapacity = parseInt(partySize, 10);
              filteredShops = filteredShops.filter((s) => !s.party_capacity || s.party_capacity >= minCapacity);
            }
            setResults(filteredShops);
            setTotal(geoData.total);
            return;
          } catch { /* fall through */ }
        }
      }

      let shops = initialData.shops;
      if (partySize) {
        const minCapacity = parseInt(partySize, 10);
        shops = shops.filter((s) => !s.party_capacity || s.party_capacity >= minCapacity);
      }
      setResults(shops);
      setTotal(initialData.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : '検索に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleReserve = (shop: Restaurant) => {
    const url = buildAffiliateUrl(shop.url);
    setLoginPromptUrl(url);
    setShowLoginPrompt(true);
  };

  const handleConfirmReserve = () => {
    window.open(loginPromptUrl, '_blank');
    setShowLoginPrompt(false);
  };

  const handleSavePrimary = async (shop: Restaurant) => {
    if (primaryVenues.length >= 2) {
      setError('一次会候補は最大2件までです。');
      return;
    }
    setSaving(shop.id);
    try {
      await api.addVenue(event.id, { venue_type: 'primary', restaurant: shop });
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(null);
    }
  };

  const handleEarnPoints = async () => {
    const amount = parseInt(earnAmount, 10);
    if (!amount || amount <= 0) return;
    setPointsLoading(true);
    try {
      await api.addPoints(event.id, {
        type: 'earned',
        amount,
        description: earnDesc || `${event.name} 予約ポイント`,
      });
      const updated = await api.getPoints(event.id);
      setPoints(updated);
      setEarnAmount('');
      setEarnDesc('');
    } catch { /* */ }
    setPointsLoading(false);
  };

  const handleContributePoints = async () => {
    const amount = parseInt(contributeAmount, 10);
    if (!amount || amount <= 0 || !points || amount > points.available_balance) return;
    setPointsLoading(true);
    try {
      await api.addPoints(event.id, {
        type: 'contributed',
        amount,
        description: `${event.name} への拠出`,
      });
      const updated = await api.getPoints(event.id);
      setPoints(updated);
      setContributeAmount('');
      await refetch(); // kampa_amount updated
    } catch { /* */ }
    setPointsLoading(false);
  };

  const estimatedPoints = attending.length * 50;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate(`/events/${event.id}`)}>← 幹事ページ</Button>
        <div>
          <h1 className="text-2xl font-bold">店舗予約</h1>
          <p className="text-sm text-muted-foreground">{event.name} ({attending.length}名参加)</p>
        </div>
      </div>

      {/* Campaign Banner */}
      <Card className="border-2 border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-orange-600">ホットペッパー予約でポイント還元!</span>
          </div>
          <p className="text-sm text-muted-foreground">
            ホットペッパーグルメからネット予約すると、来店人数x50ポイント以上のPontaポイント/dポイントが貯まります。
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href="https://www.hotpepper.jp/campaign/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline font-medium"
            >
              現在のキャンペーンを確認 →
            </a>
          </div>
          <div className="rounded-lg bg-white/60 p-2 text-xs text-muted-foreground">
            予約前に<span className="font-bold text-foreground">リクルートID</span>でログインするとポイント獲得が最大化されます
          </div>
        </CardContent>
      </Card>

      {/* Points Panel */}
      <Card>
        <CardHeader><CardTitle className="text-lg">ポイント台帳（共同財布）</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-green-50 p-3">
              <p className="text-xs text-muted-foreground">累計獲得</p>
              <p className="text-xl font-bold text-green-600">{points?.total_earned || 0}<span className="text-xs">pt</span></p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-xs text-muted-foreground">拠出済み</p>
              <p className="text-xl font-bold text-blue-600">{points?.total_contributed || 0}<span className="text-xs">pt</span></p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3">
              <p className="text-xs text-muted-foreground">拠出可能残高</p>
              <p className="text-xl font-bold text-amber-600">{points?.available_balance || 0}<span className="text-xs">pt</span></p>
            </div>
          </div>

          {/* Estimate */}
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="text-muted-foreground">今回の予約で獲得見込み: <span className="font-bold text-foreground">{attending.length}名 × 50pt = {estimatedPoints}pt</span></p>
            <p className="text-xs text-muted-foreground mt-1">※キャンペーン適用時はさらに増額</p>
          </div>

          {/* Earn points */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">ポイント獲得を記録</Label>
            <div className="flex gap-2">
              <Input type="number" placeholder="ポイント数" value={earnAmount} onChange={(e) => setEarnAmount(e.target.value)} className="w-24" />
              <Input placeholder="メモ（任意）" value={earnDesc} onChange={(e) => setEarnDesc(e.target.value)} className="flex-1" />
              <Button size="sm" onClick={handleEarnPoints} disabled={pointsLoading || !earnAmount}>記録</Button>
            </div>
          </div>

          {/* Contribute points */}
          {(points?.available_balance || 0) > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">ポイントを繰越金等に拠出</Label>
              <div className="flex gap-2">
                <Input type="number" placeholder="拠出額" value={contributeAmount} onChange={(e) => setContributeAmount(e.target.value)} className="w-24" />
                <Button size="sm" onClick={handleContributePoints} disabled={pointsLoading || !contributeAmount}>
                  拠出する
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">拠出したポイントは繰越金等に加算されます</p>
            </div>
          )}

          {/* History */}
          {(points?.records || []).length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">履歴</p>
              <div className="max-h-40 overflow-auto space-y-1">
                {(points?.records || []).slice(0, 10).map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-xs border-b border-border py-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={r.type === 'earned' ? 'default' : 'secondary'} className="text-xs">
                        {r.type === 'earned' ? '獲得' : '拠出'}
                      </Badge>
                      <span className="text-muted-foreground">{r.description}</span>
                    </div>
                    <span className={`font-medium ${r.type === 'earned' ? 'text-green-600' : 'text-blue-600'}`}>
                      {r.type === 'earned' ? '+' : '-'}{r.amount}pt
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Form */}
      <Card>
        <CardHeader><CardTitle className="text-lg">お店を探す</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>最寄駅・エリア名</Label>
            <div className="flex gap-2">
              <Input
                placeholder="例: 渋谷駅 居酒屋"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={loading || !keyword.trim()}>
                {loading ? '検索中...' : '検索'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs">距離</Label>
              <Select value={range} onChange={(e) => setRange(e.target.value)}>
                {RANGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">予算</Label>
              <Select value={budget} onChange={(e) => setBudget(e.target.value)}>
                {BUDGET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">人数</Label>
              <Input type="number" placeholder="例: 10" value={partySize} onChange={(e) => setPartySize(e.target.value)} min="1" />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={freeDrink} onChange={(e) => setFreeDrink(e.target.checked)} className="rounded" />
              飲み放題あり
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={cardPayment} onChange={(e) => setCardPayment(e.target.checked)} className="rounded" />
              カード/電子決済可
            </label>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {total !== null && (
            <p className="text-sm text-muted-foreground">
              {total}件中 {results.length}件を表示
            </p>
          )}

          {results.length > 0 && (
            <div className="space-y-3">
              {results.map((shop) => {
                const alreadySaved = primaryVenues.some((v) => v.restaurant.id === shop.id);
                const affiliateUrl = buildAffiliateUrl(shop.url);
                return (
                  <div key={shop.id} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex gap-3">
                      {shop.photo_url && (
                        <img src={shop.photo_url} alt={shop.name} className="h-20 w-20 rounded-md object-cover flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate">{shop.name}</h4>
                        {shop.catch && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{shop.catch}</p>}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {shop.genre && <Badge variant="outline" className="text-xs">{shop.genre}</Badge>}
                          {shop.budget_name && <Badge variant="secondary" className="text-xs">{shop.budget_name}</Badge>}
                          {shop.station_name && <Badge variant="outline" className="text-xs">{shop.station_name}</Badge>}
                          {shop.free_drink === 'あり' && <Badge variant="default" className="text-xs">飲み放題</Badge>}
                          {shop.course === 'あり' && <Badge variant="secondary" className="text-xs">コース</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {shop.address && <p>{shop.address}</p>}
                      {shop.capacity > 0 && <span>席数: {shop.capacity} </span>}
                      {shop.party_capacity > 0 && <span>宴会: 最大{shop.party_capacity}名</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        className="bg-orange-500 hover:bg-orange-600 text-white text-xs"
                        onClick={() => handleReserve(shop)}
                      >
                        ホットペッパーで予約
                      </Button>
                      {affiliateUrl && (
                        <a href={affiliateUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                          詳細を見る
                        </a>
                      )}
                      {shop.lat && shop.lng && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${shop.lat},${shop.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          地図
                        </a>
                      )}
                      <div className="ml-auto">
                        {alreadySaved ? (
                          <Badge variant="secondary" className="text-xs">選択済み</Badge>
                        ) : primaryVenues.length < 2 && (
                          <Button variant="outline" size="sm" className="text-xs" disabled={saving === shop.id} onClick={() => handleSavePrimary(shop)}>
                            {saving === shop.id ? '保存中...' : '候補に追加'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Login prompt modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowLoginPrompt(false)}>
          <Card className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-6 space-y-4 text-center">
              <p className="text-lg font-bold">ポイント獲得のご案内</p>
              <div className="rounded-lg bg-orange-50 border border-orange-200 p-4 text-sm text-left space-y-2">
                <p className="font-medium text-orange-700">リクルートIDでログインしてから予約するとポイント最大化!</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                  <li>Pontaポイント/dポイントが貯まります</li>
                  <li>来店人数 × 50ポイント以上を獲得</li>
                  <li>キャンペーン期間中はさらにポイントアップ</li>
                </ul>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowLoginPrompt(false)}>戻る</Button>
                <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" onClick={handleConfirmReserve}>
                  予約ページを開く
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
