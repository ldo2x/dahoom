/* ===== دحوم — سيرفر ربط احتياطي (متوافق مع PeerJS) =====
   الشاشة تسجّل فيه بنفس كود الجلسة، ولو سيرفر PeerJS العام طاح الجوال يجرّب هذا.
   يشتغل على Cloudflare Workers + Durable Object واحد يمسك كل الاتصالات (الخطة المجانية تكفي).

   البروتوكول (نفس peerjs-server):
     GET  /peerjs/id                       → رقم عشوائي للجوال (لو ما عنده رقم)
     WS   /peerjs?key=peerjs&id=..&token=..→ OPEN، وبعدها OFFER/ANSWER/CANDIDATE/LEAVE تنمرر للطرف الثاني (dst)
     لو الطرف الثاني مو موجود: نرجّع EXPIRE على طول (الجوال يعرف إن الشاشة مو هنا ويجرب غيره)
*/
const ALLOWED = [/^https:\/\/ldo2x\.github\.io$/, /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/];
const okOrigin = o => !o || ALLOWED.some(r => r.test(o));
const cors = (res, origin) => {
  const h = new Headers(res.headers);
  h.set('Access-Control-Allow-Origin', origin && okOrigin(origin) ? origin : 'https://ldo2x.github.io');
  h.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  h.set('Vary', 'Origin');
  return new Response(res.body, { status: res.status, headers: h });
};

export default {
  async fetch(req, env) {
    const url = new URL(req.url), origin = req.headers.get('Origin');
    if (req.method === 'OPTIONS') return cors(new Response(null, { status: 204 }), origin);
    if (!okOrigin(origin)) return new Response('forbidden', { status: 403 });
    const p = url.pathname.replace(/\/+$/, '');
    if (p.endsWith('/peerjs/id')) return cors(new Response(crypto.randomUUID(), { headers: { 'content-type': 'text/plain' } }), origin);
    if (p.endsWith('/peerjs')) {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
      return env.HUB.get(env.HUB.idFromName('main')).fetch(req);
    }
    if (p === '') return cors(new Response(JSON.stringify({ name: 'dahoom-peer', ok: true }), { headers: { 'content-type': 'application/json' } }), origin);
    return new Response('not found', { status: 404 });
  },
};

export class Hub {
  constructor(state) {
    this.state = state;
    // نبض PeerJS كل ٥ ثواني: نرد عليه بدون ما نصحّي الكائن (أوفر)
    this.state.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"type":"HEARTBEAT"}', '{"type":"HEARTBEAT"}'));
  }
  async fetch(req) {
    const url = new URL(req.url);
    const id = url.searchParams.get('id') || '', token = url.searchParams.get('token') || '', key = url.searchParams.get('key');
    const [client, server] = Object.values(new WebSocketPair());
    const bad = key !== 'peerjs' || !/^[\w-]{1,64}$/.test(id) || !token;
    const old = bad ? [] : this.state.getWebSockets(id);
    for (const ws of old) {
      const a = ws.deserializeAttachment() || {};
      if (a.token !== token) { // الرقم محجوز لجهاز ثاني
        server.accept(); server.send(JSON.stringify({ type: 'ID-TAKEN', payload: { msg: 'ID is taken' } })); server.close(1008, 'id taken');
        return new Response(null, { status: 101, webSocket: client });
      }
      try { ws.close(1000, 'replaced'); } catch (e) {}   // نفس الجهاز رجع يتصل
    }
    if (bad) {
      server.accept(); server.send(JSON.stringify({ type: 'ERROR', payload: { msg: 'Invalid key, id or token' } })); server.close(1008, 'bad');
      return new Response(null, { status: 101, webSocket: client });
    }
    this.state.acceptWebSocket(server, [id]);
    server.serializeAttachment({ id, token });
    server.send(JSON.stringify({ type: 'OPEN' }));
    return new Response(null, { status: 101, webSocket: client });
  }
  async webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > 64000) return;
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    const me = ws.deserializeAttachment(); if (!me || !m || !m.type || m.type === 'HEARTBEAT') return;
    const dstId = typeof m.dst === 'string' ? m.dst : ''; if (!dstId) return;
    const dst = this.state.getWebSockets(dstId).find(w => { try { return w.readyState === 1; } catch (e) { return false; } });
    if (dst) { try { dst.send(JSON.stringify({ type: m.type, src: me.id, dst: dstId, payload: m.payload })); } catch (e) {} return; }
    if (m.type === 'OFFER') { try { ws.send(JSON.stringify({ type: 'EXPIRE', src: dstId, dst: me.id })); } catch (e) {} }
  }
  async webSocketClose(ws, code) { try { ws.close(code === 1005 ? 1000 : code, 'bye'); } catch (e) {} }
  async webSocketError(ws) { try { ws.close(1011, 'error'); } catch (e) {} }
}
