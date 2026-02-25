import { linePushMessage, buildReminderNotification } from '../../lib/line';

interface Env {
  DB: D1Database;
  LINE_CHANNEL_ACCESS_TOKEN?: string;
  CRON_SECRET?: string;
}

// POST: Check and send pending LINE reminders
// Called periodically by cron trigger, external scheduler, or frontend polling
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const db = context.env.DB;
  const lineToken = context.env.LINE_CHANNEL_ACCESS_TOKEN;

  // Optional: verify cron secret for external callers
  const authHeader = context.request.headers.get('X-Cron-Secret');
  const cronSecret = context.env.CRON_SECRET;
  if (cronSecret && authHeader !== cronSecret) {
    // Also allow calls from same origin (frontend polling)
    const referer = context.request.headers.get('Referer') || '';
    const origin = new URL(context.request.url).origin;
    if (!referer.startsWith(origin)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (!lineToken) {
    return Response.json({ sent: 0, message: 'LINE not configured' });
  }

  // Find arrivals where:
  // - status is 'approaching'
  // - line_reminder_sent = 0
  // - reminder_at <= now
  const now = new Date().toISOString();
  const pendingReminders = await db
    .prepare(
      `SELECT a.*, p.name as participant_name, e.name as event_name, e.line_user_id, e.id as eid
       FROM arrivals a
       JOIN participants p ON p.id = a.participant_id
       JOIN events e ON e.id = a.event_id
       WHERE a.status = 'approaching'
         AND a.line_reminder_sent = 0
         AND a.reminder_at IS NOT NULL
         AND a.reminder_at <= ?
         AND e.line_user_id IS NOT NULL`
    )
    .bind(now)
    .all();

  let sent = 0;
  const origin = new URL(context.request.url).origin;

  for (const arrival of pendingReminders.results) {
    try {
      const eventUrl = `${origin}/events/${arrival.eid}/day`;
      const messages = buildReminderNotification(
        arrival.participant_name as string,
        arrival.event_name as string,
        eventUrl
      );

      const success = await linePushMessage(
        lineToken,
        arrival.line_user_id as string,
        messages
      );

      if (success) {
        await db
          .prepare('UPDATE arrivals SET line_reminder_sent = 1 WHERE id = ?')
          .bind(arrival.id)
          .run();
        sent++;
      }
    } catch {
      // Continue with other reminders
    }
  }

  return Response.json({ sent, checked: pendingReminders.results.length });
};
