import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEventDetail } from '@/hooks/useEventData';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
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
  const [copied, setCopied] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newHour, setNewHour] = useState('19');
  const [newMinute, setNewMinute] = useState('00');
  const [addingDate, setAddingDate] = useState(false);

  // Pre-registration
  const [newParticipantName, setNewParticipantName] = useState('');
  const [addingParticipant, setAddingParticipant] = useState(false);

  // PayPay ID
  const [editPaypay, setEditPaypay] = useState(false);
  const [paypayId, setPaypayId] = useState('');

  // Event name edit
  const [editName, setEditName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');

  // Custom venue links
  const [venueLabel, setVenueLabel] = useState('');
  const [venueUrl, setVenueUrl] = useState('');
  const [venueType, setVenueType] = useState<'primary' | 'after_party'>('primary');
  const [addingVenueLink, setAddingVenueLink] = useState(false);

  // LINE integration
  const [linkingLine, setLinkingLine] = useState(false);
  const [unlinkingLine, setUnlinkingLine] = useState(false);

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
  const customVenueLinks = event.custom_venue_links || [];

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

  const handleDeleteParticipant = async (participantId: number) => {
    if (!confirm('この参加者を削除しますか？')) return;
    await api.deleteParticipant(participantId);
    await refetch();
  };

  const handleToggleAfterParty = async () => {
    await api.updateEvent(event.id, { has_after_party: !event.has_after_party });
    await refetch();
  };

  const handleAddCandidateDate = async () => {
    if (!newDate) return;
    const dateTime = `${newDate}T${newHour.padStart(2, '0')}:${newMinute}`;
    setAddingDate(true);
    try {
      await api.addCandidateDate(event.id, dateTime);
      setNewDate('');
      await refetch();
    } finally {
      setAddingDate(false);
    }
  };

  const handleSaveName = async () => {
    if (!editNameValue.trim()) return;
    await api.updateEvent(event.id, { name: editNameValue.trim() });
    setEditName(false);
    await refetch();
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

  const handleLinkLine = async () => {
    setLinkingLine(true);
    try {
      const { auth_url } = await api.getLineAuthUrl(event.id);
      window.location.href = auth_url;
    } catch (err) {
      alert(err instanceof Error ? err.message : 'LINE連携の開始に失敗しました');
      setLinkingLine(false);
    }
  };

  const handleUnlinkLine = async () => {
    if (!confirm('LINE連携を解除しますか？')) return;
    setUnlinkingLine(true);
    try {
      await api.unlinkLine(event.id);
      await refetch();
    } finally {
      setUnlinkingLine(false);
    }
  };

  const handleAddVenueLink = async () => {
    if (!venueLabel.trim() || !venueUrl.trim()) return;
    setAddingVenueLink(true);
    try {
      await api.addCustomVenueLink(event.id, {
        venue_type: venueType,
        label: venueLabel.trim(),
        url: venueUrl.trim(),
      });
      setVenueLabel('');
      setVenueUrl('');
      await refetch();
    } finally {
      setAddingVenueLink(false);
    }
  };

  const handleDeleteVenueLink = async (linkId: number) => {
    if (!confirm('このリンクを削除しますか？')) return;
    await api.deleteCustomVenueLink(linkId);
    await refetch();
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
        <div className="flex-1 min-w-0">
          {editName ? (
            <div className="flex gap-2 items-center">
              <Input
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSaveName(); } }}
                className="text-lg font-bold"
                autoFocus
              />
              <Button size="sm" onClick={handleSaveName}>保存</Button>
              <Button size="sm" variant="outline" onClick={() => setEditName(false)}>取消</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{event.name}</h1>
              <button
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => { setEditNameValue(event.name); setEditName(true); }}
              >
                編集
              </button>
            </div>
          )}
          <p className="text-sm text-muted-foreground">{event.date}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {event.has_after_party && <Badge variant="secondary">二次会あり</Badge>}
          </div>
        </div>
      </div>

      {/* 参加者共有リンク */}
      <Card>
        <CardHeader><CardTitle className="text-lg">参加者向けリンク</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">参加者にこのリンクを共有して出欠を登録してもらいましょう</p>
          <div className="flex gap-2">
            <Input value={participantUrl} readOnly className="flex-1" />
            <Button onClick={handleCopyLink} variant="outline">{copied ? 'コピー済み' : 'コピー'}</Button>
          </div>
          <a
            href={participantUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-sm text-primary hover:underline"
          >
            参加者ページを開く →
          </a>
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

      {/* LINE通知連携 */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">LINE通知</p>
              <p className="text-xs text-muted-foreground">
                {event.line_user_id
                  ? '連携済み - 遅刻者の到着連絡がLINEに届きます'
                  : '連携すると遅刻者の到着時にLINEで通知されます'}
              </p>
            </div>
            {event.line_user_id ? (
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs">連携済</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnlinkLine}
                  disabled={unlinkingLine}
                >
                  解除
                </Button>
              </div>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={handleLinkLine}
                disabled={linkingLine}
                className="bg-[#06C755] hover:bg-[#05b34d] text-white"
              >
                {linkingLine ? '接続中...' : 'LINE連携'}
              </Button>
            )}
          </div>
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
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">日付</label>
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            </div>
            <div className="w-20">
              <label className="text-xs text-muted-foreground">時</label>
              <Select
                value={newHour}
                onChange={(e) => setNewHour(e.target.value)}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={String(i)}>{String(i).padStart(2, '0')}</option>
                ))}
              </Select>
            </div>
            <span className="pb-3 text-sm font-medium">:</span>
            <div className="w-20">
              <label className="text-xs text-muted-foreground">分</label>
              <Select
                value={newMinute}
                onChange={(e) => setNewMinute(e.target.value)}
              >
                <option value="00">00</option>
                <option value="30">30</option>
              </Select>
            </div>
            <Button onClick={handleAddCandidateDate} disabled={!newDate || addingDate} size="sm">追加</Button>
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

      {/* カスタム場所リンク */}
      <Card>
        <CardHeader><CardTitle className="text-lg">場所リンク（GoogleマップURL等）</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            GoogleマップのURLなど、お店の場所を直接リンクで登録できます
          </p>
          {customVenueLinks.length > 0 && (
            <div className="space-y-2">
              {customVenueLinks.map((link) => (
                <div key={link.id} className="flex items-center justify-between rounded-lg border border-border p-2 gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {link.venue_type === 'primary' ? '一次会' : '二次会'}
                      </Badge>
                      <span className="text-sm font-medium truncate">{link.label}</span>
                    </div>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline break-all"
                    >
                      {link.url}
                    </a>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleDeleteVenueLink(link.id)}>削除</Button>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex gap-2">
              <Input
                placeholder="ラベル（例: 居酒屋〇〇）"
                value={venueLabel}
                onChange={(e) => setVenueLabel(e.target.value)}
                className="flex-1"
              />
              <Select
                value={venueType}
                onChange={(e) => setVenueType(e.target.value as 'primary' | 'after_party')}
                className="w-28"
              >
                <option value="primary">一次会</option>
                <option value="after_party">二次会</option>
              </Select>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="URL（GoogleマップのURLなど）"
                value={venueUrl}
                onChange={(e) => setVenueUrl(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleAddVenueLink}
                disabled={!venueLabel.trim() || !venueUrl.trim() || addingVenueLink}
                size="sm"
              >
                追加
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 当日ページへのリンク */}
      <Card>
        <CardContent className="p-4">
          <Button
            className="w-full"
            onClick={() => navigate(`/events/${event.id}/day`)}
          >
            当日ページを開く（出欠確認・精算）
          </Button>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            当日の出欠確認、精算設定、精算テキスト生成はこちら
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
