export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
  
    if (request.method === 'POST') {
      const { roomId, answer } = await request.json();
      await env.SIGNAL_KV.put(`answer:${roomId}`, JSON.stringify(answer), { expirationTtl: 600 });
      return new Response('Answer stored', { status: 200 });
    }
  
    if (request.method === 'GET') {
      const roomId = url.searchParams.get('roomId');
      const answer = await env.SIGNAL_KV.get(`answer:${roomId}`);
      return new Response(answer || 'No answer found', { status: answer ? 200 : 404 });
    }
  
    return new Response('Method not allowed', { status: 405 });
  }