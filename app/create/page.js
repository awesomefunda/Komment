"use client";

import { useState, useRef, useCallback } from "react";
import { detectPlatform, PLATFORMS } from "@/lib/utils";

const TEMPLATES = [
  {
    id: "clean",
    label: "Clean",
    bg: "#ffffff",
    commentColor: "#0f1419",
    contextColor: "#6b7280",
    metaColor: "#9ca3af",
    accentColor: "#0f1419",
    borderColor: "#e5e7eb",
    fontStyle: "serif",
  },
  {
    id: "dark",
    label: "Dark",
    bg: "#0f1419",
    commentColor: "#f7f9f9",
    contextColor: "#8899a6",
    metaColor: "#5b7083",
    accentColor: "#ffffff",
    borderColor: "#2f3336",
    fontStyle: "serif",
  },
  {
    id: "ember",
    label: "Ember",
    bg: "#1c1008",
    commentColor: "#fef3c7",
    contextColor: "#a68a5b",
    metaColor: "#78653f",
    accentColor: "#f59e0b",
    borderColor: "#78653f33",
    fontStyle: "serif",
  },
  {
    id: "ocean",
    label: "Ocean",
    bg: "#0c1929",
    commentColor: "#e0f2fe",
    contextColor: "#7aa5c4",
    metaColor: "#4a7a9b",
    accentColor: "#38bdf8",
    borderColor: "#4a7a9b33",
    fontStyle: "serif",
  },
  {
    id: "paper",
    label: "Paper",
    bg: "#faf8f5",
    commentColor: "#292524",
    contextColor: "#78716c",
    metaColor: "#a8a29e",
    accentColor: "#292524",
    borderColor: "#e7e5e4",
    fontStyle: "serif",
  },
  {
    id: "neon",
    label: "Neon",
    bg: "#0a0a0a",
    commentColor: "#4ade80",
    contextColor: "#4b5563",
    metaColor: "#374151",
    accentColor: "#4ade80",
    borderColor: "#4ade8020",
    fontStyle: "mono",
  },
];

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line + (line ? " " : "") + word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export default function CreatePage() {
  const [comment, setComment] = useState("");
  const [context, setContext] = useState("");
  const [credit, setCredit] = useState("");
  const [link, setLink] = useState("");
  const [template, setTemplate] = useState("clean");
  const [postToFeed, setPostToFeed] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [posted, setPosted] = useState(false);
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);

  const tmpl = TEMPLATES.find((t) => t.id === template);
  const canGenerate = comment.trim().length > 0;

  const generateCard = useCallback(() => {
    if (!canGenerate) return;
    setGenerating(true);
    setError(null);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const W = 1080;
    const pad = 72;
    const contentW = W - pad * 2;

    // Measure text to determine canvas height
    const serifFont = "'Georgia', 'Times New Roman', serif";
    const sansFont = "'Helvetica Neue', 'Arial', sans-serif";
    const monoFont = "'SF Mono', 'Courier New', monospace";
    const fontFamily =
      tmpl.fontStyle === "mono" ? monoFont : 
      tmpl.fontStyle === "sans" ? sansFont : serifFont;

    // Measure comment
    ctx.font = `500 42px ${fontFamily}`;
    const commentLines = wrapText(ctx, comment, contentW - 20);
    const commentH = commentLines.length * 56;

    // Measure context
    ctx.font = `italic 26px ${sansFont}`;
    const contextLines = context ? wrapText(ctx, context, contentW - 48) : [];
    const contextH = contextLines.length > 0 ? contextLines.length * 36 + 40 : 0;

    // Total height
    const H = pad + commentH + 40 + contextH + (credit ? 60 : 0) + 80 + pad;

    canvas.width = W;
    canvas.height = H;

    // Background
    ctx.fillStyle = tmpl.bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle grain texture
    if (tmpl.id !== "clean" && tmpl.id !== "paper") {
      for (let i = 0; i < 15000; i++) {
        const x = Math.random() * W;
        const y = Math.random() * H;
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.015})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // Accent line at top
    ctx.fillStyle = tmpl.accentColor;
    ctx.fillRect(pad, pad - 20, 40, 3);

    // Comment text
    ctx.fillStyle = tmpl.commentColor;
    ctx.font = `500 42px ${fontFamily}`;
    ctx.textBaseline = "top";
    let y = pad;
    commentLines.forEach((line) => {
      ctx.fillText(line, pad, y);
      y += 56;
    });

    y += 24;

    // Context block
    if (contextLines.length > 0) {
      // Border line
      ctx.fillStyle = tmpl.borderColor;
      ctx.fillRect(pad, y, contentW, 1);
      y += 20;

      // Context text
      ctx.fillStyle = tmpl.contextColor;
      ctx.font = `italic 26px ${sansFont}`;
      contextLines.forEach((line) => {
        ctx.fillText(line, pad + 16, y);
        y += 36;
      });
      y += 16;
    }

    // Credit
    if (credit.trim()) {
      ctx.fillStyle = tmpl.metaColor;
      ctx.font = `600 24px ${sansFont}`;
      ctx.fillText(`— ${credit}`, pad, y);
      y += 40;
    }

    // Watermark + platform
    const watermarkY = H - pad + 10;
    ctx.fillStyle = tmpl.metaColor;
    ctx.font = `600 20px ${sansFont}`;
    ctx.fillText("komment.app", pad, watermarkY);

    if (link) {
      const plat = detectPlatform(link);
      const platLabel = PLATFORMS[plat]?.label || "";
      if (platLabel) {
        ctx.font = `400 18px ${sansFont}`;
        ctx.textAlign = "right";
        ctx.fillText(`via ${platLabel}`, W - pad, watermarkY);
        ctx.textAlign = "left";
      }
    }

    setGenerating(false);
  }, [comment, context, credit, link, tmpl, canGenerate]);

  const downloadCard = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "komment-card.png";
    a.click();
  };

  const shareCard = async () => {
    const canvas = canvasRef.current;
    try {
      const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
      const file = new File([blob], "komment-card.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `"${comment}" via Komment` });
      } else {
        downloadCard();
      }
    } catch {
      downloadCard();
    }
  };

  const handleGenerate = async () => {
    generateCard();

    // Post to feed if toggled on
    if (postToFeed && comment.trim() && context.trim()) {
      try {
        const res = await fetch("/api/cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            comment_text: comment.trim(),
            credit_name: credit.trim() || "anonymous",
            context_desc: context.trim(),
            original_link: link.trim() || null,
            platform: detectPlatform(link),
          }),
        });
        const json = await res.json();
        // Save deletion_token to localStorage so the user can delete later from any tab
        if (json.card?.id && json.deletion_token) {
          try {
            const tokens = JSON.parse(localStorage.getItem("komment_tokens") || "{}");
            tokens[json.card.id] = json.deletion_token;
            localStorage.setItem("komment_tokens", JSON.stringify(tokens));
          } catch {}
        }
        setPosted(true);
        setTimeout(() => setPosted(false), 3000);
      } catch (e) {
        // Silent fail — card generation is the priority
      }
    }
  };

  const hasCard = canvasRef.current?.width > 0 && canvasRef.current?.height > 1;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/97 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-[600px] mx-auto px-5 py-3.5 flex items-center justify-between">
          <a href="/" className="no-underline">
            <h1 className="text-[22px] font-extrabold text-gray-900 tracking-tight font-serif m-0">
              Komment
            </h1>
            <p className="text-[10.5px] text-gray-400 font-medium italic tracking-wide mt-0">
              where comment is content
            </p>
          </a>
          <a
            href="/"
            className="text-[14px] text-gray-400 hover:text-gray-600 transition-colors no-underline"
          >
            ← Feed
          </a>
        </div>
      </header>

      <main className="max-w-[600px] mx-auto px-5 py-6">
        {/* Input Section */}
        <div className="space-y-5 mb-8">
          <div>
            <label className="block text-[13px] font-semibold text-gray-400 mb-1.5">
              The moment ✦
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="The comment, tweet, text, or reply that deserves to be seen..."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3.5 rounded-2xl border-[1.5px] border-gray-200 text-[18px] leading-relaxed text-gray-900 resize-none outline-none focus:border-gray-900 transition-colors font-serif"
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-gray-400 mb-1.5">
              The context
              <span className="font-normal text-gray-300"> — what were they reacting to?</span>
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Describe the post, reel, tweet, or conversation..."
              rows={2}
              maxLength={300}
              className="w-full px-4 py-3 rounded-2xl border-[1.5px] border-gray-200 text-[15px] leading-relaxed text-gray-900 resize-none outline-none focus:border-gray-900 transition-colors"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[13px] font-semibold text-gray-400 mb-1.5">
                Credit
              </label>
              <input
                value={credit}
                onChange={(e) => setCredit(e.target.value)}
                placeholder="@username"
                maxLength={50}
                className="w-full px-4 py-2.5 rounded-xl border-[1.5px] border-gray-200 text-[15px] text-gray-900 outline-none focus:border-gray-900 transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[13px] font-semibold text-gray-400 mb-1.5">
                Source link
              </label>
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2.5 rounded-xl border-[1.5px] border-gray-200 text-[15px] text-gray-900 outline-none focus:border-gray-900 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Template Picker */}
        <div className="mb-6">
          <label className="block text-[13px] font-semibold text-gray-400 mb-3">
            Style
          </label>
          <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={`shrink-0 w-[72px] h-[44px] rounded-xl border-2 transition-all flex items-center justify-center text-[11px] font-semibold ${
                  template === t.id
                    ? "border-gray-900 scale-105"
                    : "border-gray-200 hover:border-gray-400"
                }`}
                style={{
                  background: t.bg,
                  color: t.commentColor,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Post to feed toggle */}
        <div className="flex items-center justify-between mb-6 px-1">
          <div>
            <p className="text-[14px] font-semibold text-gray-900 m-0">
              Post to Komment feed
            </p>
            <p className="text-[12px] text-gray-400 m-0 mt-0.5">
              Make this card discoverable by others
            </p>
          </div>
          <button
            onClick={() => setPostToFeed(!postToFeed)}
            className={`relative w-[44px] h-[26px] rounded-full transition-colors ${
              postToFeed ? "bg-gray-900" : "bg-gray-200"
            }`}
          >
            <div
              className={`absolute top-[3px] w-[20px] h-[20px] rounded-full bg-white shadow transition-transform ${
                postToFeed ? "left-[21px]" : "left-[3px]"
              }`}
            />
          </button>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className={`w-full py-3.5 rounded-2xl text-[16px] font-bold transition-all ${
            canGenerate
              ? "bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98]"
              : "bg-gray-100 text-gray-300 cursor-default"
          }`}
        >
          {generating ? "Generating..." : "Generate Card"}
        </button>

        {/* Canvas (hidden until generated) */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Preview + Actions */}
        {hasCard && (
          <div className="mt-8 animate-fade-in-up">
            {/* Preview */}
            <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm mb-5">
              <img
                src={canvasRef.current.toDataURL("image/png")}
                alt="Generated card"
                className="w-full block"
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={downloadCard}
                className="flex-1 py-3 rounded-2xl border-[1.5px] border-gray-200 text-[14px] font-bold text-gray-900 hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download
              </button>
              <button
                onClick={shareCard}
                className="flex-1 py-3 rounded-2xl bg-gray-900 text-white text-[14px] font-bold hover:bg-gray-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                Share
              </button>
            </div>

            {posted && (
              <p className="text-center text-[13px] text-green-600 font-medium mt-3 animate-fade-in">
                ✓ Posted to Komment feed
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
