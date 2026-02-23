interface Env {
  DB: D1Database;
}

// Batch upsert responses for a participant
export const onRequestPost: PagesFunction<Env> = async ({ params, request, env }) => {
  const eventId = params.id;
  const body = await request.json<{
    participant_id: number;
    responses: Array<{
      candidate_date_id: number;
      status: 'attending' | 'absent' | 'pending';
      after_party_status?: 'attending' | 'absent' | 'pending';
    }>;
  }>();

  if (!body.participant_id || !body.responses || !Array.isArray(body.responses)) {
    return Response.json({ error: 'participant_id and responses are required' }, { status: 400 });
  }

  // Verify participant belongs to this event
  const participant = await env.DB.prepare(
    'SELECT id FROM participants WHERE id = ? AND event_id = ?'
  )
    .bind(body.participant_id, eventId)
    .first();

  if (!participant) {
    return Response.json({ error: 'Participant not found in this event' }, { status: 404 });
  }

  const statements = body.responses.map((r) =>
    env.DB.prepare(
      `INSERT INTO participant_responses (participant_id, candidate_date_id, status, after_party_status)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(participant_id, candidate_date_id) DO UPDATE SET
         status = excluded.status,
         after_party_status = excluded.after_party_status`
    ).bind(body.participant_id, r.candidate_date_id, r.status, r.after_party_status || null)
  );

  try {
    await env.DB.batch(statements);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to save responses' },
      { status: 500 }
    );
  }

  // Return all responses for this participant
  const { results } = await env.DB.prepare(
    'SELECT * FROM participant_responses WHERE participant_id = ?'
  )
    .bind(body.participant_id)
    .all();

  return Response.json(results);
};
