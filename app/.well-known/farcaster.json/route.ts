import { NextResponse } from "next/server";
import { farcasterManifest } from "@/lib/farcaster";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(farcasterManifest, {
    headers: {
      "Cache-Control": "public, max-age=300"
    }
  });
}
