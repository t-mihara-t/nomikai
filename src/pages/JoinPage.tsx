import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEventDetail } from '@/hooks/useEventData';
import { api } from '@/lib/api';
import type { Restaurant, Participant, ParticipantResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { QRCodeSVG } from 'qrcode.react';

type ResponseStatus = 'attending' | 'absent' | 'pending';

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
        {shop.open && <p>営業: {shop.open}</p>}
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

/**
 * Extract lat/lng from various Google Maps URL formats.
 */
function extractCoordsFromUrl(url: string): { lat: number; lng: number } | null {
  // Format: /@35.6812362,139.7671248
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  // Format: ?q=35.6812362,139.7671248 or &query=35.6812362,139.7671248
  const qMatch = url.match(/[?&](?:q|query)=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  // Format: /place/35.6812362,139.7671248
  const placeMatch = url.match(/\/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (placeMatch) return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };
  return null;
}

function VenueLinkCard({ label, url, venueType }: { label: string; url: string; venueType: string }) {
  const coords = extractCoordsFromUrl(url);
  const embedUrl = coords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.005},${coords.lat - 0.003},${coords.lng + 0.005},${coords.lat + 0.003}&layer=mapnik&marker=${coords.lat},${coords.lng}`
    : null;

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs shrink-0">
          {venueType === 'primary' ? '一次会' : '二次会'}
        </Badge>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-primary hover:underline break-all"
      >
        Google Mapで開く
      </a>
      {embedUrl && (
        <iframe src={embedUrl} className="w-full h-40 rounded-md border border-border" title={`${label}の地図`} />
      )}
    </div>
  );
}

function StatusButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <Button type="button" variant={active ? 'default' : 'outline'} size="sm" className="text-xs flex-1" onClick={onClick}>
      {label}
    </Button>
  );
}

export function JoinPage() {
  const { id } = useParams<{ id: string }>();
  const eventId = id ? parseInt(id, 10) : null;
  const { event, loading, error, refetch } = useEventDetail(eventId);

  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [selfName, setSelfName] = useState('');
  const [isDrinker, setIsDrinker] = useState(true);
  const [isSelfMode, setIsSelfMode] = useState(false);

  const [responses, setResponses] = useState<Record<number, ResponseStatus>>({});
  const [afterPartyResponses, setAfterPartyResponses] = useState<Record<number, ResponseStatus>>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  const venueSelections = event.venue_selections || [];
  const primaryVenues = venueSelections.filter((v) => v.venue_type === 'primary');
  const afterPartyVenues = venueSelections.filter((v) => v.venue_type === 'after_party');
  const candidateDates = event.candidate_dates || [];
  const allResponses = event.participant_responses || [];

  const handleSelectParticipant = (p: Participant) => {
    setSelectedParticipant(p);
    setIsDrinker(p.is_drinker);
    setIsSelfMode(false);
    setFormError(null);
    const existing: Record<number, ResponseStatus> = {};
    const existingAP: Record<number, ResponseStatus> = {};
    allResponses
      .filter((r) => r.participant_id === p.id)
      .forEach((r) => {
        existing[r.candidate_date_id] = r.status;
        if (r.after_party_status) existingAP[r.candidate_date_id] = r.after_party_status;
      });
    setResponses(existing);
    setAfterPartyResponses(existingAP);
  };

  const handleStartSelfAdd = () => {
    setIsSelfMode(true);
    setSelectedParticipant(null);
    setSelfName('');
    setIsDrinker(true);
    setResponses({});
    setAfterPartyResponses({});
    setFormError(null);
  };

  const handleSubmitResponses = async () => {
    if (candidateDates.length > 0 && Object.keys(responses).length === 0) {
      setFormError('少なくとも1つの日時に回答してください');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      let participant = selectedParticipant;

      // If in self-add mode, create participant first
      if (isSelfMode && !participant) {
        if (!selfName.trim()) { setFormError('名前を入力してください'); setSubmitting(false); return; }
        const p = await api.addParticipant(event.id, { name: selfName.trim(), is_drinker: isDrinker });
        participant = p;
      }

      if (!participant) { setSubmitting(false); return; }

      const responseArray = candidateDates
        .filter((cd) => responses[cd.id])
        .map((cd) => ({
          candidate_date_id: cd.id,
          status: responses[cd.id],
          after_party_status: afterPartyResponses[cd.id] || undefined,
        }));
      await api.submitResponses(event.id, {
        participant_id: participant.id,
        responses: responseArray,
      });
      if (!isSelfMode && participant.is_drinker !== isDrinker) {
        await api.updateParticipant(participant.id, { is_drinker: isDrinker });
      }
      setSubmitted(true);
      await refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '回答の送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedParticipant(null);
    setSelfName('');
    setIsDrinker(true);
    setIsSelfMode(false);
    setResponses({});
    setAfterPartyResponses({});
    setSubmitted(false);
    setFormError(null);
  };

  const getParticipantResponse = (participantId: number, dateId: number): ParticipantResponse | undefined => {
    return allResponses.find((r) => r.participant_id === participantId && r.candidate_date_id === dateId);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{event.name}</h1>
        <p className="mt-1 text-muted-foreground">{event.date}</p>
        {event.has_after_party && <Badge variant="secondary" className="mt-2">二次会あり</Badge>}
      </div>

      {/* 出欠確認セクション（メイン） */}
      <Card className="border-2 border-primary">
        <CardHeader className="bg-primary/5 pb-3">
          <CardTitle className="text-xl text-center">出欠確認</CardTitle>
          {!submitted && !selectedParticipant && !isSelfMode && (
            <p className="text-sm text-muted-foreground text-center mt-1">あなたの名前を選んでください</p>
          )}
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {submitted ? (
            <div className="text-center space-y-4 py-2">
              <p className="text-lg font-semibold">回答を送信しました！</p>
              <p className="text-sm text-muted-foreground">ありがとうございます。</p>
              <Button variant="outline" onClick={handleReset}>別の人の回答をする</Button>
            </div>
          ) : !selectedParticipant && !isSelfMode ? (
            <div className="space-y-4">
              {event.participants.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">事前登録リストから選択:</p>
                  <div className="flex flex-wrap gap-2">
                    {event.participants.map((p) => (
                      <Button key={p.id} variant="outline" size="sm" onClick={() => handleSelectParticipant(p)}>
                        {p.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <div className="border-t border-border pt-4">
                <Button variant="outline" className="w-full" onClick={handleStartSelfAdd}>
                  リストにない場合はこちら（名前を追加）
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-base font-medium">
                  {isSelfMode ? '新規参加者の回答' : `${selectedParticipant!.name}さんの回答`}
                </p>
                <Button variant="outline" size="sm" onClick={handleReset}>名前を変更</Button>
              </div>

              {isSelfMode && (
                <div className="space-y-2">
                  <Label>名前</Label>
                  <Input placeholder="例: 田中太郎" value={selfName} onChange={(e) => setSelfName(e.target.value)} />
                </div>
              )}

              <div className="space-y-2">
                <Label>飲酒</Label>
                <div className="flex gap-2">
                  <Button type="button" variant={isDrinker ? 'default' : 'outline'} size="sm" onClick={() => setIsDrinker(true)}>飲む</Button>
                  <Button type="button" variant={!isDrinker ? 'default' : 'outline'} size="sm" onClick={() => setIsDrinker(false)}>飲まない</Button>
                </div>
              </div>

              {candidateDates.length > 0 ? (
                <div className="space-y-4">
                  <Label>候補日時ごとの参加可否</Label>
                  {candidateDates.map((cd) => (
                    <div key={cd.id} className="rounded-lg border border-border p-3 space-y-2">
                      <p className="text-sm font-medium">{formatDateTime(cd.date_time)}</p>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">一次会:</p>
                        <div className="flex gap-1">
                          <StatusButton label="参加" active={responses[cd.id] === 'attending'} onClick={() => setResponses((prev) => ({ ...prev, [cd.id]: 'attending' }))} />
                          <StatusButton label="保留" active={responses[cd.id] === 'pending'} onClick={() => setResponses((prev) => ({ ...prev, [cd.id]: 'pending' }))} />
                          <StatusButton label="不参加" active={responses[cd.id] === 'absent'} onClick={() => setResponses((prev) => ({ ...prev, [cd.id]: 'absent' }))} />
                        </div>
                        {!responses[cd.id] && <p className="text-xs text-amber-600">未回答</p>}
                      </div>
                      {event.has_after_party && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">二次会:</p>
                          <div className="flex gap-1">
                            <StatusButton label="参加" active={afterPartyResponses[cd.id] === 'attending'} onClick={() => setAfterPartyResponses((prev) => ({ ...prev, [cd.id]: 'attending' }))} />
                            <StatusButton label="保留" active={afterPartyResponses[cd.id] === 'pending'} onClick={() => setAfterPartyResponses((prev) => ({ ...prev, [cd.id]: 'pending' }))} />
                            <StatusButton label="不参加" active={afterPartyResponses[cd.id] === 'absent'} onClick={() => setAfterPartyResponses((prev) => ({ ...prev, [cd.id]: 'absent' }))} />
                          </div>
                          {!afterPartyResponses[cd.id] && <p className="text-xs text-amber-600">未回答</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">候補日時がまだ設定されていません</p>
              )}

              {formError && <p className="text-sm text-destructive">{formError}</p>}
              <Button onClick={handleSubmitResponses} disabled={submitting} className="w-full">
                {submitting ? '送信中...' : isSelfMode ? '追加して回答を送信' : '回答を送信'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* このページのQRコード + 遅刻者ページリンク */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-center bg-white p-4 rounded-lg">
            <QRCodeSVG value={window.location.href} size={180} />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            このページのQRコード（会場の地図確認にも使えます）
          </p>
          <a href={`/events/${event.id}/arrive`} className="block">
            <Button
              className="w-full min-h-[48px] text-base font-bold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
            >
              遅れそうな方はこちら（到着連絡・注文）
            </Button>
          </a>
        </CardContent>
      </Card>

      {primaryVenues.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">一次会候補</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {primaryVenues.map((v, i) => (
              <VenueCard key={v.id} shop={v.restaurant} label={primaryVenues.length > 1 ? `候補 ${i + 1}` : undefined} />
            ))}
          </CardContent>
        </Card>
      )}
      {afterPartyVenues.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">二次会候補</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {afterPartyVenues.map((v) => (<VenueCard key={v.id} shop={v.restaurant} />))}
          </CardContent>
        </Card>
      )}

      {/* カスタム場所リンク（地図埋め込み付き） */}
      {(event.custom_venue_links || []).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">会場の地図</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(event.custom_venue_links || []).map((link) => (
              <VenueLinkCard
                key={link.id}
                label={link.label}
                url={link.url}
                venueType={link.venue_type}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {event.paypay_id && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">幹事のPayPay ID:</p>
            <p className="font-mono font-semibold">{event.paypay_id}</p>
          </CardContent>
        </Card>
      )}

      {/* Response overview */}
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
                      <Badge variant="default">{attending}</Badge>
                      <Badge variant="warning">{pendingCount}</Badge>
                      <Badge variant="secondary">{absent}</Badge>
                      {unanswered > 0 && <Badge variant="outline">{unanswered}未</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {event.participants.map((p) => {
                      const resp = getParticipantResponse(p.id, cd.id);
                      const variant = resp
                        ? resp.status === 'attending' ? 'default' : resp.status === 'pending' ? 'warning' : 'secondary'
                        : 'outline';
                      const statusText = resp
                        ? resp.status === 'attending' ? '参加' : resp.status === 'pending' ? '保留' : '不参加'
                        : '未回答';
                      return (
                        <Badge key={p.id} variant={variant} className="text-xs">{p.name}: {statusText}</Badge>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
