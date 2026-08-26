const fetch = require('node-fetch');

const DERIV_APP_ID = process.env.DERIV_APP_ID || '33rxAwkQtyvcvVAj38XLU';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { token, appId } = req.query;
  if (!token) return res.status(400).json({ error: 'Missing token parameter' });

  try {
    const response = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Deriv-App-ID': appId || DERIV_APP_ID,
      },
    });

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      return res.status(response.status || 500).json({
        error: 'Deriv API returned non‑JSON response',
        raw: text
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || data.error || 'Deriv API error',
        details: data
      });
    }

    // 📌 FIX: Unwrap the "data" wrapper if it exists
    const accountsArray = data.data || data.accounts || data;

    // ✅ Send back just the array (not wrapped)
    res.json(accountsArray);
  } catch (err) {
    console.error('Accounts fetch error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
