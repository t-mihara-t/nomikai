interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async ({ params, request, env }) => {
  const parentEventId = params.id;
  const body = await request.json<{
    participant_ids: number[];
  }>();

  // Get parent event
  const parentEvent = await env.DB.prepare('SELECT * FROM events WHERE id = ?')
    .bind(parentEventId)
    .first();

  if (!parentEvent) {
    return Response.json({ error: 'Parent event not found' }, { status: 404 });
  }

  // Check if after-party event already exists
  try {
    const existing = await env.DB.prepare('SELECT id FROM events WHERE parent_event_id = ?')
      .bind(parentEventId)
      .first();
    if (existing) {
      return Response.json({ error: '二次会イベントは既に作成されています' }, { status: 400 });
    }
  } catch {
    // parent_event_id column may not exist yet
  }

  // Create after-party event
  let afterPartyEvent;
  try {
    afterPartyEvent = await env.DB.prepare(
      `INSERT INTO events (name, date, drinker_ratio, has_after_party, paypay_id, kampa_amount, parent_event_id)
       VALUES (?, ?, ?, 0, ?, 0, ?)
       RETURNING *`
    )
      .bind(
        `${parentEvent.name}（二次会）`,
        parentEvent.date,
        parentEvent.drinker_ratio,
        parentEvent.paypay_id || null,
        parentEventId
      )
      .first();
  } catch {
    // Fallback without kampa_amount and parent_event_id columns
    afterPartyEvent = await env.DB.prepare(
      `INSERT INTO events (name, date, drinker_ratio, has_after_party, paypay_id)
       VALUES (?, ?, ?, 0, ?)
       RETURNING *`
    )
      .bind(
        `${parentEvent.name}（二次会）`,
        parentEvent.date,
        parentEvent.drinker_ratio,
        parentEvent.paypay_id || null
      )
      .first();
  }

  if (!afterPartyEvent) {
    return Response.json({ error: 'Failed to create after-party event' }, { status: 500 });
  }

  // Copy selected participants to after-party event
  if (body.participant_ids.length > 0) {
    const { results: participants } = await env.DB.prepare(
      `SELECT * FROM participants WHERE event_id = ? AND id IN (${body.participant_ids.map(() => '?').join(',')})`
    )
      .bind(parentEventId, ...body.participant_ids)
      .all();

    if (participants.length > 0) {
      const batch = participants.map((p) =>
        env.DB.prepare(
          `INSERT INTO participants (event_id, name, status, is_drinker, multiplier, discount_rate)
           VALUES (?, ?, 'attending', ?, ?, ?)`
        ).bind(
          afterPartyEvent!.id,
          p.name,
          p.is_drinker,
          (p.multiplier as number) || 1.0,
          (p.discount_rate as number) || 0.0
        )
      );
      await env.DB.batch(batch);
    }
  }

  return Response.json(afterPartyEvent);
};
