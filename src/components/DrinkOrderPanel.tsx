import { useState } from 'react';
import type { DrinkOrder } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const DRINK_MENU = [
  { name: '生ビール', emoji: '🍺' },
  { name: 'ハイボール', emoji: '🥃' },
  { name: 'レモンサワー', emoji: '🍋' },
  { name: '梅酒', emoji: '🍑' },
  { name: '日本酒', emoji: '🍶' },
  { name: 'ウーロン茶', emoji: '🍵' },
  { name: 'ジンジャーエール', emoji: '🥤' },
  { name: 'コーラ', emoji: '🥤' },
];

interface DrinkOrderFormProps {
  participantId: number;
  onOrder: (drinkName: string, quantity: number, note?: string) => Promise<void>;
}

/** Drink order form for latecomers - large touch targets for easy use */
export function DrinkOrderForm({ onOrder }: DrinkOrderFormProps) {
  const [selectedDrink, setSelectedDrink] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [ordered, setOrdered] = useState(false);

  const handleOrder = async () => {
    if (!selectedDrink) return;
    setSubmitting(true);
    try {
      await onOrder(selectedDrink, quantity);
      setOrdered(true);
      setTimeout(() => {
        setOrdered(false);
        setSelectedDrink(null);
        setQuantity(1);
      }, 2000);
    } finally {
      setSubmitting(false);
    }
  };

  if (ordered) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-2xl font-bold text-green-600">注文を送信しました！</p>
          <p className="text-muted-foreground mt-2">幹事が注文を通してくれます</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">先に注文しておく</CardTitle>
        <p className="text-sm text-muted-foreground">到着時にすぐ飲めるよう、注文を幹事に伝えます</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {DRINK_MENU.map((drink) => (
            <Button
              key={drink.name}
              variant={selectedDrink === drink.name ? 'default' : 'outline'}
              className="min-h-[56px] text-base font-semibold justify-start gap-2"
              onClick={() => setSelectedDrink(drink.name)}
            >
              <span className="text-xl">{drink.emoji}</span>
              {drink.name}
            </Button>
          ))}
        </div>

        {selectedDrink && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                className="min-h-[48px] min-w-[48px] text-xl font-bold"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                −
              </Button>
              <span className="text-2xl font-bold min-w-[60px] text-center">{quantity}杯</span>
              <Button
                variant="outline"
                className="min-h-[48px] min-w-[48px] text-xl font-bold"
                onClick={() => setQuantity(Math.min(5, quantity + 1))}
              >
                ＋
              </Button>
            </div>

            <Button
              className="w-full min-h-[56px] text-lg font-bold bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleOrder}
              disabled={submitting}
            >
              {submitting ? '送信中...' : `${selectedDrink} ${quantity}杯を注文`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface DrinkOrderListProps {
  orders: DrinkOrder[];
  onConfirm: (orderId: number) => void;
  onDelete: (orderId: number) => void;
}

/** Organizer view: list of pending drink orders with confirm buttons */
export function DrinkOrderList({ orders, onConfirm, onDelete }: DrinkOrderListProps) {
  if (orders.length === 0) return null;

  const pending = orders.filter((o) => !o.confirmed);
  const confirmed = orders.filter((o) => o.confirmed);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          注文リクエスト
          {pending.length > 0 && (
            <Badge variant="destructive" className="ml-2">{pending.length}件未対応</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pending.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-amber-600">未確認の注文</p>
            {pending.map((order) => (
              <div key={order.id} className="arrival-card-enter flex items-center justify-between rounded-lg border-2 border-amber-400 bg-amber-50 p-3 gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base">{order.participant_name}</p>
                  <p className="text-sm">
                    {order.drink_name}
                    {order.quantity > 1 && ` ×${order.quantity}`}
                    {order.note && <span className="text-muted-foreground"> ({order.note})</span>}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    className="min-h-[48px] min-w-[48px] bg-green-600 hover:bg-green-700 text-white font-bold text-base"
                    onClick={() => onConfirm(order.id)}
                  >
                    注文OK
                  </Button>
                  <Button
                    variant="outline"
                    className="min-h-[48px] min-w-[48px]"
                    onClick={() => onDelete(order.id)}
                  >
                    取消
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {confirmed.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-green-600">注文済み</p>
            {confirmed.map((order) => (
              <div key={order.id} className="flex items-center justify-between rounded-lg border border-border bg-muted p-2 text-sm gap-2">
                <span className="flex-1 min-w-0">
                  {order.participant_name}: {order.drink_name}
                  {order.quantity > 1 && ` ×${order.quantity}`}
                </span>
                <div className="flex items-center gap-1">
                  <Badge variant="success">済</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => onDelete(order.id)}
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
