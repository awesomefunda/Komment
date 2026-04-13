// Platform detection from URL
export function detectPlatform(link) {
  if (!link) return "other";
  const l = link.toLowerCase();
  if (l.includes("instagram.com")) return "instagram";
  if (l.includes("x.com") || l.includes("twitter.com")) return "x";
  if (l.includes("reddit.com")) return "reddit";
  if (l.includes("tiktok.com")) return "tiktok";
  if (l.includes("linkedin.com")) return "linkedin";
  if (l.includes("youtube.com") || l.includes("youtu.be")) return "youtube";
  return "other";
}

// Platform display info
export const PLATFORMS = {
  instagram: { label: "Instagram", color: "#C13584" },
  x: { label: "X / Twitter", color: "#1DA1F2" },
  reddit: { label: "Reddit", color: "#FF4500" },
  tiktok: { label: "TikTok", color: "#010101" },
  linkedin: { label: "LinkedIn", color: "#0A66C2" },
  youtube: { label: "YouTube", color: "#FF0000" },
  other: { label: "Web", color: "#666666" },
};

// Number formatting
export function formatNum(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}

// Time ago
export function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return mins + "m";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h";
  const days = Math.floor(hrs / 24);
  if (days < 7) return days + "d";
  const weeks = Math.floor(days / 7);
  return weeks + "w";
}

// Simple device fingerprint (hash of user agent + screen size + timezone)
export function getDeviceHash() {
  if (typeof window === "undefined") return "server";
  const raw = [
    navigator.userAgent,
    screen.width + "x" + screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join("|");
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return "dh_" + Math.abs(hash).toString(36);
}

// Bad words filter (basic — expand as needed)
const BAD_WORDS = [
  // Add slurs and targeted hate terms here
  // Keeping this minimal for the scaffold
];

export function containsBadWords(text) {
  const lower = text.toLowerCase();
  return BAD_WORDS.some((w) => lower.includes(w));
}

// Generate a unique 6-character short code for sharing
export function generateShortCode() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Get the share URL for a card
export function getShareUrl(shortCode) {
  if (typeof window === "undefined") return `${process.env.NEXT_PUBLIC_SITE_URL || "https://komment.app"}/c/${shortCode}`;
  return `${window.location.origin}/c/${shortCode}`;
}
