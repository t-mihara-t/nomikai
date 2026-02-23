import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface EventFormProps {
  onSubmit: (data: {
    name: string;
    date: string;
    has_after_party?: boolean;
    candidate_dates?: string[];
    paypay_id?: string;
  }) => Promise<void>;
  loading?: boolean;
}

export function EventForm({ onSubmit, loading }: EventFormProps) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [hasAfterParty, setHasAfterParty] = useState(false);
  const [candidateDates, setCandidateDates] = useState<string[]>(['']);
  const [paypayId, setPaypayId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAddCandidateDate = () => {
    setCandidateDates([...candidateDates, '']);
  };

  const handleRemoveCandidateDate = (index: number) => {
    setCandidateDates(candidateDates.filter((_, i) => i !== index));
  };

  const handleCandidateDateChange = (index: number, value: string) => {
    const updated = [...candidateDates];
    updated[index] = value;
    setCandidateDates(updated);
  };

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

    const filledDates = candidateDates.filter((d) => d.trim() !== '');

    await onSubmit({
      name: name.trim(),
      date,
      has_after_party: hasAfterParty,
      candidate_dates: filledDates.length > 0 ? filledDates : undefined,
      paypay_id: paypayId.trim() || undefined,
    });

    setName('');
    setDate('');
    setHasAfterParty(false);
    setCandidateDates(['']);
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
            <Label>候補日時</Label>
            {candidateDates.map((dt, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="datetime-local"
                  value={dt}
                  onChange={(e) => handleCandidateDateChange(index, e.target.value)}
                  className="flex-1"
                />
                {candidateDates.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveCandidateDate(index)}
                  >
                    -
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddCandidateDate}
            >
              + 候補日時を追加
            </Button>
          </div>

          <div className="space-y-2">
            <Label>二次会</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={hasAfterParty ? 'default' : 'outline'}
                size="sm"
                onClick={() => setHasAfterParty(true)}
              >
                あり
              </Button>
              <Button
                type="button"
                variant={!hasAfterParty ? 'default' : 'outline'}
                size="sm"
                onClick={() => setHasAfterParty(false)}
              >
                なし
              </Button>
            </div>
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
