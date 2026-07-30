// GET /api/telegram-media?file_id=xxx
// تصویر رو از سرورهای تلگرام می‌گیره و بدون افشای BOT_TOKEN به مرورگر تحویل می‌ده.

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const fileId = url.searchParams.get('file_id');

  if (!fileId) {
    return new Response('Missing file_id', { status: 400 });
  }
  if (!env.BOT_TOKEN) {
    return new Response('Server not configured', { status: 500 });
  }

  try {
    const getFileRes = await fetch(
      `https://api.telegram.org/bot${env.BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`
    );
    const getFileData = await getFileRes.json();
    if (!getFileData.ok) {
      return new Response('File not found', { status: 404 });
    }

    const filePath = getFileData.result.file_path;
    const fileRes = await fetch(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${filePath}`);
    if (!fileRes.ok) {
      return new Response('Failed to fetch file', { status: 502 });
    }

    const contentType = fileRes.headers.get('Content-Type') || 'image/jpeg';
    return new Response(fileRes.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // عکس‌های تلگرام تغییر نمی‌کنن، پس می‌شه با خیال راحت کش کرد
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (e) {
    return new Response('Error fetching media', { status: 500 });
  }
}
