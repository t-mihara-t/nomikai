import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEventDetail } from '@/hooks/useEventData';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DrinkOrderForm } from '@/components/DrinkOrderPanel';
import type { Restaurant } from '@/types';

const ETA_OPTIONS = [
  { label: '5分', value: 5 },
  { label: '10分', value: 10 },
  { label: '15分', value: 15 },
  { label: '20分', value: 20 },
  { label: '30分', value: 30 },
];

function VenueCard({ shop }: { shop: Restaurant }) {
  const mapUrl = shop.lat && shop.lng
    ? `https://www.google.com/maps/search/?api=1&query=${shop.lat},${shop.lng}`
    : null;

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex gap-3">
        {shop.photo_url && (
          <img src={shop.photo_url} alt={shop.name} className="h-16 w-16 rounded-md object-cover flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold">{shop.name}</h4>
          <p className="text-sm text-muted-foreground mt-1">{shop.address}</p>
        </div>
      </div>
      {mapUrl && (
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full min-h-[48px] bg-primary text-primary-foreground rounded-lg font-bold text-center leading-[48px]"
        >
          Google Map で開く
        </a>
      )}
    </div>
  );
}

export function ArrivePage() {
  const { id } = useParams<{ id: string }>();
  const eventId = id ? parseInt(id, 10) : null;
  const { event, loading, error } = useEventDetail(eventId);

  const [step, setStep] = useState<'select' | 'announce' | 'done'>('select');
  const [selectedParticipantId, setSelectedParticipantId] = useState<number | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(10);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [arrivalId, setArrivalId] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground text-lg">読み込み中...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-lg p-4 text-center">
        <p className="text-destructive text-lg">{error || 'イベントが見つかりません'}</p>
      </div>
    );
  }

  const primaryVenues = (event.venue_selections || []).filter((v) => v.venue_type === 'primary');

  const handleAnnounce = async () => {
    if (!selectedParticipantId) return;
    setSubmitting(true);
    try {
      const arrival = await api.announceArrival(event.id, {
        participant_id: selectedParticipantId,
        eta_minutes: etaMinutes ?? undefined,
        message: message.trim() || undefined,
      });
      setArrivalId(arrival.id);
      setStep('done');
    } catch (err) {
      alert(err instanceof Error ? err.message : '送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkArrived = async () => {
    if (!arrivalId) return;
    try {
      await api.updateArrival(arrivalId, { status: 'arrived' });
      // Also update participant status to attending
      if (selectedParticipantId) {
        await api.updateParticipant(selectedParticipantId, { status: 'attending' });
      }
    } catch {
      // Ignore errors
    }
  };

  const handleDrinkOrder = async (drinkName: string, quantity: number, note?: string) => {
    if (!selectedParticipantId) return;
    await api.createDrinkOrder(event.id, {
      participant_id: selectedParticipantId,
      drink_name: drinkName,
      quantity,
      note,
    });
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 p-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <Badge variant="warning" className="text-sm px-4 py-1">遅れて参加</Badge>
        <h1 className="text-2xl font-bold">{event.name}</h1>
        <p className="text-muted-foreground">{event.date}</p>
      </div>

      {/* Venue info */}
      {primaryVenues.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">会場</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {primaryVenues.map((v) => (
              <VenueCard key={v.id} shop={v.restaurant} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Step 1: Select who you are */}
      {step === 'select' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">あなたは誰ですか？</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {event.participants.map((p) => (
                <Button
                  key={p.id}
                  variant={selectedParticipantId === p.id ? 'default' : 'outline'}
                  className="min-h-[56px] text-base font-semibold"
                  onClick={() => setSelectedParticipantId(p.id)}
                >
                  {p.name}
                </Button>
              ))}
            </div>

            {selectedParticipantId && (
              <>
                <div className="space-y-2">
                  <p className="text-sm font-medium">到着予定は？</p>
                  <div className="flex flex-wrap gap-2">
                    {ETA_OPTIONS.map((opt) => (
                      <Button
                        key={opt.value}
                        variant={etaMinutes === opt.value ? 'default' : 'outline'}
                        className="min-h-[48px] min-w-[64px] text-base font-bold"
                        onClick={() => setEtaMinutes(opt.value)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">ひとこと（任意）</p>
                  <Input
                    placeholder="例: 電車遅延で遅れます！"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[48px] text-base"
                  />
                </div>

                <Button
                  className="w-full min-h-[56px] text-lg font-bold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                  onClick={handleAnnounce}
                  disabled={submitting}
                >
                  {submitting ? '送信中...' : '到着を予告する（Heroic Entry）'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Done - show drink order + arrived button */}
      {step === 'done' && selectedParticipantId && (
        <>
          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <div className="text-4xl">🎉</div>
              <p className="text-xl font-bold">到着予告を送信しました！</p>
              <p className="text-muted-foreground">
                幹事のスマホに通知が表示されます
              </p>
              <Button
                className="w-full min-h-[56px] text-lg font-bold bg-green-600 hover:bg-green-700 text-white"
                onClick={handleMarkArrived}
              >
                到着した！
              </Button>
            </CardContent>
          </Card>

          {/* Drink pre-order */}
          <DrinkOrderForm
            participantId={selectedParticipantId}
            onOrder={handleDrinkOrder}
          />
        </>
      )}
    </div>
  );
}
