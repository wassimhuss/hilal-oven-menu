# Hilal Oven menu

Mobile-first Arabic/English customer menu at `/`, with PIN-protected menu management at `/admin`. Prices are whole Lebanese pounds. The logo and food artwork come from the owner's supplied PDF; the initial menu intentionally contains no invented items or prices.

## Architecture

- **Render Static Site** serves the exported website for free.
- **Supabase** stores the menu and exposes anonymous read access.
- Admin writes only work through `SECURITY DEFINER` database functions after a valid temporary admin session is issued.
- The four-digit code is stored only as a bcrypt hash. Five failed attempts lock login for 15 minutes. Successful sessions expire after two hours and are stored only in the browser tab's `sessionStorage`.
- Row Level Security allows public reads and blocks direct anonymous writes.

## Supabase setup

1. Open the Supabase SQL Editor for the project.
2. Run `supabase/migrations/001_menu_and_pin_admin.sql` once, then run `supabase/migrations/002_admin_categories.sql`.
3. Generate a bcrypt hash locally and set it in `private.admin_config`. Do not put the plain PIN in source control.

Categories are managed by the administrator from the dashboard. A category with menu items cannot be deleted; move or delete those items first.

The app uses the project's publishable key. It does not need a service-role key or a paid Render database.

## Local development

```bash
npm install
npm run dev
```

The checked-in Supabase project URL and publishable key are safe for browser use. They can be overridden with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in an ignored `.env.local` file.

## Verification

```bash
npx tsc --noEmit
npm run lint
npm run build
```

The static build is written to `dist/client`.

## Render

Create a **Static Site** with:

- Build command: `npm ci && npm run build`
- Publish directory: `dist/client`

`render.yaml` contains the same settings. The live site is
`https://hilal-oven-menu.onrender.com/`. The PNG and SVG QR files in `public/`
were decoded and verified against that exact address.
