# Coach Jeremy Capocyan

A responsive Next.js App Router portfolio for a PhPA Level 1 certified pickleball coach. Built with TypeScript, React, Lucide icons, and custom CSS.

## Develop

Requires Node.js 20.9+ and pnpm 10.

```sh
pnpm install
pnpm dev
```

Open http://127.0.0.1:3000. To check and export:

```sh
pnpm typecheck
pnpm build
```

The deployable static website is generated in `out/`. It can be hosted on any static hosting service. `next start` is not used with the static export configuration.

## Content and media

- `app/page.tsx`: copy, coaching focus areas, photo gallery, FAQs, and contact links.
- `app/globals.css`: responsive styles and brand colors.
- `app/layout.tsx`: title, description, and favicon metadata.
- `public/media/`: supplied photos, branding, poster, and drill video. Photos are resized WebP copies; originals are untouched.

Contact actions open a phone call or a prefilled text message to +63 976 024 2712, taken from the supplied poster. The site does not submit bookings or collect personal data. Visitors confirm availability, venue, and rates directly with Jeremy. Coaching focus areas are suggested presentation copy, not confirmed prices or schedules. No testimonials or experience statistics are invented.

The gallery supports category filtering and accessible native modal dialogs. The supplied video uses native playback controls. Fonts load from Google Fonts with local system fallbacks. The site respects reduced motion preferences and includes a keyboard skip link.

## Hosting

The Sites project identity and static export directory are in `.openai/hosting.json`. Dependencies and generated files are excluded from source control. Keep the hosted audience private until ready to share.

Facebook enquiries link directly to the Coach Jeremy Pickleball Facebook Page.
