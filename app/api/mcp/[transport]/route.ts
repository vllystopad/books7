import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ transport: string }> }
) {
  const { transport } = await params;
  return NextResponse.json({ message: `MCP endpoint [${transport}] - Stage 4` });
}
