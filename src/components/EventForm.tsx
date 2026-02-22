import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface EventFormProps {
  onSubmit: (data: { name: string; date: string; paypay_id?: string }) => Promise<void>;
  loading?: boolean;
}

export function EventForm({ onSubmit, loading }: EventFormProps) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [paypayId, setPaypayId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('イベント名を入力してください');
      return;
    }
    if (!date) {
      setError('日付を入力してください');
      return;
    }

    await onSubmit({
      name: name.trim(),
      date,
      paypay_id: paypayId.trim() || undefined,
    });

    setName('');
    setDate('');
    setPaypayId('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">新しい飲み会を作成</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event-name">イベント名</Label>
            <Input
              id="event-name"
              placeholder="例: 歓迎会"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-date">日付</Label>
            <Input
              id="event-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paypay-id">PayPay ID (幹事)</Label>
            <Input
              id="paypay-id"
              placeholder="例: your-paypay-id"
              value={paypayId}
              onChange={(e) => setPaypayId(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? '作成中...' : '飲み会を作成'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
