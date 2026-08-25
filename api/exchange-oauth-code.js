const fetch = require('node-fetch');
const qs = require('querystring');

const DERIV_APP_ID = process.env.DERIV_APP_ID || '33rxAwkQtyvcvVAj38XLU';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, code_verifier, redirect_uri } = req.body;
  if (!code || !code_verifier || !redirect_uri) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const params = {
      grant_type: 'authorization_code',
      client_id: DERIV_APP_ID,
      code,
      code_verifier,
      redirect_uri,
    };

    const response = await fetch('https://auth.deriv.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: qs.stringify(params),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error_description || data.error });
    }

    res.json({ access_token: data.access_token });
  } catch (err) {
    console.error('OAuth exchange error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
