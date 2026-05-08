# Wedding Invitation — Luxury SPA

Single-page wedding invitation built with **HTML**, **CSS**, and **vanilla JavaScript**, backed by **Firebase Firestore** for guest messages and RSVP submissions. Designed for **RTL / Arabic-first** layout with elegant English companion copy.

## Features

- Cinematic hero with particles and smooth entrance motion  
- Live countdown (June 5 · 9:00 PM — **year set in `script.js`**, default **2026**, local time)  
- Venue section with Google Maps link  
- Guest message form + optional signature canvas (PNG stored as base64 in Firestore)  
- RSVP form with validation and loading state  
- Live wall of recent messages (Firestore snapshot listener)  
- Optional background music toggle (add your **licensed** audio file — see below)  
- Loading screen, glassmorphism cards, scroll-triggered section reveals  
- **Vercel-ready** static deployment  

## Local setup

1. **Clone or copy** this folder to your machine.

2. **Serve over HTTP** (needed for ES modules and Firebase):

   ```bash
   npx --yes serve .
   ```

   Or use VS Code Live Server, Python `http.server`, etc.

3. Open the printed URL (usually `http://localhost:3000`).

> Opening `index.html` directly as `file://` may block ES module imports in some browsers — always use a local server.

## Firebase setup

1. In [Firebase Console](https://console.firebase.google.com/), open project **`wedding-invitation-f2472`** (or replace config in `firebase.js` with your own project).

2. Enable **Firestore** (production mode first; then deploy rules below).

3. Deploy **`firestore.rules`** from this repo:

   - Console → **Firestore Database** → **Rules** → paste contents of `firestore.rules` → **Publish**  
   - Or use Firebase CLI: `firebase deploy --only firestore:rules`

4. **Collections** used:

   | Collection   | Purpose        | Public read (default in rules) |
   | ------------ | -------------- | ------------------------------- |
   | `messages`   | Wall + canvas  | Yes                             |
   | `rsvps`      | RSVP responses | No (privacy)                    |

   To **display RSVPs** in the admin UI later, tighten writes but enable reads only for authenticated admins — the sample rules keep RSVPs **write-only from the web**.

5. **Indexes**: The query `messages` ordered by `createdAt` descending uses the automatic single-field index. If you add filters, create composite indexes from the Firebase Console link in the error message.

## Background music (optional)

The template ships **without** audio. To enable the toggle:

1. Add a licensed MP3 (or compatible format) to the project, e.g. `audio/ambient.mp3`.

2. In `index.html`, set the `<source>` inside `#bg-audio`:

   ```html
   <source src="audio/ambient.mp3" type="audio/mpeg" />
   ```

Browsers may block autoplay; the floating button lets guests **opt in** after a gesture.

## GitHub upload

1. Initialize git (if needed):

   ```bash
   git init
   git add .
   git commit -m "Add wedding invitation SPA"
   ```

2. Create a **new empty repository** on GitHub (no README/license if you already have files locally).

3. Link and push:

   ```bash
   git remote add origin https://github.com/<you>/<repo>.git
   git branch -M main
   git push -u origin main
   ```

## Vercel deployment

1. Sign in at [vercel.com](https://vercel.com/) and **Import** your GitHub repository.

2. In **Configure Project**, use:
   - **Framework Preset**: **Other**
   - **Root Directory**: `./` (leave default if the repo root contains `index.html`)
   - **Build Command**: leave **empty** (this site has no compile step)
   - **Output Directory**: leave **empty**, or set to **`.`** if Vercel asks for one  
   - **Install Command**: leave default (`npm install`) — the repo includes a minimal `package.json` so install always succeeds

3. Click **Deploy**. After it finishes, open the **`.vercel.app`** URL from the success screen.

4. **Environment**: No env vars required for this client-only Firebase config (API keys are public in Firestore web apps). Restrict abuse with **Firestore rules**, **App Check** (optional), and sane field limits.

### “No Production Deployment” / “Production Domain is not serving traffic”

That banner means **nothing is assigned to production yet** or the **last production deploy failed**. Do this in order:

1. Open your project → **Deployments**. Find the latest deployment on your production branch (usually `main`).
2. If status is **Error** or **Canceled**: open it → **Building** / **Running** logs and fix the reported issue (see settings below), then **Redeploy**.
3. If there are **no** deployments: trigger one — **Deployments** → **Create Deployment** (deploy current `main`), or push a new commit to GitHub.
4. **Project → Settings → Git**: confirm **Production Branch** matches your real branch name (`main` vs `master`).
5. **Project → Settings → Domains**: your `*.vercel.app` domain should attach automatically after a **successful** production deployment. Custom domains need correct DNS and sometimes a **Redeploy** after DNS propagates.

After the first **green** production deployment, the warning usually disappears within a minute.

**CLI (optional):** with [Vercel CLI](https://vercel.com/docs/cli) installed and logged in:

```bash
npx vercel --prod
```

## Updating the site later

1. Edit **copy** in `index.html`, **styles** in `style.css`, **behavior** in `script.js` / `firebase.js`.

2. **Wedding date/time**: constant `WEDDING_DATE` in `script.js`.

3. **Firebase config**: `firebase.js`.

4. **Security rules**: `firestore.rules` → redeploy in Firebase Console after edits.

5. Push to GitHub; Vercel **auto-deploys** on push to the connected branch.

## Project structure

```
├── index.html       # Markup & sections
├── style.css        # Luxury styling, RTL, animations
├── script.js        # UI, countdown, canvas, Firestore
├── firebase.js      # Firebase app + Firestore export
├── firestore.rules  # Paste/deploy to Firebase
├── vercel.json      # Static hosting headers (Vercel)
├── package.json     # Minimal file so Vercel `npm install` succeeds
└── README.md
```

## Privacy & security notes

- RSVP documents are **not** readable by anonymous clients under the sample rules — submissions still **succeed**; view them in Firebase Console or add an admin app later.
- Messages are **publicly readable** by design for the guest wall.
- Replace demo keys with your own Firebase project for production if this template was copied outside the owner’s account.

---

Made with care for a calm, cinematic, **minimal luxury** wedding experience.
