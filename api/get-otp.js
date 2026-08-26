const fetch = require('node-fetch');

const DERIV_APP_ID = process.env.DERIV_APP_ID || '33rxAwkQtyvcvVAj38XLU';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'OTP request failed' });
    }

    let wsUrl = data.url;
    if (!wsUrl) {
      const type = accountId.startsWith('DOT') ? 'demo' : 'real';
      wsUrl = `wss://api.derivws.com/trading/v1/options/ws/${type}?otp=${data.otp}`;
    }
    res.json({ url: wsUrl });
  } catch (err) {
    console.error('OTP error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
