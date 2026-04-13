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

// GET /api/cards?tab=fresh|top&page=0
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get("tab") || "fresh";
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
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cards: data || [] });
}

// POST /api/cards — create a new card
export async function POST(request) {
  try {
    const body = await request.json();
    const { comment_text, credit_name, context_desc, original_link, image_url, platform, vibe, post_to_feed } = body;

    if (!comment_text || comment_text.trim().length === 0)
      return NextResponse.json({ error: "Comment is required" }, { status: 400 });
    const EMBED_PLATFORMS = ["instagram", "tiktok", "youtube", "x"];
    const needsContext = !EMBED_PLATFORMS.includes(platform) || !original_link?.trim();
    if (needsContext && (!context_desc || context_desc.trim().length === 0))
      return NextResponse.json({ error: "Context is required" }, { status: 400 });
    if (comment_text.length > 500)
      return NextResponse.json({ error: "Comment too long (max 500 chars)" }, { status: 400 });

    // Unique short code
    let short_code = generateShortCode();
    for (let i = 0; i < 10; i++) {
      const { data: existing } = await getAdminClient()
        .from("cards").select("id").eq("short_code", short_code).single();
      if (!existing) break;
      short_code = generateShortCode();
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
        views: 0, shares: 0, clickthroughs: 0, report_count: 0,
        is_hidden, short_code,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Fetch and permanently store the post image in Supabase Storage.
    // Priority: user-supplied image_url > auto-fetched via Microlink
    const card = { ...data };
    const imageSource = image_url?.trim() || (original_link?.trim() ? null : null);
    try {
      let screenshotUrl = null;
      if (image_url?.trim()) {
        // User pasted a direct image URL — download and store it as-is
        screenshotUrl = await downloadAndStore(image_url.trim(), short_code);
      } else if (original_link?.trim()) {
        // Auto-fetch via Microlink
        screenshotUrl = await fetchAndStoreImage(original_link.trim(), short_code);
      }
      if (screenshotUrl) {
        await getAdminClient()
          .from("cards")
          .update({ screenshot_url: screenshotUrl })
          .eq("id", card.id);
        card.screenshot_url = screenshotUrl;
      }
    } catch {
      // Image storage failed — card still created, image fetched lazily in feed
    }

    return NextResponse.json({ card }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// ─── Image fetch + Supabase Storage ──────────────────────────────────────────

// Download a direct image URL and store it in Supabase Storage
async function downloadAndStore(imageUrl, short_code) {
  const imgRes = await fetch(imageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Referer: "https://www.instagram.com/",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!imgRes.ok) return null;

  const contentType = imgRes.headers.get("content-type") || "image/jpeg";
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const buffer = Buffer.from(await imgRes.arrayBuffer());

  const admin = getAdminClient();
  await admin.storage.createBucket("card-images", { public: true }).catch(() => {});
  const filePath = `${short_code}.${ext}`;
  const { error } = await admin.storage.from("card-images").upload(filePath, buffer, { contentType, upsert: true });
  if (error) return null;
  return admin.storage.from("card-images").getPublicUrl(filePath).data.publicUrl;
}

async function fetchAndStoreImage(pageUrl, short_code) {
  // Get the image URL via Microlink (handles Instagram, Reddit, Twitter)
  const imageUrl = await getOgImageUrl(pageUrl);
  if (!imageUrl) return null;

  // Download the image server-side (bypasses CORS, uses original signed URL)
  const imgRes = await fetch(imageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Referer: "https://www.instagram.com/",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!imgRes.ok) return null;

  const contentType = imgRes.headers.get("content-type") || "image/jpeg";
  const ext = contentType.includes("png") ? "png" : "jpg";
  const arrayBuffer = await imgRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Ensure bucket exists
  const admin = getAdminClient();
  await admin.storage.createBucket("card-images", { public: true }).catch(() => {});

  // Upload to Supabase Storage
  const filePath = `${short_code}.${ext}`;
  const { error: uploadError } = await admin.storage
    .from("card-images")
    .upload(filePath, buffer, { contentType, upsert: true });

  if (uploadError) return null;

  const { data: { publicUrl } } = admin.storage
    .from("card-images")
    .getPublicUrl(filePath);

  return publicUrl;
}

async function getOgImageUrl(pageUrl) {
  // Strip Instagram comment_id param so we fetch the post, not a comment anchor
  let cleanUrl = pageUrl;
  try {
    const u = new URL(pageUrl);
    u.searchParams.delete("comment_id");
    u.searchParams.delete("igsh");
    cleanUrl = u.toString();
  } catch {}

  try {
    const res = await fetch(
      `https://api.microlink.io/?url=${encodeURIComponent(cleanUrl)}&screenshot=false&meta=true`,
      { headers: { "User-Agent": "KommentBot/1.0" }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== "success") return null;
    return json.data?.image?.url || null;
  } catch {
    return null;
  }
}
