import { listTickets } from "@/lib/server/db";

/** One ticket (used by "Track by ticket ID"). */
export async function GET(_request: Request, ctx: RouteContext<"/api/tickets/[id]">) {
  const { id } = await ctx.params;
  const ticket = (await listTickets()).find((t) => t.id.toUpperCase() === id.toUpperCase());
  if (!ticket) return Response.json({ error: "No ticket with that ID." }, { status: 404 });
  return Response.json({ ticket }, { headers: { "Cache-Control": "no-store" } });
}
