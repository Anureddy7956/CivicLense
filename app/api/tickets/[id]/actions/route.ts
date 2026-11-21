import { ActionError, applyAction, decodePhoto } from "@/lib/server/db";
import { TriageError } from "@/lib/server/triage";
import { parseLatLng } from "@/lib/tickets";
import { ACTION_RULES, type Action } from "@/lib/workflow";
import { ROLES, type Role, type VerifyOutcome } from "@/lib/types";

export const maxDuration = 30; // evidence capture runs the AI photo match

/**
 * Workflow actions. Body: { action, role, note?, outcome?, photo?, lat?, lng?, accuracyM? }.
 * The server checks that the role may perform the action from the ticket's current status.
 * (Demo: role comes from the role switcher; a real deployment would take it from the login session.)
 */
export async function POST(request: Request, ctx: RouteContext<"/api/tickets/[id]/actions">) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "Invalid request." }, { status: 400 });

  const action = body.action as Action;
  const role = body.role as Role;
  if (!(action in ACTION_RULES)) return Response.json({ error: "Unknown action." }, { status: 400 });
  if (!ROLES.includes(role)) return Response.json({ error: "Unknown role." }, { status: 400 });

  let photo = null;
  if (typeof body.photo === "string" && body.photo) {
    if (body.photo.length > 1_500_000) return Response.json({ error: "Photo is too large." }, { status: 413 });
    photo = decodePhoto(body.photo);
    if (!photo) return Response.json({ error: "Unsupported photo format." }, { status: 415 });
  }
  const { lat, lng } = parseLatLng(body.lat, body.lng);
  const accuracyM = typeof body.accuracyM === "number" && Number.isFinite(body.accuracyM) ? Math.round(body.accuracyM) : null;

  try {
    const ticket = await applyAction(id, {
      action,
      role,
      note: typeof body.note === "string" ? body.note : undefined,
      outcome: body.outcome as VerifyOutcome | undefined,
      photo,
      lat,
      lng,
      accuracyM,
    });
    return Response.json({ ticket });
  } catch (err) {
    if (err instanceof ActionError || err instanceof TriageError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error("[actions] failed:", err);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
