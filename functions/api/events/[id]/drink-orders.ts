interface Env {
  DB: D1Database;
}

// GET: List drink orders for an event
// POST: Create a drink order
export const onRequest: PagesFunction<Env> = async (context) => {
  const db = context.env.DB;
  const eventId = parseInt(context.params.id as string, 10);

  if (context.request.method === 'GET') {
    const orders = await db
      .prepare(
        `SELECT d.*, p.name as participant_name
         FROM drink_orders d
         JOIN participants p ON p.id = d.participant_id
         WHERE d.event_id = ?
         ORDER BY d.created_at DESC`
      )
      .bind(eventId)
      .all();

    return Response.json(orders.results);
  }

  if (context.request.method === 'POST') {
    const body = (await context.request.json()) as {
      participant_id: number;
      drink_name: string;
      quantity?: number;
      note?: string;
    };

    if (!body.participant_id || !body.drink_name) {
      return Response.json(
        { error: 'participant_id and drink_name are required' },
        { status: 400 }
      );
    }

    const result = await db
      .prepare(
        `INSERT INTO drink_orders (event_id, participant_id, drink_name, quantity, note)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(
        eventId,
        body.participant_id,
        body.drink_name,
        body.quantity ?? 1,
        body.note ?? null
      )
      .run();

    const order = await db
      .prepare(
        `SELECT d.*, p.name as participant_name
         FROM drink_orders d JOIN participants p ON p.id = d.participant_id
         WHERE d.id = ?`
      )
      .bind(result.meta.last_row_id)
      .first();

    return Response.json(order, { status: 201 });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};
