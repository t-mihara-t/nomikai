import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEventDetail } from '@/hooks/useEventData';
import { api } from '@/lib/api';
import type { PointsSummary } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

/**
 * Organizer dashboard page.
 * Shows real-time points display, estimated earnings, and profit summary.
 * "推定ポイント（Hotpepper予約P + 決済端数 + PayPayP）" as specified.
 */
export function DashboardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const eventId = id ? parseInt(id, 10) : null;
  const { event, loading, error } = useEventDetail(eventId);
  const [points, setPoints] = useState<PointsSummary | null>(null);

  useEffect(() => {
    if (eventId) {
      api.getPoints(eventId).then(setPoints).catch(() => {});
    }
  }, [eventId]);

  // Refresh points every 15 seconds
  useEffect(() => {
    if (!eventId) return;
    const interval = setInterval(() => {
      api.getPoints(eventId).then(setPoints).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [eventId]);

  if (loading) {
    return <div className="flex items-center justify-center p-12"><p className="text-muted-foreground">読み込み中...</p></div>;
  }

  if (error || !event) {
    return <div className="mx-auto max-w-2xl p-4"><p className="text-destructive">{error || 'イベントが見つかりません'}</p></div>;
  }

  const attending = event.participants.filter((p) => p.status === 'attending');
  const paid = attending.filter((p) => p.paid_status);
  const unpaid = attending.filter((p) => !p.paid_status && p.amount_to_pay != null && p.amount_to_pay > 0);
  const totalToPay = attending.reduce((sum, p) => sum + (p.amount_to_pay || 0), 0);
  const totalPaid = paid.reduce((sum, p) => sum + (p.amount_to_pay || 0), 0);

  // Estimated point earnings
  const hotpepperPoints = attending.length * 50; // Base HotPepper points per person
  const roundingFee = event.total_amount ? (totalToPay - event.total_amount) : 0; // Rounding surplus
  const estimatedPayPayPoints = Math.floor(totalToPay * 0.005); // ~0.5% PayPay cashback estimate

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate(`/events/${event.id}`)}>← 幹事ページ</Button>
        <div>
          <h1 className="text-2xl font-bold">幹事ダッシュボード</h1>
          <p className="text-sm text-muted-foreground">{event.name}</p>
        </div>
      </div>

      {/* Real-time estimated points card */}
      <Card className="border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50">
        <CardHeader>
          <CardTitle className="text-lg">この飲み会で得た推定ポイント</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-white/70 p-3 shadow-sm">
              <p className="text-xs text-muted-foreground">Hotpepper予約P</p>
              <p className="text-2xl font-bold text-orange-600">{hotpepperPoints}</p>
              <p className="text-xs text-muted-foreground">pt</p>
            </div>
            <div className="rounded-lg bg-white/70 p-3 shadow-sm">
              <p className="text-xs text-muted-foreground">端数積立金</p>
              <p className="text-2xl font-bold text-green-600">{roundingFee > 0 ? roundingFee : 0}</p>
              <p className="text-xs text-muted-foreground">円</p>
            </div>
            <div className="rounded-lg bg-white/70 p-3 shadow-sm">
              <p className="text-xs text-muted-foreground">PayPay還元(推定)</p>
              <p className="text-2xl font-bold text-red-600">{estimatedPayPayPoints}</p>
              <p className="text-xs text-muted-foreground">pt</p>
            </div>
          </div>

          <div className="rounded-lg bg-gradient-to-r from-amber-100 to-yellow-100 p-4 text-center">
            <p className="text-xs text-muted-foreground">合計推定ポイント</p>
            <p className="text-3xl font-bold text-amber-700">
              {hotpepperPoints + Math.max(roundingFee, 0) + estimatedPayPayPoints}
              <span className="text-base ml-1">pt相当</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Points ledger */}
      <Card>
        <CardHeader><CardTitle className="text-lg">ポイント台帳</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-green-50 p-3">
              <p className="text-xs text-muted-foreground">累計獲得</p>
              <p className="text-xl font-bold text-green-600">{points?.total_earned || 0}<span className="text-xs">pt</span></p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-xs text-muted-foreground">利用済み</p>
              <p className="text-xl font-bold text-blue-600">{points?.total_contributed || 0}<span className="text-xs">pt</span></p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3">
              <p className="text-xs text-muted-foreground">残高</p>
              <p className="text-xl font-bold text-amber-600">{points?.available_balance || 0}<span className="text-xs">pt</span></p>
            </div>
          </div>

          {(points?.records || []).length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">取引履歴</p>
              <div className="max-h-48 overflow-auto space-y-1">
                {(points?.records || []).map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-xs border-b border-border py-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant={r.type === 'earned' ? 'default' : 'secondary'} className="text-xs">
                        {r.type === 'earned' ? '獲得' : '利用'}
                      </Badge>
                      <span className="text-muted-foreground">{r.description}</span>
                    </div>
                    <span className={`font-medium ${r.type === 'earned' ? 'text-green-600' : 'text-blue-600'}`}>
                      {r.type === 'earned' ? '+' : '-'}{r.amount}pt
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment collection status */}
      <Card>
        <CardHeader><CardTitle className="text-lg">徴収状況</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-green-50 p-3">
              <p className="text-xs text-muted-foreground">徴収済み</p>
              <p className="text-xl font-bold text-green-600">{totalPaid.toLocaleString()}<span className="text-xs">円</span></p>
              <p className="text-xs text-muted-foreground">{paid.length}名</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-xs text-muted-foreground">未徴収</p>
              <p className="text-xl font-bold text-red-600">{(totalToPay - totalPaid).toLocaleString()}<span className="text-xs">円</span></p>
              <p className="text-xs text-muted-foreground">{unpaid.length}名</p>
            </div>
          </div>

          {unpaid.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">未払い一覧</p>
              {unpaid.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-2">
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-sm font-bold text-red-600">{p.amount_to_pay?.toLocaleString()}円</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={() => navigate(`/events/${event.id}/day`)} className="min-h-[48px]">
          当日ページ
        </Button>
        <Button variant="outline" onClick={() => navigate(`/events/${event.id}/reserve`)} className="min-h-[48px]">
          店舗予約
        </Button>
      </div>
    </div>
  );
}
