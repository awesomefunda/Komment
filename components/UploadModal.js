"use client";

import { useState } from "react";
import { detectPlatform } from "@/lib/utils";

export default function UploadModal({ onClose, onSubmit }) {
  const [comment, setComment] = useState("");
  const [context, setContext] = useState("");
  const [link, setLink] = useState("");
  const [credit, setCredit] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit = comment.trim().length > 0 && context.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);

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

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setSubmitting(false);
        return;
      }

      onSubmit(data.card);
    } catch (e) {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/45 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-[20px] w-full max-w-[600px] max-h-[88vh] overflow-auto animate-fade-in-up"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-[20px] z-10">
          <button
            onClick={onClose}
            className="text-[15px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            Cancel
          </button>
          <span className="text-[16px] font-bold text-gray-900 tracking-tight">
            Post a Komment
          </span>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className={`rounded-full px-5 py-2 text-[14px] font-bold transition-all ${
              canSubmit && !submitting
                ? "bg-gray-900 text-white"
                : "bg-gray-200 text-gray-400 cursor-default"
            }`}
          >
            {submitting ? "Posting..." : "Post"}
          </button>
        </div>

        <div className="p-5 space-y-5">
          {error && (
            <div className="px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl text-[14px] text-red-600">
              {error}
            </div>
          )}

          {/* Comment */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-400 mb-1.5">
              The comment ✦
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Paste or type the comment that deserves a stage..."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3.5 rounded-xl border-[1.5px] border-gray-200 text-[17px] leading-relaxed text-gray-900 resize-vertical outline-none focus:border-gray-900 transition-colors font-serif"
            />
            <p className="text-right text-[11px] text-gray-300 mt-1">
              {comment.length}/500
            </p>
          </div>

          {/* Context */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-400 mb-1.5">
              The context ✦
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="What were they reacting to? Describe the post, reel, or tweet..."
              rows={2}
              maxLength={500}
              className="w-full px-4 py-3.5 rounded-xl border-[1.5px] border-gray-200 text-[15px] leading-relaxed text-gray-900 resize-vertical outline-none focus:border-gray-900 transition-colors"
            />
          </div>

          {/* Link */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-400 mb-1.5">
              Original link{" "}
              <span className="font-normal text-gray-300">— optional</span>
            </label>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://instagram.com/reel/..."
              className="w-full px-4 py-3 rounded-xl border-[1.5px] border-gray-200 text-[15px] text-gray-900 outline-none focus:border-gray-900 transition-colors"
            />
          </div>

          {/* Credit */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-400 mb-1.5">
              Credit to{" "}
              <span className="font-normal text-gray-300">— who said it?</span>
            </label>
            <input
              value={credit}
              onChange={(e) => setCredit(e.target.value)}
              placeholder="@username or name"
              maxLength={50}
              className="w-full px-4 py-3 rounded-xl border-[1.5px] border-gray-200 text-[15px] text-gray-900 outline-none focus:border-gray-900 transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
