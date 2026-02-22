import type { CalculateResult } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface SummaryCardProps {
  result: CalculateResult;
  totalAmount: number;
}

export function SummaryCard({ result, totalAmount }: SummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">精算結果</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-muted-foreground">合計金額</p>
            <p className="text-xl font-bold">{totalAmount.toLocaleString()}円</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">徴収合計</p>
            <p className="text-xl font-bold">{result.total_collected.toLocaleString()}円</p>
          </div>

          {result.drinker_count > 0 && (
            <div className="space-y-1">
              <p className="text-muted-foreground">飲む人 ({result.drinker_count}名)</p>
              <p className="text-lg font-semibold text-primary">
                {result.drinker_amount.toLocaleString()}円/人
              </p>
            </div>
          )}

          {result.non_drinker_count > 0 && (
            <div className="space-y-1">
              <p className="text-muted-foreground">飲まない人 ({result.non_drinker_count}名)</p>
              <p className="text-lg font-semibold">
                {result.non_drinker_amount.toLocaleString()}円/人
              </p>
            </div>
          )}

          {result.difference !== 0 && (
            <div className="col-span-2 rounded-lg bg-muted p-2">
              <p className="text-sm text-muted-foreground">
                {result.difference > 0
                  ? `端数調整: +${result.difference.toLocaleString()}円（多め徴収）`
                  : `端数調整: ${result.difference.toLocaleString()}円（不足分は幹事負担）`}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
