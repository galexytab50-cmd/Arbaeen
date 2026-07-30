// GET /api/telegram-posts
// لیست پست‌های ذخیره‌شده رو برای فرانت‌اند برمی‌گردونه.

const KV_KEY = 'posts';

export async function onRequestGet(context) {
  const { env } = context;

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
