import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEventDetail, useCalculate } from '@/hooks/useEventData';
import { api } from '@/lib/api';
import { ParticipantForm } from '@/components/ParticipantForm';
import { ParticipantList } from '@/components/ParticipantList';
import { AdminPanel } from '@/components/AdminPanel';
import { Button } from '@/components/ui/button';

export function EventPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const eventId = id ? parseInt(id, 10) : null;
  const { event, loading, error, refetch } = useEventDetail(eventId);
  const { calculate, loading: calcLoading } = useCalculate();
  const [addingParticipant, setAddingParticipant] = useState(false);

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

  const handleAddParticipant = async (data: {
    name: string;
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
    currentStatus: 'attending' | 'absent'
  ) => {
    await api.updateParticipant(participantId, {
      status: currentStatus === 'attending' ? 'absent' : 'attending',
    });
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

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/')}>
          ← 戻る
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <p className="text-sm text-muted-foreground">{event.date}</p>
        </div>
      </div>

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
