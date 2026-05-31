const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const VALID_LEVELS = new Set(['l1', 'l2', 'l3']);

module.exports = async (req, res) => {
  const origin = process.env.SITE_URL || 'https://wineexamprep.com';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { test, userId } = req.query;

  if (!test || !userId) {
    return res.status(400).json({ error: 'Missing required params: test, userId' });
  }

  // Validate test ID format: e.g. "l2-05"
  const parts = test.split('-');
  if (parts.length !== 2) return res.status(400).json({ error: 'Invalid test ID' });
  const [level, numStr] = parts;

  if (!VALID_LEVELS.has(level)) return res.status(400).json({ error: 'Invalid level' });

  const num = parseInt(numStr, 10);
  if (isNaN(num) || num < 1 || num > 20) return res.status(400).json({ error: 'Invalid test number' });

  const bundleId = `${level}-pack${num <= 10 ? 1 : 2}`;

  // Verify purchase in Supabase
  try {
    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data, error } = await db
      .from('purchases')
      .select('id')
      .eq('user_id', userId)
      .eq('bundle_id', bundleId)
      .maybeSingle();

    if (error || !data) {
      return res.status(403).json({ error: 'Access denied. Please purchase this bundle.' });
    }
  } catch (err) {
    console.error('Purchase verification error:', err);
    return res.status(500).json({ error: 'Server error verifying access' });
  }

  // Serve the question data
  try {
    const paddedNum = numStr.padStart(2, '0');
    const filePath = path.join(process.cwd(), 'data', level, `${paddedNum}.json`);
    const content = fs.readFileSync(filePath, 'utf8');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).send(content);
  } catch (err) {
    console.error('File read error:', err);
    return res.status(404).json({ error: 'Exam data not found' });
  }
};
