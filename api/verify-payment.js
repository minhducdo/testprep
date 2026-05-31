const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.SITE_URL || 'https://wineexamprep.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const { session_id } = req.query;

  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === 'paid') {
      const bundleId = session.metadata.bundleId;
      const userId = session.metadata.userId;
      const userEmail = session.metadata.userEmail;

      // Record purchase in Supabase if we have a userId
      if (userId && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
        try {
          const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
          );

          await supabase.from('purchases').upsert({
            user_id: userId,
            bundle_id: bundleId,
            stripe_session_id: session_id,
            amount_cents: session.amount_total,
            level: session.metadata.level,
            pack: session.metadata.pack,
            promo: session.metadata.promo === 'true',
          }, {
            onConflict: 'user_id,bundle_id',
            ignoreDuplicates: true,
          });
        } catch (dbErr) {
          // Log but don't fail — the payment was still successful
          console.error('Supabase purchase record error:', dbErr);
        }
      }

      return res.status(200).json({
        verified: true,
        bundleId,
        level: session.metadata.level,
        pack: session.metadata.pack,
        amount: (session.amount_total != null) ? session.amount_total / 100 : null,
        currency: (session.currency || 'usd').toUpperCase(),
        customerEmail: session.customer_details?.email || userEmail || null,
      });
    } else {
      return res.status(402).json({ verified: false, error: 'Payment not completed' });
    }
  } catch (err) {
    console.error('Stripe verify error:', err);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
};
