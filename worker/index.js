// نقطه‌ی ورود اصلی Worker.
// درخواست‌های /api/* رو خودمون هندل می‌کنیم و بقیه رو به فایل‌های استاتیک (dist) می‌سپاریم.
// دیگه هیچ فیلتر هشتگ یا زبانی روی پست‌های ورودی اعمال نمی‌شه — هرچی از هر کانالی
// که ربات توش ادمینه بیاد، مستقیم ذخیره و تو «پوشش زنده اخبار» نمایش داده می‌شه.
// گزارش «عملیات روانی» هم خودکار/زمان‌بندی‌شده نیست — فقط با کلیک دکمه‌ی «تولید گزارش»
// تو خودِ سایت ساخته می‌شه، و بازه‌ش «از نیمه‌شب امروز (وقت عراق) تا همین لحظه» است.

const KV_KEY = 'posts';
const MAX_STORED_POSTS = 5000; // سقف فنی برای جلوگیری از رشد بی‌رویه‌ی KV؛ عملاً نامحدود

const STOPWORDS = new Set([
  'و', 'در', 'به', 'از', 'که', 'این', 'را', 'با', 'است', 'برای', 'آن', 'یک', 'هم', 'تا', 'یا',
  'های', 'شد', 'شده', 'کرد', 'می', 'کند', 'ها', 'اما', 'نیز', 'هر', 'بر', 'بود', 'باشد', 'دارد',
  'داشت', 'او', 'ما', 'شما', 'آنها', 'چه', 'چون', 'اگر', 'پس', 'بی', 'بین', 'روی', 'زیر', 'چند',
  'همه', 'دیگر', 'خود', 'کنند', 'کرده', 'گفت', 'گفته', 'بعد', 'قبل', 'هنوز', 'فقط', 'باید',
  'نباید', 'کنیم', 'شود', 'ولی', 'یعنی', 'خواهد', 'کنید', 'شدند', 'کردند', 'کنیم', 'ایم', 'اند',
]);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/telegram-webhook') {
      if (request.method === 'POST') return handleWebhook(request, env);
      return new Response('Telegram webhook is alive. Use POST.', { status: 200 });
    }

    if (path === '/api/telegram-posts' && request.method === 'GET') {
      return handlePosts(env);
    }

    if (path === '/api/telegram-media' && request.method === 'GET') {
      return handleMedia(request, env);
    }

    if (path === '/api/archive' && request.method === 'GET') {
      return handleArchive(request, env);
    }

    if (path === '/api/psyop-report' && request.method === 'GET') {
      return handlePsyopReportGet(env);
    }

    if (path === '/api/psyop-report/generate' && request.method === 'POST') {
      return handlePsyopReportGenerate(request, env);
    }

    if (path === '/api/admin/clear-posts' && request.method === 'POST') {
      return handleClearPosts(request, env);
    }

    // هر درخواست دیگه‌ای -> فایل‌های استاتیک ساخته‌شده توسط Vite (پوشه‌ی dist)
    return env.ASSETS.fetch(request);
  },
};

