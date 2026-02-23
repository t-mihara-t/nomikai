import { useState } from 'react';
import { api } from '@/lib/api';
import type { Restaurant } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function RestaurantSearch() {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<Restaurant[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.searchRestaurants(keyword.trim(), 10);
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

  return (
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

        {error && <p className="text-sm text-destructive">{error}</p>}

        {total !== null && (
          <p className="text-sm text-muted-foreground">
            {total}件中 {results.length}件を表示
          </p>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((shop) => (
              <div
                key={shop.id}
                className="rounded-lg border border-border p-3 space-y-2"
              >
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
                    {shop.private_room === 'あり' && <span>個室あり</span>}
                    {shop.free_drink === 'あり' && <span>飲み放題あり</span>}
                    {shop.course === 'あり' && <span>コースあり</span>}
                  </div>
                </div>

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
              </div>
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
  );
}
