interface Env {
  DB: D1Database;
}

export const onRequestDelete: PagesFunction<Env> = async ({ params, env }) => {
  const id = params.id;

  try {
    await env.DB.prepare('DELETE FROM venue_selections WHERE id = ?').bind(id).run();
  } catch {
    // Table may not exist
  }

  return Response.json({ success: true });
};
