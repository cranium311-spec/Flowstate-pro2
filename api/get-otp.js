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
    console.log('OTP raw response:', text); // <-- will appear in Vercel logs

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({ error: 'Invalid JSON from Deriv', raw: text });
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'OTP request failed', details: data });
    }

    // 🔥 Use the URL directly if it exists – it already contains the OTP
    if (data.url) {
      return res.json({ url: data.url });
    }

    // Fallback: extract OTP and build URL
    const otp = data.otp || data.token;
    if (!otp) {
      return res.status(500).json({ error: 'No OTP or URL in response', raw: data });
    }

    const type = accountId.startsWith('DOT') ? 'demo' : 'real';
    const wsUrl = `wss://api.derivws.com/trading/v1/options/ws/${type}?otp=${otp}`;
    res.json({ url: wsUrl });
  } catch (err) {
    console.error('OTP error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
