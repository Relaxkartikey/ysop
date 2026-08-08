# YSOP — Your Storage at One Place

YSOP is a file storage and sharing platform for developers and professionals. Upload a file, get a source link and a share link, organize everything into folders, and set an automatic expiry — or connect your own Cloudflare R2 bucket and manage it through the same workflow.

Live at [ysop.entospark.com](https://ysop.entospark.com).

## Features

- **Uploads with expiry** — pick 24 hours to 10 days, or make a link permanent on Pro
- **Folders** — nested up to 5 levels, with per-folder share pages and ZIP download
- **Source & share links** — a direct storage URL alongside a hosted download page
- **YSOP storage** — connect a personal Cloudflare R2 bucket; credentials are encrypted at rest and never returned to the client
- **Google sign-in** via Supabase Auth
- **Pro billing** via Cashfree, with a full subscription lifecycle (renewal, past-due recovery, cancellation, expiry) driven entirely by verified webhooks

## Tech stack

- **Framework**: Next.js (App Router), TypeScript
- **UI**: Tailwind CSS, shadcn/ui
- **Database & Auth**: Supabase (Postgres, Row Level Security, Google OAuth)
- **Storage**: Cloudflare R2 (platform storage + user-connected personal buckets)
- **Billing**: Cashfree (Orders API), with an internal provider-agnostic billing layer so other payment providers can be added without touching entitlement logic
- **Deployment**: Vercel

## Getting started

```sh
git clone https://github.com/Relaxkartikey/ysop.git
cd ysop
npm install
cp .env.example .env   # fill in your own Supabase/R2/Cashfree credentials
npm run dev
```

See `.env.example` for the full list of required environment variables.

## Project structure

```
app/            Routes, layouts, and Server Actions (App Router)
components/     UI components
server/         Business logic — files, storage, billing, admin
  billing/      Provider-agnostic billing layer + Cashfree implementation
  storage/      Storage provider abstraction (R2 today, others pluggable)
lib/            Shared client-safe utilities and config
supabase/       Database migrations
```

## License

MIT — see [LICENSE](LICENSE).

Built by [@relaxkartikey](https://github.com/relaxkartikey) at [Entospark](https://entospark.com).
