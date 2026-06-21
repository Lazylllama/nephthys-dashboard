import { getStats } from "@/lib/nephthys";

export async function GET() {
  try {
    return Response.json(await getStats());
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Upstream failed" },
      { status: 502 },
    );
  }
}
