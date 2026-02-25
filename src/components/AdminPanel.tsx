import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { calculateSplit } from '@/lib/calculate';
import type { Participant, CalculateResult, ParticipantBreakdown } from '@/types';

interface AdminPanelProps {
  eventId: number;
  participants: Participant[];
  currentTotalAmount: number | null;
  currentDrinkerRatio: number;
  currentKampaAmount?: number;
  onCalculate: (data: {
    total_amount: number;
    drinker_ratio: number;
    kampa_amount: number;
    rounding: 'ceil' | 'floor';
  }) => Promise<CalculateResult | null>;
  loading?: boolean;
}

export function AdminPanel({
  participants,
  currentTotalAmount,
  currentDrinkerRatio,
  currentKampaAmount,
  onCalculate,
  loading,
}: AdminPanelProps) {
  const [totalAmount, setTotalAmount] = useState(currentTotalAmount?.toString() || '');
  const [kampaAmount, setKampaAmount] = useState(currentKampaAmount?.toString() || '0');
  const [drinkerRatio, setDrinkerRatio] = useState(currentDrinkerRatio);
  const [rounding, setRounding] = useState<'ceil' | 'floor'>('ceil');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CalculateResult | null>(null);
  const [confirmed, setConfirmed] = useState<CalculateResult | null>(null);

  const attending = participants.filter((p) => p.status === 'attending');

  const handlePreview = () => {
    setError(null);
    const amount = parseInt(totalAmount, 10);
    const kampa = parseInt(kampaAmount, 10) || 0;

    if (!totalAmount || isNaN(amount) || amount <= 0) {
      setError('正しい合計金額を入力してください');
      return;
    }
    if (kampa >= amount) {
      setError('カンパ額が合計金額以上です');
      return;
    }
    if (attending.length === 0) {
      setError('参加者が0人のため計算できません');
      return;
    }

    const result = calculateSplit(amount, attending, drinkerRatio, kampa, rounding);
    setPreview(result);
    setConfirmed(null);
  };

  const handleConfirm = async () => {
    const amount = parseInt(totalAmount, 10);
    const kampa = parseInt(kampaAmount, 10) || 0;
    if (!amount) return;

    const result = await onCalculate({
      total_amount: amount,
      drinker_ratio: drinkerRatio,
      kampa_amount: kampa,
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
          <CardTitle className="text-lg">精算設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
            <p>参加者: {attending.length}名</p>
            {attending.some((p) => p.multiplier !== 1.0) && (
              <p className="text-xs text-muted-foreground">
                個別倍率あり: {attending.filter((p) => p.multiplier !== 1.0).map((p) => `${p.name}(${p.multiplier}倍)`).join(', ')}
              </p>
            )}
            {attending.some((p) => p.discount_rate > 0) && (
              <p className="text-xs text-muted-foreground">
                割引あり: {attending.filter((p) => p.discount_rate > 0).map((p) => `${p.name}(${Math.round(p.discount_rate * 100)}%OFF)`).join(', ')}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="total-amount">合計金額 (円)</Label>
              <Input id="total-amount" type="number" placeholder="例: 30000" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kampa-amount">カンパ総額 (円)</Label>
              <Input id="kampa-amount" type="number" placeholder="0" value={kampaAmount} onChange={(e) => setKampaAmount(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              飲む人の倍率: <span className="font-bold text-primary">{drinkerRatio.toFixed(1)}倍</span>
            </Label>
            <Slider min={1.0} max={2.0} step={0.1} value={drinkerRatio} onChange={(e) => setDrinkerRatio(parseFloat(e.target.value))} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1.0倍</span><span>1.5倍</span><span>2.0倍</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rounding">端数処理</Label>
            <Select id="rounding" value={rounding} onChange={(e) => setRounding(e.target.value as 'ceil' | 'floor')}>
              <option value="ceil">100円単位で切り上げ</option>
              <option value="floor">100円単位で切り捨て</option>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePreview} className="flex-1">プレビュー</Button>
            <Button onClick={handleConfirm} disabled={loading || !preview} className="flex-1">
              {loading ? '計算中...' : '確定する'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {preview && <BreakdownCard result={preview} totalAmount={parseInt(totalAmount, 10)} label="プレビュー（未確定）" labelColor="text-muted-foreground" />}
      {confirmed && <BreakdownCard result={confirmed} totalAmount={parseInt(totalAmount, 10)} label="確定済み" labelColor="text-green-600" />}
    </div>
  );
}

function BreakdownCard({ result, totalAmount, label, labelColor }: { result: CalculateResult; totalAmount: number; label: string; labelColor: string }) {
  return (
    <div className="space-y-2">
      <p className={`text-sm font-medium ${labelColor}`}>{label}</p>
      <Card>
        <CardHeader><CardTitle className="text-lg">精算結果</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">合計金額</p>
              <p className="text-xl font-bold">{totalAmount.toLocaleString()}円</p>
            </div>
            <div>
              <p className="text-muted-foreground">徴収合計</p>
              <p className="text-xl font-bold">{result.total_collected.toLocaleString()}円</p>
            </div>
            {result.kampa_amount > 0 && (
              <div>
                <p className="text-muted-foreground">カンパ総額</p>
                <p className="text-lg font-semibold text-green-600">-{result.kampa_amount.toLocaleString()}円</p>
              </div>
            )}
            {result.kampa_amount > 0 && (
              <div>
                <p className="text-muted-foreground">割り勘対象額</p>
                <p className="text-lg font-semibold">{result.adjusted_total.toLocaleString()}円</p>
              </div>
            )}
          </div>

          {result.difference !== 0 && (
            <div className="rounded-lg bg-muted p-2">
              <p className="text-sm text-muted-foreground">
                {result.difference > 0
                  ? `端数調整: +${result.difference.toLocaleString()}円（多め徴収）`
                  : `端数調整: ${result.difference.toLocaleString()}円（不足分は幹事負担）`}
              </p>
            </div>
          )}

          {/* Per-person breakdown */}
          {result.breakdowns && result.breakdowns.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">個人別内訳</p>
              <div className="space-y-2">
                {result.breakdowns.map((b) => (
                  <BreakdownRow key={b.participant_id} b={b} />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BreakdownRow({ b }: { b: ParticipantBreakdown }) {
  const hasCustom = b.multiplier !== 1.0 || b.discount_rate > 0;

  return (
    <div className="rounded-lg border border-border p-2 text-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">{b.name}</span>
          <div className="flex gap-1">
            {b.is_drinker && <Badge variant="warning" className="text-[10px]">飲む</Badge>}
            {b.multiplier !== 1.0 && <Badge variant="outline" className="text-[10px]">{b.multiplier}倍</Badge>}
            {b.discount_rate > 0 && <Badge variant="secondary" className="text-[10px]">{Math.round(b.discount_rate * 100)}%OFF</Badge>}
          </div>
        </div>
        <span className="font-bold text-primary">{b.final_amount.toLocaleString()}円</span>
      </div>
      {hasCustom && (
        <p className="text-[10px] text-muted-foreground mt-1">
          {b.base_amount.toLocaleString()}円
          {b.multiplier !== 1.0 && ` × ${b.multiplier}`}
          {b.is_drinker && b.drinker_ratio > 1 && ` × ${b.drinker_ratio}(飲)`}
          {b.discount_rate > 0 && ` - ${b.discount_amount.toLocaleString()}円(割引)`}
          {` → ${b.final_amount.toLocaleString()}円`}
        </p>
      )}
    </div>
  );
}
