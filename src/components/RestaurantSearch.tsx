import { useState } from 'react';
import { api } from '@/lib/api';
import type { Restaurant, VenueSelection } from '@/types';
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
  eventId: number;
  hasAfterParty: boolean;
  savedVenues: VenueSelection[];
  onVenueChange: () => void;
}

function ShopCard({
  shop,
  actions,
}: {
  shop: Restaurant;
  actions?: React.ReactNode;
}) {
  const mapUrl = shop.lat && shop.lng
    ? `https://www.google.com/maps/search/?api=1&query=${shop.lat},${shop.lng}`
    : null;

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
      <div className="flex items-center gap-2 flex-wrap">
        {shop.url && (
          <a
            href={shop.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs text-primary hover:underline"
          >
            ホットペッパーで見る
          </a>
        )}
        {mapUrl && (
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs text-primary hover:underline"
          >
            地図を見る
          </a>
        )}
        {actions && <div className="ml-auto flex gap-1">{actions}</div>}
      </div>
    </div>
  );
}

export function RestaurantSearch({ eventId, hasAfterParty, savedVenues, onVenueChange }: RestaurantSearchProps) {
  const [keyword, setKeyword] = useState('');
  const [budget, setBudget] = useState('');
  const [range, setRange] = useState('');
  const [partySize, setPartySize] = useState('');
  const [results, setResults] = useState<Restaurant[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // After-party search
  const [afterPartyResults, setAfterPartyResults] = useState<Restaurant[]>([]);
  const [afterPartyTotal, setAfterPartyTotal] = useState<number | null>(null);
  const [afterPartyLoading, setAfterPartyLoading] = useState(false);
  const [afterPartyError, setAfterPartyError] = useState<string | null>(null);
  const [savingAfterParty, setSavingAfterParty] = useState<string | null>(null);
  const [afterPartyKeyword, setAfterPartyKeyword] = useState('');
  const [afterPartyRange, setAfterPartyRange] = useState('3'); // default 1000m

  const primaryVenues = savedVenues.filter((v) => v.venue_type === 'primary');
  const afterPartyVenues = savedVenues.filter((v) => v.venue_type === 'after_party');

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setTotal(null);

    try {
      // Step 1: keyword search (with budget if set)
      const baseParams: Parameters<typeof api.searchRestaurants>[0] = {
        keyword: keyword.trim(),
        count: 10,
        budget: budget || undefined,
      };

      const initialData = await api.searchRestaurants(baseParams);

      // Step 2: If range is selected, use coordinates from first result for geo-filtered search
      if (range && initialData.shops.length > 0) {
        const firstShop = initialData.shops[0];
        if (firstShop.lat && firstShop.lng) {
          try {
            const geoData = await api.searchRestaurants({
              keyword: keyword.trim(),
              lat: firstShop.lat,
              lng: firstShop.lng,
              range,
              budget: budget || undefined,
              count: 10,
            });
            let filteredShops = geoData.shops;
            // Client-side party_capacity filter
            if (partySize) {
              const minCapacity = parseInt(partySize, 10);
              filteredShops = filteredShops.filter(
                (s) => !s.party_capacity || s.party_capacity >= minCapacity
              );
            }
            setResults(filteredShops);
            setTotal(geoData.total);
            return;
          } catch {
            // Fall back to initial results if geo search fails
          }
        }
      }

      // Use initial results (no range or range search failed)
      let shops = initialData.shops;
      if (partySize) {
        const minCapacity = parseInt(partySize, 10);
        shops = shops.filter(
          (s) => !s.party_capacity || s.party_capacity >= minCapacity
        );
      }
      setResults(shops);
      setTotal(initialData.total);
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

  const handleSavePrimary = async (shop: Restaurant) => {
    if (primaryVenues.length >= 2) {
      setError('一次会候補は最大2件までです。既存の候補を削除してから追加してください。');
      return;
    }
    setSaving(shop.id);
    setError(null);
    try {
      await api.addVenue(eventId, { venue_type: 'primary', restaurant: shop });
      // Keep search results visible so user can select a second candidate
      onVenueChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteVenue = async (venueId: number) => {
    try {
      await api.deleteVenue(venueId);
      onVenueChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    }
  };

  const handleSearchAfterParty = async () => {
    // Search near the first primary venue
    const venue = primaryVenues[0];
    if (!venue) return;
    const shop = venue.restaurant;
    if (!shop.lat || !shop.lng) {
      setAfterPartyError('一次会会場の位置情報がないため、二次会候補を検索できません');
      return;
    }

    setAfterPartyLoading(true);
    setAfterPartyError(null);
    setAfterPartyResults([]);
    setAfterPartyTotal(null);

    try {
      const searchParams: Parameters<typeof api.searchRestaurants>[0] = {
        lat: shop.lat,
        lng: shop.lng,
        range: afterPartyRange,
        count: 20,
      };
      if (afterPartyKeyword.trim()) {
        searchParams.keyword = afterPartyKeyword.trim();
      }
      const data = await api.searchRestaurants(searchParams);
      // Exclude primary venues
      const primaryIds = new Set(primaryVenues.map((v) => v.restaurant.id));
      const filtered = data.shops.filter((s) => !primaryIds.has(s.id));
      setAfterPartyResults(filtered);
      setAfterPartyTotal(data.total);
    } catch (err) {
      setAfterPartyError(err instanceof Error ? err.message : '二次会候補の検索に失敗しました');
    } finally {
      setAfterPartyLoading(false);
    }
  };

  const handleSaveAfterParty = async (shop: Restaurant) => {
    setSavingAfterParty(shop.id);
    try {
      await api.addVenue(eventId, { venue_type: 'after_party', restaurant: shop });
      onVenueChange();
    } catch (err) {
      setAfterPartyError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSavingAfterParty(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Saved primary venues */}
      {primaryVenues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">一次会候補 ({primaryVenues.length}/2)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {primaryVenues.map((v) => (
              <ShopCard
                key={v.id}
                shop={v.restaurant}
                actions={
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-destructive"
                    onClick={() => handleDeleteVenue(v.id)}
                  >
                    削除
                  </Button>
                }
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Saved after-party venues */}
      {afterPartyVenues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">二次会候補</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {afterPartyVenues.map((v) => (
              <ShopCard
                key={v.id}
                shop={v.restaurant}
                actions={
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-destructive"
                    onClick={() => handleDeleteVenue(v.id)}
                  >
                    削除
                  </Button>
                }
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Search */}
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
              {range && (
                <p className="text-[10px] text-muted-foreground">
                  ※キーワード検索結果の周辺で距離フィルタを適用します
                </p>
              )}
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
              {results.length === 0 && ' - 条件を緩めて再検索してみてください'}
            </p>
          )}

          {results.length > 0 && (
            <div className="space-y-3">
              {results.map((shop) => {
                const alreadySaved = primaryVenues.some((v) => v.restaurant.id === shop.id);
                return (
                  <ShopCard
                    key={shop.id}
                    shop={shop}
                    actions={
                      alreadySaved ? (
                        <Badge variant="secondary" className="text-xs">選択済み</Badge>
                      ) : primaryVenues.length >= 2 ? (
                        <Badge variant="outline" className="text-xs">候補上限</Badge>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          className="text-xs"
                          disabled={saving === shop.id}
                          onClick={() => handleSavePrimary(shop)}
                        >
                          {saving === shop.id ? '保存中...' : '一次会候補に追加'}
                        </Button>
                      )
                    }
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* After-party search */}
      {hasAfterParty && primaryVenues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              二次会を探す（{primaryVenues[0].restaurant.name}の近く）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="ap-keyword" className="text-xs">キーワード（任意）</Label>
                <Input
                  id="ap-keyword"
                  placeholder="例: バー、居酒屋"
                  value={afterPartyKeyword}
                  onChange={(e) => setAfterPartyKeyword(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ap-range" className="text-xs">検索範囲</Label>
                <Select
                  id="ap-range"
                  value={afterPartyRange}
                  onChange={(e) => setAfterPartyRange(e.target.value)}
                >
                  {RANGE_OPTIONS.filter((o) => o.value !== '').map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              </div>
            </div>
            <Button
              onClick={handleSearchAfterParty}
              disabled={afterPartyLoading}
              className="w-full"
            >
              {afterPartyLoading ? '検索中...' : afterPartyResults.length > 0 ? '再検索' : '二次会候補を検索'}
            </Button>
            {afterPartyError && (
              <p className="text-sm text-destructive">{afterPartyError}</p>
            )}
            {afterPartyTotal !== null && !afterPartyLoading && (
              <p className="text-sm text-muted-foreground">
                一次会会場の近く: {afterPartyTotal}件中 {afterPartyResults.length}件を表示
                {afterPartyResults.length === 0 && ' - 検索範囲を広げるか、キーワードを変更してみてください'}
              </p>
            )}
            {afterPartyResults.length > 0 && (
              <div className="space-y-3">
                {afterPartyResults.map((shop) => {
                  const alreadySaved = afterPartyVenues.some((v) => v.restaurant.id === shop.id);
                  return (
                    <ShopCard
                      key={shop.id}
                      shop={shop}
                      actions={
                        alreadySaved ? (
                          <Badge variant="secondary" className="text-xs">選択済み</Badge>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            className="text-xs"
                            disabled={savingAfterParty === shop.id}
                            onClick={() => handleSaveAfterParty(shop)}
                          >
                            {savingAfterParty === shop.id ? '保存中...' : '二次会候補に追加'}
                          </Button>
                        )
                      }
                    />
                  );
                })}
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
