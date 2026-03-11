interface Env {
  DB: D1Database;
}

async function ensureParticipantColumns(db: D1Database): Promise<void> {
  const stmts = [
    'ALTER TABLE participants ADD COLUMN multiplier REAL NOT NULL DEFAULT 1.0',
    'ALTER TABLE participants ADD COLUMN discount_rate REAL NOT NULL DEFAULT 0.0',
    'ALTER TABLE participants ADD COLUMN join_after_party INTEGER NOT NULL DEFAULT 0',
  ];
  for (const sql of stmts) {
    try { await db.prepare(sql).run(); } catch { /* column already exists */ }
  }
}

async function ensureEventColumns(db: D1Database): Promise<void> {
  const stmts = [
    'ALTER TABLE events ADD COLUMN has_after_party INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE events ADD COLUMN kampa_amount INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE events ADD COLUMN parent_event_id INTEGER REFERENCES events(id) ON DELETE SET NULL',
    'ALTER TABLE events ADD COLUMN auto_delete_at TEXT',
    'ALTER TABLE events ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1',
    'ALTER TABLE events ADD COLUMN line_user_id TEXT',
  ];
  for (const sql of stmts) {
    try { await db.prepare(sql).run(); } catch { /* column already exists */ }
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const id = params.id;

  // Ensure columns exist before querying
  await ensureEventColumns(env.DB);
  await ensureParticipantColumns(env.DB);

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

  // Fetch arrivals (Heroic Entry)
  let arrivals: Record<string, unknown>[] = [];
  try {
    const res = await env.DB.prepare(
      `SELECT a.*, p.name as participant_name
       FROM arrivals a
       JOIN participants p ON p.id = a.participant_id
       WHERE a.event_id = ? AND a.status != 'dismissed'
       ORDER BY a.created_at DESC`
    ).bind(id).all();
    arrivals = res.results;
  } catch {
    // arrivals table may not exist yet
  }

  // Fetch drink orders
  let drinkOrders: Record<string, unknown>[] = [];
  try {
    const res = await env.DB.prepare(
      `SELECT d.*, p.name as participant_name
       FROM drink_orders d
       JOIN participants p ON p.id = d.participant_id
       WHERE d.event_id = ?
       ORDER BY d.created_at DESC`
    ).bind(id).all();
    drinkOrders = res.results;
  } catch {
    // drink_orders table may not exist yet
  }

  // Fetch custom venue links
  let customVenueLinks: Record<string, unknown>[] = [];
  try {
    const res = await env.DB.prepare(
      'SELECT * FROM custom_venue_links WHERE event_id = ? ORDER BY venue_type, created_at ASC'
    ).bind(id).all();
    customVenueLinks = res.results;
  } catch {
    // custom_venue_links table may not exist yet
  }

  return Response.json({
    ...event,
    participants,
    candidate_dates: candidateDates,
    venue_selections: venueSelections,
    participant_responses: participantResponses,
    after_party_event: afterPartyEvent,
    arrivals,
    drink_orders: drinkOrders,
    custom_venue_links: customVenueLinks,
  });
};

export const onRequestPut: PagesFunction<Env> = async ({ params, request, env }) => {
  // Ensure event columns exist before updating
  await ensureEventColumns(env.DB);

  const id = params.id;
  const body = await request.json<{
    name?: string;
    date?: string;
    total_amount?: number;
    drinker_ratio?: number;
    has_after_party?: boolean;
    paypay_id?: string;
    kampa_amount?: number;
    auto_delete_at?: string;
    is_active?: boolean;
  }>();

  const event = await env.DB.prepare('SELECT * FROM events WHERE id = ?')
    .bind(id)
    .first();

  if (!event) {
    return Response.json({ error: 'Event not found' }, { status: 404 });
  }

  const result = await env.DB.prepare(
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
  try {
    await env.DB.prepare('DELETE FROM arrivals WHERE event_id = ?').bind(id).run();
  } catch {
    // arrivals table may not exist yet
  }
  try {
    await env.DB.prepare('DELETE FROM drink_orders WHERE event_id = ?').bind(id).run();
  } catch {
    // drink_orders table may not exist yet
  }
  try {
    await env.DB.prepare('DELETE FROM custom_venue_links WHERE event_id = ?').bind(id).run();
  } catch {
    // custom_venue_links table may not exist yet
  }
  await env.DB.prepare('DELETE FROM participants WHERE event_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM events WHERE id = ?').bind(id).run();

  return Response.json({ success: true });
};
