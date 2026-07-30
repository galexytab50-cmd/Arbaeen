// POST /api/telegram-webhook
// تلگرام هر پست جدید کانال رو با یک درخواست POST به این آدرس می‌فرسته.
// این تابع پیام رو پردازش و در Cloudflare KV ذخیره می‌کنه.

const MAX_STORED_POSTS = 60;
const KV_KEY = 'posts';

export async function onRequestPost(context) {
  const { request, env } = context;

  // امنیت: تلگرام هدر secret token رو دقیقاً همونی که موقع setWebhook دادیم برمی‌گردونه
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
    // آپدیت‌های دیگه (مثل پیام خصوصی به ربات) رو نادیده می‌گیریم
    return new Response('OK', { status: 200 });
  }

  const text = msg.text || msg.caption || '';

  let photoFileId = null;
  if (Array.isArray(msg.photo) && msg.photo.length > 0) {
    // آخرین آیتم آرایه‌ی photo همیشه بزرگ‌ترین رزولوشنه
    photoFileId = msg.photo[msg.photo.length - 1].file_id;
  }

  const channelUsername = msg.chat && msg.chat.username ? msg.chat.username : null;

  const post = {
    id: `${msg.chat.id}_${msg.message_id}`,
    messageId: msg.message_id,
    text,
    date: msg.date * 1000, // یونیکس ثانیه -> میلی‌ثانیه
    photoFileId,
    photoUrl: photoFileId ? `/api/telegram-media?file_id=${encodeURIComponent(photoFileId)}` : null,
    link: channelUsername ? `https://t.me/${channelUsername}/${msg.message_id}` : null,
  };

  const existingRaw = await env.POSTS.get(KV_KEY);
  let list = [];
  if (existingRaw) {
    try { list = JSON.parse(existingRaw); } catch { list = []; }
  }

  // اگه پیام ویرایش‌شده بود، نسخه‌ی قبلی رو جایگزین کن، وگرنه اضافه کن
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

export async function onRequestGet() {
  // برای تست دستی در مرورگر
  return new Response('Telegram webhook is alive. Use POST.', { status: 200 });
}
