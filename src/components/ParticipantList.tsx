import { useState } from 'react';
import type { Participant } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PayPayLink } from './PayPayLink';

interface ParticipantListProps {
  participants: Participant[];
  eventPaypayId?: string | null;
  showAfterPartyCheck?: boolean;
  onToggleStatus: (id: number, currentStatus: 'attending' | 'absent' | 'pending') => void;
  onTogglePaid: (id: number, currentPaid: boolean) => void;
  onDelete: (id: number) => void;
  onUpdateMultiplier?: (id: number, multiplier: number) => void;
  onUpdateDiscount?: (id: number, discountRate: number) => void;
  onToggleAfterParty?: (id: number, current: boolean) => void;
  onBulkUpdate?: (updates: { status?: 'attending' | 'absent' | 'pending'; is_drinker?: boolean }) => void;
}

const MULTIPLIER_PRESETS = [
  { label: '若手 0.8x', value: 0.8 },
  { label: '通常 1.0x', value: 1.0 },
  { label: '先輩 1.2x', value: 1.2 },
  { label: '上司 1.5x', value: 1.5 },
  { label: '部長 2.0x', value: 2.0 },
];

const DISCOUNT_PRESETS = [
  { label: 'なし', value: 0 },
  { label: '20%OFF', value: 0.2 },
  { label: '30%OFF', value: 0.3 },
  { label: '50%OFF', value: 0.5 },
];

function statusBadge(status: 'attending' | 'absent' | 'pending') {
  switch (status) {
    case 'attending': return <Badge variant="default">参加</Badge>;
    case 'absent': return <Badge variant="secondary">不参加</Badge>;
    case 'pending': return <Badge variant="warning">保留</Badge>;
  }
}

function nextStatusLabel(status: 'attending' | 'absent' | 'pending') {
  switch (status) {
    case 'attending': return '不参加にする';
    case 'absent': return '保留にする';
    case 'pending': return '参加にする';
  }
}

