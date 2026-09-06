# Hilal Oven menu

Arabic/English customer menu at `/`, and a protected menu dashboard at `/admin`. Prices are whole Lebanese pounds. Original logo and food artwork were extracted from the owner's supplied PDF. The menu intentionally contains no fabricated items or prices.

## Admin access

The dashboard uses the Sites platform's ChatGPT sign-in. Every admin API checks the server-side `ADMIN_EMAILS` allowlist. Missing configuration denies all admin access. Configure production values through Sites environment variables; keep them out of source control. Customers can browse anonymously when the Site's audience is public.

The owner can create and edit bilingual names/descriptions, choose one of five categories, set an LBP price, mark an item unavailable, and confirm deletion. Saves persist in D1. Customers fetch current data on opening the menu, returning to the tab, and every 30 seconds while the tab is visible. A timestamp check prevents stale editors from overwriting or deleting newer changes.

## Local development

Run `npm install`, then `npm run dev`. Use a local `.env` with `ADMIN_EMAILS=seedy@sites.test` to authorize the Sites local sign-in simulator. This is a development-only identity; it is not configured for production. The simulator strips supplied identity headers and provides its own identity after local sign-in.

Schema: `db/schema.ts`. SQL migrations: `drizzle/`. Generate new migrations with `npm run db:generate`. Apply them to the local D1 binding with Wrangler using database ID `00000000-0000-4000-8000-000000000000` and the `.wrangler/state` persistence directory. Sites applies packaged migrations to production during deployment. Never edit an applied migration.

## Verification

- `npx tsc --noEmit`
- `node tests/menu-api.mjs` with the local dev server, schema, and local admin identity configured. Creates temporary verification items and removes them. Refuses non-local hosts.
- `npm run build`

The API verification covers anonymous and spoofed identity denial, cross-origin write rejection, input validation, bilingual create/edit/delete, shared data, availability, stale-edit/deletion protection, and cleanup. Browser interaction testing is a separate check.

## QR code

`public/hilal-oven-qr.png` and `.svg` point to `https://hilal-oven-menu.wassimah.chatgpt.site/`. PNG was decoded and verified programmatically. Admins can download it from the dashboard. Keep the URL unchanged after printing; item and price edits do not require a new QR code. Regenerate the code if the Site slug or domain changes.
