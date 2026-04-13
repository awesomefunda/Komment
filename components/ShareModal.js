"use client";

import { useState } from "react";
import { getShareUrl } from "@/lib/utils";

export default function ShareModal({ card, onClose }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = getShareUrl(card.short_code);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleTwitterShare = () => {
    const text = encodeURIComponent(`"${card.comment_text}" — ${card.credit_name}\n\nvia Komment`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`, "_blank");
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`"${card.comment_text}" — ${card.credit_name}\n\n${shareUrl}\n\nvia Komment`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-in">
          <h2 className="text-[20px] font-bold text-gray-900 mb-4">Share this comment</h2>
          
          {/* Share URL */}
          <div className="mb-5">
            <p className="text-[12px] text-gray-500 font-semibold uppercase tracking-wide mb-2">
              Link
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-[12px] text-[14px] text-gray-900 font-mono select-all"
              />
              <button
                onClick={handleCopy}
                className={`px-4 py-2.5 rounded-[12px] font-semibold text-[14px] transition-all ${
                  copied
                    ? "bg-green-100 text-green-900 "
                    : "bg-gray-900 text-white hover:bg-gray-800"
                }`}
              >
                {copied ? "✓" : "Copy"}
              </button>
            </div>
          </div>

          {/* Share buttons */}
          <p className="text-[12px] text-gray-500 font-semibold uppercase tracking-wide mb-3">
            Share to
          </p>
          <div className="space-y-2 mb-4">
            <button
              onClick={handleTwitterShare}
              className="w-full px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-[12px] font-semibold text-[14px] transition-all"
            >
              𝕏 Twitter / X
            </button>
            <button
              onClick={handleWhatsAppShare}
              className="w-full px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-[12px] font-semibold text-[14px] transition-all"
            >
              💬 WhatsApp
            </button>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-[12px] font-semibold text-[14px] transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}
