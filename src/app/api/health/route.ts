import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "online",
    module: "comunidade",
    name: "CODEX Community",
    port: 3004,
    ts: Date.now(),
  });
}
