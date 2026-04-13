#!/usr/bin/env python3
"""
Komment Scraper — finds viral comments and posts them to the Komment feed.

Usage:
    python scripts/scraper.py                        # interactive: review each before posting
    python scripts/scraper.py --auto                 # post top result automatically
    python scripts/scraper.py --source reddit        # reddit only
    python scripts/scraper.py --source twitter       # twitter/nitter only
    python scripts/scraper.py --limit 10             # fetch 10 candidates (default 5)
    python scripts/scraper.py --api http://localhost:3000  # point at local or prod

Future flags (not yet wired):
    --discord   send approval card to Discord webhook instead of posting directly
    --dry-run   print candidates without posting anything
"""

import argparse
import json
import sys
import textwrap
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime, timezone

# ─── Config ────────────────────────────────────────────────────────────────────

DEFAULT_API = "http://localhost:3000"

# Subreddits to pull from. Top comment from each post's top thread.
SUBREDDITS = [
    "AskReddit",
    "worldnews",
    "technology",
    "todayilearned",
    "science",
    "interestingasfuck",
    "unpopularopinion",
]

# Minimum score for a comment to be considered viral
MIN_COMMENT_SCORE = 500

# Nitter instances (public, no auth). Falls back to next if one is down.
NITTER_INSTANCES = [
    "nitter.net",
    "nitter.privacydev.net",
    "nitter.poast.org",
]

# Twitter search query for viral replies/quote tweets
TWITTER_SEARCH = "min_faves:5000 filter:replies"

PLATFORM_MAP = {
    "reddit": "reddit",
    "twitter": "x",
    "x": "x",
    "linkedin": "linkedin",
    "instagram": "instagram",
    "tiktok": "tiktok",
    "youtube": "youtube",
}

# ─── HTTP helper ───────────────────────────────────────────────────────────────

