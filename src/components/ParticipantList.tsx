import type { Participant } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PayPayLink } from './PayPayLink';

interface ParticipantListProps {
  participants: Participant[];
  eventPaypayId?: string | null;
  onToggleStatus: (id: number, currentStatus: 'attending' | 'absent') => void;
  onTogglePaid: (id: number, currentPaid: boolean) => void;
  onDelete: (id: number) => void;
}

export function ParticipantList({
  participants,
  eventPaypayId,
  onToggleStatus,
  onTogglePaid,
  onDelete,
}: ParticipantListProps) {
  const attending = participants.filter((p) => p.status === 'attending');
  const absent = participants.filter((p) => p.status === 'absent');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          参加者一覧 ({attending.length}名参加 / {absent.length}名欠席)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {participants.length === 0 ? (
          <p className="text-muted-foreground text-sm">まだ参加者がいません</p>
        ) : (
          <div className="space-y-3">
            {participants.map((p) => (
              <div
                key={p.id}
                className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{p.name}</span>
                  <Badge variant={p.status === 'attending' ? 'default' : 'secondary'}>
                    {p.status === 'attending' ? '参加' : '欠席'}
                  </Badge>
                  {p.status === 'attending' && (
                    <Badge variant={p.is_drinker ? 'warning' : 'outline'}>
                      {p.is_drinker ? '飲む' : '飲まない'}
                    </Badge>
                  )}
                  {p.amount_to_pay != null && p.status === 'attending' && (
                    <Badge variant="outline">{p.amount_to_pay.toLocaleString()}円</Badge>
                  )}
                  {p.paid_status && (
                    <Badge variant="success">支払済</Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {p.status === 'attending' &&
                    p.amount_to_pay != null &&
                    !p.paid_status &&
                    eventPaypayId && (
                      <PayPayLink paypayId={eventPaypayId} amount={p.amount_to_pay} />
                    )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onToggleStatus(p.id, p.status)}
                  >
                    {p.status === 'attending' ? '欠席にする' : '参加にする'}
                  </Button>
                  {p.status === 'attending' && p.amount_to_pay != null && (
                    <Button
                      variant={p.paid_status ? 'secondary' : 'default'}
                      size="sm"
                      onClick={() => onTogglePaid(p.id, p.paid_status)}
                    >
                      {p.paid_status ? '未払いに戻す' : '支払い完了'}
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(p.id)}
                  >
                    削除
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
