import { listTickets } from "@/lib/server/db";
import { TriageError, draftComplaintEmail } from "@/lib/server/triage";
import { accountabilityFor } from "@/lib/wards";
import { mapsUrl } from "@/lib/workflow";
import { STATUS_LABEL } from "@/lib/types";

export const maxDuration = 30;

/** AI-drafted formal complaint email for a ticket: { to, subject, body }. */
export async function POST(_request: Request, ctx: RouteContext<"/api/tickets/[id]/complaint">) {
  const { id } = await ctx.params;
  const t = (await listTickets()).find((x) => x.id === id);
  if (!t) return Response.json({ error: "Ticket not found." }, { status: 404 });

  const acc = accountabilityFor(t);
  const v = t.verification;
  const facts = {
    ticket_id: t.id,
    reported_on: new Date(t.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
    department: t.triage.department,
    issue_title: t.triage.title,
    issue_summary: t.triage.english_summary,
    category: t.triage.category,
    severity: t.triage.severity,
    severity_reason: t.triage.severity_reason,
    area: t.area || null,
    ward: acc ? `Ward ${acc.ward.number} – ${acc.ward.name}` : null,
    gps: t.lat != null && t.lng != null ? `${t.lat}, ${t.lng}` : null,
    map_link: t.lat != null && t.lng != null ? mapsUrl(t) : null,
    photo_evidence: t.photoUrl ? `Citizen photo on file${t.triage.photo_observation ? `: ${t.triage.photo_observation}` : ""}` : "No photo attached",
    voice_evidence: t.voice ? `Voice complaint recorded in ${t.voice.language}` : null,
    current_status: STATUS_LABEL[t.status],
    field_verification: v?.outcome ? `${v.outcome} on site${v.note ? `: ${v.note}` : ""}` : "Not yet verified on site",
    citizens_reporting: t.reportsCount,
    responsible_officer: acc ? `${acc.officer.name}, ${acc.officer.designation} (${acc.agency}), phone ${acc.officer.phone}` : null,
    road_contractor: acc?.contractor
      ? {
          name: acc.contractor.name,
          tender_number: acc.contractor.tender,
          maintenance_period: `${acc.contractor.maintenanceFrom} to ${acc.contractor.maintenanceTo}`,
          within_maintenance_period: acc.contractor.withinMaintenance,
        }
      : null,
  };

  try {
    const email = await draftComplaintEmail(facts);
    return Response.json({ email, demoData: Boolean(acc) });
  } catch (err) {
    if (err instanceof TriageError) {
      return Response.json({ error: "Couldn't draft the complaint right now. Please try again." }, { status: err.status });
    }
    console.error("[complaint] failed:", err);
    return Response.json({ error: "Couldn't draft the complaint right now. Please try again." }, { status: 500 });
  }
}
