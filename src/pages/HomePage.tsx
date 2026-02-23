import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvents } from '@/hooks/useEventData';
import { api } from '@/lib/api';
import { EventForm } from '@/components/EventForm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function HomePage() {
  const { events, loading, error, refetch } = useEvents();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleCreate = async (data: {
    name: string;
    date: string;
    has_after_party?: boolean;
    candidate_dates?: string[];
    paypay_id?: string;
  }) => {
    setCreating(true);
    setCreateError(null);
    try {
      const event = await api.createEvent(data);
      await refetch();
      navigate(`/events/${event.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : '作成に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('この飲み会を削除しますか？')) return;
    await api.deleteEvent(id);
    await refetch();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold">飲み会精算アプリ</h1>
        <p className="mt-2 text-muted-foreground">出欠管理と割り勘計算をかんたんに</p>
      </div>

      {createError && (
        <p className="text-sm text-destructive text-center">{createError}</p>
      )}
      <EventForm onSubmit={handleCreate} loading={creating} />

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">イベント一覧</h2>
        {loading && <p className="text-muted-foreground text-sm">読み込み中...</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!loading && events.length === 0 && (
          <p className="text-muted-foreground text-sm">イベントはまだありません</p>
        )}
        {events.map((event) => (
          <Card
            key={event.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
          >
            <CardContent className="flex items-center justify-between p-4">
              <div
                className="flex-1"
                onClick={() => navigate(`/events/${event.id}`)}
              >
                <h3 className="font-semibold">{event.name}</h3>
                <p className="text-sm text-muted-foreground">{event.date}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {event.total_amount && (
                    <Badge variant="outline">
                      合計: {event.total_amount.toLocaleString()}円
                    </Badge>
                  )}
                  {event.has_after_party && (
                    <Badge variant="secondary">二次会あり</Badge>
                  )}
                  {event.candidate_dates && event.candidate_dates.length > 0 && (
                    <Badge variant="outline">
                      候補: {event.candidate_dates.length}件
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(event.id);
                }}
              >
                削除
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
