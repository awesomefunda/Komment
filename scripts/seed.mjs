/**
 * Seed script — run with: npm run seed
 * 
 * Prerequisites:
 * 1. Create a .env.local file with your Supabase credentials
 * 2. Run the schema.sql in Supabase SQL Editor
 * 3. Then run: node scripts/seed.mjs
 * 
 * Or if you ran seed_scraper.py first, it will also import from komment_seed.json
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Built-in seed data — real comments from internet culture
const SEED_CARDS = [
  { comment_text: "Bro's 6 figures include the decimal point 💀", credit_name: "deziboi_", platform: "instagram", context_desc: 'Instagram Reel: Guy showing off his "6-figure dropshipping empire" while clearly sitting in his mom\'s basement with a ring light', original_link: "https://instagram.com", vibe: "roast" },
  { comment_text: "AI can't even center a div. We're fine.", credit_name: "priya.codes", platform: "x", context_desc: 'Tweet: "AI will replace all software engineers by 2027. Learn prompt engineering or become obsolete." — @techguru99', original_link: "https://x.com", vibe: "hottake" },
  { comment_text: "This man has more courage at 70 than I have ordering food over the phone at 28", credit_name: "naan_stop", platform: "instagram", context_desc: "Instagram Reel: 70-year-old grandpa learning to skateboard with his grandson, keeps falling but gets back up laughing every time", original_link: "https://instagram.com", vibe: "wholesome" },
  { comment_text: "VP of Synergy is crazy work. What's next, Chief Vibes Officer? 😭", credit_name: "chaiwithcode", platform: "linkedin", context_desc: 'LinkedIn Post: "I\'m humbled to announce I\'ve been promoted to VP of Synergy and Innovation at a Fortune 500 company."', original_link: "https://linkedin.com", vibe: "roast" },
  { comment_text: "Mitochondria is the powerhouse of the cell. I have never once needed this information. Not even once.", credit_name: "silentscroller", platform: "reddit", context_desc: 'Reddit r/AskReddit: "What\'s the most useless thing you learned in school?" — 14.2K upvotes', original_link: "https://reddit.com", vibe: "funny" },
  { comment_text: "My man really typed 'thoughts?' after a 47-paragraph LinkedIn post about buying coffee", credit_name: "professionaltroll", platform: "linkedin", context_desc: "LinkedIn Post: An extremely long story about how the author's interaction with a barista taught him 7 leadership lessons, ending with \"Thoughts?\"", original_link: "https://linkedin.com", vibe: "roast" },
  { comment_text: "Plot twist: the dog trained him", credit_name: "woofcommander", platform: "tiktok", context_desc: "TikTok: Man claims he spent 6 months training his golden retriever to do an obstacle course. Dog just sits there while the man runs the course himself.", original_link: "https://tiktok.com", vibe: "funny" },
  { comment_text: "Sir this is a Wendy's but honestly you made some valid points", credit_name: "wendysemployee", platform: "reddit", context_desc: "Reddit r/unpopularopinion: A 2000-word essay arguing that cereal is technically a soup, with citations and a bibliography", original_link: "https://reddit.com", vibe: "funny" },
  { comment_text: "I showed this to my therapist and she started crying too", credit_name: "emotional_wreck", platform: "instagram", context_desc: "Instagram Reel: Montage of a dad seeing his daughter in her wedding dress for the first time, both completely breaking down in tears", original_link: "https://instagram.com", vibe: "wholesome" },
  { comment_text: "The interviewer asked 'where do you see yourself in 5 years' and bro said 'your job' with a straight face. Legend.", credit_name: "corporatesurvivor", platform: "x", context_desc: 'Tweet thread: "What\'s the most unhinged thing you\'ve said in a job interview?" — 12K replies', original_link: "https://x.com", vibe: "savage" },
  { comment_text: "Bro graduated from the University of Wikipedia with a PhD in Confidence", credit_name: "factcheckthis", platform: "x", context_desc: "Tweet: Someone confidently explaining quantum physics incorrectly, getting ratioed by an actual physics professor", original_link: "https://x.com", vibe: "roast" },
  { comment_text: "My toxic trait is thinking I could do this after watching one YouTube tutorial", credit_name: "delusionalDIY", platform: "tiktok", context_desc: "TikTok: Professional woodworker building an insanely complex Japanese joinery table without nails or screws in a 60-second timelapse", original_link: "https://tiktok.com", vibe: "funny" },
  { comment_text: "The fact that he rehearsed this in the shower and still fumbled is sending me", credit_name: "showerrehearsals", platform: "tiktok", context_desc: "TikTok: Guy tries to do a romantic surprise proposal at a restaurant, drops the ring into his soup, then knocks over the soup", original_link: "https://tiktok.com", vibe: "roast" },
  { comment_text: "This is the most expensive way to say 'I don't know how to cook'", credit_name: "gordonramsaywannabe", platform: "instagram", context_desc: "Instagram Reel: Influencer showing off a $200 grocery haul that's entirely pre-made meals, protein bars, and bottled smoothies", original_link: "https://instagram.com", vibe: "roast" },
  { comment_text: "Me pretending to understand my friend's crypto explanation vs me actually understanding it: 📉", credit_name: "cryptoskeptic", platform: "x", context_desc: "Tweet: A 15-tweet thread explaining tokenomics with multiple charts that makes absolutely no sense to normal people", original_link: "https://x.com", vibe: "funny" },
  { comment_text: "This cat has achieved a level of relaxation I will never know in this economy", credit_name: "stressedmillennial", platform: "reddit", context_desc: "Reddit r/cats: Photo of a cat lying completely flat on its back on a sunny windowsill with zero concerns in the world", original_link: "https://reddit.com", vibe: "wholesome" },
  { comment_text: "Your resume says team player but your git commits say lone wolf", credit_name: "saboredeveloper", platform: "x", context_desc: 'Tweet: "What\'s the biggest lie on every developer\'s resume?"', original_link: "https://x.com", vibe: "roast" },
  { comment_text: "He didn't just burn bridges. He napalmed the entire river.", credit_name: "corporatewarfare", platform: "reddit", context_desc: "Reddit r/MaliciousCompliance: Story about an employee who quit by automating his entire job, then emailing the CEO his manager's browser history", original_link: "https://reddit.com", vibe: "savage" },
  { comment_text: "My grandma makes this and it tastes like a hug from the inside", credit_name: "foodienostalgia", platform: "tiktok", context_desc: "TikTok: Recipe video for a simple lentil soup that looks incredibly comforting and homemade", original_link: "https://tiktok.com", vibe: "wholesome" },
  { comment_text: "This man's morning routine costs more than my rent", credit_name: "brokemillennial", platform: "youtube", context_desc: "YouTube: Influencer morning routine video featuring $400 supplements, a $3000 cold plunge tub, and a personal chef making an avocado toast", original_link: "https://youtube.com", vibe: "roast" },
  { comment_text: "Nothing humbles you faster than a front-facing camera opened accidentally", credit_name: "uglytruth", platform: "x", context_desc: 'Tweet: "What\'s the most humbling experience you\'ve had?" — 8K replies', original_link: "https://x.com", vibe: "funny" },
  { comment_text: "This is what happens when your personality is just a Spotify playlist", credit_name: "playlistpersonality", platform: "instagram", context_desc: "Instagram: Someone's dating profile where literally every photo is at a different music festival and their bio is just song lyrics", original_link: "https://instagram.com", vibe: "roast" },
  { comment_text: "Bro said 'work-life balance' and his boss heard 'fire me'", credit_name: "overworkeddev", platform: "reddit", context_desc: 'Reddit r/antiwork: Post about someone who asked for flexible hours and got put on a performance improvement plan the next day', original_link: "https://reddit.com", vibe: "savage" },
  { comment_text: "Tell me you've never been to a real barber without telling me you've never been to a real barber", credit_name: "barbershopcritic", platform: "tiktok", context_desc: "TikTok: Guy showing off his self-haircut attempt that looks like someone used a lawnmower", original_link: "https://tiktok.com", vibe: "roast" },
  { comment_text: "The way he looks at her is the way I look at my phone when it's at 1% and the charger is across the room", credit_name: "romanticrealist", platform: "instagram", context_desc: "Instagram Reel: Wedding video where the groom is tearing up watching his bride walk down the aisle", original_link: "https://instagram.com", vibe: "wholesome" },
  { comment_text: "Your code works? In this economy?", credit_name: "debugginglife", platform: "x", context_desc: 'Tweet: Someone celebrating that their code compiled on the first try', original_link: "https://x.com", vibe: "funny" },
  { comment_text: "I've been on hold longer than some of my relationships", credit_name: "customersupportsurvivor", platform: "reddit", context_desc: 'Reddit r/mildlyinfuriating: Screenshot of a 2-hour hold time with customer support, with hold music still playing', original_link: "https://reddit.com", vibe: "funny" },
  { comment_text: "His apology video had better production value than the original offense", credit_name: "apologycritic", platform: "youtube", context_desc: "YouTube: Influencer posts a cinematic apology video with dramatic lighting, a piano soundtrack, and multiple camera angles for getting caught faking a giveaway", original_link: "https://youtube.com", vibe: "savage" },
  { comment_text: "That's not a red flag, that's the entire Soviet Union", credit_name: "datingexpert", platform: "reddit", context_desc: 'Reddit r/dating_advice: Post about a date who showed up 2 hours late, borrowed money for dinner, then asked for a ride to their ex\'s house', original_link: "https://reddit.com", vibe: "roast" },
  { comment_text: "Imagine explaining this to a medieval peasant. 'So you have a magic rectangle that shows you cats and makes you sad?'", credit_name: "timetravel_thoughts", platform: "x", context_desc: 'Tweet: "What would be the hardest thing to explain about modern life to someone from 500 years ago?"', original_link: "https://x.com", vibe: "bigbrain" },
];

async function seed() {
  console.log("🌱 Seeding Komment database...\n");

  let cards = [...SEED_CARDS];

  // Also import from scraper output if it exists
  if (existsSync("komment_seed.json")) {
    console.log("📦 Found komment_seed.json — importing scraped cards...\n");
    try {
      const scraped = JSON.parse(readFileSync("komment_seed.json", "utf-8"));
      for (const card of scraped.cards || []) {
        cards.push({
          comment_text: card.comment,
          credit_name: card.creditName || card.author || "anonymous",
          platform: card.platform || "reddit",
          context_desc: card.contextDesc,
          original_link: card.originalLink || null,
          vibe: card.vibe || "funny",
        });
      }
    } catch (e) {
      console.error("Error reading komment_seed.json:", e.message);
    }
  }

  let success = 0;
  let failed = 0;

  for (const card of cards) {
    const { error } = await supabase.from("cards").insert({
      comment_text: card.comment_text,
      credit_name: card.credit_name,
      platform: card.platform,
      context_desc: card.context_desc,
      original_link: card.original_link,
      vibe: card.vibe || "funny",
      views: Math.floor(Math.random() * 150000) + 5000,
      shares: Math.floor(Math.random() * 4000) + 100,
      clickthroughs: Math.floor(Math.random() * 2000) + 50,
      report_count: 0,
      is_hidden: false,
    });

    if (error) {
      console.error(`  ✗ Failed: "${card.comment_text.slice(0, 50)}..." — ${error.message}`);
      failed++;
    } else {
      console.log(`  ✓ "${card.comment_text.slice(0, 60)}..."`);
      success++;
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`✅ Seeded ${success} cards (${failed} failed)`);
  console.log(`${"=".repeat(50)}`);
}

seed().catch(console.error);
