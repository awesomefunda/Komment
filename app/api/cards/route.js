import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateShortCode } from "@/lib/utils";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// GET /api/cards?tab=trending|fresh|top&page=0
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get("tab") || "trending";
  const page = parseInt(searchParams.get("page") || "0", 10);
  const limit = 20;
  const offset = page * limit;

  let query = supabase
    .from("cards")
    .select("*")
    .eq("is_hidden", false)
    .range(offset, offset + limit - 1);

  if (tab === "top") {
    query = query.order("shares", { ascending: false });
  } else {
    // fresh (default): newest first
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ cards: data || [] });
}

// POST /api/cards — create a new card
// Body: { comment_text, credit_name, context_desc, original_link, platform, vibe, post_to_feed }
// post_to_feed=true  → is_hidden=false (card appears in feed)
// post_to_feed=false → is_hidden=true  (card exists for the share link only)
export async function POST(request) {
  try {
    const body = await request.json();
    const { comment_text, credit_name, context_desc, original_link, platform, vibe, post_to_feed } = body;

    // Validation
    if (!comment_text || comment_text.trim().length === 0) {
      return NextResponse.json({ error: "Comment is required" }, { status: 400 });
    }
    if (!context_desc || context_desc.trim().length === 0) {
      return NextResponse.json({ error: "Context is required" }, { status: 400 });
    }
    if (comment_text.length > 500) {
      return NextResponse.json({ error: "Comment too long (max 500 chars)" }, { status: 400 });
    }

    // Generate unique short code
    let short_code = generateShortCode();
    let attempts = 0;
    while (attempts < 10) {
      const { data: existing } = await getAdminClient()
        .from("cards")
        .select("id")
        .eq("short_code", short_code)
        .single();
      if (!existing) break;
      short_code = generateShortCode();
      attempts++;
    }

    const is_hidden = post_to_feed === false;

    const { data, error } = await getAdminClient()
      .from("cards")
      .insert({
        comment_text: comment_text.trim(),
        credit_name: (credit_name || "anonymous").trim().slice(0, 50),
        context_desc: context_desc.trim().slice(0, 500),
        original_link: original_link?.trim() || null,
        platform: platform || "other",
        vibe: vibe || "roast",
        views: 0,
        shares: 0,
        clickthroughs: 0,
        report_count: 0,
        is_hidden,
        short_code,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ card: data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
