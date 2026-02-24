interface Env {
  DB: D1Database;
}

// PUT: Update arrival status (arrived, dismissed)
export const onRequest: PagesFunction<Env> = async (context) => {
  const db = context.env.DB;
  const arrivalId = parseInt(context.params.id as string, 10);

  if (context.request.method === 'PUT') {
    const body = (await context.request.json()) as {
      status?: 'approaching' | 'arrived' | 'dismissed';
      eta_minutes?: number;
    };

    const sets: string[] = [];
    const values: (string | number)[] = [];

    if (body.status) {
      sets.push('status = ?');
      values.push(body.status);
    }
    if (body.eta_minutes !== undefined) {
      sets.push('eta_minutes = ?');
      values.push(body.eta_minutes);
    }

    if (sets.length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(arrivalId);
    await db
      .prepare(`UPDATE arrivals SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    const arrival = await db
      .prepare(
        `SELECT a.*, p.name as participant_name
         FROM arrivals a JOIN participants p ON p.id = a.participant_id
         WHERE a.id = ?`
      )
      .bind(arrivalId)
      .first();

    return Response.json(arrival);
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};
