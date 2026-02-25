import { linePushMessage, buildArrivalNotification } from '../../../lib/line';

interface Env {
  DB: D1Database;
  LINE_CHANNEL_ACCESS_TOKEN?: string;
}

/** Check if LINE columns exist in arrivals table */
async function hasLineColumns(db: D1Database): Promise<boolean> {
  try {
    await db.prepare('SELECT line_notified FROM arrivals LIMIT 0').all();
    return true;
  } catch {
    return false;
  }
}

/** Ensure LINE columns exist (auto-migrate) */
async function ensureLineColumns(db: D1Database): Promise<void> {
  const stmts = [
    'ALTER TABLE arrivals ADD COLUMN line_notified INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE arrivals ADD COLUMN line_reminder_sent INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE arrivals ADD COLUMN reminder_at TEXT',
    'ALTER TABLE events ADD COLUMN line_user_id TEXT',
  ];
  for (const sql of stmts) {
    try { await db.prepare(sql).run(); } catch { /* column already exists */ }
  }
}

// GET: List active arrivals for an event
// POST: Announce arrival (Heroic Entry)
export const onRequest: PagesFunction<Env> = async (context) => {
  const db = context.env.DB;
  const eventId = parseInt(context.params.id as string, 10);

  if (context.request.method === 'GET') {
    const arrivals = await db
      .prepare(
        `SELECT a.*, p.name as participant_name
         FROM arrivals a
         JOIN participants p ON p.id = a.participant_id
         WHERE a.event_id = ? AND a.status != 'dismissed'
         ORDER BY a.created_at DESC`
      )
      .bind(eventId)
      .all();

    return Response.json(arrivals.results);
  }

  if (context.request.method === 'POST') {
    const body = (await context.request.json()) as {
      participant_id: number;
      eta_minutes?: number;
      message?: string;
    };

    if (!body.participant_id) {
      return Response.json({ error: 'participant_id is required' }, { status: 400 });
    }

    // Auto-migrate if LINE columns don't exist yet
    const lineColumnsExist = await hasLineColumns(db);
    if (!lineColumnsExist) {
      await ensureLineColumns(db);
    }

    // Check for existing active arrival
    const existing = await db
      .prepare(
        `SELECT id FROM arrivals WHERE event_id = ? AND participant_id = ? AND status = 'approaching'`
      )
      .bind(eventId, body.participant_id)
      .first();

    if (existing) {
      // Update existing arrival
      const reminderAt = body.eta_minutes && body.eta_minutes >= 10
        ? new Date(Date.now() + (body.eta_minutes - 5) * 60000).toISOString()
        : null;

      await db
        .prepare(
          `UPDATE arrivals SET eta_minutes = ?, message = ?, reminder_at = ? WHERE id = ?`
        )
        .bind(body.eta_minutes ?? null, body.message ?? null, reminderAt, existing.id)
        .run();

      const updated = await db
        .prepare(
          `SELECT a.*, p.name as participant_name
           FROM arrivals a JOIN participants p ON p.id = a.participant_id
           WHERE a.id = ?`
        )
        .bind(existing.id)
        .first();

      return Response.json(updated);
    }

    // Calculate reminder_at: 5 minutes before estimated arrival (only if ETA >= 10 min)
    const reminderAt = body.eta_minutes && body.eta_minutes >= 10
      ? new Date(Date.now() + (body.eta_minutes - 5) * 60000).toISOString()
      : null;

    // Create new arrival
    const result = await db
      .prepare(
        `INSERT INTO arrivals (event_id, participant_id, eta_minutes, message, reminder_at) VALUES (?, ?, ?, ?, ?)`
      )
      .bind(eventId, body.participant_id, body.eta_minutes ?? null, body.message ?? null, reminderAt)
      .run();

    const arrival = await db
      .prepare(
        `SELECT a.*, p.name as participant_name
         FROM arrivals a JOIN participants p ON p.id = a.participant_id
         WHERE a.id = ?`
      )
      .bind(result.meta.last_row_id)
      .first();

    // Send immediate LINE notification to organizer
    let lineNotified = false;
    const lineToken = context.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (lineToken && arrival) {
      try {
        const event = await db
          .prepare('SELECT * FROM events WHERE id = ?')
          .bind(eventId)
          .first();

        if (event?.line_user_id) {
          const origin = new URL(context.request.url).origin;
          const eventUrl = `${origin}/events/${eventId}/day`;
          const messages = buildArrivalNotification(
            arrival.participant_name as string,
            body.eta_minutes ?? null,
            body.message ?? null,
            event.name as string,
            eventUrl
          );
          lineNotified = await linePushMessage(lineToken, event.line_user_id as string, messages);

          if (lineNotified) {
            await db
              .prepare('UPDATE arrivals SET line_notified = 1 WHERE id = ?')
              .bind(arrival.id)
              .run();
          }
        }
      } catch {
        // LINE notification failure should not block the response
      }
    }

    return Response.json({ ...arrival, line_notified: lineNotified ? 1 : 0 }, { status: 201 });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};
