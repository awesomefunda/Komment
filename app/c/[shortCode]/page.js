import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import FeedCard from "@/components/FeedCard";

// Use admin client so we can fetch cards that are hidden (created with post_to_feed=false)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://komment.app";

async function getCard(shortCode) {
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("short_code", shortCode)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function generateMetadata({ params }) {
  const card = await getCard(params.shortCode);

  if (!card) {
    return {
      title: "Not Found",
      description: "This comment has been deleted or does not exist.",
    };
  }

  const description = `"${card.comment_text.slice(0, 100)}" — ${card.credit_name}`;
  const shareUrl = `${SITE_URL}/c/${card.short_code}`;

  return {
    title: `${card.credit_name}'s comment | Komment`,
    description,
    openGraph: {
      title: description,
      description: card.context_desc.slice(0, 160),
      url: shareUrl,
      type: "article",
      images: card.screenshot_url ? [{ url: card.screenshot_url }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: description,
      description: card.context_desc.slice(0, 160),
      images: card.screenshot_url ? [card.screenshot_url] : [],
    },
  };
}

export default async function SharePage({ params }) {
  const card = await getCard(params.shortCode);

  if (!card) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[600px] mx-auto border-x border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100 sticky top-0 bg-white/[0.97] backdrop-blur-xl z-10">
          <a href="/" className="text-gray-600 hover:text-gray-900 text-[14px] font-semibold">
            ← Back to feed
          </a>
        </div>
        <FeedCard card={card} />
      </div>
    </div>
  );
}
