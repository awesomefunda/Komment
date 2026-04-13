import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const VALID_REASONS = ["hate_speech", "harassment", "spam", "not_real"];

// POST /api/cards/[id]/report
export async function POST(request, { params }) {
  const { id } = params;

  try {
    const body = await request.json();
    const { reason, device_hash } = body;

    if (!reason || !VALID_REASONS.includes(reason)) {
      return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
    }

    // Check if this device already reported this card
    if (device_hash) {
      const { data: existing } = await supabase
        .from("reports")
        .select("id")
        .eq("card_id", id)
        .eq("device_hash", device_hash)
        .limit(1);

      if (existing && existing.length > 0) {
        return NextResponse.json({ error: "Already reported" }, { status: 409 });
      }
    }

    // Insert report (trigger auto-updates card.report_count and card.is_hidden)
    const { error } = await supabase.from("reports").insert({
      card_id: id,
      reason,
      device_hash: device_hash || null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
