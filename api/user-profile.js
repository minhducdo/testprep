const { createClient } = require('@supabase/supabase-js');

const supabase = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.SITE_URL || 'https://wineexamprep.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = supabase();

  // ── GET: Lookup user by airkit_uuid, return profile + purchases ──
  // Email-based lookup is intentionally not supported — it would allow
  // unauthenticated callers to enumerate whether any email is registered.
  if (req.method === 'GET') {
    const { airkit_uuid } = req.query;
    if (!airkit_uuid) {
      return res.status(400).json({ error: 'Provide airkit_uuid' });
    }

    try {
      const { data: user, error: userErr } = await db
        .from('users')
        .select('*')
        .eq('airkit_uuid', airkit_uuid)
        .single();

      if (userErr || !user) {
        return res.status(404).json({ found: false });
      }

      // Fetch their purchases
      const { data: purchases } = await db
        .from('purchases')
        .select('bundle_id, purchased_at')
        .eq('user_id', user.id);

      return res.status(200).json({
        found: true,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          city: user.city,
          country: user.country,
          zip_code: user.zip_code,
        },
        bundles: (purchases || []).map(p => p.bundle_id),
      });
    } catch (err) {
      console.error('User lookup error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // ── POST: Create or update user profile ──
  if (req.method === 'POST') {
    const { airkit_uuid, email, first_name, last_name, city, country, zip_code } = req.body;

    if (!email || !first_name || !last_name) {
      return res.status(400).json({ error: 'Missing required fields: email, first_name, last_name' });
    }

    try {
      // Check if user already exists (by airkit_uuid or email)
      let existing = null;
      if (airkit_uuid) {
        const { data } = await db.from('users').select('id').eq('airkit_uuid', airkit_uuid).single();
        existing = data;
      }
      if (!existing) {
        const { data } = await db.from('users').select('id').eq('email', email).single();
        existing = data;
      }

      if (existing) {
        // Update existing user
        const { data: updated, error } = await db
          .from('users')
          .update({ first_name, last_name, city, country, zip_code, airkit_uuid: airkit_uuid || undefined })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;

        // Fetch purchases
        const { data: purchases } = await db
          .from('purchases')
          .select('bundle_id')
          .eq('user_id', updated.id);

        return res.status(200).json({
          user: {
            id: updated.id,
            email: updated.email,
            first_name: updated.first_name,
            last_name: updated.last_name,
            city: updated.city,
            country: updated.country,
            zip_code: updated.zip_code,
          },
          bundles: (purchases || []).map(p => p.bundle_id),
          created: false,
        });
      }

      // Create new user
      const { data: newUser, error } = await db
        .from('users')
        .insert({ airkit_uuid, email, first_name, last_name, city, country, zip_code })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        user: {
          id: newUser.id,
          email: newUser.email,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          city: newUser.city,
          country: newUser.country,
          zip_code: newUser.zip_code,
        },
        bundles: [],
        created: true,
      });
    } catch (err) {
      console.error('User profile error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
