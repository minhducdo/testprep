const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

// Vercel: disable body parsing — Stripe signature verification requires the raw body
module.exports.config = { api: { bodyParser: false } };

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    if (session.payment_status === 'paid') {
      const { bundleId, userId, userEmail, level, pack, promo } = session.metadata;

      if (userId && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
        try {
          const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
          const { error } = await db.from('purchases').upsert({
            user_id: userId,
            bundle_id: bundleId,
            stripe_session_id: session.id,
            amount_cents: session.amount_total,
            level,
            pack,
            promo: promo === 'true',
          }, {
            onConflict: 'user_id,bundle_id',
            ignoreDuplicates: true,
          });
          if (error) console.error('Supabase upsert error:', error);
        } catch (dbErr) {
          // Log but return 200 — Stripe will retry on 5xx, not on success
          console.error('Supabase purchase record error:', dbErr);
        }
      } else {
        console.warn('Webhook: paid session missing userId in metadata', session.id);
      }
    }
  }

  // Always return 200 so Stripe doesn't keep retrying
  res.status(200).json({ received: true });
};
