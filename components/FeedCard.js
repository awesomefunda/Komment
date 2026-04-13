"use client";

import { useState, useEffect } from "react";
import { PLATFORMS, formatNum, timeAgo, getDeviceHash } from "@/lib/utils";
import ReportModal from "./ReportModal";
import ShareModal from "./ShareModal";

// Strip comment_id param so OG fetch hits the base post, not just the comment anchor
function basePostUrl(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.searchParams.delete("comment_id");
    u.searchParams.delete("igsh");
    return u.toString();
  } catch {
    return url;
  }
}

export default function FeedCard({ card, onDeleted }) {
  const [shares, setShares] = useState(card.shares);
  const [shared, setShared] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [reported, setReported] = useState(false);
  const [postToFeed, setPostToFeed] = useState(true);
  const [deletionToken, setDeletionToken] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [ogPreview, setOgPreview] = useState(null);

  // Load postToFeed preference and deletion token from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("komment_postToFeed");
    if (saved !== null) {
      setPostToFeed(JSON.parse(saved));
    }
    const tokens = JSON.parse(localStorage.getItem("komment_tokens") || "{}");
    if (tokens[card.id]) {
      setDeletionToken(tokens[card.id]);
    }
  }, [card.id]);

  // Fetch OG preview for original link
  useEffect(() => {
    if (!card.original_link) return;
    const url = basePostUrl(card.original_link);
    fetch(`/api/og-preview?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(data => { if (data.image || data.title) setOgPreview(data); })
      .catch(() => {});
  }, [card.original_link]);

  const plat = PLATFORMS[card.platform] || PLATFORMS.other;
  const initial = (card.credit_name || "?")[0].toUpperCase();

  const handleShare = async () => {
    // Show share modal
    setShowShare(true);

    // Post to feed if enabled (ensures card is in feed)
    if (postToFeed) {
      fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment_text: card.comment_text,
          credit_name: card.credit_name,
          context_desc: card.context_desc,
          original_link: card.original_link,
          platform: card.platform,
        }),
      }).catch(() => {});
    }

    // Log share action to API
    setShared(true);
    setShares((s) => s + 1);
    fetch(`/api/cards/${card.id}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_hash: getDeviceHash() }),
    }).catch(() => {});

    setTimeout(() => setShared(false), 2000);
  };

  const handleReport = async (reason) => {
    setReported(true);
    setShowReport(false);
    fetch(`/api/cards/${card.id}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, device_hash: getDeviceHash() }),
    }).catch(() => {});
  };

  const handleDelete = async () => {
    if (!deletionToken || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deletion_token: deletionToken }),
      });
      if (res.ok) {
        setDeleted(true);
        // Remove token from localStorage
        const tokens = JSON.parse(localStorage.getItem("komment_tokens") || "{}");
        delete tokens[card.id];
        localStorage.setItem("komment_tokens", JSON.stringify(tokens));
        onDeleted?.(card.id);
      }
    } catch {}
    setDeleting(false);
  };

  const domain = card.original_link
    ? card.original_link.replace(/https?:\/\/(www\.)?/, "").split("/")[0]
    : null;

  return (
    <>
      <article
        className={`border-b border-gray-100 px-5 py-[18px] transition-opacity ${
          reported || deleted ? "opacity-30 pointer-events-none" : ""
        }`}
      >
        <div className="flex gap-3">
          {/* Avatar */}
          <div
            className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-[15px] font-bold shrink-0"
            style={{
              background: plat.color + "15",
              border: `1.5px solid ${plat.color}30`,
              color: plat.color,
            }}
          >
            {initial}
          </div>

          <div className="flex-1 min-w-0">
            {/* Meta row */}
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className="font-bold text-[14.5px] text-gray-900">
                {card.credit_name}
              </span>
              <span className="text-gray-300 text-[13px]">·</span>
              <span className="text-gray-400 text-[13px]">
                {timeAgo(card.created_at)}
              </span>
              <span
                className="text-[10.5px] font-semibold uppercase tracking-wide px-[7px] py-[2px] rounded-full"
                style={{
                  color: plat.color,
                  background: plat.color + "0D",
                }}
              >
                {plat.label}
              </span>
            </div>

            {/* THE COMMENT */}
            <p className="text-[18px] leading-[1.55] text-gray-900 font-normal mb-3.5 break-words font-serif tracking-tight">
              {card.comment_text}
            </p>

            {/* Context card */}
            <a
              href={card.original_link || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className={`block border border-gray-200 rounded-[14px] overflow-hidden mb-3.5 no-underline transition-colors ${card.original_link ? "hover:border-gray-300 hover:bg-gray-50/50" : ""}`}
              onClick={e => !card.original_link && e.preventDefault()}
            >
              {/* OG image — full natural dimensions, no crop */}
              {ogPreview?.image && (
                <div className="w-full bg-gray-100 overflow-hidden">
                  <img
                    src={ogPreview.image}
                    alt=""
                    className="w-full h-auto block"
                    onError={e => { e.target.parentElement.style.display = "none"; }}
                  />
                </div>
              )}

              {/* Context text */}
              <div className="px-4 py-3.5">
                <p className="text-[13.5px] text-gray-500 leading-relaxed italic m-0">
                  {card.context_desc}
                </p>
              </div>

              {/* Source row */}
              {card.original_link && (
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-t border-gray-100">
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#bbb"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  <span className="text-[12px] text-gray-400 flex-1 truncate">
                    {ogPreview?.title ? ogPreview.title.slice(0, 60) + (ogPreview.title.length > 60 ? "…" : "") : domain}
                  </span>
                  <span className="text-[12px] text-blue-400 font-medium shrink-0">
                    View original
                  </span>
                </div>
              )}
            </a>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <span className="text-[12.5px] text-gray-300">
                  {formatNum(card.views)} views
                </span>
                <span className="text-[12.5px] text-gray-300">
                  {formatNum(shares)} shares
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Delete (only shown if this browser created the card) */}
                {deletionToken && (
                  <button
                    onClick={handleDelete}
                    disabled={deleting || deleted}
                    title="Delete your card"
                    className="p-1.5 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                  >
                    {deleting ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4h6v2"/>
                      </svg>
                    )}
                  </button>
                )}
                {/* Report */}
                <button
                  onClick={() => !reported && setShowReport(true)}
                  className="p-1.5 text-gray-300 hover:text-red-400 transition-colors"
                  disabled={reported}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                    <line x1="4" y1="22" x2="4" y2="15" />
                  </svg>
                </button>
                {/* Share */}
                <button
                  onClick={handleShare}
                  className={`flex items-center gap-1.5 text-[13px] font-semibold px-4 py-[7px] rounded-full border transition-all ${
                    shared
                      ? "bg-green-50 border-green-200 text-green-600"
                      : "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                  {shared ? "Copied!" : "Share"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>

      {showReport && (
        <ReportModal
          onClose={() => setShowReport(false)}
          onReport={handleReport}
        />
      )}

      {showShare && (
        <ShareModal
          card={card}
          onClose={() => setShowShare(false)}
        />
      )}
    </>
  );
}
