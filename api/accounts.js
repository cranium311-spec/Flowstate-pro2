const fetch = require('node-fetch');

const DERIV_APP_ID = process.env.DERIV_APP_ID || '33rxAwkQtyvcvVAj38XLU';

module.exports = async (req, res) => {
  // Enable CORS for all origins (useful during development)
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, appId } = req.query;
  if (!token) {
    return res.status(400).json({ error: 'Missing token parameter' });
  }

  try {
    const response = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Deriv-App-ID': appId || DERIV_APP_ID,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Failed to fetch accounts' });
    }

    // Deriv returns an array of account objects; we wrap it.
    res.json({ accounts: data });
  } catch (err) {
    console.error('Accounts fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
