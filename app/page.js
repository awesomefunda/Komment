"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FeedCard from "@/components/FeedCard";
import ShareModal from "@/components/ShareModal";
import { detectPlatform, PLATFORMS } from "@/lib/utils";

/* ─── Templates ─── */
const TEMPLATES = [
  { id: "clean", label: "Clean", bg: "#ffffff", comment: "#0f1419", context: "#6b7280", meta: "#9ca3af", accent: "#0f1419", border: "#e5e7eb" },
  { id: "dark", label: "Dark", bg: "#0f1419", comment: "#f7f9f9", context: "#8899a6", meta: "#5b7083", accent: "#ffffff", border: "#2f3336" },
  { id: "ember", label: "Ember", bg: "#1c1008", comment: "#fef3c7", context: "#a68a5b", meta: "#78653f", accent: "#f59e0b", border: "#78653f44" },
  { id: "ocean", label: "Ocean", bg: "#0c1929", comment: "#e0f2fe", context: "#7aa5c4", meta: "#4a7a9b", accent: "#38bdf8", border: "#4a7a9b44" },
  { id: "paper", label: "Paper", bg: "#faf8f5", comment: "#292524", context: "#78716c", meta: "#a8a29e", accent: "#292524", border: "#e7e5e4" },
  { id: "neon", label: "Neon", bg: "#0a0a0a", comment: "#4ade80", context: "#4b5563", meta: "#374151", accent: "#4ade80", border: "#4ade8022" },
];

/* ─── Canvas text wrapping ─── */
function wrapText(ctx, text, maxW) {
  const words = text.split(" "), lines = [];
  let line = "";
  for (const w of words) {
    const t = line + (line ? " " : "") + w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; }
    else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

/* ─── Live Card Preview ─── */
function LiveCard({ comment, context, credit, tmpl, canvasRef }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    if (!comment?.trim()) { setSrc(null); return; }
    const c = canvasRef.current;
    const x = c.getContext("2d");
    const W = 1080, pad = 80, cW = W - pad * 2;
    const serif = "Georgia, 'Times New Roman', serif";
    const sans = "Helvetica, Arial, sans-serif";

    x.font = `500 44px ${serif}`;
    const cLines = wrapText(x, comment, cW);
    const cH = cLines.length * 60;
    x.font = `italic 24px ${sans}`;
    const xLines = context ? wrapText(x, context, cW - 32) : [];
    const xH = xLines.length > 0 ? xLines.length * 34 + 52 : 0;
    const creditH = credit?.trim() ? 48 : 0;
    const H = pad + 4 + cH + 36 + xH + creditH + 64 + pad;

    c.width = W; c.height = H;
    x.fillStyle = tmpl.bg; x.fillRect(0, 0, W, H);

    if (!["clean", "paper"].includes(tmpl.id)) {
      for (let i = 0; i < 15000; i++) {
        x.fillStyle = `rgba(255,255,255,${Math.random() * 0.015})`;
        x.fillRect(Math.random() * W, Math.random() * H, 1, 1);
      }
    }

    x.fillStyle = tmpl.accent;
    x.fillRect(pad, pad - 8, 32, 3);

    x.fillStyle = tmpl.comment;
    x.font = `500 44px ${serif}`;
    x.textBaseline = "top";
    let y = pad;
    cLines.forEach(l => { x.fillText(l, pad, y); y += 60; });
    y += 24;

    if (xLines.length) {
      x.fillStyle = tmpl.border;
      x.fillRect(pad, y, cW, 1);
      y += 20;
      x.fillStyle = tmpl.context;
      x.font = `italic 24px ${sans}`;
      xLines.forEach(l => { x.fillText(l, pad + 12, y); y += 34; });
      y += 16;
    }

    if (credit?.trim()) {
      x.fillStyle = tmpl.meta;
      x.font = `600 22px ${sans}`;
      x.fillText(`— ${credit}`, pad, y);
    }

    x.fillStyle = tmpl.meta;
    x.font = `600 18px ${sans}`;
    x.fillText("komment.app", pad, H - pad + 12);
    x.textAlign = "right";
    x.font = `400 16px ${sans}`;
    x.fillText("where comment is content", W - pad, H - pad + 12);
    x.textAlign = "left";

    setSrc(c.toDataURL("image/png"));
  }, [comment, context, credit, tmpl, canvasRef]);

  if (!src) return null;
  return <img src={src} alt="Card preview" className="w-full block" />;
}

