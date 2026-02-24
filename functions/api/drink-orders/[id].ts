interface Env {
  DB: D1Database;
}

// DELETE: Remove a drink order
export const onRequest: PagesFunction<Env> = async (context) => {
  const db = context.env.DB;
  const orderId = parseInt(context.params.id as string, 10);

  if (context.request.method === 'DELETE') {
    await db.prepare('DELETE FROM drink_orders WHERE id = ?').bind(orderId).run();
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};
