import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function LineCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [eventId, setEventId] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // eventId
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      setStatus('error');
      const desc = errorDescription
        ? `LINE認証エラー: ${errorDescription}`
        : 'LINE認証がキャンセルされました';
      setErrorMsg(desc);
      if (state) setEventId(state);
      return;
    }

    if (!code || !state) {
      setStatus('error');
      setErrorMsg('パラメータが不正です');
      return;
    }

    setEventId(state);

    // Exchange code for profile via our backend
    fetch(`/api/events/${state}/line-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then((res) => res.json())
      .then((data: { success?: boolean; display_name?: string; error?: string; detail?: string }) => {
        if (data.success) {
          setStatus('success');
          setDisplayName(data.display_name || '');
        } else {
          setStatus('error');
          setErrorMsg(data.detail
            ? `${data.error}: ${data.detail}`
            : data.error || 'LINE連携に失敗しました');
        }
      })
      .catch(() => {
        setStatus('error');
        setErrorMsg('通信エラーが発生しました');
      });
  }, [searchParams]);

  return (
    <div className="mx-auto max-w-lg p-4 pt-12">
      <Card>
        <CardContent className="p-6 text-center space-y-4">
          {status === 'loading' && (
            <>
              <p className="text-lg font-medium">LINE連携中...</p>
              <p className="text-muted-foreground">しばらくお待ちください</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="text-4xl">&#x2705;</div>
              <p className="text-lg font-bold">LINE連携完了！</p>
              <p className="text-muted-foreground">
                {displayName}さんのLINEアカウントと連携しました。
                <br />
                遅刻者が到着連絡をすると、LINEで通知が届きます。
              </p>
              {eventId && (
                <Button onClick={() => navigate(`/events/${eventId}`)}>
                  幹事ページに戻る
                </Button>
              )}
            </>
          )}

          {status === 'error' && (
            <>
              <div className="text-4xl">&#x274C;</div>
              <p className="text-lg font-bold">連携に失敗しました</p>
              <p className="text-sm text-muted-foreground break-all">{errorMsg}</p>
              <div className="text-left bg-muted rounded-lg p-3 space-y-1">
                <p className="text-xs font-medium">LINE Developersコンソールで以下を確認してください:</p>
                <p className="text-xs text-muted-foreground">1. LINE Loginチャネルの「コールバックURL」に以下を登録:</p>
                <code className="text-xs bg-background rounded px-2 py-1 block break-all">{window.location.origin}/line-callback</code>
                <p className="text-xs text-muted-foreground">2. LINE_LOGIN_CHANNEL_IDとLINE_LOGIN_CHANNEL_SECRETが正しく設定されているか確認</p>
              </div>
              {eventId && (
                <Button variant="outline" onClick={() => navigate(`/events/${eventId}`)}>
                  幹事ページに戻る
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
