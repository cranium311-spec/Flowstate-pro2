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
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({ error: `Deriv returned non‑JSON: ${text.substring(0, 200)}`, raw: text });
    }

    // Check for error in response
    if (data.error || data.message) {
      return res.status(response.status === 200 ? 400 : response.status).json({
        error: data.message || data.error || 'Deriv API error',
        raw: text,
        details: data
      });
    }

    // 🔥 Extract the URL – look inside data.data.url or data.url
    let wsUrl = data.url || (data.data && data.data.url);

    if (wsUrl) {
      // Fix the protocol: Deriv sometimes returns "www://" instead of "wss://"
      if (wsUrl.startsWith('www://')) {
        wsUrl = wsUrl.replace('www://', 'wss://');
      }
      return res.json({ url: wsUrl });
    }

    // Fallback: extract OTP if URL isn't present
    const otp = data.otp || (data.data && data.data.otp);
    if (otp) {
      const type = accountId.startsWith('DOT') ? 'demo' : 'real';
      wsUrl = `wss://api.derivws.com/trading/v1/options/ws/${type}?otp=${otp}`;
      return res.json({ url: wsUrl });
    }

    // No URL or OTP found
    return res.status(500).json({
      error: `No OTP or URL. Deriv responded with: ${text.substring(0, 200)}`,
      raw: text,
      details: data
    });
  } catch (err) {
    console.error('OTP error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
