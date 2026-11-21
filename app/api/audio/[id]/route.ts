import { readAudio } from "@/lib/server/db";

/** Plays back a ticket's voice complaint. */
export async function GET(_request: Request, ctx: RouteContext<"/api/audio/[id]">) {
  const { id } = await ctx.params;
  const audio = await readAudio(id);
  if (!audio) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(audio.bytes), {
    headers: {
      "Content-Type": audio.mime,
      "Content-Length": String(audio.bytes.length),
      "Accept-Ranges": "none",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
