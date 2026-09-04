import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Appends to the audit log as the signed-in user. The RLS policy only accepts
 * an entry whose actor is the caller, so nobody can forge someone else's trail.
 */
export async function recordAudit(entry: {
  actorProfileId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = await createServerSupabase();
  await supabase.from("audit_log").insert({
    actor_user_id: entry.actorProfileId ?? null,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId ?? null,
    metadata: (entry.metadata ?? {}) as never,
  });
}
