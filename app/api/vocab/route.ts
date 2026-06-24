import { NextResponse } from "next/server";
import { loadVocab } from "@/lib/vocab";

export async function GET() {
  const vocab = await loadVocab();
  return NextResponse.json({ vocab });
}
