const Stripe = require('stripe');

const VALID_LEVELS = new Set(['l1', 'l2', 'l3']);

module.exports = async (req, res) => {
  const origin = process.env.SITE_URL || 'https://wineexamprep.com';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const { bundleId, level, pack, promo, userId, userEmail } = req.body;

  if (!bundleId || !level || !pack) {
    return res.status(400).json({ error: 'Missing bundleId, level, or pack' });
  }

  // pack is sent as a number (1 or 2) from the client
  const packNum = parseInt(pack, 10);
  if (!VALID_LEVELS.has(level) || (packNum !== 1 && packNum !== 2)) {
    return res.status(400).json({ error: 'Invalid level or pack' });
  }

  // Pricing: L1 = $5, L2/L3 = $10 (promo: $5 per-session timer on client)
  const pricing = {
    l1: { regular: 500, promo: 500 },
    l2: { regular: 1000, promo: 500 },
    l3: { regular: 1000, promo: 500 },
  };

  const levelPricing = pricing[level];
  const unitAmount = promo ? levelPricing.promo : levelPricing.regular;

  const levelNames = { l1: 'Level 1', l2: 'Level 2', l3: 'Level 3' };
  const startTest = packNum === 1 ? 1 : 11;
  const endTest = packNum === 1 ? 10 : 20;
  const siteUrl = process.env.SITE_URL || 'https://wineexamprep.com';

  try {
    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `WSET ${levelNames[level]} Practice Exams — Pack ${pack}`,
            description: `10 full-length practice exams (Exams ${startTest}-${endTest}) with detailed explanations`,
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${siteUrl}/?bundle=${bundleId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/#bundles`,
      metadata: {
        bundleId,
        level,
        pack: String(pack),
        promo: String(!!promo),
        userId: userId || '',
        userEmail: userEmail || '',
      },
    };

    if (userEmail) {
      sessionConfig.customer_email = userEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};
