import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEventDetail } from '@/hooks/useEventData';
import { api } from '@/lib/api';
import type { Restaurant } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

function formatDateTime(dt: string) {
  const d = new Date(dt);
  if (isNaN(d.getTime())) return dt;
  return d.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function VenueCard({ shop, label }: { shop: Restaurant; label?: string }) {
  const mapUrl = shop.lat && shop.lng
    ? `https://www.google.com/maps/search/?api=1&query=${shop.lat},${shop.lng}`
    : null;

  const embedUrl = shop.lat && shop.lng
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${shop.lng - 0.005},${shop.lat - 0.003},${shop.lng + 0.005},${shop.lat + 0.003}&layer=mapnik&marker=${shop.lat},${shop.lng}`
    : null;

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      {label && (
        <Badge variant="secondary" className="text-xs mb-1">{label}</Badge>
      )}
      <div className="flex gap-3">
        {shop.photo_url && (
          <img
            src={shop.photo_url}
            alt={shop.name}
            className="h-16 w-16 rounded-md object-cover flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm">{shop.name}</h4>
          <div className="mt-1 flex flex-wrap gap-1">
            {shop.genre && (
              <Badge variant="outline" className="text-xs">{shop.genre}</Badge>
            )}
            {shop.budget_name && (
              <Badge variant="secondary" className="text-xs">{shop.budget_name}</Badge>
            )}
          </div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground space-y-0.5">
        {shop.address && <p>{shop.address}</p>}
        {shop.station_name && <p>最寄駅: {shop.station_name}</p>}
        {shop.open && <p>営業: {shop.open}</p>}
      </div>
      <div className="flex items-center gap-3">
        {shop.url && (
          <a
            href={shop.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            お店の詳細
          </a>
        )}
        {mapUrl && (
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            Google Mapで開く
          </a>
        )}
      </div>
      {embedUrl && (
        <iframe
          src={embedUrl}
          className="w-full h-40 rounded-md border border-border"
          title={`${shop.name}の地図`}
        />
      )}
    </div>
  );
}

export function JoinPage() {
  const { id } = useParams<{ id: string }>();
  const eventId = id ? parseInt(id, 10) : null;
  const { event, loading, error, refetch } = useEventDetail(eventId);

  const [name, setName] = useState('');
  const [status, setStatus] = useState<'attending' | 'absent' | 'pending'>('attending');
  const [isDrinker, setIsDrinker] = useState(true);
  const [paypayId, setPaypayId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <p className="text-destructive">{error || 'イベントが見つかりません'}</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('名前を入力してください');
      return;
    }

    setSubmitting(true);
    try {
      await api.addParticipant(event.id, {
        name: name.trim(),
        status,
        is_drinker: isDrinker,
        paypay_id: paypayId.trim() || undefined,
      });
      setSubmitted(true);
      await refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '登録に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setName('');
    setStatus('attending');
    setIsDrinker(true);
    setPaypayId('');
    setSubmitted(false);
    setFormError(null);
  };

  const attending = event.participants.filter((p) => p.status === 'attending');
  const pending = event.participants.filter((p) => p.status === 'pending');
  const absent = event.participants.filter((p) => p.status === 'absent');

  const venueSelections = event.venue_selections || [];
  const primaryVenues = venueSelections.filter((v) => v.venue_type === 'primary');
  const afterPartyVenues = venueSelections.filter((v) => v.venue_type === 'after_party');

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      {/* イベント情報 */}
      <div className="text-center">
        <h1 className="text-2xl font-bold">{event.name}</h1>
        <p className="mt-1 text-muted-foreground">{event.date}</p>
        {event.has_after_party && (
          <Badge variant="secondary" className="mt-2">二次会あり</Badge>
        )}
      </div>

      {/* 候補日時 */}
      {event.candidate_dates && event.candidate_dates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">候補日時</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {event.candidate_dates.map((cd) => (
                <div key={cd.id} className="rounded-lg border border-border p-2 text-sm">
                  {formatDateTime(cd.date_time)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 一次会会場候補 */}
      {primaryVenues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">一次会候補</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {primaryVenues.map((v, i) => (
              <VenueCard
                key={v.id}
                shop={v.restaurant}
                label={primaryVenues.length > 1 ? `候補 ${i + 1}` : undefined}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* 二次会会場候補 */}
      {afterPartyVenues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">二次会候補</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {afterPartyVenues.map((v) => (
              <VenueCard key={v.id} shop={v.restaurant} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* 回答フォーム */}
      {submitted ? (
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-lg font-semibold">登録完了しました！</p>
            <p className="text-sm text-muted-foreground">
              回答ありがとうございます。
            </p>
            <Button variant="outline" onClick={handleReset}>
              別の人を登録する
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">出欠を登録</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="join-name">名前</Label>
                <Input
                  id="join-name"
                  placeholder="例: 田中太郎"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>参加可否</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={status === 'attending' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatus('attending')}
                  >
                    参加
                  </Button>
                  <Button
                    type="button"
                    variant={status === 'pending' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatus('pending')}
                  >
                    保留
                  </Button>
                  <Button
                    type="button"
                    variant={status === 'absent' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatus('absent')}
                  >
                    不参加
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>飲酒</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={isDrinker ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setIsDrinker(true)}
                  >
                    飲む
                  </Button>
                  <Button
                    type="button"
                    variant={!isDrinker ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setIsDrinker(false)}
                  >
                    飲まない
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="join-paypay">PayPay ID (任意)</Label>
                <Input
                  id="join-paypay"
                  placeholder="例: your-paypay-id"
                  value={paypayId}
                  onChange={(e) => setPaypayId(e.target.value)}
                />
              </div>

              {formError && <p className="text-sm text-destructive">{formError}</p>}

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? '登録中...' : '回答する'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 現在の回答状況 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            回答状況 ({attending.length}名参加 / {pending.length}名保留 / {absent.length}名不参加)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {event.participants.length === 0 ? (
            <p className="text-muted-foreground text-sm">まだ回答がありません</p>
          ) : (
            <div className="space-y-2">
              {event.participants.map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{p.name}</span>
                  <Badge
                    variant={
                      p.status === 'attending'
                        ? 'default'
                        : p.status === 'pending'
                          ? 'warning'
                          : 'secondary'
                    }
                  >
                    {p.status === 'attending' ? '参加' : p.status === 'pending' ? '保留' : '不参加'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
