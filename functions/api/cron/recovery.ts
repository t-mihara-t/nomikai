/**
 * Recovery Action Trigger
 *
 * Fires based on event end time to send:
 * 1. Last train deadline reminder (30 min before event end)
 * 2. Recovery set purchase suggestion (right after event end)
 *
 * Called periodically via the existing polling mechanism or Cron Trigger.
 * Uses LINE Messaging API to send 1-to-1 push messages.
 */

interface Env {
  DB: D1Database;
  LINE_CHANNEL_ACCESS_TOKEN?: string;
}

interface ParticipantWithStation {
  id: number;
  name: string;
  nearest_station?: string;
  line_user_id?: string;
}

async function sendLineMessage(token: string, userId: string, messages: { type: string; text: string }[]): Promise<void> {
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ to: userId, messages }),
  });
}

export const onRequestPost: PagesFunction<Env> = async ({ env }) => {
  const token = env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    return Response.json({ error: 'LINE token not configured' }, { status: 200 });
  }

  const now = new Date();
  let sentReminders = 0;
  let sentRecovery = 0;

  // Find active events with LINE integration
  const { results: events } = await env.DB.prepare(
    `SELECT e.*, e.line_user_id as organizer_line_id
     FROM events e
     WHERE e.is_active = 1 AND e.line_user_id IS NOT NULL`
  ).all();

  for (const event of events) {
    if (!event.date || !event.organizer_line_id) continue;

    // Parse event date/time
    const eventDate = new Date(event.date as string);
    if (isNaN(eventDate.getTime())) continue;

    // Assume event duration is ~2.5 hours
    const eventEnd = new Date(eventDate.getTime() + 2.5 * 60 * 60 * 1000);
    const minutesBeforeEnd = (eventEnd.getTime() - now.getTime()) / 60000;

    // 1. Last train reminder: 30 minutes before end
    if (minutesBeforeEnd > 25 && minutesBeforeEnd <= 35) {
      try {
        await sendLineMessage(token, event.organizer_line_id as string, [
          {
            type: 'text',
            text: `【終電リマインド】\n\n${event.name}の終了予定まであと約30分です。\n\n参加者の方へ終電の確認をお声がけください。\n\n※このメッセージはシステムから自動送信されています。`,
          },
        ]);
        sentReminders++;
      } catch {
        // Failed to send - ignore
      }
    }

    // 2. Recovery suggestion: right after event end (0-10 minutes after)
    if (minutesBeforeEnd >= -10 && minutesBeforeEnd < 0) {
      try {
        await sendLineMessage(token, event.organizer_line_id as string, [
          {
            type: 'text',
            text: `【お疲れ様でした】\n\n${event.name}お疲れ様でした！\n\n明日に備えてリカバリーはいかがですか？\n\n近くのコンビニで以下がオススメ：\n・ヘパリーゼ / ウコンの力\n・経口補水液 OS-1\n・おにぎり or サンドイッチ\n\n※このメッセージはシステムから自動送信されています。`,
          },
        ]);
        sentRecovery++;
      } catch {
        // Failed to send - ignore
      }
    }
  }

  return Response.json({
    checked: events.length,
    sent_reminders: sentReminders,
    sent_recovery: sentRecovery,
    timestamp: now.toISOString(),
  });
};
