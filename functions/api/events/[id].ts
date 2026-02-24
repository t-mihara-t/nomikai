interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const id = params.id;

  const event = await env.DB.prepare('SELECT * FROM events WHERE id = ?')
    .bind(id)
    .first();

  if (!event) {
    return Response.json({ error: 'Event not found' }, { status: 404 });
  }

  const { results: participants } = await env.DB.prepare(
    'SELECT * FROM participants WHERE event_id = ? ORDER BY created_at ASC'
  )
    .bind(id)
    .all();

  let candidateDates: Record<string, unknown>[] = [];
  try {
    const res = await env.DB.prepare(
      'SELECT * FROM candidate_dates WHERE event_id = ? ORDER BY date_time ASC'
    )
      .bind(id)
      .all();
    candidateDates = res.results;
  } catch {
    // candidate_dates table may not exist yet
  }

  let venueSelections: Record<string, unknown>[] = [];
  try {
    const res = await env.DB.prepare(
      'SELECT * FROM venue_selections WHERE event_id = ? ORDER BY venue_type, created_at ASC'
    )
      .bind(id)
      .all();
    venueSelections = res.results.map((v) => ({
      id: v.id,
      event_id: v.event_id,
      venue_type: v.venue_type,
      restaurant: JSON.parse(v.restaurant_data as string),
      created_at: v.created_at,
    }));
  } catch {
    // venue_selections table may not exist yet
  }

  // Fetch participant responses
  let participantResponses: Record<string, unknown>[] = [];
  try {
    const res = await env.DB.prepare(
      `SELECT pr.* FROM participant_responses pr
       JOIN participants p ON pr.participant_id = p.id
       WHERE p.event_id = ?`
    )
      .bind(id)
      .all();
    participantResponses = res.results;
  } catch {
    // participant_responses table may not exist yet
  }

  // Check for after-party event
  let afterPartyEvent = null;
  try {
    const apEvent = await env.DB.prepare('SELECT * FROM events WHERE parent_event_id = ?')
      .bind(id)
      .first();
    if (apEvent) {
      const { results: apParticipants } = await env.DB.prepare(
        'SELECT * FROM participants WHERE event_id = ? ORDER BY created_at ASC'
      ).bind(apEvent.id).all();
      afterPartyEvent = { ...apEvent, participants: apParticipants, venue_selections: [], participant_responses: [] };
    }
  } catch {
    // parent_event_id column may not exist yet
  }

  return Response.json({
    ...event,
    participants,
    candidate_dates: candidateDates,
    venue_selections: venueSelections,
    participant_responses: participantResponses,
    after_party_event: afterPartyEvent,
  });
};

export const onRequestPut: PagesFunction<Env> = async ({ params, request, env }) => {
  const id = params.id;
  const body = await request.json<{
    name?: string;
    date?: string;
    total_amount?: number;
    drinker_ratio?: number;
    has_after_party?: boolean;
    paypay_id?: string;
    kampa_amount?: number;
  }>();

  const event = await env.DB.prepare('SELECT * FROM events WHERE id = ?')
    .bind(id)
    .first();

  if (!event) {
    return Response.json({ error: 'Event not found' }, { status: 404 });
  }

  let result: Record<string, unknown> | null = null;
  try {
    result = await env.DB.prepare(
      `UPDATE events SET
        name = COALESCE(?, name),
        date = COALESCE(?, date),
        total_amount = COALESCE(?, total_amount),
        drinker_ratio = COALESCE(?, drinker_ratio),
        has_after_party = COALESCE(?, has_after_party),
        paypay_id = COALESCE(?, paypay_id),
        kampa_amount = COALESCE(?, kampa_amount)
      WHERE id = ? RETURNING *`
    )
      .bind(
        body.name || null,
        body.date || null,
        body.total_amount ?? null,
        body.drinker_ratio ?? null,
        body.has_after_party !== undefined ? (body.has_after_party ? 1 : 0) : null,
        body.paypay_id ?? null,
        body.kampa_amount ?? null,
        id
      )
      .first();
  } catch {
    result = await env.DB.prepare(
      `UPDATE events SET
        name = COALESCE(?, name),
        date = COALESCE(?, date),
        total_amount = COALESCE(?, total_amount),
        drinker_ratio = COALESCE(?, drinker_ratio),
        paypay_id = COALESCE(?, paypay_id)
      WHERE id = ? RETURNING *`
    )
      .bind(
        body.name || null,
        body.date || null,
        body.total_amount ?? null,
        body.drinker_ratio ?? null,
        body.paypay_id ?? null,
        id
      )
      .first();
  }

  return Response.json(result);
};

export const onRequestDelete: PagesFunction<Env> = async ({ params, env }) => {
  const id = params.id;

  try {
    await env.DB.prepare('DELETE FROM candidate_dates WHERE event_id = ?').bind(id).run();
  } catch {
    // candidate_dates table may not exist yet
  }
  try {
    await env.DB.prepare('DELETE FROM venue_selections WHERE event_id = ?').bind(id).run();
  } catch {
    // venue_selections table may not exist yet
  }
  await env.DB.prepare('DELETE FROM participants WHERE event_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM events WHERE id = ?').bind(id).run();

  return Response.json({ success: true });
};
