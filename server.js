const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const qs = require('querystring');

const app = express();
const PORT = process.env.PORT || 3000;

// Use environment variables for sensitive data
const DERIV_APP_ID = process.env.DERIV_APP_ID || '33rxAwkQtyvcvVAj38XLU'; // your app ID

app.use(cors());
app.use(bodyParser.json());

// ---------- OAuth Token Exchange ----------
// POST /api/exchange-oauth-code
// Body: { code, code_verifier, redirect_uri }
app.post('/api/exchange-oauth-code', async (req, res) => {
  const { code, code_verifier, redirect_uri } = req.body;
  if (!code || !code_verifier || !redirect_uri) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const params = {
      grant_type: 'authorization_code',
      client_id: DERIV_APP_ID,
      code: code,
      code_verifier: code_verifier,
      redirect_uri: redirect_uri,
    };

    const response = await fetch('https://auth.deriv.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: qs.stringify(params),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error_description || data.error });
    }

    // Return access_token
    res.json({ access_token: data.access_token });
  } catch (err) {
    console.error('OAuth exchange error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------- Get OTP WebSocket URL ----------
// POST /api/get-otp
// Body: { token, accountId, appId }
app.post('/api/get-otp', async (req, res) => {
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

    // The OTP response should contain a WebSocket URL with the OTP embedded
    // Based on the docs, it returns a URL like: wss://api.derivws.com/trading/v1/options/ws/demo?otp=...
    // If not, we construct it.
    let wsUrl = data.url;
    if (!wsUrl) {
      // Fallback: construct from account type (demo/real) if known
      const type = accountId.startsWith('DOT') ? 'demo' : 'real';
      wsUrl = `wss://api.derivws.com/trading/v1/options/ws/${type}?otp=${data.otp}`;
    }
    res.json({ url: wsUrl });
  } catch (err) {
    console.error('OTP error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------- Get Accounts ----------
// GET /api/accounts?token=xxx&appId=xxx
app.get('/api/accounts', async (req, res) => {
  const { token, appId } = req.query;
  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
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

    // Data is expected to be an array of account objects
    res.json({ accounts: data });
  } catch (err) {
    console.error('Accounts fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
