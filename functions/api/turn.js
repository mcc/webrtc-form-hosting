export async function onRequest(context) {
    const { env } = context;
  
    // Retrieve environment variables
    const turnKeyId = env.TURN_KEY_ID;
    const turnKeyApiToken = env.TURN_KEY_API_TOKEN;
  
    if (!turnKeyId || !turnKeyApiToken) {
      return new Response('Missing TURN_KEY_ID or TURN_KEY_API_TOKEN', { status: 500 });
    }
  
    const response = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${turnKeyId}/credentials/generate-ice-servers`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${turnKeyApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ttl: 86400, // 24 hours, as in the cURL example
        }),
      }
    );
  
    const data = await response.json();
    if (!response.ok) {
      return new Response(JSON.stringify(data.errors || 'Failed to generate TURN credentials'), { status: 500 });
    }
  
    // Return the iceServers directly as received
    return new Response(JSON.stringify(data.iceServers), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }