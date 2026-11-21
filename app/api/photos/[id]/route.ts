import { readPhoto } from "@/lib/server/db";

/** Serves a ticket's photo from the local store. */
export async function GET(_request: Request, ctx: RouteContext<"/api/photos/[id]">) {
  const { id } = await ctx.params;
  const photo = await readPhoto(id);
  if (!photo) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(photo.bytes), {
    headers: {
      "Content-Type": photo.mime,
      "Cache-Control": "private, max-age=31536000, immutable", // a ticket's photo never changes
    },
  });
}
