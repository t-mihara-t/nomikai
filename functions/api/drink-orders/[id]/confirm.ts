interface Env {
  DB: D1Database;
}

// PUT: Confirm a drink order (organizer marks as ordered)
export const onRequest: PagesFunction<Env> = async (context) => {
  const db = context.env.DB;
  const orderId = parseInt(context.params.id as string, 10);

  if (context.request.method === 'PUT') {
    await db
      .prepare('UPDATE drink_orders SET confirmed = 1 WHERE id = ?')
      .bind(orderId)
      .run();

    const order = await db
      .prepare(
        `SELECT d.*, p.name as participant_name
         FROM drink_orders d JOIN participants p ON p.id = d.participant_id
         WHERE d.id = ?`
      )
      .bind(orderId)
      .first();

    return Response.json(order);
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};