export function ParticipantList({
  participants,
  eventPaypayId,
  showAfterPartyCheck,
  onToggleStatus,
  onTogglePaid,
  onDelete,
  onUpdateMultiplier,
  onUpdateDiscount,
  onToggleAfterParty,
  onBulkUpdate,
}: ParticipantListProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const attending = participants.filter((p) => p.status === 'attending');
  const absent = participants.filter((p) => p.status === 'absent');
  const pending = participants.filter((p) => p.status === 'pending');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          参加者一覧
          <span className="block text-sm font-normal text-muted-foreground mt-1">
            {attending.length}名参加 / {pending.length}名保留 / {absent.length}名不参加
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Bulk actions */}
        {onBulkUpdate && participants.length > 0 && (
          <div className="flex flex-wrap gap-2 rounded-lg bg-muted p-2">
            <span className="text-xs text-muted-foreground self-center">一括操作:</span>
            <Button
              variant="outline" size="sm" className="text-xs h-7"
              onClick={() => onBulkUpdate({ status: 'attending' })}
            >全員参加</Button>
            <Button
              variant="outline" size="sm" className="text-xs h-7"
              onClick={() => onBulkUpdate({ is_drinker: true })}
            >全員「飲む」</Button>
            <Button
              variant="outline" size="sm" className="text-xs h-7"
              onClick={() => onBulkUpdate({ is_drinker: false })}
            >全員「飲まない」</Button>
          </div>
        )}

        {participants.length === 0 ? (
          <p className="text-muted-foreground text-sm">まだ参加者がいません</p>
        ) : (
          <div className="space-y-2">
            {participants.map((p) => {
              const isExpanded = expandedId === p.id;
              return (
                <div key={p.id} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{p.name}</span>
                      {statusBadge(p.status)}
                      {p.status === 'attending' && (
                        <Badge variant={p.is_drinker ? 'warning' : 'outline'}>
                          {p.is_drinker ? '飲む' : '飲まない'}
                        </Badge>
                      )}
                      {p.multiplier !== 1.0 && (
                        <Badge variant="outline" className="text-xs">{p.multiplier}倍</Badge>
                      )}
                      {p.discount_rate > 0 && p.discount_rate < 1.0 && (
                        <Badge variant="secondary" className="text-xs">{Math.round(p.discount_rate * 100)}%OFF</Badge>
                      )}
                      {p.discount_rate >= 1.0 && (
                        <Badge variant="secondary" className="text-xs">招待（無料）</Badge>
                      )}
                      {p.amount_to_pay != null && p.status === 'attending' && (
                        <Badge variant="outline">{p.amount_to_pay.toLocaleString()}円</Badge>
                      )}
                      {p.paid_status && <Badge variant="success">支払済</Badge>}
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {showAfterPartyCheck && onToggleAfterParty && (
                        <Button
                          variant={p.join_after_party ? 'default' : 'outline'}
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => onToggleAfterParty(p.id, p.join_after_party)}
                        >
                          {p.join_after_party ? '二次会○' : '二次会'}
                        </Button>
                      )}
                      {p.status === 'attending' && p.amount_to_pay != null && !p.paid_status && eventPaypayId && (
                        <PayPayLink paypayId={eventPaypayId} amount={p.amount_to_pay} />
                      )}
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => onToggleStatus(p.id, p.status)}>
                        {nextStatusLabel(p.status)}
                      </Button>
                      {p.status === 'attending' && p.amount_to_pay != null && (
                        <Button
                          variant={p.paid_status ? 'secondary' : 'default'}
                          size="sm" className="text-xs h-7"
                          onClick={() => onTogglePaid(p.id, p.paid_status)}
                        >
                          {p.paid_status ? '未払い' : '支払済'}
                        </Button>
                      )}
                      {(onUpdateMultiplier || onUpdateDiscount) && (
                        <Button
                          variant="outline" size="sm" className="text-xs h-7"
                          onClick={() => setExpandedId(isExpanded ? null : p.id)}
                        >
                          {isExpanded ? '閉じる' : '設定'}
                        </Button>
                      )}
                      <Button variant="destructive" size="sm" className="text-xs h-7" onClick={() => onDelete(p.id)}>
                        削除
                      </Button>
                    </div>
                  </div>

                  {/* Expanded settings */}
                  {isExpanded && (
                    <div className="rounded-lg bg-muted p-3 space-y-3">
                      {onUpdateDiscount && (
                        <div className="space-y-1">
                          <label className="text-xs font-medium">招待（無料）</label>
                          <div className="flex items-center gap-2">
                            <Button
                              variant={p.discount_rate >= 1.0 ? 'default' : 'outline'}
                              size="sm" className="text-xs h-7"
                              onClick={() => onUpdateDiscount(p.id, p.discount_rate >= 1.0 ? 0 : 1.0)}
                            >
                              {p.discount_rate >= 1.0 ? '招待中（無料）' : '招待にする'}
                            </Button>
                            <span className="text-xs text-muted-foreground">送別会・歓迎会の主賓など</span>
                          </div>
                        </div>
                      )}
                      {onUpdateMultiplier && (
                        <div className="space-y-1">
                          <label className="text-xs font-medium">役職倍率</label>
                          <div className="flex gap-1 flex-wrap">
                            {MULTIPLIER_PRESETS.map((preset) => (
                              <Button
                                key={preset.value}
                                variant={p.multiplier === preset.value ? 'default' : 'outline'}
                                size="sm" className="text-xs h-7"
                                onClick={() => onUpdateMultiplier(p.id, preset.value)}
                              >
                                {preset.label}
                              </Button>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">カスタム:</span>
                            <Input
                              type="number" step="0.1" min="0.1" max="5.0"
                              value={p.multiplier}
                              onChange={(e) => onUpdateMultiplier(p.id, parseFloat(e.target.value) || 1.0)}
                              className="w-20 h-7 text-xs"
                            />
                            <span className="text-xs">倍</span>
                          </div>
                        </div>
                      )}
                      {onUpdateDiscount && p.discount_rate < 1.0 && (
                        <div className="space-y-1">
                          <label className="text-xs font-medium">遅刻・早退割引</label>
                          <div className="flex gap-1 flex-wrap">
                            {DISCOUNT_PRESETS.map((preset) => (
                              <Button
                                key={preset.value}
                                variant={p.discount_rate === preset.value ? 'default' : 'outline'}
                                size="sm" className="text-xs h-7"
                                onClick={() => onUpdateDiscount(p.id, preset.value)}
                              >
                                {preset.label}
                              </Button>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">カスタム:</span>
                            <Input
                              type="number" step="5" min="0" max="100"
                              value={Math.round(p.discount_rate * 100)}
                              onChange={(e) => onUpdateDiscount(p.id, (parseInt(e.target.value) || 0) / 100)}
                              className="w-20 h-7 text-xs"
                            />
                            <span className="text-xs">%OFF</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
