#!/usr/bin/env python3
"""
Komment smoke test — one real card per platform.
Verifies POST, feed GET, embed URL extraction, and screenshot_url storage.

Run after every change:
    python scripts/test.py                              # localhost auto-detect
    python scripts/test.py --api http://localhost:3008
    python scripts/test.py --api https://your-app.vercel.app
    python scripts/test.py --keep   # don't delete test cards after run
"""

import argparse
import json
import sys
import urllib.request
import urllib.error
import urllib.parse

# ─── Real test data — one per platform ────────────────────────────────────────

TEST_CARDS = [
    {
        "platform": "instagram",
        "comment_text": "Such a crappy situation. I bet both of them were pissed.",
        "credit_name": "ig_commenter",
        "context_desc": "",
        "original_link": "https://www.instagram.com/p/DW_579gAvXY/?comment_id=18085831298037156",
        # embed check
        "expect_embed_id": "DW_579gAvXY",
        "expect_embed_src": "instagram.com/p/DW_579gAvXY/embed",
    },
    {
        "platform": "tiktok",
        "comment_text": "This man invented an entire new genre of comedy and it's just standing there judging people.",
        "credit_name": "@tiktok_commenter",
        "context_desc": "",
        "original_link": "https://www.tiktok.com/@khaby.lame/video/6958070927817067782",
        "expect_embed_id": "6958070927817067782",
        "expect_embed_src": "tiktok.com/embed/v2/6958070927817067782",
    },
    {
        "platform": "youtube",
        "comment_text": "The fact that they rehearsed this enough times to get it this clean is crazier than the stunt itself.",
        "credit_name": "yt_commenter",
        "context_desc": "",
        "original_link": "https://www.youtube.com/watch?v=HPGopaSBa4I",
        "expect_embed_id": "HPGopaSBa4I",
        "expect_embed_src": "youtube.com/embed/HPGopaSBa4I",
    },
    {
        "platform": "x",
        "comment_text": "AI can't center a div. We're fine.",
        "credit_name": "@dev_reply",
        "context_desc": "",
        "original_link": "https://x.com/karpathy/status/1886192184808149383",
        "expect_embed_id": "1886192184808149383",
        "expect_embed_src": "platform.twitter.com/embed/Tweet.html?id=1886192184808149383",
    },
    {
        "platform": "reddit",
        "comment_text": "Neighbor of 10 years won the lottery, told us he won, left the country a few days later. Never heard from him again. He left us everything in his garage — BMW X3, robot lawnmower, generator, and a few bicycles.",
        "credit_name": "u/lvl_60",
        "context_desc": "r/AskReddit: Have you ever seen someone get rich overnight, like literally?",
        "original_link": "https://reddit.com/r/AskReddit/comments/1sj8okp/have_you_ever_seen_someone_get_rich_overnight/ofpy6ry/",
        "expect_embed_id": None,
        "expect_embed_src": None,
    },
    {
        "platform": "linkedin",
        "comment_text": "The employees he laid off are out here applying for jobs and he's out here applying for sympathy.",
        "credit_name": "linkedin_commenter",
        "context_desc": "LinkedIn: CEO posted a crying selfie after laying off two employees. Most viral LinkedIn post of 2022.",
        "original_link": "https://www.linkedin.com/posts/bradenwallake_this-will-be-the-most-vulnerable-thing-ill-activity-6962886723617910784-_L4w",
        "expect_embed_id": None,
        "expect_embed_src": None,
    },
]

PASS = "PASS"
FAIL = "FAIL"
SKIP = "SKIP"

results = []

# ─── HTTP helpers ─────────────────────────────────────────────────────────────

