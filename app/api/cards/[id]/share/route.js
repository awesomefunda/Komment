import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// POST /api/cards/[id]/share
export async function POST(request, { params }) {
  const { id } = params;
  const body = await request.json().catch(() => ({}));

  // Increment share count
  const { data: card } = await supabase
    .from("cards")
    .select("shares")
    .eq("id", id)
    .single();

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  await supabase
    .from("cards")
    .update({ shares: card.shares + 1 })
    .eq("id", id);

  // Log event
  await supabase.from("events").insert({
    card_id: id,
    event_type: "share",
    device_hash: body.device_hash || null,
  });

  return NextResponse.json({ success: true, shares: card.shares + 1 });
}
