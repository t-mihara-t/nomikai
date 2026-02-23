import { useState } from 'react';
import { api } from '@/lib/api';
import type { Restaurant } from '@/types';
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
  { value: 'B012', label: '20001～30000円' },
  { value: 'B013', label: '30001円～' },
];

const RANGE_OPTIONS = [
  { value: '', label: '指定なし' },
  { value: '1', label: '300m以内（徒歩約4分）' },
  { value: '2', label: '500m以内（徒歩約6分）' },
  { value: '3', label: '1000m以内（徒歩約12分）' },
  { value: '4', label: '2000m以内（徒歩約25分）' },
  { value: '5', label: '3000m以内（徒歩約37分）' },
];

interface RestaurantSearchProps {
  hasAfterParty?: boolean;
}

function ShopCard({
  shop,
  onSelect,
  selectLabel,
}: {
  shop: Restaurant;
  onSelect?: (shop: Restaurant) => void;
  selectLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex gap-3">
        {shop.photo_url && (
          <img
            src={shop.photo_url}
            alt={shop.name}
            className="h-20 w-20 rounded-md object-cover flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate">{shop.name}</h4>
          {shop.catch && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {shop.catch}
            </p>
          )}
          <div className="mt-1 flex flex-wrap gap-1">
            {shop.genre && (
              <Badge variant="outline" className="text-xs">{shop.genre}</Badge>
            )}
            {shop.budget_name && (
              <Badge variant="secondary" className="text-xs">{shop.budget_name}</Badge>
            )}
            {shop.station_name && (
              <Badge variant="outline" className="text-xs">{shop.station_name}</Badge>
            )}
          </div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground space-y-0.5">
        {shop.address && <p>{shop.address}</p>}
        {shop.open && <p>営業: {shop.open}</p>}
        <div className="flex flex-wrap gap-2 mt-1">
          {shop.capacity > 0 && <span>席数: {shop.capacity}</span>}
          {shop.party_capacity > 0 && <span>宴会: 最大{shop.party_capacity}名</span>}
          {shop.private_room === 'あり' && <span>個室あり</span>}
          {shop.free_drink === 'あり' && <span>飲み放題あり</span>}
          {shop.course === 'あり' && <span>コースあり</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {shop.url && (
          <a
            href={shop.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs text-primary hover:underline"
          >
            ホットペッパーで詳細を見る →
          </a>
        )}
        {onSelect && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto text-xs"
            onClick={() => onSelect(shop)}
          >
            {selectLabel || '選択'}
          </Button>
        )}
      </div>
    </div>
  );
}

export function RestaurantSearch({ hasAfterParty }: RestaurantSearchProps) {
  const [keyword, setKeyword] = useState('');
  const [budget, setBudget] = useState('');
  const [range, setRange] = useState('');
  const [partySize, setPartySize] = useState('');
  const [results, setResults] = useState<Restaurant[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 一次会の選択と二次会
  const [primaryVenue, setPrimaryVenue] = useState<Restaurant | null>(null);
  const [afterPartyResults, setAfterPartyResults] = useState<Restaurant[]>([]);
  const [afterPartyTotal, setAfterPartyTotal] = useState<number | null>(null);
  const [afterPartyLoading, setAfterPartyLoading] = useState(false);
  const [afterPartyError, setAfterPartyError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.searchRestaurants({
        keyword: keyword.trim(),
        count: 10,
        range: range || undefined,
        budget: budget || undefined,
        party_capacity: partySize ? parseInt(partySize, 10) : undefined,
      });
      setResults(data.shops);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : '検索に失敗しました');
      setResults([]);
      setTotal(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleSelectPrimary = async (shop: Restaurant) => {
    setPrimaryVenue(shop);
    if (hasAfterParty && shop.lat && shop.lng) {
      await searchAfterParty(shop);
    }
  };

  const searchAfterParty = async (venue: Restaurant) => {
    setAfterPartyLoading(true);
    setAfterPartyError(null);
    try {
      const data = await api.searchRestaurants({
        lat: venue.lat,
        lng: venue.lng,
        range: '2', // 500m以内
        keyword: '居酒屋 バー',
        count: 5,
      });
      // 一次会と同じ店を除外
      const filtered = data.shops.filter((s) => s.id !== venue.id);
      setAfterPartyResults(filtered);
      setAfterPartyTotal(data.total);
    } catch (err) {
      setAfterPartyError(err instanceof Error ? err.message : '二次会候補の検索に失敗しました');
      setAfterPartyResults([]);
      setAfterPartyTotal(null);
    } finally {
      setAfterPartyLoading(false);
    }
  };

  const handleClearPrimary = () => {
    setPrimaryVenue(null);
    setAfterPartyResults([]);
    setAfterPartyTotal(null);
    setAfterPartyError(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">お店を探す</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>最寄駅・エリア名</Label>
            <div className="flex gap-2">
              <Input
                placeholder="例: 渋谷駅 居酒屋"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={loading || !keyword.trim()}>
                {loading ? '検索中...' : '検索'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="search-range" className="text-xs">駅からの距離</Label>
              <Select
                id="search-range"
                value={range}
                onChange={(e) => setRange(e.target.value)}
              >
                {RANGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="search-budget" className="text-xs">1人あたり予算</Label>
              <Select
                id="search-budget"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              >
                {BUDGET_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="search-party" className="text-xs">予定人数</Label>
              <Input
                id="search-party"
                type="number"
                placeholder="例: 10"
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
                min="1"
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {total !== null && (
            <p className="text-sm text-muted-foreground">
              {total}件中 {results.length}件を表示
            </p>
          )}

          {results.length > 0 && (
            <div className="space-y-3">
              {results.map((shop) => (
                <ShopCard
                  key={shop.id}
                  shop={shop}
                  onSelect={handleSelectPrimary}
                  selectLabel="一次会に選ぶ"
                />
              ))}
            </div>
          )}

          {total !== null && results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              該当するお店が見つかりませんでした
            </p>
          )}
        </CardContent>
      </Card>

      {/* 一次会の選択結果 */}
      {primaryVenue && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">一次会会場</CardTitle>
              <Button variant="outline" size="sm" onClick={handleClearPrimary}>
                変更
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ShopCard shop={primaryVenue} />
          </CardContent>
        </Card>
      )}

      {/* 二次会候補の自動検索 */}
      {hasAfterParty && primaryVenue && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              二次会おすすめ（{primaryVenue.name}の近く）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {afterPartyLoading && (
              <p className="text-sm text-muted-foreground">二次会候補を検索中...</p>
            )}
            {afterPartyError && (
              <p className="text-sm text-destructive">{afterPartyError}</p>
            )}
            {afterPartyTotal !== null && !afterPartyLoading && (
              <p className="text-sm text-muted-foreground">
                一次会会場から500m以内: {afterPartyTotal}件中 {afterPartyResults.length}件を表示
              </p>
            )}
            {afterPartyResults.length > 0 && (
              <div className="space-y-3">
                {afterPartyResults.map((shop) => (
                  <ShopCard key={shop.id} shop={shop} />
                ))}
              </div>
            )}
            {afterPartyTotal !== null && afterPartyResults.length === 0 && !afterPartyLoading && (
              <p className="text-sm text-muted-foreground text-center py-4">
                近くに二次会候補が見つかりませんでした
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
