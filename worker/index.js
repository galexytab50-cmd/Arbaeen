// نقطه‌ی ورود اصلی Worker.
// درخواست‌های /api/* رو خودمون هندل می‌کنیم و بقیه رو به فایل‌های استاتیک (dist) می‌سپاریم.

const KV_KEY = 'posts';
const MAX_STORED_POSTS = 60;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/telegram-webhook') {
      if (request.method === 'POST') return handleWebhook(request, env);
      return new Response('Telegram webhook is alive. Use POST.', { status: 200 });
    }

    if (url.pathname === '/api/telegram-posts' && request.method === 'GET') {
      return handlePosts(env);
    }

    if (url.pathname === '/api/telegram-media' && request.method === 'GET') {
      return handleMedia(request, env);
    }

    // هر درخواست دیگه‌ای -> فایل‌های استاتیک ساخته‌شده توسط Vite (پوشه‌ی dist)
    return env.ASSETS.fetch(request);
  },
};

async function handleWebhook(request, env) {
  const secretHeader = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (!env.WEBHOOK_SECRET || secretHeader !== env.WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  let update;
  try {
    update = await request.json();
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const msg = update.channel_post || update.edited_channel_post;
  if (!msg) {
    return new Response('OK', { status: 200 });
  }

  const text = msg.text || msg.caption || '';

  let photoFileId = null;
  if (Array.isArray(msg.photo) && msg.photo.length > 0) {
    photoFileId = msg.photo[msg.photo.length - 1].file_id;
  }

  const channelUsername = msg.chat && msg.chat.username ? msg.chat.username : null;

  const post = {
    id: `${msg.chat.id}_${msg.message_id}`,
    messageId: msg.message_id,
    text,
    date: msg.date * 1000,
    photoFileId,
    photoUrl: photoFileId ? `/api/telegram-media?file_id=${encodeURIComponent(photoFileId)}` : null,
    link: channelUsername ? `https://t.me/${channelUsername}/${msg.message_id}` : null,
  };

  const existingRaw = await env.POSTS.get(KV_KEY);
  let list = [];
  if (existingRaw) {
    try { list = JSON.parse(existingRaw); } catch { list = []; }
  }

  const idx = list.findIndex((p) => p.id === post.id);
  if (idx >= 0) {
    list[idx] = post;
  } else {
    list.unshift(post);
  }

  list.sort((a, b) => b.date - a.date);
  list = list.slice(0, MAX_STORED_POSTS);

  await env.POSTS.put(KV_KEY, JSON.stringify(list));

  return new Response('OK', { status: 200 });
}

async function handlePosts(env) {
  const raw = await env.POSTS.get(KV_KEY);
  let posts = [];
  if (raw) {
    try { posts = JSON.parse(raw); } catch { posts = []; }
  }

  return new Response(JSON.stringify({ posts }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

async function handleMedia(request, env) {
  const url = new URL(request.url);
  const fileId = url.searchParams.get('file_id');

  if (!fileId) return new Response('Missing file_id', { status: 400 });
  if (!env.BOT_TOKEN) return new Response('Server not configured', { status: 500 });

  try {
    const getFileRes = await fetch(
      `https://api.telegram.org/bot${env.BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`
    );
    const getFileData = await getFileRes.json();
    if (!getFileData.ok) return new Response('File not found', { status: 404 });

    const filePath = getFileData.result.file_path;
    const fileRes = await fetch(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${filePath}`);
    if (!fileRes.ok) return new Response('Failed to fetch file', { status: 502 });

    const contentType = fileRes.headers.get('Content-Type') || 'image/jpeg';
    return new Response(fileRes.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch {
    return new Response('Error fetching media', { status: 500 });
  }
}