/* -------------------------------------------------------------------
   وبهوک تلگرام: دریافت پست جدید و ذخیره در KV (بدون هیچ فیلتری)
------------------------------------------------------------------- */
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
  const sourceUsername = msg.chat && msg.chat.username ? msg.chat.username : null;

  let photoFileId = null;
  if (Array.isArray(msg.photo) && msg.photo.length > 0) {
    photoFileId = msg.photo[msg.photo.length - 1].file_id;
  }

  const post = {
    id: `${msg.chat.id}_${msg.message_id}`,
    messageId: msg.message_id,
    text,
    date: msg.date * 1000,
    photoFileId,
    photoUrl: photoFileId ? `/api/telegram-media?file_id=${encodeURIComponent(photoFileId)}` : null,
    link: sourceUsername ? `https://t.me/${sourceUsername}/${msg.message_id}` : null,
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

/* -------------------------------------------------------------------
   تب «پوشش زنده اخبار» - همه‌ی پست‌ها، بدون محدودیت نمایشی
------------------------------------------------------------------- */
// پاک‌کردن کامل اخبار ذخیره‌شده (پوشش زنده + آرشیو، چون هر دو از همین کلید می‌خونن).
// عملی غیرقابل‌بازگشته، برای همین با همون WEBHOOK_SECRET محافظت می‌شه
// و کلید رو تو خودِ مرورگر ذخیره نمی‌کنیم — هر بار باید واردش کنی.
async function handleClearPosts(request, env) {
  const secretHeader = request.headers.get('X-Admin-Secret');
  if (!env.WEBHOOK_SECRET || secretHeader !== env.WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ ok: false, error: 'رمز نادرست است.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  await env.POSTS.delete(KV_KEY);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
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

/* -------------------------------------------------------------------
   تب «آرشیو مطالب» - فیلتر بر اساس تاریخ (به وقت عراق، UTC+3)
------------------------------------------------------------------- */
function toIraqDateString(dateMs) {
  const iraqMs = dateMs + 3 * 60 * 60 * 1000;
  const d = new Date(iraqMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// آغاز روز جاری (ساعت ۰۰:۰۰) به وقت عراق (UTC+3، بدون تغییر ساعت تابستانی)، به میلی‌ثانیه‌ی UTC
function getIraqDayStartMs(nowMs) {
  const iraqMs = nowMs + 3 * 60 * 60 * 1000;
  const d = new Date(iraqMs);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  return Date.UTC(y, m, day, 0, 0, 0) - 3 * 60 * 60 * 1000;
}

async function handleArchive(request, env) {
  const url = new URL(request.url);
  const dateParam = url.searchParams.get('date'); // فرمت مورد انتظار: YYYY-MM-DD

  if (!dateParam) {
    return new Response(JSON.stringify({ posts: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const raw = await env.POSTS.get(KV_KEY);
  const allPosts = raw ? JSON.parse(raw) : [];
  const matched = allPosts.filter((p) => toIraqDateString(p.date) === dateParam);

  return new Response(JSON.stringify({ posts: matched }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

/* -------------------------------------------------------------------
   تب «عملیات روانی» - گزارش با کلیک دکمه (بدون خودکارسازی)
------------------------------------------------------------------- */
async function handlePsyopReportGet(env) {
  const raw = await env.POSTS.get('psyop_report_latest');
  const report = raw ? JSON.parse(raw) : null;

  return new Response(JSON.stringify({ report }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

// این endpoint از خودِ سایت (با کلیک دکمه‌ی «تولید گزارش») صدا زده می‌شه، پس عمداً
// نیازی به secret نداره (چون تو مرورگر قابل مشاهده می‌بود). برای جلوگیری از سوءاستفاده
// (مثلاً کلیک پشت‌سرهم که هزینه‌ی API دیپ‌سیک رو بالا ببره)، یه فاصله‌ی زمانی حداقلی می‌ذاریم.
const GENERATE_COOLDOWN_MS = 60 * 1000; // یک دقیقه

async function handlePsyopReportGenerate(request, env) {
  const now = Date.now();
  const lastRaw = await env.POSTS.get('psyop_report_last_generated_at');
  const last = lastRaw ? parseInt(lastRaw, 10) : 0;

  if (now - last < GENERATE_COOLDOWN_MS) {
    const waitSec = Math.ceil((GENERATE_COOLDOWN_MS - (now - last)) / 1000);
    return new Response(JSON.stringify({ ok: false, error: `لطفاً ${waitSec} ثانیه‌ی دیگر دوباره تلاش کنید.` }), {
      status: 429,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  await env.POSTS.put('psyop_report_last_generated_at', String(now));

  const report = await generatePsyopReport(env);
  return new Response(JSON.stringify({ ok: true, report }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

async function generatePsyopReport(env) {
  const raw = await env.POSTS.get(KV_KEY);
  const allPosts = raw ? JSON.parse(raw) : [];

  const now = Date.now();
  const periodStart = getIraqDayStartMs(now); // نیمه‌شب امروز به وقت عراق
  const periodPosts = allPosts.filter((p) => p.date >= periodStart && p.date <= now);

  const topWords = computeTopWords(periodPosts);
  const ai = await callDeepSeekReport(env, periodPosts);

  const report = {
    generatedAt: now,
    periodStart,
    periodEnd: now,
    newsCount: periodPosts.length,
    topWords,
    summary: ai.summary,
    techniques: ai.techniques,
    importantNews: ai.importantNews,
    top5News: ai.top5News,
  };

  await env.POSTS.put('psyop_report_latest', JSON.stringify(report));

  // یه تاریخچه‌ی کوتاه هم نگه می‌داریم (برای توسعه‌های بعدی)
  const historyRaw = await env.POSTS.get('psyop_report_history');
  let history = [];
  if (historyRaw) {
    try { history = JSON.parse(historyRaw); } catch { history = []; }
  }
  history.unshift({ generatedAt: now, newsCount: report.newsCount, summary: report.summary });
  history = history.slice(0, 30);
  await env.POSTS.put('psyop_report_history', JSON.stringify(history));

  return report;
}

// شمارش کلمات پرتکرار - محاسبه‌ی برنامه‌نویسی‌شده (نه با AI) برای دقت بیشتر.
// هشتگ‌ها و لینک‌ها حذف می‌شن و کلمات توقف (حروف اضافه و ربط رایج) هم حساب نمی‌شن.
function computeTopWords(posts, limit = 15) {
  const freq = new Map();

  for (const p of posts) {
    const text = p.text || '';
    const withoutHashtags = text.replace(/#\S+/g, ' ');
    const withoutUrls = withoutHashtags.replace(/https?:\/\/\S+/g, ' ');
    const words = withoutUrls.match(/[\u0600-\u06FF]{2,}/g) || [];

    for (const raw of words) {
      const w = raw.trim();
      if (!w || STOPWORDS.has(w)) continue;
      freq.set(w, (freq.get(w) || 0) + 1);
    }
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

// کوتاه‌کردن امن متن: برخلاف String.slice، از وسط یک ایموجی یا کاراکتر دوبایتی نمی‌بره
function safeTruncate(str, maxLen) {
  if (!str) return '';
  const chars = Array.from(str);
  if (chars.length <= maxLen) return str;
  return chars.slice(0, maxLen).join('');
}

// حذف کاراکترهای surrogate تنها (نیمه‌ایموجی‌های خراب) که باعث خرابی JSON موقع ارسال به API می‌شن
function stripLoneSurrogates(str) {
  return str.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/g, (m) =>
    m.length > 1 ? m[0] : ''
  );
}

// بخش کیفی گزارش (تکنیک‌های عملیات روانی، اخبار مهم، ۵ خبر برتر، خلاصه‌ی مدیریتی) با API دیپ‌سیک
async function callDeepSeekReport(env, posts) {
  if (!env.DEEPSEEK_API_KEY) {
    return {
      summary: 'کلید DEEPSEEK_API_KEY تنظیم نشده است. این گزارش بدون تحلیل هوش مصنوعی تولید شده.',
      techniques: [],
      importantNews: [],
      top5News: [],
    };
  }

  if (posts.length === 0) {
    return {
      summary: 'در این بازه‌ی زمانی هیچ پست جدیدی ثبت نشده است.',
      techniques: [],
      importantNews: [],
      top5News: [],
    };
  }

  const sample = stripLoneSurrogates(
    posts
      .slice(0, 150)
      .map((p, i) => `${i + 1}. ${safeTruncate(p.text || '', 400)}`)
      .join('\n')
  );

  const prompt = `تو یک تحلیلگر رسانه‌ای هستی. متن زیر مجموعه‌ای از پست‌های یک کانال خبری تلگرامی درباره‌ی مراسم اربعین است.
بر اساس این پست‌ها یک گزارش تحلیلی به زبان فارسی و فقط در قالب JSON خام (بدون هیچ توضیح اضافه، بدون markdown، بدون تیک‌بک‌کوت) با دقیقاً این ساختار تولید کن:

{
  "summary": "یک خلاصه‌ی مدیریتی در ۳ تا ۵ جمله درباره‌ی وضعیت کلی این بازه",
  "techniques": ["فهرست تکنیک‌های احتمالی عملیات روانی که در این پست‌ها مشاهده می‌شود، هرکدام با توضیح کوتاه"],
  "importantNews": ["مهم‌ترین اخبار و رویدادهایی که در این پست‌ها مطرح شده"],
  "top5News": ["دقیقاً ۵ خبر مهم این بازه، به‌ترتیب اهمیت"]
}

پست‌ها:
${sample}`;

  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'تو فقط و فقط خروجی JSON معتبر تولید می‌کنی، بدون هیچ متن اضافه قبل یا بعدش.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    const rawBody = await res.text();

    if (!res.ok) {
      throw new Error(`دیپ‌سیک خطای ${res.status} برگرداند: ${rawBody.slice(0, 300)}`);
    }

    let data;
    try {
      data = JSON.parse(rawBody);
    } catch {
      throw new Error(`پاسخ دیپ‌سیک JSON معتبر نبود: ${rawBody.slice(0, 300)}`);
    }

    const raw = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!raw) throw new Error('پاسخ دیپ‌سیک ساختار مورد انتظار را نداشت: ' + rawBody.slice(0, 300));

    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      summary: parsed.summary || '',
      techniques: Array.isArray(parsed.techniques) ? parsed.techniques : [],
      importantNews: Array.isArray(parsed.importantNews) ? parsed.importantNews : [],
      top5News: Array.isArray(parsed.top5News) ? parsed.top5News : [],
    };
  } catch (e) {
    return {
      summary: 'خطا در تولید گزارش با دیپ‌سیک: ' + e.message,
      techniques: [],
      importantNews: [],
      top5News: [],
    };
  }
}

/* -------------------------------------------------------------------
   پروکسی امن عکس‌های تلگرام
------------------------------------------------------------------- */
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
