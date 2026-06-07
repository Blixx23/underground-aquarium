# 🚀 Deploy UndergroundAquarium — Step by Step

Zero coding experience needed. Follow this exactly and you'll be live in ~30 minutes.

---

## What You're Setting Up
- **Vercel** — hosts your website (free)
- **Supabase** — your database & user accounts (free to start)
- **GitHub** — stores your code (free)

---

## Step 1: Install Node.js
1. Go to https://nodejs.org
2. Download and install the **LTS** version
3. Open Terminal (Mac) or Command Prompt (Windows)
4. Type `node -v` and press Enter — you should see a version number

---

## Step 2: Put Your Code on GitHub
1. Go to https://github.com and create a free account
2. Click **New Repository** → name it `underground-aquarium` → **Create**
3. Open Terminal, navigate to this project folder:
   ```
   cd path/to/undergroundaquarium
   ```
4. Run these commands one by one:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/underground-aquarium.git
   git push -u origin main
   ```

---

## Step 3: Set Up Supabase (Your Database)
1. Go to https://supabase.com → **Start your project** → Sign up free
2. Click **New Project** → name it `undergroundaquarium`
3. Choose a strong database password and save it somewhere safe
4. Wait ~2 minutes for it to set up
5. Go to **Settings → API** and copy:
   - **Project URL** → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → this is your `SUPABASE_SERVICE_ROLE_KEY` (keep this private!)

---

## Step 4: Deploy to Vercel
1. Go to https://vercel.com → **Sign up with GitHub**
2. Click **Add New Project** → import your `underground-aquarium` repo
3. Before clicking Deploy, click **Environment Variables** and add:
   ```
   NEXT_PUBLIC_SUPABASE_URL        → your Supabase project URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY   → your Supabase anon key
   SUPABASE_SERVICE_ROLE_KEY       → your Supabase service role key
   NEXT_PUBLIC_SITE_URL            → https://your-vercel-url.vercel.app (update later)
   ```
4. Click **Deploy** — Vercel builds and publishes your site automatically!

---

## Step 5: Connect Your Domain
1. In Vercel → your project → **Settings → Domains**
2. Add `undergroundaquarium.com` and `www.undergroundaquarium.com`
3. Vercel will show you DNS records to add
4. Log into your domain registrar (where you bought the domain)
5. Add the DNS records Vercel shows you
6. Wait up to 24 hours for DNS to propagate (usually under 1 hour)

---

## Step 6: Every Future Update
Whenever you change code, just run:
```
git add .
git commit -m "describe what you changed"
git push
```
Vercel automatically rebuilds and deploys. **Zero downtime.**

---

## Estimated Monthly Costs
| Service | Cost |
|---------|------|
| Vercel (hosting) | Free |
| Supabase (database) | Free up to 500MB |
| Domain | ~$12/year (~$1/mo) |
| **Total** | **~$1/month** |

Supabase Pro ($25/mo) only needed when you have thousands of users and heavy traffic.

---

## Need Help?
- Vercel docs: https://vercel.com/docs
- Supabase docs: https://supabase.com/docs
- Next.js docs: https://nextjs.org/docs
