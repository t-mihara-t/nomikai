interface Env {
  DB: D1Database;
}

export const onRequestPut: PagesFunction<Env> = async ({ params, request, env }) => {
  const eventId = params.id;
  const body = await request.json<{
    participant_ids: number[];
    updates: {
      status?: 'attending' | 'absent' | 'pending';
      is_drinker?: boolean;
    };
  }>();

  if (!body.participant_ids || body.participant_ids.length === 0) {
    return Response.json({ error: 'participant_ids is required' }, { status: 400 });
  }

  const batch = [];
  for (const pid of body.participant_ids) {
    const sets: string[] = [];
    const values: (string | number)[] = [];

    if (body.updates.status) {
      sets.push('status = ?');
      values.push(body.updates.status);
    }
    if (body.updates.is_drinker !== undefined) {
      sets.push('is_drinker = ?');
      values.push(body.updates.is_drinker ? 1 : 0);
    }

    if (sets.length > 0) {
      values.push(pid);
      values.push(eventId as string | number);
      batch.push(
        env.DB.prepare(
          `UPDATE participants SET ${sets.join(', ')} WHERE id = ? AND event_id = ?`
        ).bind(...values)
      );
    }
  }

  if (batch.length > 0) {
    await env.DB.batch(batch);
  }

  return Response.json({ success: true });
};
