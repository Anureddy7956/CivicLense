import { loadSamples, removeSamples } from "@/lib/server/db";

/** Load demo tickets at every workflow stage (real tickets are kept). */
export async function POST() {
  const count = await loadSamples();
  return Response.json({ loaded: count });
}

/** Remove all demo tickets. */
export async function DELETE() {
  const count = await removeSamples();
  return Response.json({ removed: count });
}
