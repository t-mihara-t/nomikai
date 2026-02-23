interface Env {
  DB: D1Database;
}

export const onRequestDelete: PagesFunction<Env> = async ({ params, env }) => {
  const id = params.id;

  await env.DB.prepare('DELETE FROM candidate_dates WHERE id = ?').bind(id).run();

  return Response.json({ success: true });
};
