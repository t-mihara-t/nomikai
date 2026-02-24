interface Env {
  DB: D1Database;
}

// POST: Activate Safe Exit mode - deactivate event and schedule deletion
export const onRequest: PagesFunction<Env> = async (context) => {
  const db = context.env.DB;
  const eventId = parseInt(context.params.id as string, 10);

  if (context.request.method === 'POST') {
    // Set auto_delete_at to next 4:00 AM JST (UTC+9)
    const now = new Date();
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const deleteAt = new Date(jstNow);
    deleteAt.setHours(4, 0, 0, 0);
    if (deleteAt <= jstNow) {
      deleteAt.setDate(deleteAt.getDate() + 1);
    }
    // Convert back to UTC for storage
    const deleteAtUtc = new Date(deleteAt.getTime() - 9 * 60 * 60 * 1000);
    const deleteAtStr = deleteAtUtc.toISOString().replace('T', ' ').substring(0, 19);

    try {
      // Deactivate event and set TTL
      await db
        .prepare(
          `UPDATE events SET is_active = 0, auto_delete_at = ? WHERE id = ?`
        )
        .bind(deleteAtStr, eventId)
        .run();

      // Also deactivate any child after-party events
      await db
        .prepare(
          `UPDATE events SET is_active = 0, auto_delete_at = ? WHERE parent_event_id = ?`
        )
        .bind(deleteAtStr, eventId)
        .run();

      // Delete location-sensitive data immediately
      await db
        .prepare(`DELETE FROM arrivals WHERE event_id = ?`)
        .bind(eventId)
        .run();

      // Get child event IDs to clean their arrivals too
      const children = await db
        .prepare(`SELECT id FROM events WHERE parent_event_id = ?`)
        .bind(eventId)
        .all();

      for (const child of children.results) {
        await db
          .prepare(`DELETE FROM arrivals WHERE event_id = ?`)
          .bind((child as { id: number }).id)
          .run();
      }
    } catch {
      // Fallback: if auto_delete_at column doesn't exist yet, just delete arrivals
      await db
        .prepare(`DELETE FROM arrivals WHERE event_id = ?`)
        .bind(eventId)
        .run();
    }

    return Response.json({ success: true, auto_delete_at: deleteAtStr });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
};
