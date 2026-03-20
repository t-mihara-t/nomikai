import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useEventDetail } from '@/hooks/useEventData';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Participant } from '@/types';

function extractCoordsFromUrl(url: string): { lat: number; lng: number } | null {
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  const qMatch = url.match(/[?&](?:q|query)=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  const placeMatch = url.match(/\/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (placeMatch) return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };
  return null;
}

/**
 * Anonymous participant view page.
 * Each participant sees ONLY their own payment status and system instructions.
 * No other participant information is visible (1:1 communication structure).
 */
export function ParticipantViewPage() {
  const { id } = useParams<{ id: string }>();
  const eventId = id ? parseInt(id, 10) : null;
  const { event, loading, error } = useEventDetail(eventId);
  const [selectedParticipantId, setSelectedParticipantId] = useState<number | null>(null);

  // Try to auto-identify participant by LINE user ID or stored selection
  useEffect(() => {
    if (!event) return;
    const stored = sessionStorage.getItem(`participant_${eventId}`);
    if (stored) {
      setSelectedParticipantId(parseInt(stored, 10));
    }
  }, [event, eventId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-md p-4">
        <p className="text-destructive">{error || 'イベントが見つかりません'}</p>
      </div>
    );
  }

  const participant = selectedParticipantId
    ? event.participants.find((p) => p.id === selectedParticipantId) || null
    : null;

  const handleSelectParticipant = (p: Participant) => {
    setSelectedParticipantId(p.id);
    sessionStorage.setItem(`participant_${eventId}`, String(p.id));
  };

  // Name selection screen
  if (!participant) {
    return (
      <div className="mx-auto max-w-md space-y-6 p-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <p className="text-sm text-muted-foreground">{event.date}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">お名前を選択してください</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {event.participants.map((p) => (
              <Button
                key={p.id}
                variant="outline"
                className="w-full justify-start min-h-[48px]"
                onClick={() => handleSelectParticipant(p)}
              >
                {p.name}
                {p.status === 'attending' && <Badge variant="default" className="ml-auto text-xs">参加</Badge>}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Anonymous participant view - only own info visible
  const hasPayment = participant.amount_to_pay != null && participant.amount_to_pay > 0;
  const isGuest = participant.discount_rate >= 1.0;

  return (
    <div className="mx-auto max-w-md space-y-6 p-4">
      {/* Header - minimal, anonymous */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">{event.name}</h1>
        <p className="text-sm text-muted-foreground">{event.date}</p>
        <Badge variant="secondary">{participant.name}さん</Badge>
        {event.has_after_party && <Badge variant="outline">二次会あり</Badge>}
      </div>

      {/* System status card */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle className="text-lg">システムからのお知らせ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Attendance status */}
          <div className="rounded-lg bg-muted p-3 space-y-2">
            <div>
              <p className="text-sm font-medium">一次会</p>
              <p className="text-lg font-bold mt-1">
                {participant.status === 'attending' ? '参加' : participant.status === 'absent' ? '不参加' : '保留'}
              </p>
            </div>
            {event.has_after_party && (
              <div className="border-t border-border pt-2">
                <p className="text-sm font-medium">二次会</p>
                <p className="text-lg font-bold mt-1">
                  {participant.join_after_party ? '参加' : '不参加'}
                </p>
              </div>
            )}
          </div>

          {/* Payment info - only shown to this participant */}
          {hasPayment && !isGuest && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-2">
              <p className="text-sm font-medium text-primary">お支払い金額</p>
              <p className="text-3xl font-bold text-primary">
                {participant.amount_to_pay!.toLocaleString()}円
              </p>
              <p className="text-xs text-muted-foreground">
                システム規定により、端数（100円未満）を次回の還元基金として積み立て処理しました。
              </p>
              {participant.paid_status ? (
                <Badge variant="default" className="text-sm">支払い済み</Badge>
              ) : (
                <Badge variant="warning" className="text-sm">未払い</Badge>
              )}
            </div>
          )}

          {isGuest && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <p className="text-sm font-medium text-green-700">招待（無料）</p>
              <p className="text-xs text-muted-foreground mt-1">
                お支払いは不要です。
              </p>
            </div>
          )}

          {/* PayPay link if available */}
          {hasPayment && !participant.paid_status && !isGuest && event.paypay_id && (
            <a
              href={`https://paypay.me/${event.paypay_id}/${participant.amount_to_pay}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button className="w-full min-h-[48px] bg-red-500 hover:bg-red-600 text-white font-bold">
                PayPayで支払う ({participant.amount_to_pay!.toLocaleString()}円)
              </Button>
            </a>
          )}
        </CardContent>
      </Card>

      {/* Venue info (limited - only location, no other participants) */}
      {event.venue_selections && event.venue_selections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">会場情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {event.venue_selections
              .filter((v) => v.venue_type === 'primary')
              .map((v) => (
                <div key={v.id} className="space-y-1">
                  <Badge variant="secondary" className="text-xs">一次会</Badge>
                  <p className="font-medium text-sm">{v.restaurant.name}</p>
                  <p className="text-xs text-muted-foreground">{v.restaurant.address}</p>
                  {v.restaurant.lat && v.restaurant.lng && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${v.restaurant.lat},${v.restaurant.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      Google Mapで開く
                    </a>
                  )}
                </div>
              ))}
            {event.has_after_party && event.venue_selections
              .filter((v) => v.venue_type === 'after_party')
              .map((v) => (
                <div key={v.id} className="space-y-1">
                  <Badge variant="secondary" className="text-xs">二次会</Badge>
                  <p className="font-medium text-sm">{v.restaurant.name}</p>
                  <p className="text-xs text-muted-foreground">{v.restaurant.address}</p>
                  {v.restaurant.lat && v.restaurant.lng && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${v.restaurant.lat},${v.restaurant.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      Google Mapで開く
                    </a>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Custom venue links with embedded maps */}
      {event.custom_venue_links && event.custom_venue_links.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">会場の地図</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {event.custom_venue_links
              .filter((l) => l.venue_type === 'primary' || (event.has_after_party && l.venue_type === 'after_party'))
              .map((link) => {
                const coords = extractCoordsFromUrl(link.url);
                const embedUrl = coords
                  ? `https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.005},${coords.lat - 0.003},${coords.lng + 0.005},${coords.lat + 0.003}&layer=mapnik&marker=${coords.lat},${coords.lng}`
                  : null;
                return (
                  <div key={link.id} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {link.venue_type === 'primary' ? '一次会' : '二次会'}
                      </Badge>
                      <span className="text-sm font-medium">{link.label}</span>
                    </div>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      Google Mapで開く
                    </a>
                    {embedUrl && (
                      <iframe src={embedUrl} className="w-full h-40 rounded-md border border-border" title={`${link.label}の地図`} />
                    )}
                  </div>
                );
              })}
          </CardContent>
        </Card>
      )}

      {/* Footer note */}
      <div className="text-center text-xs text-muted-foreground space-y-1">
        <p>この画面はあなた専用です。他の参加者の情報は表示されません。</p>
        <p>お支払い金額はシステムにより自動計算されています。</p>
      </div>
    </div>
  );
}
