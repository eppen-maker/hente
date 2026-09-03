import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function recordAudit(entry: {
  actorProfileId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createAdminSupabase();
  await supabase.from("audit_log").insert({
    actor_user_id: entry.actorProfileId ?? null,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId ?? null,
    metadata: (entry.metadata ?? {}) as never,
  });
}