/* ─── Feed Tab ─── */
function FeedView({ sort }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchCards = useCallback(async (s, pageNum = 0, append = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cards?tab=${s}&page=${pageNum}`);
      const data = await res.json();
      if (data.cards) {
        if (append) setCards(prev => [...prev, ...data.cards]);
        else setCards(data.cards);
        setHasMore(data.cards.length >= 20);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { setPage(0); fetchCards(sort); }, [sort, fetchCards]);

  return (
    <div className="max-w-[600px] mx-auto border-x border-gray-50 min-h-[calc(100vh-160px)]">
      {loading && cards.length === 0 && <div className="py-20 text-center text-gray-300 text-sm">Loading...</div>}
      {cards.map(card => (
        <FeedCard
          key={card.id}
          card={card}
          onDeleted={id => setCards(prev => prev.filter(c => c.id !== id))}
        />
      ))}
      {cards.length > 0 && (
        <div className="py-10 text-center">
          {hasMore ? (
            <button onClick={() => { const n = page + 1; setPage(n); fetchCards(sort, n, true); }} disabled={loading}
              className="px-6 py-2.5 rounded-full border border-gray-200 text-[13px] text-gray-400 font-medium hover:bg-gray-50 disabled:opacity-50">
              {loading ? "Loading..." : "Load more"}
            </button>
          ) : <p className="text-[13px] text-gray-200">You're all caught up</p>}
        </div>
      )}
      {!loading && cards.length === 0 && (
        <div className="py-20 text-center px-5">
          <div className="text-3xl mb-3">💬</div>
          <h2 className="text-lg font-bold text-gray-900 mb-2 font-serif">No komments yet</h2>
          <p className="text-sm text-gray-400">Create a card and toggle "Post to feed" to see it here.</p>
        </div>
      )}
    </div>
  );
}

/* ─── Main App ─── */
export default function Page() {
  return (
    <Suspense>
      <Home />
    </Suspense>
  );
}

function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // tab: "create" | "fresh" | "top"
  const tab = searchParams.get("tab") || "create";
  const setTab = (t) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", t);
    router.push(`?${params.toString()}`, { scroll: false });
  };
  const [comment, setComment] = useState("");
  const [context, setContext] = useState("");
  const [credit, setCredit] = useState("");
  const [link, setLink] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [templateId, setTemplateId] = useState("clean");
  const [postToFeed, setPostToFeed] = useState(true);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [createdCard, setCreatedCard] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const canvasRef = useRef(null);

  // Load postToFeed preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("komment_postToFeed");
    if (saved !== null) {
      setPostToFeed(JSON.parse(saved));
    }
  }, []);

  const tmpl = TEMPLATES.find(t => t.id === templateId);
  const hasComment = comment.trim().length > 0;

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  // Save postToFeed preference to localStorage
  useEffect(() => {
    localStorage.setItem("komment_postToFeed", JSON.stringify(postToFeed));
  }, [postToFeed]);

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasComment) return;
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl; a.download = "komment-card.png"; a.click();
    setSaved(true); setTimeout(() => setSaved(false), 2500);
    showToast("Card saved ✓");
  };

  const handleShare = async () => {
    if (!hasComment || !context.trim()) {
      showToast("Add context to create a shareable link");
      return;
    }
    setSharing(true);
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment_text: comment.trim(),
          credit_name: (credit.trim() || "anonymous").slice(0, 50),
          context_desc: context.trim().slice(0, 500),
          original_link: link.trim() || null,
          image_url: imageUrl.trim() || null,
          platform: detectPlatform(link),
          post_to_feed: postToFeed,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.card) {
        showToast(data.error || "Failed to create link");
        return;
      }
      // Save deletion token to localStorage so user can delete later
      if (data.card.deletion_token) {
        const tokens = JSON.parse(localStorage.getItem("komment_tokens") || "{}");
        tokens[data.card.id] = data.card.deletion_token;
        localStorage.setItem("komment_tokens", JSON.stringify(tokens));
      }
      setCreatedCard(data.card);
      setShowShareModal(true);
    } catch {
      showToast("Network error — please try again");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <header className="sticky top-0 z-[100] bg-white/[0.97] backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-[600px] mx-auto px-5 pt-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-[24px] font-extrabold text-gray-900 tracking-tight font-serif m-0">Komment</h1>
              <p className="text-[11px] text-gray-400 italic tracking-wide mt-0.5">where comment is content</p>
            </div>
          </div>
          <div className="flex">
            {[
              { id: "create", label: "Create" },
              { id: "fresh", label: "Fresh" },
              { id: "top", label: "Top" },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 py-2.5 text-[15px] border-b-[2.5px] transition-all tracking-tight ${tab === t.id ? "border-gray-900 text-gray-900 font-bold" : "border-transparent text-gray-400 font-medium"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* CREATE TAB */}
      {tab === "create" && (
        <main className="max-w-[600px] mx-auto px-5 py-6 pb-28">
          {/* Comment */}
          <div className="mb-5">
            <textarea value={comment} onChange={e => setComment(e.target.value)}
              placeholder="Paste the comment that stopped your scroll..."
              rows={3} maxLength={500} autoFocus
              className="w-full px-[18px] py-4 rounded-2xl border-[1.5px] border-gray-200 text-[19px] leading-relaxed text-gray-900 resize-none outline-none focus:border-gray-900 transition-colors font-serif box-border" />
            <div className="flex justify-between mt-1 px-1">
              <span className="text-[11px] text-gray-300">The comment, tweet, text, or reply</span>
              <span className="text-[11px] text-gray-300">{comment.length}/500</span>
            </div>
          </div>

          {/* Context */}
          <div className="mb-5">
            <textarea value={context} onChange={e => setContext(e.target.value)}
              placeholder="What were they reacting to?"
              rows={2} maxLength={300}
              className="w-full px-[18px] py-3.5 rounded-xl border-[1.5px] border-gray-200 text-[15px] leading-relaxed text-gray-900 resize-none outline-none focus:border-gray-900 transition-colors box-border" />
            <span className="text-[11px] text-gray-300 mt-1 block pl-1">Describe the post, reel, or tweet</span>
          </div>

          {/* Credit + Link */}
          <div className="flex gap-3 mb-1.5">
            <input value={credit} onChange={e => setCredit(e.target.value)}
              placeholder="@who said it" maxLength={50}
              className="flex-1 px-[18px] py-3 rounded-xl border-[1.5px] border-gray-200 text-[15px] text-gray-900 outline-none focus:border-gray-900 transition-colors box-border" />
            <input value={link} onChange={e => setLink(e.target.value)}
              placeholder="Source link (optional)"
              className="flex-1 px-[18px] py-3 rounded-xl border-[1.5px] border-gray-200 text-[15px] text-gray-900 outline-none focus:border-gray-900 transition-colors box-border" />
          </div>
          {/* Instagram hint + image URL field */}
          {link.trim() && (
            <div className="mb-5">
              <input
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="Post image URL (optional — paste for full image quality)"
                className="w-full px-[18px] py-3 rounded-xl border-[1.5px] border-gray-200 text-[14px] text-gray-900 outline-none focus:border-gray-900 transition-colors box-border"
              />
              {detectPlatform(link) === "instagram" ? (
                <p className="text-[11px] text-gray-400 mt-1 pl-1">
                  Instagram: open post → right-click image → Copy Image Address. Paste above for the full meme.
                </p>
              ) : (
                <p className="text-[11px] text-gray-400 mt-1 pl-1">
                  Optional: paste the direct image URL for a richer card preview.
                </p>
              )}
            </div>
          )}

          {/* Live preview + templates */}
          {hasComment && (
            <div className="mb-6 animate-fade-in-up">
              <div className="flex items-center justify-between mb-2.5 px-0.5">
                <span className="text-[13px] font-semibold text-gray-400">Live preview</span>
                <div className="flex gap-1.5">
                  {TEMPLATES.map(t => (
                    <button key={t.id} onClick={() => setTemplateId(t.id)} title={t.label}
                      className="transition-all"
                      style={{
                        width: 28, height: 28, borderRadius: 8,
                        border: templateId === t.id ? "2.5px solid #1a1a1a" : "1.5px solid #e5e5e5",
                        background: t.bg, cursor: "pointer",
                        transform: templateId === t.id ? "scale(1.12)" : "scale(1)",
                        boxShadow: templateId === t.id ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
                      }} />
                  ))}
                </div>
              </div>
              <div className="rounded-2xl overflow-hidden border border-gray-200" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
                <LiveCard comment={comment} context={context} credit={credit} tmpl={tmpl} canvasRef={canvasRef} />
              </div>
            </div>
          )}

          {/* Post to feed toggle */}
          {hasComment && (
            <div className="flex items-center justify-between mb-5 px-0.5 animate-fade-in-up">
              <div>
                <p className="text-[14px] font-semibold text-gray-900 m-0">Post to Komment feed</p>
                <p className="text-[11.5px] text-gray-400 m-0 mt-0.5">Others can discover this card</p>
              </div>
              <button onClick={() => setPostToFeed(!postToFeed)}
                className="relative transition-colors"
                style={{ width: 44, height: 26, borderRadius: 13, border: "none", cursor: "pointer", background: postToFeed ? "#1a1a1a" : "#ddd" }}>
                <div className="absolute top-[3px] rounded-full bg-white transition-all"
                  style={{ width: 20, height: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.2)", left: postToFeed ? 21 : 3 }} />
              </button>
            </div>
          )}

          {/* Buttons */}
          {hasComment && (
            <div className="flex gap-2.5 animate-fade-in-up">
              <button onClick={handleDownload}
                className={`flex-1 py-3.5 rounded-[14px] border-[1.5px] text-[15px] font-bold cursor-pointer flex items-center justify-center gap-2 transition-all ${saved ? "border-green-200 bg-green-50 text-green-600" : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50"}`}>
                {saved ? "✓ Saved" : (<><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Download</>)}
              </button>
              <button onClick={handleShare} disabled={sharing}
                className="flex-1 py-3.5 rounded-[14px] border-none bg-gray-900 text-white text-[15px] font-bold cursor-pointer flex items-center justify-center gap-2 hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                {sharing ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                )}
                {sharing ? "Creating link…" : "Share"}
              </button>
            </div>
          )}

          {/* Empty state */}
          {!hasComment && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3 opacity-80">✍️</div>
              <p className="text-[16px] text-gray-300 mb-1.5 font-serif">Paste a comment that stopped your scroll</p>
              <p className="text-[13px] text-gray-200 m-0">A roast. A hot take. A text that made you spit your coffee.</p>
            </div>
          )}
        </main>
      )}

      {/* FEED TABS */}
      {(tab === "fresh" || tab === "top") && <FeedView sort={tab} />}

      {/* Share Modal */}
      {showShareModal && createdCard && (
        <ShareModal
          card={createdCard}
          onClose={() => { setShowShareModal(false); setCreatedCard(null); }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-2.5 rounded-full text-[14px] font-semibold shadow-lg z-[250] animate-fade-in-up whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  );
}