def fetch_json(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {
        "User-Agent": "Mozilla/5.0 (compatible; KommentBot/1.0)"
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read().decode())
    except (urllib.error.URLError, json.JSONDecodeError) as e:
        print(f"  ! fetch failed: {url}\n    {e}")
        return None


def fetch_text(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {
        "User-Agent": "Mozilla/5.0 (compatible; KommentBot/1.0)"
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.read().decode(errors="replace")
    except urllib.error.URLError as e:
        return None

# ─── Reddit scraper ────────────────────────────────────────────────────────────

def fetch_reddit_candidates(limit=5):
    """Fetch top comments from Reddit's top daily posts across configured subreddits."""
    candidates = []
    posts_checked = 0
    target = limit * 3  # fetch more posts than needed to find good comments

    for sub in SUBREDDITS:
        if len(candidates) >= target:
            break
        url = f"https://www.reddit.com/r/{sub}/top.json?t=day&limit=5"
        data = fetch_json(url)
        if not data:
            continue

        posts = data.get("data", {}).get("children", [])
        for post in posts:
            p = post["data"]
            post_title = p.get("title", "")
            post_url = f"https://reddit.com{p.get('permalink', '')}"
            post_score = p.get("score", 0)

            # Skip if post isn't popular enough to have viral comments
            if post_score < 1000:
                continue

            posts_checked += 1
            permalink = p.get("permalink", "").rstrip("/")
            comments_url = f"https://www.reddit.com{permalink}.json?sort=top&limit=5"
            cdata = fetch_json(comments_url)
            if not cdata or len(cdata) < 2:
                continue

            comments = cdata[1].get("data", {}).get("children", [])
            for comment in comments:
                c = comment.get("data", {})
                body = c.get("body", "").strip()
                score = c.get("score", 0)
                author = c.get("author", "anonymous")
                comment_url = f"https://reddit.com{c.get('permalink', '')}"

                # Skip low-quality
                if score < MIN_COMMENT_SCORE:
                    continue
                if len(body) < 20 or len(body) > 480:
                    continue
                if body in ("[deleted]", "[removed]"):
                    continue

                candidates.append({
                    "comment_text": body,
                    "credit_name": f"u/{author}",
                    "context_desc": post_title,
                    "original_link": comment_url,
                    "platform": "reddit",
                    "score": score,
                    "source_label": f"r/{sub} | {score:,} upvotes",
                })

    # Sort by score, return top N
    candidates.sort(key=lambda x: x["score"], reverse=True)
    return candidates[:limit]


# ─── Twitter/Nitter scraper ────────────────────────────────────────────────────

def fetch_twitter_candidates(limit=5):
    """
    Fetch viral replies/tweets via Nitter RSS (no API key required).
    Nitter is a public Twitter frontend — instances can be unreliable.
    """
    candidates = []

    for instance in NITTER_INSTANCES:
        query = urllib.parse.quote("min_faves:2000 filter:replies -filter:retweets lang:en")
        url = f"https://{instance}/search/rss?q={query}&f=tweets"
        text = fetch_text(url)
        if not text:
            continue

        # Parse RSS manually (avoid xml dependency)
        items = text.split("<item>")[1:]
        for item in items[:limit * 2]:
            title = _xml_val(item, "title")
            link = _xml_val(item, "link")
            desc = _xml_val(item, "description")
            creator = _xml_val(item, "dc:creator")

            if not title or not link:
                continue

            # Strip HTML tags from description
            import re
            desc_clean = re.sub(r"<[^>]+>", "", desc or "").strip()
            title_clean = re.sub(r"<[^>]+>", "", title).strip()

            # Use title as the comment text (Nitter puts tweet text in title)
            comment = title_clean.replace("RT by", "").strip()
            if len(comment) < 20 or len(comment) > 480:
                continue

            candidates.append({
                "comment_text": comment,
                "credit_name": creator or "anonymous",
                "context_desc": desc_clean[:300] if desc_clean else "Viral tweet",
                "original_link": link,
                "platform": "x",
                "score": 2000,  # minimum by our filter
                "source_label": f"Twitter via {instance}",
            })

            if len(candidates) >= limit:
                break

        if candidates:
            break  # got results from this instance, done

    return candidates[:limit]


def _xml_val(xml, tag):
    start = xml.find(f"<{tag}>")
    end = xml.find(f"</{tag}>")
    if start == -1 or end == -1:
        return ""
    val = xml[start + len(tag) + 2:end].strip()
    # Strip CDATA
    if val.startswith("<![CDATA["):
        val = val[9:]
    if val.endswith("]]>"):
        val = val[:-3]
    return val.strip()


# ─── Post to Komment API ───────────────────────────────────────────────────────

def post_to_komment(candidate, api_base, post_to_feed=True):
    url = f"{api_base}/api/cards"
    payload = json.dumps({
        "comment_text": candidate["comment_text"],
        "credit_name": candidate["credit_name"],
        "context_desc": candidate["context_desc"],
        "original_link": candidate["original_link"],
        "platform": candidate["platform"],
        "post_to_feed": post_to_feed,
    }).encode()

    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read().decode())
            return data.get("card")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  ERR API error {e.code}: {body}")
        return None
    except urllib.error.URLError as e:
        print(f"  ERR Network error: {e}")
        return None


# ─── Display ──────────────────────────────────────────────────────────────────

def display_candidate(i, total, c):
    w = 70
    print()
    print("-" * w)
    print(f"  [{i}/{total}]  {c['source_label']}")
    print("-" * w)
    print()

    # Comment text — wrapped
    for line in textwrap.wrap(f'"{c["comment_text"]}"', w - 4):
        print(f"    {line}")
    print()
    print(f"    -- {c['credit_name']}")
    print()
    print(f"  Context:  {c['context_desc'][:80]}{'…' if len(c['context_desc']) > 80 else ''}")
    print(f"  Platform: {c['platform']}")
    print(f"  Link:     {c['original_link']}")
    print()


def prompt_action():
    print("  [p] Post to feed   [s] Skip   [q] Quit")
    while True:
        try:
            choice = input("  > ").strip().lower()
        except (KeyboardInterrupt, EOFError):
            return "q"
        if choice in ("p", "s", "q"):
            return choice
        print("  Type p, s, or q")


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Komment viral comment scraper")
    parser.add_argument("--source", choices=["reddit", "twitter", "all"], default="all")
    parser.add_argument("--limit", type=int, default=5, help="Max candidates to fetch")
    parser.add_argument("--auto", action="store_true", help="Post top result automatically")
    parser.add_argument("--api", default=DEFAULT_API, help="Komment API base URL")
    parser.add_argument("--dry-run", action="store_true", help="Print candidates, don't post")
    args = parser.parse_args()

    print()
    print("  KOMMENT SCRAPER")
    print()
    print(f"  Scraper  |  source={args.source}  |  limit={args.limit}  |  api={args.api}")
    print()

    # ── Fetch candidates ──────────────────────────────────────────────────────
    candidates = []

    if args.source in ("reddit", "all"):
        print("  Fetching Reddit candidates…")
        r = fetch_reddit_candidates(limit=args.limit)
        print(f"  Found {len(r)} Reddit candidates")
        candidates.extend(r)

    if args.source in ("twitter", "all"):
        print("  Fetching Twitter/Nitter candidates…")
        t = fetch_twitter_candidates(limit=args.limit)
        print(f"  Found {len(t)} Twitter candidates")
        candidates.extend(t)

    # Deduplicate and sort
    seen = set()
    unique = []
    for c in candidates:
        key = c["comment_text"][:80]
        if key not in seen:
            seen.add(key)
            unique.append(c)
    unique.sort(key=lambda x: x["score"], reverse=True)
    candidates = unique[:args.limit]

    if not candidates:
        print()
        print("  No candidates found. Try --source reddit or check your connection.")
        sys.exit(1)

    print(f"\n  Total candidates: {len(candidates)}")

    # ── Auto mode: post top result ────────────────────────────────────────────
    if args.auto:
        c = candidates[0]
        display_candidate(1, 1, c)
        if args.dry_run:
            print("  [dry-run] would post this card")
            return
        print("  Auto-posting top candidate…")
        card = post_to_komment(c, args.api)
        if card:
            share_url = f"{args.api}/c/{card.get('short_code', '')}"
            print(f"  OK Posted! Share URL: {share_url}")
        return

    # ── Interactive mode ──────────────────────────────────────────────────────
    posted = 0
    for i, c in enumerate(candidates, 1):
        display_candidate(i, len(candidates), c)

        if args.dry_run:
            print("  [dry-run] skipping post")
            continue

        action = prompt_action()
        if action == "q":
            break
        elif action == "s":
            print("  Skipped.")
            continue
        elif action == "p":
            print("  Posting…")
            card = post_to_komment(c, args.api)
            if card:
                share_url = f"{args.api}/c/{card.get('short_code', '')}"
                print(f"  OK Posted!  {share_url}")
                posted += 1
            else:
                print("  ERR Failed to post. Check that the local server is running.")

    print()
    print(f"  Done. {posted} card(s) posted.")
    print()


if __name__ == "__main__":
    main()
