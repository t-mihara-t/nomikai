interface Env {
  DB: D1Database;
}

async function ensurePointsTable(db: D1Database): Promise<void> {
  try {
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS recruit_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('earned', 'contributed')),
        amount INTEGER NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      )`
    ).run();
  } catch { /* table already exists */ }
}

// GET: Get points summary for all events (global)
// POST: Add a points record
export const onRequest: PagesFunction<Env> = async (context) => {
  const db = context.env.DB;
  const eventId = parseInt(context.params.id as string, 10);

  await ensurePointsTable(db);

  if (context.request.method === 'GET') {
    // Get global points summary (across all events)
    const { results: records } = await db.prepare(
      'SELECT * FROM recruit_points ORDER BY created_at DESC'
    ).all();

    let totalEarned = 0;
    let totalContributed = 0;
    for (const r of records) {
      if (r.type === 'earned') totalEarned += r.amount as number;
      else if (r.type === 'contributed') totalContributed += r.amount as number;
    }

    return Response.json({
      total_earned: totalEarned,
      total_contributed: totalContributed,
      available_balance: totalEarned - totalContributed,
      records,
    });
  }

  if (context.request.method === 'POST') {
    const body = (await context.request.json()) as {
      type: 'earned' | 'contributed';
      amount: number;
      description?: string;
    };

    if (!body.type || !body.amount || body.amount <= 0) {
      return Response.json({ error: 'type and positive amount are required' }, { status: 400 });
    }

    // For contributions, check available balance
    if (body.type === 'contributed') {
      const { results: allRecords } = await db.prepare(
        'SELECT type, amount FROM recruit_points'
      ).all();
      let earned = 0;
      let contributed = 0;
      for (const r of allRecords) {
        if (r.type === 'earned') earned += r.amount as number;
        else contributed += r.amount as number;
      }
      if (body.amount > earned - contributed) {
        return Response.json({ error: 'Insufficient point balance' }, { status: 400 });
      }

      // Also add the contributed amount to event's kampa_amount
      try {
        await db.prepare(
          'UPDATE events SET kampa_amount = kampa_amount + ? WHERE id = ?'
        ).bind(body.amount, eventId).run();
      } catch { /* kampa_amount column might not exist */ }
    }

    const result = await db.prepare(
      'INSERT INTO recruit_points (event_id, type, amount, description) VALUES (?, ?, ?, ?) RETURNING *'
    ).bind(eventId, body.type, body.amount, body.description || null).first();

    return Response.json(result);
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};
