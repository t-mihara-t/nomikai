interface Env {
  DB: D1Database;
}

// GET: List custom venue links for an event
// POST: Add a custom venue link (Google Maps URL, etc.)
export const onRequest: PagesFunction<Env> = async (context) => {
  const db = context.env.DB;
  const eventId = parseInt(context.params.id as string, 10);

  if (context.request.method === 'GET') {
    const links = await db
      .prepare('SELECT * FROM custom_venue_links WHERE event_id = ? ORDER BY venue_type, created_at ASC')
      .bind(eventId)
      .all();
    return Response.json(links.results);
  }

  if (context.request.method === 'POST') {
    const body = (await context.request.json()) as {
      venue_type: 'primary' | 'after_party';
      label: string;
      url: string;
    };

    if (!body.label || !body.url) {
      return Response.json({ error: 'label and url are required' }, { status: 400 });
    }

    const result = await db
      .prepare('INSERT INTO custom_venue_links (event_id, venue_type, label, url) VALUES (?, ?, ?, ?)')
      .bind(eventId, body.venue_type || 'primary', body.label, body.url)
      .run();

    const link = await db
      .prepare('SELECT * FROM custom_venue_links WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first();

    return Response.json(link, { status: 201 });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};
