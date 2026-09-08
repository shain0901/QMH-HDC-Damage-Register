# QMH Damage Register

A shared damage/incident register for the three heritage buildings at the Queen Mary Hospital
grounds (Chisholm Block, Nurse's Hostel, Soldier's Block), for Hanmer Security's work for Hurunui
District Council. Replaces the earlier Claude Artifact prototype with a real, individually-logged-in
app so access isn't tied to Claude account membership, and so photos attach directly to each
incident instead of being emailed/texted separately.

Stack: FastAPI (Python) + Postgres backend, React + MUI frontend, deployed together as one Vercel
project — same shape as the HHH WiFi Manager. Magic-link email sign-in (via Resend), no passwords.

## Roles

| Role | Can do |
|---|---|
| **admin** (Shain) | Everything — full edit, delete, assign repairs, manage zones/buildings, manage user accounts |
| **editor** (Rhys, Garth) | Everything except managing user accounts |
| **reporter_repairer** (Salym) | Submit new incidents (incl. filing a police report), update repair status/contractor/date |
| **repairer** (other HHH staff) | Read-only on the register + building maps, plus updating repair status/date on incidents |

Change the capability matrix in `app/auth.py` (`ROLE_CAPS`) if this needs adjusting — it's the one
place all four roles' permissions are defined, both frontend (`frontend/src/lib/api.js` mirrors it
for UI purposes only) and backend (which is what actually enforces it).

## One-time setup

1. **Create the Vercel project.** Push this repo to GitHub/GitLab and import it into Vercel, or run
   `vercel` from this directory. Vercel should detect the Python function under `api/` and the
   frontend build automatically via `vercel.json`.

2. **Add a Postgres database.** In the Vercel project → Storage tab → Create Database → Postgres
   (or bring your own Neon/Supabase instance). Copy the connection string into `DATABASE_URL`.

3. **Add Blob storage** (for photos). Storage tab → Create Database → Blob. Vercel automatically
   sets `BLOB_READ_WRITE_TOKEN` for you once it's attached to the project.

4. **Set up Resend** (resend.com) for magic-link emails. Verify a sending domain (or use their
   test domain while trying this out), create an API key, and set `RESEND_API_KEY` + `EMAIL_FROM`.

5. **Set the remaining environment variables** in Vercel project settings → Environment Variables
   (see `.env.example` for the full list): `JWT_SECRET` (generate with `openssl rand -hex 32`) and
   `APP_BASE_URL` (your deployed URL, e.g. `https://qmh-damage-register.vercel.app`).

6. **Run the schema against your database**, once, from your own machine:

   ```
   psql "$DATABASE_URL" -f app/db/schema.sql
   ```

7. **Fill in real email addresses and run the seed script.** Open `app/db/seed.py`, replace the
   `TODO-...@example.com` placeholders for Rhys and Garth with their real emails, then run:

   ```
   pip install -r requirements.txt
   python -m app.db.seed
   ```

   This creates the four named accounts (Shain/admin, Rhys+Garth/editor, Salym/reporter_repairer)
   and the three buildings with their current zone lists. Re-running it later is safe — it updates
   rather than duplicates. Add other HHH repair staff afterwards from the in-app **Manage users**
   page (admin only) as their names come through, using the **Repairer** role.

8. **Add the building map photos.** Drop the redrawn site photos into `frontend/public/maps/` as
   `chisholm-block.jpg`, `nurses-hostel.jpg`, `soldiers-block.jpg` (see the README in that folder).
   No code change needed — they show up on the next deploy.

9. **Deploy**: `vercel --prod`, or push to your connected git branch.

## First-deploy checklist

This is a from-scratch build, not something tested against a live Vercel deployment, so a couple of
things are worth checking the first time it goes up:

- **Routing** (`vercel.json`): the `builds`/`routes` config wires three different function types
  (Python API, one Node function for Blob uploads, and the static frontend build) onto one domain.
  If `/api/blob-upload-url` 404s or hits the Python function instead of the Node one, that's the
  first place to look.
- **Vercel Blob's REST/client-upload contract** (`api/blob-upload-url.js`) — built against
  `@vercel/blob`'s documented client-upload pattern, but Blob has evolved quickly in the past; if
  photo uploads fail, check `@vercel/blob`'s current docs against this file.
- **Cold starts**: the Python function opens a fresh Postgres connection per request rather than
  pooling (see `app/db/connection.py`) — fine at this app's scale, but if `DATABASE_URL` points at
  a non-pooled connection string and things feel slow under concurrent use, switch to your Postgres
  provider's pooled connection string (Vercel Postgres and Neon both offer one) — no code change
  needed, just the env var.

## Local development

```
# Terminal 1 — API
pip install -r requirements.txt
export $(cat .env | xargs)   # or use your own env loading
vercel dev                   # runs both the Python + Node functions locally on :3000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev                  # :5173, proxies /api to :3000 (see vite.config.js)
```

## What's not built (yet)

- No photo deletion once attached (only adding).
- No "forgot which zone" — the admin/editor "Edit zone layout" flow is basic (add/rename/remove,
  matching the original prototype); no drag-to-reorder.
- No rate limiting on `/api/auth/request-link` — fine for a small known user base, worth adding
  if this ever gets exposed more broadly.
