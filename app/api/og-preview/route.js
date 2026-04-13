import { NextResponse } from "next/server";

// Simple in-memory cache (survives for the lifetime of the server process)
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// GET /api/og-preview?url=https://...
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  // Return cached result if fresh
  const cached = cache.get(url);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  // Try direct fetch first (works for many sites)
  const direct = await tryDirectFetch(url);
  if (direct?.image) {
    cache.set(url, { data: direct, ts: Date.now() });
    return NextResponse.json(direct);
  }

  // Fallback: Microlink free API — handles Instagram, Twitter, Reddit anti-bot
  const microlink = await tryMicrolink(url);
  if (microlink) {
    cache.set(url, { data: microlink, ts: Date.now() });
    return NextResponse.json(microlink);
  }

  // Return whatever we got from direct (even if no image)
  const result = direct || { error: "Could not fetch preview" };
  cache.set(url, { data: result, ts: Date.now() });
  return NextResponse.json(result);
}

async function tryDirectFetch(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return parseOG(html, url);
  } catch {
    return null;
  }
}

async function tryMicrolink(url) {
  try {
    const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=false&meta=true`;
    const res = await fetch(apiUrl, {
      headers: { "User-Agent": "KommentBot/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== "success" || !json.data) return null;
    const d = json.data;
    return {
      title: d.title || null,
      description: d.description || null,
      image: d.image?.url || d.logo?.url || null,
      site_name: d.publisher || null,
      url: d.url || url,
    };
  } catch {
    return null;
  }
}

function parseOG(html, pageUrl) {
  const get = (prop) => {
    // og: and twitter: tags
    const patterns = [
      new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, "i"),
      new RegExp(`<meta[^>]+name=["']twitter:${prop}["'][^>]+content=["']([^"']+)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:${prop}["']`, "i"),
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m) return decodeHTML(m[1].trim());
    }
    return null;
  };

  // Fallback title from <title> tag
  const titleFallback = html.match(/<title[^>]*>([^<]+)<\/title>/i);

  // For Instagram comment links, strip the comment_id so the base post URL is used
  const domain = (() => {
    try { return new URL(pageUrl).hostname.replace("www.", ""); } catch { return ""; }
  })();

  return {
    title: get("title") || (titleFallback ? decodeHTML(titleFallback[1].trim()) : null),
    description: get("description"),
    image: get("image"),
    site_name: get("site_name") || domain,
    url: get("url") || pageUrl,
  };
}

function decodeHTML(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
