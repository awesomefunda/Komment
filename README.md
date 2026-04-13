# Komment — where comment is content

A platform where anyone can turn great social media comments into shareable content cards. No login required.

## Quick Start (15 minutes)

### 1. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to **SQL Editor** and paste the contents of `supabase/schema.sql` — click **Run**
3. Go to **Settings > API** and copy your **Project URL** and **anon public key**

### 2. Local Setup

```bash
# Clone and install
cd komment
npm install

# Configure env
cp .env.local.example .env.local
# Edit .env.local with your Supabase URL and anon key

# Seed the database with starter content
npm run seed

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 3. Deploy to Vercel

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Or connect your GitHub repo to Vercel for auto-deploys.

## Project Structure

```
komment/
├── app/
│   ├── layout.js          # Root layout + metadata
│   ├── page.js            # Main feed page
│   ├── globals.css         # Tailwind + custom styles
│   └── api/
│       └── cards/
│           ├── route.js    # GET feed, POST new card
│           └── [id]/
│               ├── share/route.js   # POST share event
│               └── report/route.js  # POST report
├── components/
│   ├── FeedCard.js         # Card component
│   ├── UploadModal.js      # Upload form
│   └── ReportModal.js      # Report flow
├── lib/
│   ├── supabase.js         # Supabase client
│   └── utils.js            # Helpers
├── scripts/
│   └── seed.mjs            # Seed database
├── supabase/
│   └── schema.sql          # Database schema
└── seed_scraper.py         # Reddit scraper for more seed content
```

## Seeding More Content

### Option A: Run the Reddit scraper

```bash
python seed_scraper.py    # Outputs komment_seed.json
npm run seed              # Imports into Supabase
```

### Option B: Manual curation

See `komment-seed-playbook.md` for a guide to manually curating 50+ comments in one evening.

## Tech Stack

- **Frontend:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Database:** Supabase (Postgres)
- **Hosting:** Vercel
- **Auth:** None (by design for V1)

## What's Included in V1

- Feed with Trending / Fresh / Top tabs
- Upload flow (comment + context + link + credit)
- Share button (clipboard + native share)
- View Original link (traffic back to source)
- Report flow with auto-hide at 5 reports
- Device fingerprinting to prevent report abuse
- Anonymous analytics (views, shares, clickthroughs)
- 30 seed cards built in + Reddit scraper for more
- Mobile-responsive design
- Vercel + Supabase ready

## What's NOT in V1

- No user accounts or login
- No likes, bookmarks, or comments on cards
- No AI curation
- No screenshot upload (text description only — add Supabase Storage later)
- No share card image generation (copies text — add Canvas API later)
