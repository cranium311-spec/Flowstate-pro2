// /api/get-otp.js (Vercel serverless function)
export default async function handler(req, res) {
  // 1. Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, accountId, appId } = req.body;

  if (!token || !accountId || !appId) {
    return res.status(400).json({ error: 'Missing token, accountId, or appId' });
  }

  try {
    // 2. Exchange PAT for session token using Deriv's authorize endpoint
    //    Official method: send { "authorize": "pat_..." } in the body
    const authResponse = await fetch('https://api.binaryws.com/authorize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ authorize: token })   // ✅ Correct format
    });

    // 3. Handle HTTP errors
    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('Deriv auth error:', authResponse.status, errorText);
      return res.status(authResponse.status).json({
        error: `Deriv API returned ${authResponse.status}`,
        details: errorText.substring(0, 200) // Trim for readability
      });
    }

    const authData = await authResponse.json();

    // 4. Extract session token
    const sessionToken = authData?.authorize?.token;

    if (!sessionToken) {
      console.error('No session token in response:', authData);
      return res.status(401).json({
        error: 'Invalid PAT token – no session token returned',
        details: authData
      });
    }

    // 5. Build WebSocket URL
    const wsUrl = `wss://ws.binaryws.com/websockets/v3?app_id=${appId}&token=${sessionToken}`;

    return res.status(200).json({ url: wsUrl });

  } catch (error) {
    console.error('Unhandled error in /api/get-otp:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: error.stack // Include stack trace for debugging
    });
  }
}
