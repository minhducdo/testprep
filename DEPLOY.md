# WineExamPrep — Deployment Guide

## 1. Domain

**wineexamprep.com** purchased on Namecheap.

## 2. Stripe Setup

1. Dashboard: [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Go to **Developers > API Keys** and copy your:
   - **Publishable key** (`pk_test_...` for testing, `pk_live_...` for production)
   - **Secret key** (`sk_test_...` for testing, `sk_live_...` for production)
3. No products need to be created in Stripe — pricing is defined inline in `api/create-checkout.js`

### Pricing (defined in code)
| Bundle | Regular | Promo (50% off) |
|--------|---------|-----------------|
| Level 1 Pack (10 tests) | $5 | $5 (no promo) |
| Level 2 Pack (10 tests) | $10 | $5 |
| Level 3 Pack (10 tests) | $10 | $5 |

Promo runs for the first 10 minutes of a visitor's session, then expires for 24 hours.

## 3. GitHub Setup

1. Create org **Test Prep** under account `minhducdo`
2. Create repo `wineexamprep` under that org
3. Push this project:
```bash
cd wineexamprep
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TestPrep/wineexamprep.git
git push -u origin main
```

## 4. Deploy to Vercel

### Install Vercel CLI
```bash
npm install -g vercel
```

### Deploy
```bash
cd wineexamprep
npm install
vercel
```

### Set Environment Variables
```bash
vercel env add STRIPE_SECRET_KEY        # sk_test_... or sk_live_...
vercel env add STRIPE_PUBLISHABLE_KEY   # pk_test_... or pk_live_...
vercel env add SITE_URL                 # https://wineexamprep.com
```

Then deploy to production:
```bash
vercel --prod
```

### Connect Domain
1. In Vercel Dashboard > your project > **Settings > Domains**
2. Add `wineexamprep.com`
3. Update DNS in Namecheap with the records Vercel provides
4. SSL is automatic

## 5. AIRkit Login (Pending)

1. Register at [developers.sandbox.air3.com](https://developers.sandbox.air3.com)
2. Create an app and get your App ID
3. Replace the placeholder `handleLogin()` function in `public/index.html` with the AIRkit SDK
4. This enables email/passkey login and cross-device purchase sync

## 6. Test the Payment Flow

1. Use Stripe **test mode** keys first
2. Visit your site, click any "Unlock" button
3. Use test card: `4242 4242 4242 4242`, any future expiry, any CVC
4. Verify redirect back and bundle unlocks
5. Switch to **live mode** keys and redeploy

## 7. Project Structure

```
wineexamprep/
├── public/
│   ├── index.html          # Landing page with bundle pricing & promo timer
│   └── exam.html           # Universal exam engine
├── api/
│   ├── create-checkout.js  # Creates Stripe Checkout sessions (bundle-based)
│   └── verify-payment.js   # Verifies payment & returns bundle info
├── data/
│   ├── l1/01-20.json       # Level 1 tests (30 questions each)
│   ├── l2/01-20.json       # Level 2 tests (50 questions each)
│   └── l3/01-20.json       # Level 3 tests (50 questions each)
├── package.json
├── vercel.json
└── .env.example
```

## 8. Cost Summary

| Item | Cost |
|------|------|
| Domain | ~$12/year |
| Vercel hosting | Free (Hobby tier) |
| Stripe fees | 2.9% + $0.30 per transaction |
| **Net revenue per $5 bundle** | **~$4.56** |
| **Net revenue per $10 bundle** | **~$9.41** |

## 9. Updating Questions

Each test is a standalone JSON file in `data/l1/`, `data/l2/`, or `data/l3/`. Format:
```json
{
  "id": 1,
  "category": "Topic Name",
  "text": "Question text?",
  "options": ["A", "B", "C", "D"],
  "correct": 2,
  "explanation": "Why C is correct."
}
```

Save and redeploy: `vercel --prod`
