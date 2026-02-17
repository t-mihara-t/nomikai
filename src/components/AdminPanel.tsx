import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { calculateSplit } from '@/lib/calculate';
import { SummaryCard } from './SummaryCard';
import type { Participant, CalculateResult } from '@/types';

interface AdminPanelProps {
  eventId: number;
  participants: Participant[];
  currentTotalAmount: number | null;
  currentDrinkerRatio: number;
  onCalculate: (data: {
    total_amount: number;
    drinker_ratio: number;
    rounding: 'ceil' | 'floor';
  }) => Promise<CalculateResult | null>;
  loading?: boolean;
}

export function AdminPanel({
  participants,
  currentTotalAmount,
  currentDrinkerRatio,
  onCalculate,
  loading,
}: AdminPanelProps) {
  const [totalAmount, setTotalAmount] = useState(
    currentTotalAmount?.toString() || ''
  );
  const [drinkerRatio, setDrinkerRatio] = useState(currentDrinkerRatio);
  const [rounding, setRounding] = useState<'ceil' | 'floor'>('ceil');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CalculateResult | null>(null);
  const [confirmed, setConfirmed] = useState<CalculateResult | null>(null);

  const attending = participants.filter((p) => p.status === 'attending');
  const drinkers = attending.filter((p) => p.is_drinker);
  const nonDrinkers = attending.filter((p) => !p.is_drinker);

  const handlePreview = () => {
    setError(null);
    const amount = parseInt(totalAmount, 10);

    if (!totalAmount || isNaN(amount) || amount <= 0) {
      setError('正しい合計金額を入力してください');
      return;
    }
    if (attending.length === 0) {
      setError('参加者が0人のため計算できません');
      return;
    }

    const result = calculateSplit(
      amount,
      drinkers.length,
      nonDrinkers.length,
      drinkerRatio,
      rounding
    );
    setPreview(result);
    setConfirmed(null);
  };

  const handleConfirm = async () => {
    const amount = parseInt(totalAmount, 10);
    if (!amount) return;

    const result = await onCalculate({
      total_amount: amount,
      drinker_ratio: drinkerRatio,
      rounding,
    });

    if (result) {
      setConfirmed(result);
      setPreview(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">幹事パネル - 精算設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p>参加: {attending.length}名 (飲む: {drinkers.length}名 / 飲まない: {nonDrinkers.length}名)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="total-amount">合計金額 (円)</Label>
            <Input
              id="total-amount"
              type="number"
              placeholder="例: 30000"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>
              飲む人の倍率: <span className="font-bold text-primary">{drinkerRatio.toFixed(1)}倍</span>
            </Label>
            <Slider
              min={1.0}
              max={2.0}
              step={0.1}
              value={drinkerRatio}
              onChange={(e) => setDrinkerRatio(parseFloat(e.target.value))}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1.0倍</span>
              <span>1.5倍</span>
              <span>2.0倍</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rounding">端数処理</Label>
            <Select
              id="rounding"
              value={rounding}
              onChange={(e) => setRounding(e.target.value as 'ceil' | 'floor')}
            >
              <option value="ceil">100円単位で切り上げ</option>
              <option value="floor">100円単位で切り捨て</option>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePreview}
              className="flex-1"
            >
              プレビュー
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading || !preview}
              className="flex-1"
            >
              {loading ? '計算中...' : '確定する'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {preview && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">プレビュー（未確定）</p>
          <SummaryCard result={preview} totalAmount={parseInt(totalAmount, 10)} />
        </div>
      )}

      {confirmed && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-green-600">確定済み</p>
          <SummaryCard result={confirmed} totalAmount={parseInt(totalAmount, 10)} />
        </div>
      )}
    </div>
  );
}
