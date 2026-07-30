# پوشش زنده اخبار (ایراف)

اپلیکیشن سبک React که پست‌های یک کانال تلگرامی رو به‌صورت زنده نمایش می‌ده.
بک‌اند با **Cloudflare Pages Functions** + **Cloudflare KV** ساخته شده — یعنی
نیازی به سرور جدا نیست و همه‌چیز روی Cloudflare اجرا می‌شه.

## چطور کار می‌کنه؟

```
کانال تلگرام → (پست جدید) → Telegram Webhook → /api/telegram-webhook
                                                        ↓
                                                  ذخیره در Cloudflare KV
                                                        ↓
مرورگر کاربر ← JSON ← /api/telegram-posts ←──────────────┘
```

ربات تلگرامی که ادمین کانال می‌کنی، به‌ازای هر پست جدید یک درخواست POST
به آدرس `/api/telegram-webhook` می‌فرسته. این تابع پیام رو در KV ذخیره می‌کنه.
صفحه‌ی اصلی هر ۴۵ ثانیه از `/api/telegram-posts` لیست به‌روز رو می‌گیره.

---

## مرحله ۱ — ساخت ربات تلگرام

۱. در تلگرام به [@BotFather](https://t.me/BotFather) پیام بده و دستور `/newbot` رو بزن.
۲. یک اسم و یوزرنیم برای ربات انتخاب کن. در پایان یک **توکن** به این شکل می‌گیری:
   `123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   این توکن رو نگه دار (بعداً به‌عنوان `BOT_TOKEN` لازمت می‌شه).
۳. وارد کانال تلگرامی‌ات شو → **Administrators** → ربات رو به‌عنوان **ادمین** اضافه کن
   (فقط دسترسی «Post Messages» یا حتی بدون هیچ دسترسی خاصی کافیه، ربات فقط باید عضو ادمین باشه تا آپدیت پست‌ها رو ببینه).

## مرحله ۲ — آپلود پروژه در گیت‌هاب

```bash
cd iraf-news
git init
git add .
git commit -m "اولین نسخه"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

## مرحله ۳ — ساخت پروژه در Cloudflare Pages

۱. وارد داشبورد [Cloudflare](https://dash.cloudflare.com) شو → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
۲. ریپوی گیت‌هابت رو انتخاب کن.
۳. تنظیمات build:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
۴. روی **Save and Deploy** بزن (اولین دیپلوی خطای ۵۰۰ می‌ده چون هنوز KV و env variable وصل نکردیم — طبیعیه، مرحله بعد درستش می‌کنیم).

## مرحله ۴ — ساخت KV Namespace و اتصالش

۱. در داشبورد Cloudflare → **Workers & Pages** → **KV** → **Create a namespace** → اسمش رو بذار `POSTS`.
۲. برگرد به پروژه‌ی Pages‌ات → **Settings** → **Functions** → **KV namespace bindings** → **Add binding**:
   - **Variable name:** `POSTS`
   - **KV namespace:** همون `POSTS` که ساختی

## مرحله ۵ — تنظیم متغیرهای محیطی

در همون پروژه‌ی Pages → **Settings** → **Environment variables** → **Add variable** (برای Production و در صورت نیاز Preview):

| نام | مقدار |
|---|---|
| `BOT_TOKEN` | توکنی که از BotFather گرفتی |
| `WEBHOOK_SECRET` | یک رشته‌ی تصادفی و طولانی خودت بساز (مثلاً با `openssl rand -hex 32`) — این برای امن‌کردن endpoint وبهوکه |

بعد از اضافه‌کردن، یک بار دیگه از تب **Deployments** روی **Retry deployment** بزن تا متغیرها اعمال بشن.

## مرحله ۶ — وصل‌کردن وبهوک تلگرام

بعد از دیپلوی موفق، آدرس سایتت چیزی شبیه `https://iraf-live-news.pages.dev` می‌شه.
حالا با یکی از این دو روش وبهوک رو تنظیم کن (فقط یک‌بار لازمه):

**با curl (در ترمینال):**
```bash
curl -F "url=https://YOUR-PROJECT.pages.dev/api/telegram-webhook" \
     -F "secret_token=YOUR_WEBHOOK_SECRET" \
     "https://api.telegram.org/bot YOUR_BOT_TOKEN/setWebhook"
```
(فاصله‌ی بعد از `bot` رو حذف کن، اینجا فقط برای خوانایی گذاشته شده.)

**یا مستقیم در مرورگر** (لینک زیر رو با مقادیر خودت پر کن و باز کن):
```
https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook?url=https://YOUR-PROJECT.pages.dev/api/telegram-webhook&secret_token=YOUR_WEBHOOK_SECRET
```

اگه جواب `{"ok":true,"result":true,...}` گرفتی یعنی وصل شد. برای بررسی وضعیت هر زمان:
```
https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo
```

## مرحله ۷ — تست

یک پیام (متن یا عکس) در کانال تلگرامی‌ات پست کن. تا ۱ دقیقه بعد باید در سایتت
(زیر تب پوشش زنده) ظاهر بشه.

---

## توسعه‌ی محلی (اختیاری)

```bash
npm install
cp .dev.vars.example .dev.vars   # و مقادیر واقعی رو توش بذار
npx wrangler pages dev --kv POSTS -- npm run dev
```
> نکته: چون تلگرام برای وبهوک به یک آدرس عمومی (HTTPS) نیاز داره، تست کامل وبهوک
> فقط بعد از دیپلوی روی Cloudflare ممکنه؛ برای تست محلی می‌تونی مستقیماً با curl
> یک آپدیت نمونه به `/api/telegram-webhook` بفرستی.

---

## ساختار پروژه

```
iraf-news/
├── src/
│   ├── App.jsx          ← رابط کاربری پوشش زنده اخبار
│   └── main.jsx
├── functions/api/
│   ├── telegram-webhook.js   ← دریافت پست جدید از تلگرام و ذخیره در KV
│   ├── telegram-posts.js     ← تحویل لیست پست‌ها به فرانت‌اند
│   └── telegram-media.js     ← پروکسی امن برای نمایش عکس‌ها
├── wrangler.toml
└── package.json
```

## مرحله بعد

این نسخه فقط «پوشش زنده اخبار» رو پیاده می‌کنه. برای اضافه‌کردن بخش‌های دیگه
(مثل تحریریه هوشمند، چت، آرشیو و...) کافیه به همین ساختار ادامه بدیم.