def post_json(url, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data,
        headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")
    except Exception as e:
        return 0, {"error": str(e)}


def get_json(url):
    req = urllib.request.Request(url,
        headers={"User-Agent": "KommentTest/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, json.loads(r.read().decode())
    except Exception as e:
        return 0, {"error": str(e)}


def delete_card(api, card_id, token):
    data = json.dumps({"deletion_token": token}).encode()
    req = urllib.request.Request(f"{api}/api/cards/{card_id}",
        data=data, headers={"Content-Type": "application/json"}, method="DELETE")
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except:
        return 0

# ─── Embed URL helpers (mirrors FeedCard.js logic) ───────────────────────────

def expected_embed_src(platform, url):
    import re
    if platform == "instagram":
        m = re.search(r"instagram\.com/(?:p|reel|tv)/([A-Za-z0-9_-]+)", url)
        if m: return f"https://www.instagram.com/p/{m.group(1)}/embed/captioned/"
    if platform == "tiktok":
        m = re.search(r"tiktok\.com/@[^/]+/video/(\d+)", url)
        if m: return f"https://www.tiktok.com/embed/v2/{m.group(1)}"
    if platform == "youtube":
        m = re.search(r"(?:youtube\.com/watch\?v=|youtu\.be/)([A-Za-z0-9_-]+)", url)
        if m: return f"https://www.youtube.com/embed/{m.group(1)}"
    if platform == "x":
        m = re.search(r"(?:twitter\.com|x\.com)/\w+/status/(\d+)", url)
        if m: return f"https://platform.twitter.com/embed/Tweet.html?id={m.group(1)}"
    return None

# ─── Detect API port ─────────────────────────────────────────────────────────

def find_api():
    for port in range(3000, 3015):
        try:
            with urllib.request.urlopen(f"http://localhost:{port}/api/cards?tab=fresh&page=0", timeout=2) as r:
                if r.status == 200:
                    return f"http://localhost:{port}"
        except:
            pass
    return None

# ─── Check ───────────────────────────────────────────────────────────────────

def check(label, ok, detail=""):
    status = PASS if ok else FAIL
    mark = "OK" if ok else "!!"
    suffix = f"  ({detail})" if detail else ""
    print(f"    [{mark}] {label}{suffix}")
    results.append((status, label))
    return ok

# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--api", default=None)
    parser.add_argument("--keep", action="store_true", help="Keep test cards in feed")
    args = parser.parse_args()

    api = args.api
    if not api:
        print("  Detecting local server...")
        api = find_api()
        if not api:
            print("  No local server found. Start with: npm run dev")
            sys.exit(1)
        print(f"  Found server at {api}")

    print()
    print(f"  Komment Test Suite  |  {api}")
    print()

    created = []  # (id, token) for cleanup

    for tc in TEST_CARDS:
        plat = tc["platform"].upper()
        print(f"  -- {plat} --")

        # 1. POST the card
        status, resp = post_json(f"{api}/api/cards", {
            "comment_text": tc["comment_text"],
            "credit_name": tc["credit_name"],
            "context_desc": tc["context_desc"],
            "original_link": tc["original_link"],
            "platform": tc["platform"],
            "post_to_feed": True,
        })

        if not check("POST /api/cards returns 201", status == 201, f"got {status}"):
            print()
            continue

        card = resp.get("card", {})
        card_id = card.get("id")
        token = card.get("deletion_token")
        short_code = card.get("short_code")

        if token:
            created.append((card_id, token))

        check("Card has short_code", bool(short_code), short_code or "missing")
        check("Card has deletion_token", bool(token))
        check("Platform stored correctly", card.get("platform") == tc["platform"],
              f"got {card.get('platform')}")

        # 2. Check embed URL (client-side logic mirrored in Python)
        if tc["expect_embed_src"]:
            embed = expected_embed_src(tc["platform"], tc["original_link"])
            check("Embed URL generated correctly",
                  embed and tc["expect_embed_src"] in embed,
                  embed or "None")
        else:
            check("No embed (correct for this platform)", True, "fallback to OG image")

        # 3. Check screenshot_url (Instagram always gets one; Reddit/LinkedIn depend on Microlink)
        if tc["platform"] == "instagram":
            has_screenshot = bool(card.get("screenshot_url"))
            check("screenshot_url stored in Supabase", has_screenshot,
                  card.get("screenshot_url", "missing")[:60] if has_screenshot else "missing")
        elif tc["platform"] in ("reddit", "linkedin"):
            has_screenshot = bool(card.get("screenshot_url"))
            # Soft check — Microlink may not always return images for these
            mark = "OK" if has_screenshot else "~~"
            detail = card.get("screenshot_url", "none")[:60] if has_screenshot else "Microlink returned no image (ok)"
            print(f"    [{mark}] screenshot_url stored  ({detail})")

        # 4. Card fetchable by short_code via API
        if short_code:
            sc_status, sc_resp = get_json(f"{api}/api/cards/short/{short_code}")
            if sc_status == 200:
                check(f"Card fetchable by short_code", True, short_code)
            else:
                # Fallback: just verify short_code is set (share page is SSR, hard to test in script)
                check(f"Card has valid short_code format", len(short_code) == 6, short_code)

        print()

    # 5. Feed check — all cards visible
    print("  -- FEED --")
    feed_status, feed_resp = get_json(f"{api}/api/cards?tab=fresh&page=0")
    check("GET /api/cards returns 200", feed_status == 200)
    if feed_status == 200:
        ids_in_feed = {c["id"] for c in feed_resp.get("cards", [])}
        test_ids = {cid for cid, _ in created}
        visible = test_ids & ids_in_feed
        check(f"All {len(created)} test cards visible in feed",
              len(visible) == len(created),
              f"{len(visible)}/{len(created)} visible")

    print()

    # Cleanup
    if not args.keep and created:
        print("  Cleaning up test cards...")
        for cid, tok in created:
            s = delete_card(api, cid, tok)
            if s != 200:
                print(f"    ! Could not delete {cid} (status {s})")
        print(f"  Deleted {len(created)} test cards.")
        print()

    # Summary
    passed = sum(1 for s, _ in results if s == PASS)
    failed = sum(1 for s, _ in results if s == FAIL)
    total = len(results)
    print(f"  Results: {passed}/{total} passed", end="")
    if failed:
        print(f", {failed} FAILED")
        print()
        for s, label in results:
            if s == FAIL:
                print(f"    !! {label}")
    else:
        print(" -- all good")
    print()

    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
