# MayApps

MayApps is a personal "scratchpad of mini-apps": a place to store little JS / React
apps and run them in the browser, each backed by a database.

## Concept

- **No custom backend.** The whole app runs client-side. It talks directly to a
  **Firebase Firestore** database over the Firebase SDK.
- **You bring the database.** On first load you paste your project's `firebaseConfig`
  (a publishable client config, not a secret) into a credential gate. It's stored in
  this browser's `localStorage`; real access control lives in your Firestore Security
  Rules.
- **Apps are stored scripts.** A predefined `apps` collection holds your mini-apps
  (name, description, type, and source code). You can create, edit, delete, and run
  them from the UI.
- **Two app types.** Each app is either:
  - `react` — JSX, compiled in-browser via `@babel/standalone` (lazy-loaded from a
    CDN). Mounts by calling `render(<App/>)`.
  - `vanilla` — plain JS that gets a `root` element to manipulate.
- **Apps get their own DB access.** Each running app receives an injected, **scoped**
  `db` API (`create` / `list` / `get` / `update` / `remove`) that reads and writes only
  under `appData/{appId}/items/*`. Apps are isolated by their unique id, so they can't
  touch each other's data or the `apps` registry.
- **Apps work offline.** Firestore's persistent (IndexedDB) cache is enabled, so reads
  resolve from local data and writes are **queued and synced automatically** when the
  connection returns. The `db` write methods (`create` / `update` / `remove`) resolve
  immediately rather than waiting for the server, so an app never hangs while offline —
  `create` returns a real id you can use right away. Apps that want to surface this can
  call `db.onStatus(cb)` (see below). See `public/examples/offline-notes.jsx` for a demo.

### `db.onStatus(callback) → unsubscribe`

Subscribe to live connectivity / sync state. The callback fires immediately and on every
change with `{ online: boolean, pending: boolean }`, where `pending` means this app has
local writes not yet acknowledged by the server. Returns an unsubscribe function — call it
when the app unmounts. Example (React): `useEffect(() => db.onStatus(setStatus), [])`.

> **Security note:** stored apps run via `new Function(...)` with full page privileges.
> That trade-off is acceptable here because the "credentials" are a publishable Firebase
> config protected by Security Rules — not a secret connection string. Don't paste apps
> you don't trust if you later store anything sensitive.

## Project structure

- `src/lib/` — `firebase.ts` (config + init), `appsRepo.ts` (CRUD over the `apps`
  collection), `appData.ts` (the scoped `db` API given to apps), `runner.ts` (executes
  vanilla / React apps), `examples.ts` (seed apps + New-app templates), `types.ts`.
- `src/components/` — `CredentialGate.tsx`, `AppEditor.tsx`, `AppRunner.tsx`.
- `src/app/page.tsx` — orchestrates the gate → list → editor / runner.
- `firestore.rules` — starter Security Rules (permissive; tighten before storing
  anything sensitive).

## Setup

1. Create a Firebase project, add a **Web app**, and copy its `firebaseConfig`.
2. Enable **Firestore** (the `(default)` database).
3. Publish Security Rules — start from `firestore.rules` in this repo.
4. Run the dev server (below), open the app, and paste your config as JSON into the
   credential gate. Use **Add example apps** to seed working samples.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
