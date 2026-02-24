interface Env {
  DB: D1Database;
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

    // Check for existing active arrival
    const existing = await db
      .prepare(
        `SELECT id FROM arrivals WHERE event_id = ? AND participant_id = ? AND status = 'approaching'`
      )
      .bind(eventId, body.participant_id)
      .first();

    if (existing) {
      // Update existing arrival
      await db
        .prepare(
          `UPDATE arrivals SET eta_minutes = ?, message = ? WHERE id = ?`
        )
        .bind(body.eta_minutes ?? null, body.message ?? null, existing.id)
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

    // Create new arrival
    const result = await db
      .prepare(
        `INSERT INTO arrivals (event_id, participant_id, eta_minutes, message) VALUES (?, ?, ?, ?)`
      )
      .bind(eventId, body.participant_id, body.eta_minutes ?? null, body.message ?? null)
      .run();

    const arrival = await db
      .prepare(
        `SELECT a.*, p.name as participant_name
         FROM arrivals a JOIN participants p ON p.id = a.participant_id
         WHERE a.id = ?`
      )
      .bind(result.meta.last_row_id)
      .first();

    return Response.json(arrival, { status: 201 });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};
