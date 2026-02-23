import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface ParticipantFormProps {
  onSubmit: (data: {
    name: string;
    status?: 'attending' | 'absent' | 'pending';
    is_drinker: boolean;
    paypay_id?: string;
  }) => Promise<void>;
  loading?: boolean;
  showStatus?: boolean;
}

export function ParticipantForm({ onSubmit, loading, showStatus }: ParticipantFormProps) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'attending' | 'absent' | 'pending'>('attending');
  const [isDrinker, setIsDrinker] = useState(true);
  const [paypayId, setPaypayId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('名前を入力してください');
      return;
    }

    await onSubmit({
      name: name.trim(),
      status: showStatus ? status : undefined,
      is_drinker: isDrinker,
      paypay_id: paypayId.trim() || undefined,
    });

    setName('');
    setStatus('attending');
    setIsDrinker(true);
    setPaypayId('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">出欠を登録</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="participant-name">名前</Label>
            <Input
              id="participant-name"
              placeholder="例: 田中太郎"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {showStatus && (
            <div className="space-y-2">
              <Label>参加可否</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={status === 'attending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatus('attending')}
                >
                  参加
                </Button>
                <Button
                  type="button"
                  variant={status === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatus('pending')}
                >
                  保留
                </Button>
                <Button
                  type="button"
                  variant={status === 'absent' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatus('absent')}
                >
                  不参加
                </Button>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>飲酒</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={isDrinker ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsDrinker(true)}
              >
                飲む
              </Button>
              <Button
                type="button"
                variant={!isDrinker ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsDrinker(false)}
              >
                飲まない
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="participant-paypay">PayPay ID (任意)</Label>
            <Input
              id="participant-paypay"
              placeholder="例: your-paypay-id"
              value={paypayId}
              onChange={(e) => setPaypayId(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? '登録中...' : '参加登録'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
