import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEventDetail, useCalculate } from '@/hooks/useEventData';
import { api } from '@/lib/api';
import { ParticipantList } from '@/components/ParticipantList';
import { AdminPanel } from '@/components/AdminPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { Restaurant, EventWithParticipants } from '@/types';

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

type TabType = 'primary' | 'after_party';

export function DayOfPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const eventId = id ? parseInt(id, 10) : null;
  const { event, loading, error, refetch } = useEventDetail(eventId);
  const { calculate, loading: calcLoading } = useCalculate();
  const [settlementCopied, setSettlementCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('primary');
  const [creatingAfterParty, setCreatingAfterParty] = useState(false);

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
  const afterPartyEvent = event.after_party_event;
  const hasAfterParty = event.has_after_party;
  const showTabs = hasAfterParty || afterPartyEvent;

  // Handlers for primary event participants
  const handleToggleStatus = async (participantId: number, currentStatus: 'attending' | 'absent' | 'pending') => {
    const nextStatus = currentStatus === 'attending' ? 'absent' : currentStatus === 'absent' ? 'pending' : 'attending';
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

  const handleUpdateMultiplier = async (participantId: number, multiplier: number) => {
    await api.updateParticipant(participantId, { multiplier });
    await refetch();
  };

  const handleUpdateDiscount = async (participantId: number, discountRate: number) => {
    await api.updateParticipant(participantId, { discount_rate: discountRate });
    await refetch();
  };

  const handleToggleAfterParty = async (participantId: number, current: boolean) => {
    await api.updateParticipant(participantId, { join_after_party: !current });
    await refetch();
  };

  const handleBulkUpdate = async (updates: { status?: 'attending' | 'absent' | 'pending'; is_drinker?: boolean }) => {
    const ids = event.participants.map((p) => p.id);
    if (ids.length === 0) return;
    await api.bulkUpdateParticipants(event.id, { participant_ids: ids, updates });
    await refetch();
  };

  const handleCalculate = async (data: { total_amount: number; drinker_ratio: number; kampa_amount: number; rounding: 'ceil' | 'floor' }) => {
    const result = await calculate(event.id, data);
    if (result) await refetch();
    return result;
  };

  const handleCreateAfterParty = async () => {
    const selected = event.participants.filter((p) => p.join_after_party && p.status === 'attending');
    if (selected.length === 0) {
      alert('二次会に参加する人を選択してください（参加者一覧の「二次会」ボタンで選択）');
      return;
    }
    setCreatingAfterParty(true);
    try {
      await api.createAfterPartyEvent(event.id, { participant_ids: selected.map((p) => p.id) });
      await refetch();
      setActiveTab('after_party');
    } catch (err) {
      alert(err instanceof Error ? err.message : '二次会イベントの作成に失敗しました');
    } finally {
      setCreatingAfterParty(false);
    }
  };

  // After-party event handlers (re-use same pattern)
  const handleAPToggleStatus = async (participantId: number, currentStatus: 'attending' | 'absent' | 'pending') => {
    const nextStatus = currentStatus === 'attending' ? 'absent' : currentStatus === 'absent' ? 'pending' : 'attending';
    await api.updateParticipant(participantId, { status: nextStatus });
    await refetch();
  };

  const handleAPCalculate = async (data: { total_amount: number; drinker_ratio: number; kampa_amount: number; rounding: 'ceil' | 'floor' }) => {
    if (!afterPartyEvent) return null;
    const result = await calculate(afterPartyEvent.id, data);
    if (result) await refetch();
    return result;
  };

  const generateSettlementText = (ev: EventWithParticipants, label?: string) => {
    const attending = ev.participants.filter((p) => p.status === 'attending');
    const venueName = label === '二次会'
      ? (afterPartyVenues.length > 0 ? afterPartyVenues[0].restaurant.name : '未定')
      : (primaryVenues.length > 0 ? primaryVenues[0].restaurant.name : '未定');
    const lines = [
      `【${label || '飲み会'}精算のお知らせ】`,
      ``,
      `${ev.name}`,
      `日時: ${ev.date}`,
      `会場: ${venueName}`,
      ``,
    ];

    if (ev.total_amount) {
      lines.push(`合計金額: ${ev.total_amount.toLocaleString()}円`);
      if (ev.kampa_amount > 0) {
        lines.push(`カンパ: -${ev.kampa_amount.toLocaleString()}円`);
      }
      lines.push(`参加者: ${attending.length}名`);
      lines.push(``);

      // Show individual amounts
      attending.forEach((p) => {
        if (p.amount_to_pay != null) {
          const extras = [];
          if (p.multiplier !== 1.0) extras.push(`${p.multiplier}倍`);
          if (p.discount_rate > 0) extras.push(`${Math.round(p.discount_rate * 100)}%OFF`);
          const suffix = extras.length > 0 ? ` (${extras.join(', ')})` : '';
          lines.push(`${p.name}: ${p.amount_to_pay.toLocaleString()}円${suffix}`);
        }
      });
      lines.push(``);
    }

    if (ev.paypay_id) {
      lines.push(`PayPay ID: ${ev.paypay_id}`);
      lines.push(``);
    }

    lines.push(`よろしくお願いします！`);
    return lines.join('\n');
  };

  const handleCopySettlement = async (ev: EventWithParticipants, label?: string) => {
    const text = generateSettlementText(ev, label);
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

      {/* Tabs for primary/after-party */}
      {showTabs && (
        <div className="flex gap-2 border-b border-border pb-2">
          <Button
            variant={activeTab === 'primary' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('primary')}
          >
            一次会
          </Button>
          <Button
            variant={activeTab === 'after_party' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('after_party')}
          >
            二次会
            {afterPartyEvent && <span className="ml-1 text-xs opacity-70">({afterPartyEvent.participants.length}名)</span>}
          </Button>
        </div>
      )}

      {/* ===== PRIMARY TAB ===== */}
      {activeTab === 'primary' && (
        <>
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

          {/* 出欠確認 */}
          <ParticipantList
            participants={event.participants}
            eventPaypayId={event.paypay_id}
            showAfterPartyCheck={hasAfterParty}
            onToggleStatus={handleToggleStatus}
            onTogglePaid={handleTogglePaid}
            onDelete={handleDeleteParticipant}
            onUpdateMultiplier={handleUpdateMultiplier}
            onUpdateDiscount={handleUpdateDiscount}
            onToggleAfterParty={handleToggleAfterParty}
            onBulkUpdate={handleBulkUpdate}
          />

          {/* 二次会作成ボタン */}
          {hasAfterParty && !afterPartyEvent && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  「二次会」ボタンでチェックした参加者を二次会イベントに引き継ぎます
                  ({event.participants.filter((p) => p.join_after_party && p.status === 'attending').length}名選択中)
                </p>
                <Button onClick={handleCreateAfterParty} disabled={creatingAfterParty} className="w-full">
                  {creatingAfterParty ? '作成中...' : '二次会イベントを作成'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 精算設定 */}
          <AdminPanel
            eventId={event.id}
            participants={event.participants}
            currentTotalAmount={event.total_amount}
            currentDrinkerRatio={event.drinker_ratio}
            currentKampaAmount={event.kampa_amount}
            onCalculate={handleCalculate}
            loading={calcLoading}
          />

          {/* 精算テキスト生成 */}
          {event.total_amount && event.participants.some((p) => p.amount_to_pay != null) && (
            <Card>
              <CardHeader><CardTitle className="text-lg">精算テキスト生成</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <pre className="whitespace-pre-wrap text-xs bg-muted rounded-lg p-3 border border-border">
                  {generateSettlementText(event, '一次会')}
                </pre>
                <Button onClick={() => handleCopySettlement(event, '一次会')} variant="outline" className="w-full">
                  {settlementCopied ? 'コピー済み！' : 'テキストをコピー'}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ===== AFTER-PARTY TAB ===== */}
      {activeTab === 'after_party' && (
        <>
          {afterPartyVenues.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">二次会会場</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {afterPartyVenues.map((v) => (<VenueCard key={v.id} shop={v.restaurant} />))}
              </CardContent>
            </Card>
          )}

          {afterPartyEvent ? (
            <>
              <ParticipantList
                participants={afterPartyEvent.participants}
                eventPaypayId={afterPartyEvent.paypay_id || event.paypay_id}
                onToggleStatus={handleAPToggleStatus}
                onTogglePaid={async (pid, cur) => { await api.updateParticipant(pid, { paid_status: !cur }); await refetch(); }}
                onDelete={async (pid) => { if (confirm('削除しますか？')) { await api.deleteParticipant(pid); await refetch(); } }}
                onUpdateMultiplier={async (pid, m) => { await api.updateParticipant(pid, { multiplier: m }); await refetch(); }}
                onUpdateDiscount={async (pid, d) => { await api.updateParticipant(pid, { discount_rate: d }); await refetch(); }}
                onBulkUpdate={async (updates) => {
                  const ids = afterPartyEvent.participants.map((p) => p.id);
                  if (ids.length > 0) { await api.bulkUpdateParticipants(afterPartyEvent.id, { participant_ids: ids, updates }); await refetch(); }
                }}
              />

              <AdminPanel
                eventId={afterPartyEvent.id}
                participants={afterPartyEvent.participants}
                currentTotalAmount={afterPartyEvent.total_amount}
                currentDrinkerRatio={afterPartyEvent.drinker_ratio}
                currentKampaAmount={afterPartyEvent.kampa_amount}
                onCalculate={handleAPCalculate}
                loading={calcLoading}
              />

              {afterPartyEvent.total_amount && afterPartyEvent.participants.some((p) => p.amount_to_pay != null) && (
                <Card>
                  <CardHeader><CardTitle className="text-lg">二次会精算テキスト</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <pre className="whitespace-pre-wrap text-xs bg-muted rounded-lg p-3 border border-border">
                      {generateSettlementText(afterPartyEvent, '二次会')}
                    </pre>
                    <Button onClick={() => handleCopySettlement(afterPartyEvent, '二次会')} variant="outline" className="w-full">
                      {settlementCopied ? 'コピー済み！' : 'テキストをコピー'}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-6 text-center space-y-3">
                <p className="text-muted-foreground">二次会イベントはまだ作成されていません</p>
                <p className="text-sm text-muted-foreground">一次会タブで「二次会」ボタンでメンバーを選択してから作成してください</p>
                <Button variant="outline" onClick={() => setActiveTab('primary')}>一次会タブに戻る</Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
