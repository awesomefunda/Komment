"use client";

const REASONS = [
  { id: "hate_speech", label: "Hate speech" },
  { id: "harassment", label: "Harassment" },
  { id: "spam", label: "Spam" },
  { id: "not_real", label: "Not a real comment" },
];

export default function ReportModal({ onClose, onReport }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 p-5 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl p-6 w-full max-w-[340px]"
      >
        <h3 className="text-[17px] font-bold text-gray-900 mb-1">
          Report this card
        </h3>
        <p className="text-[13px] text-gray-400 mb-4">
          What's wrong with this content?
        </p>
        <div className="flex flex-col gap-2">
          {REASONS.map((r) => (
            <button
              key={r.id}
              onClick={() => onReport(r.id)}
              className="px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-[15px] text-gray-900 font-medium text-left hover:bg-gray-100 transition-colors"
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-3 w-full py-2.5 text-gray-400 text-[14px] hover:text-gray-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
