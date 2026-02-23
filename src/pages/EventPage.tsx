import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEventDetail, useCalculate } from '@/hooks/useEventData';
import { api } from '@/lib/api';
import { ParticipantForm } from '@/components/ParticipantForm';
import { ParticipantList } from '@/components/ParticipantList';
import { AdminPanel } from '@/components/AdminPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

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
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newDateTime, setNewDateTime] = useState('');
  const [addingDate, setAddingDate] = useState(false);

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
        <Button variant="outline" onClick={() => navigate('/')}>
          トップに戻る
        </Button>
      </div>
    );
  }

  const participantUrl = `${window.location.origin}/join/${event.id}`;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(participantUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddParticipant = async (data: {
    name: string;
    status?: 'attending' | 'absent' | 'pending';
    is_drinker: boolean;
    paypay_id?: string;
  }) => {
    setAddingParticipant(true);
    try {
      await api.addParticipant(event.id, data);
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
    await api.updateParticipant(participantId, {
      paid_status: !currentPaid,
    });
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
    if (result) {
      await refetch();
    }
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

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/')}>
          ← 戻る
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <p className="text-sm text-muted-foreground">{event.date}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {event.has_after_party && (
              <Badge variant="secondary">二次会あり</Badge>
            )}
          </div>
        </div>
      </div>

      {/* 参加者共有リンク */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">参加者向けリンク</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            参加者にこのリンクを共有して出欠を登録してもらいましょう
          </p>
          <div className="flex gap-2">
            <Input value={participantUrl} readOnly className="flex-1" />
            <Button onClick={handleCopyLink} variant="outline">
              {copied ? 'コピー済み' : 'コピー'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 候補日時管理 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">候補日時</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {event.candidate_dates && event.candidate_dates.length > 0 ? (
            <div className="space-y-2">
              {event.candidate_dates.map((cd) => (
                <div key={cd.id} className="flex items-center justify-between rounded-lg border border-border p-2">
                  <span className="text-sm">{formatDateTime(cd.date_time)}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteCandidateDate(cd.id)}
                  >
                    削除
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">候補日時はまだありません</p>
          )}
          <div className="flex gap-2">
            <Input
              type="datetime-local"
              value={newDateTime}
              onChange={(e) => setNewDateTime(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleAddCandidateDate}
              disabled={!newDateTime || addingDate}
              size="sm"
            >
              追加
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 二次会トグル */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <span className="font-medium">二次会</span>
          <Button
            variant={event.has_after_party ? 'default' : 'outline'}
            size="sm"
            onClick={handleToggleAfterParty}
          >
            {event.has_after_party ? 'あり' : 'なし'}
          </Button>
        </CardContent>
      </Card>

      <ParticipantForm onSubmit={handleAddParticipant} loading={addingParticipant} />

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
    </div>
  );
}
