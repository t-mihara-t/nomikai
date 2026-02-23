import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEventDetail, useCalculate } from '@/hooks/useEventData';
import { api } from '@/lib/api';
import { ParticipantList } from '@/components/ParticipantList';
import { AdminPanel } from '@/components/AdminPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { Restaurant } from '@/types';

function VenueCard({ shop, label }: { shop: Restaurant; label?: string }) {
  const mapUrl = shop.lat && shop.lng
    ? `https://www.google.com/maps/search/?api=1&query=${shop.lat},${shop.lng}`
    : null;
  const embedUrl = shop.lat && shop.lng
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${shop.lng - 0.005},${shop.lat - 0.003},${shop.lng + 0.005},${shop.lat + 0.003}&layer=mapnik&marker=${shop.lat},${shop.lng}`
    : null;

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      {label && <Badge variant="secondary" className="text-xs mb-1">{label}</Badge>}
      <div className="flex gap-3">
        {shop.photo_url && (
          <img src={shop.photo_url} alt={shop.name} className="h-16 w-16 rounded-md object-cover flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm">{shop.name}</h4>
          <div className="mt-1 flex flex-wrap gap-1">
            {shop.genre && <Badge variant="outline" className="text-xs">{shop.genre}</Badge>}
            {shop.budget_name && <Badge variant="secondary" className="text-xs">{shop.budget_name}</Badge>}
          </div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground space-y-0.5">
        {shop.address && <p>{shop.address}</p>}
        {shop.station_name && <p>最寄駅: {shop.station_name}</p>}
      </div>
      <div className="flex items-center gap-3">
        {shop.url && (
          <a href={shop.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">お店の詳細</a>
        )}
        {mapUrl && (
          <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Google Mapで開く</a>
        )}
      </div>
      {embedUrl && (
        <iframe src={embedUrl} className="w-full h-40 rounded-md border border-border" title={`${shop.name}の地図`} />
      )}
    </div>
  );
}

export function DayOfPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const eventId = id ? parseInt(id, 10) : null;
  const { event, loading, error, refetch } = useEventDetail(eventId);
  const { calculate, loading: calcLoading } = useCalculate();
  const [settlementCopied, setSettlementCopied] = useState(false);

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
        <Button variant="outline" onClick={() => navigate('/')}>トップに戻る</Button>
      </div>
    );
  }

  const venueSelections = event.venue_selections || [];
  const primaryVenues = venueSelections.filter((v) => v.venue_type === 'primary');
  const afterPartyVenues = venueSelections.filter((v) => v.venue_type === 'after_party');

  const handleToggleStatus = async (
    participantId: number,
    currentStatus: 'attending' | 'absent' | 'pending'
  ) => {
    const nextStatus = currentStatus === 'attending' ? 'absent'
      : currentStatus === 'absent' ? 'pending'
      : 'attending';
    await api.updateParticipant(participantId, { status: nextStatus });
    await refetch();
  };

  const handleTogglePaid = async (participantId: number, currentPaid: boolean) => {
    await api.updateParticipant(participantId, { paid_status: !currentPaid });
    await refetch();
  };

  const handleDeleteParticipant = async (participantId: number) => {
    if (!confirm('この参加者を削除しますか？')) return;
    await api.deleteParticipant(participantId);
    await refetch();
  };

  const handleCalculate = async (data: {
    total_amount: number;
    drinker_ratio: number;
    rounding: 'ceil' | 'floor';
  }) => {
    const result = await calculate(event.id, data);
    if (result) await refetch();
    return result;
  };

  const generateSettlementText = () => {
    const attending = event.participants.filter((p) => p.status === 'attending');
    const venueName = primaryVenues.length > 0 ? primaryVenues[0].restaurant.name : '未定';
    const lines = [
      `【飲み会精算のお知らせ】`,
      ``,
      `${event.name}`,
      `日時: ${event.date}`,
      `会場: ${venueName}`,
      ``,
    ];

    if (event.total_amount) {
      lines.push(`合計金額: ${event.total_amount.toLocaleString()}円`);
      lines.push(`参加者: ${attending.length}名`);
      lines.push(``);

      const drinkers = attending.filter((p) => p.is_drinker && p.amount_to_pay != null);
      const nonDrinkers = attending.filter((p) => !p.is_drinker && p.amount_to_pay != null);

      if (drinkers.length > 0 && drinkers[0].amount_to_pay != null) {
        lines.push(`飲む人: ${drinkers[0].amount_to_pay.toLocaleString()}円`);
      }
      if (nonDrinkers.length > 0 && nonDrinkers[0].amount_to_pay != null) {
        lines.push(`飲まない人: ${nonDrinkers[0].amount_to_pay.toLocaleString()}円`);
      }
      lines.push(``);
    }

    if (event.paypay_id) {
      lines.push(`PayPay ID: ${event.paypay_id}`);
      lines.push(``);
    }

    lines.push(`よろしくお願いします！`);
    return lines.join('\n');
  };

  const handleCopySettlement = async () => {
    const text = generateSettlementText();
    await navigator.clipboard.writeText(text);
    setSettlementCopied(true);
    setTimeout(() => setSettlementCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate(`/events/${event.id}`)}>← 幹事ページ</Button>
        <div>
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <p className="text-sm text-muted-foreground">{event.date}</p>
          <Badge variant="secondary" className="mt-1">当日ページ</Badge>
        </div>
      </div>

      {/* 会場情報 */}
      {primaryVenues.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">一次会会場</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {primaryVenues.map((v, i) => (
              <VenueCard key={v.id} shop={v.restaurant} label={primaryVenues.length > 1 ? `候補 ${i + 1}` : undefined} />
            ))}
          </CardContent>
        </Card>
      )}
      {afterPartyVenues.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">二次会会場</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {afterPartyVenues.map((v) => (<VenueCard key={v.id} shop={v.restaurant} />))}
          </CardContent>
        </Card>
      )}

      {/* 出欠確認 */}
      <ParticipantList
        participants={event.participants}
        eventPaypayId={event.paypay_id}
        onToggleStatus={handleToggleStatus}
        onTogglePaid={handleTogglePaid}
        onDelete={handleDeleteParticipant}
      />

      {/* 精算設定 */}
      <AdminPanel
        eventId={event.id}
        participants={event.participants}
        currentTotalAmount={event.total_amount}
        currentDrinkerRatio={event.drinker_ratio}
        onCalculate={handleCalculate}
        loading={calcLoading}
      />

      {/* 精算テキスト生成 */}
      {event.total_amount && event.participants.some((p) => p.amount_to_pay != null) && (
        <Card>
          <CardHeader><CardTitle className="text-lg">精算テキスト生成</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <pre className="whitespace-pre-wrap text-xs bg-muted rounded-lg p-3 border border-border">
              {generateSettlementText()}
            </pre>
            <Button onClick={handleCopySettlement} variant="outline" className="w-full">
              {settlementCopied ? 'コピー済み！' : 'テキストをコピー'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
