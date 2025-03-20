export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
  
    if (request.method === 'POST') {
      const { roomId, offer } = await request.json();
      await env.SIGNAL_KV.put(`offer:${roomId}`, JSON.stringify(offer), { expirationTtl: 600 });
      return new Response('Offer stored', { status: 200 });
    }
  
    if (request.method === 'GET') {
      const roomId = url.searchParams.get('roomId');
      const offer = await env.SIGNAL_KV.get(`offer:${roomId}`);
      return new Response(offer || 'No offer found', { status: offer ? 200 : 404 });
    }
  
    return new Response('Method not allowed', { status: 405 });
  }