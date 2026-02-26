import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEventDetail } from '@/hooks/useEventData';
import { api } from '@/lib/api';
import type { PointsSummary, CustomVenueLink } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RestaurantSearch } from '@/components/RestaurantSearch';

export function ReservePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const eventId = id ? parseInt(id, 10) : null;
  const { event, loading: eventLoading, error: eventError, refetch } = useEventDetail(eventId);

  // Points state
  const [points, setPoints] = useState<PointsSummary | null>(null);
  const [earnAmount, setEarnAmount] = useState('');
  const [earnDesc, setEarnDesc] = useState('');
  const [contributeAmount, setContributeAmount] = useState('');
  const [pointsLoading, setPointsLoading] = useState(false);

  // Custom venue links
  const [venueLabel, setVenueLabel] = useState('');
  const [venueUrl, setVenueUrl] = useState('');
  const [venueType, setVenueType] = useState<'primary' | 'after_party'>('primary');
  const [addingVenueLink, setAddingVenueLink] = useState(false);

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

  const customVenueLinks: CustomVenueLink[] = event.custom_venue_links || [];

  const handleAddVenueLink = async () => {
    if (!venueLabel.trim() || !venueUrl.trim()) return;
    setAddingVenueLink(true);
    try {
      await api.addCustomVenueLink(event.id, {
        venue_type: venueType,
        label: venueLabel.trim(),
        url: venueUrl.trim(),
      });
      setVenueLabel('');
      setVenueUrl('');
      await refetch();
    } finally {
      setAddingVenueLink(false);
    }
  };

  const handleDeleteVenueLink = async (linkId: number) => {
    if (!confirm('このリンクを削除しますか？')) return;
    await api.deleteCustomVenueLink(linkId);
    await refetch();
  };

  const generateTabelogUrl = () => {
    const keyword = primaryVenues.length > 0
      ? primaryVenues[0].restaurant.station_name || primaryVenues[0].restaurant.address
      : '';
    return `https://tabelog.com/rstLst/?vs=1&sa=&sk=${encodeURIComponent(keyword)}&lid=&vac_net=&svd=&svt=&svps=&svpe=&hfc=1&Cat=RC&LstCat=RC01&LstCatD=RC01&Cat=RC&LstCat=RC01&LstCatD=RC01&LstCatSD=RC0102&smp=0`;
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

      {/* Restaurant Search (consolidated from EventPage) */}
      <RestaurantSearch
        eventId={event.id}
        hasAfterParty={!!event.has_after_party}
        savedVenues={event.venue_selections || []}
        onVenueChange={refetch}
      />

      {/* Tabelog link */}
      <Card>
        <CardContent className="p-4">
          <a
            href={generateTabelogUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            食べログでお店を探す →
          </a>
          <p className="text-xs text-muted-foreground mt-1">
            ※食べログは公式APIが限定的なため、外部リンクでの検索となります
          </p>
        </CardContent>
      </Card>

      {/* カスタム場所リンク */}
      <Card>
        <CardHeader><CardTitle className="text-lg">場所リンク（GoogleマップURL等）</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            GoogleマップのURLなど、お店の場所を直接リンクで登録できます
          </p>
          {customVenueLinks.length > 0 && (
            <div className="space-y-2">
              {customVenueLinks.map((link) => (
                <div key={link.id} className="flex items-center justify-between rounded-lg border border-border p-2 gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {link.venue_type === 'primary' ? '一次会' : '二次会'}
                      </Badge>
                      <span className="text-sm font-medium truncate">{link.label}</span>
                    </div>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline break-all"
                    >
                      {link.url}
                    </a>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleDeleteVenueLink(link.id)}>削除</Button>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex gap-2">
              <Input
                placeholder="ラベル（例: 居酒屋〇〇）"
                value={venueLabel}
                onChange={(e) => setVenueLabel(e.target.value)}
                className="flex-1"
              />
              <Select
                value={venueType}
                onChange={(e) => setVenueType(e.target.value as 'primary' | 'after_party')}
                className="w-28"
              >
                <option value="primary">一次会</option>
                <option value="after_party">二次会</option>
              </Select>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="URL（GoogleマップのURLなど）"
                value={venueUrl}
                onChange={(e) => setVenueUrl(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleAddVenueLink}
                disabled={!venueLabel.trim() || !venueUrl.trim() || addingVenueLink}
                size="sm"
              >
                追加
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
