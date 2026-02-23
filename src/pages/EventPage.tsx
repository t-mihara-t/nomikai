import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEventDetail, useCalculate } from '@/hooks/useEventData';
import { api } from '@/lib/api';
import { ParticipantList } from '@/components/ParticipantList';
import { AdminPanel } from '@/components/AdminPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RestaurantSearch } from '@/components/RestaurantSearch';
import type { ParticipantResponse } from '@/types';

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

export function EventPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const eventId = id ? parseInt(id, 10) : null;
  const { event, loading, error, refetch } = useEventDetail(eventId);
  const { calculate, loading: calcLoading } = useCalculate();
  const [copied, setCopied] = useState(false);
  const [newDateTime, setNewDateTime] = useState('');
  const [addingDate, setAddingDate] = useState(false);

  // Pre-registration
  const [newParticipantName, setNewParticipantName] = useState('');
  const [addingParticipant, setAddingParticipant] = useState(false);

  // PayPay ID
  const [editPaypay, setEditPaypay] = useState(false);
  const [paypayId, setPaypayId] = useState('');

  // Settlement email
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

  const participantUrl = `${window.location.origin}/join/${event.id}`;
  const allResponses: ParticipantResponse[] = event.participant_responses || [];
  const candidateDates = event.candidate_dates || [];
  const primaryVenues = (event.venue_selections || []).filter((v) => v.venue_type === 'primary');

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(participantUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddPreRegistration = async () => {
    if (!newParticipantName.trim()) return;
    setAddingParticipant(true);
    try {
      await api.addParticipant(event.id, { name: newParticipantName.trim() });
      setNewParticipantName('');
      await refetch();
    } finally {
      setAddingParticipant(false);
    }
  };

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

  const handleToggleAfterParty = async () => {
    await api.updateEvent(event.id, { has_after_party: !event.has_after_party });
    await refetch();
  };

  const handleAddCandidateDate = async () => {
    if (!newDateTime) return;
    setAddingDate(true);
    try {
      await api.addCandidateDate(event.id, newDateTime);
      setNewDateTime('');
      await refetch();
    } finally {
      setAddingDate(false);
    }
  };

  const handleDeleteCandidateDate = async (dateId: number) => {
    await api.deleteCandidateDate(dateId);
    await refetch();
  };

  const handleSavePaypay = async () => {
    await api.updateEvent(event.id, { paypay_id: paypayId.trim() || undefined });
    setEditPaypay(false);
    await refetch();
  };

  // Settlement text generation
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

  // Tabelog search URL
  const generateTabelogUrl = () => {
    const keyword = primaryVenues.length > 0
      ? primaryVenues[0].restaurant.station_name || primaryVenues[0].restaurant.address
      : '';
    return `https://tabelog.com/rstLst/?vs=1&sa=&sk=${encodeURIComponent(keyword)}&lid=&vac_net=&svd=&svt=&svps=&svpe=&hfc=1&Cat=RC&LstCat=RC01&LstCatD=RC01&Cat=RC&LstCat=RC01&LstCatD=RC01&LstCatSD=RC0102&smp=0`;
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/')}>← 戻る</Button>
        <div>
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <p className="text-sm text-muted-foreground">{event.date}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {event.has_after_party && <Badge variant="secondary">二次会あり</Badge>}
          </div>
        </div>
      </div>

      {/* 参加者共有リンク */}
      <Card>
        <CardHeader><CardTitle className="text-lg">参加者向けリンク</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">参加者にこのリンクを共有して出欠を登録してもらいましょう</p>
          <div className="flex gap-2">
            <Input value={participantUrl} readOnly className="flex-1" />
            <Button onClick={handleCopyLink} variant="outline">{copied ? 'コピー済み' : 'コピー'}</Button>
          </div>
        </CardContent>
      </Card>

      {/* PayPay ID設定 */}
      <Card>
        <CardContent className="flex items-center justify-between p-4 gap-3">
          <div className="flex-1">
            <p className="font-medium text-sm">幹事PayPay ID</p>
            {editPaypay ? (
              <div className="flex gap-2 mt-1">
                <Input
                  value={paypayId}
                  onChange={(e) => setPaypayId(e.target.value)}
                  placeholder="PayPay ID"
                  className="flex-1"
                />
                <Button size="sm" onClick={handleSavePaypay}>保存</Button>
                <Button size="sm" variant="outline" onClick={() => setEditPaypay(false)}>取消</Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground font-mono">
                {event.paypay_id || '未設定'}
              </p>
            )}
          </div>
          {!editPaypay && (
            <Button variant="outline" size="sm" onClick={() => { setPaypayId(event.paypay_id || ''); setEditPaypay(true); }}>
              編集
            </Button>
          )}
        </CardContent>
      </Card>

      {/* 候補日時管理 */}
      <Card>
        <CardHeader><CardTitle className="text-lg">候補日時</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {candidateDates.length > 0 ? (
            <div className="space-y-2">
              {candidateDates.map((cd) => (
                <div key={cd.id} className="flex items-center justify-between rounded-lg border border-border p-2">
                  <span className="text-sm">{formatDateTime(cd.date_time)}</span>
                  <Button variant="outline" size="sm" onClick={() => handleDeleteCandidateDate(cd.id)}>削除</Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">候補日時はまだありません</p>
          )}
          <div className="flex gap-2">
            <Input type="datetime-local" value={newDateTime} onChange={(e) => setNewDateTime(e.target.value)} className="flex-1" />
            <Button onClick={handleAddCandidateDate} disabled={!newDateTime || addingDate} size="sm">追加</Button>
          </div>
        </CardContent>
      </Card>

      {/* 二次会トグル */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <span className="font-medium">二次会</span>
          <Button variant={event.has_after_party ? 'default' : 'outline'} size="sm" onClick={handleToggleAfterParty}>
            {event.has_after_party ? 'あり' : 'なし'}
          </Button>
        </CardContent>
      </Card>

      {/* 事前登録 */}
      <Card>
        <CardHeader><CardTitle className="text-lg">参加予定者の事前登録</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            参加予定者を事前に登録しておくと、参加者が回答ページで自分の名前を選択できます
          </p>
          {event.participants.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {event.participants.map((p) => (
                <div key={p.id} className="flex items-center gap-1">
                  <Badge variant="outline">{p.name}</Badge>
                  <button
                    className="text-xs text-destructive hover:underline"
                    onClick={() => handleDeleteParticipant(p.id)}
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="名前を入力"
              value={newParticipantName}
              onChange={(e) => setNewParticipantName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPreRegistration(); } }}
              className="flex-1"
            />
            <Button onClick={handleAddPreRegistration} disabled={!newParticipantName.trim() || addingParticipant} size="sm">
              追加
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 回答状況グリッド */}
      {candidateDates.length > 0 && event.participants.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">回答状況</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {candidateDates.map((cd) => {
              const dateResponses = allResponses.filter((r) => r.candidate_date_id === cd.id);
              const attending = dateResponses.filter((r) => r.status === 'attending').length;
              const pendingCount = dateResponses.filter((r) => r.status === 'pending').length;
              const absent = dateResponses.filter((r) => r.status === 'absent').length;
              const unanswered = event.participants.length - dateResponses.length;

              return (
                <div key={cd.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{formatDateTime(cd.date_time)}</p>
                    <div className="flex gap-1 text-xs">
                      <Badge variant="default">{attending}参加</Badge>
                      <Badge variant="warning">{pendingCount}保留</Badge>
                      <Badge variant="secondary">{absent}不参加</Badge>
                      {unanswered > 0 && <Badge variant="outline">{unanswered}未回答</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {event.participants.map((p) => {
                      const resp = dateResponses.find((r) => r.participant_id === p.id);
                      const variant = resp
                        ? resp.status === 'attending' ? 'default' : resp.status === 'pending' ? 'warning' : 'secondary'
                        : 'outline';
                      const text = resp
                        ? resp.status === 'attending' ? '○' : resp.status === 'pending' ? '△' : '×'
                        : '−';
                      return (
                        <Badge key={p.id} variant={variant} className="text-xs">
                          {p.name}{text}
                          {event.has_after_party && resp?.after_party_status && (
                            <span className="ml-0.5 opacity-70">
                              (2次{resp.after_party_status === 'attending' ? '○' : resp.after_party_status === 'pending' ? '△' : '×'})
                            </span>
                          )}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* お店を探す (HotPepper + Tabelog) */}
      <RestaurantSearch
        eventId={event.id}
        hasAfterParty={!!event.has_after_party}
        savedVenues={event.venue_selections || []}
        onVenueChange={refetch}
      />
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
          <p className="text-[10px] text-muted-foreground mt-1">
            ※食べログは公式APIが限定的なため、外部リンクでの検索となります
          </p>
        </CardContent>
      </Card>

      {/* 当日出欠・精算 */}
      <ParticipantList
        participants={event.participants}
        eventPaypayId={event.paypay_id}
        onToggleStatus={handleToggleStatus}
        onTogglePaid={handleTogglePaid}
        onDelete={handleDeleteParticipant}
      />

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
