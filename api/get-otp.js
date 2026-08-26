const fetch = require('node-fetch');

const DERIV_APP_ID = process.env.DERIV_APP_ID || '33rxAwkQtyvcvVAj38XLU';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token, accountId, appId } = req.body;
  if (!token || !accountId) {
    return res.status(400).json({ error: 'Missing token or accountId' });
  }

  try {
    const response = await fetch(`https://api.derivws.com/trading/v1/options/accounts/${accountId}/otp`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Deriv-App-ID': appId || DERIV_APP_ID,
        'Content-Type': 'application/json',
      },
    });

    const text = await response.text();

    // Try to parse JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      // Not JSON – return the raw text
      return res.status(500).json({ error: 'Deriv returned non‑JSON', raw: text });
    }

    // If Deriv returned an error (even with 200 status), forward it
    if (data.error || data.message) {
      return res.status(response.status === 200 ? 400 : response.status).json({
        error: data.message || data.error || 'Deriv API error',
        raw: text,
        details: data
      });
    }

    // Check for OTP or URL
    if (data.url) {
      return res.json({ url: data.url });
    }

    const otp = data.otp || data.token;
    if (otp) {
      const type = accountId.startsWith('DOT') ? 'demo' : 'real';
      const wsUrl = `wss://api.derivws.com/trading/v1/options/ws/${type}?otp=${otp}`;
      return res.json({ url: wsUrl });
    }

    // No OTP or URL found
    return res.status(500).json({
      error: 'No OTP or URL in response',
      raw: text,
      details: data
    });
  } catch (err) {
    console.error('OTP error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
