# پوشش زنده اخبار اربعین

اپلیکیشن سبک React که پست‌های یک کانال تلگرامی رو به‌صورت زنده نمایش می‌ده.
بک‌اند به‌صورت یک **Cloudflare Worker واحد** (با static assets + KV) نوشته شده —
همون پلتفرم یکپارچه‌ی جدید Cloudflare (Workers + Assets)، نه Pages قدیمی.

## چطور کار می‌کنه؟

```
کانال تلگرام → (پست جدید) → Telegram Webhook → POST /api/telegram-webhook
                                                        ↓
                                                  ذخیره در Cloudflare KV
                                                        ↓
مرورگر کاربر ← JSON ← GET /api/telegram-posts ←──────────┘

هر درخواست دیگه (/, /assets/...) → مستقیم از dist/ (فایل‌های ساخته‌شده با Vite) سرو می‌شه
```

همه‌چیز — هم API و هم فایل‌های استاتیک سایت — از یک Worker واحد (`worker/index.js`)
سرو می‌شه. مسیریابی داخل خودِ کد Worker انجام می‌شه: اگه آدرس با `/api/` شروع بشه
پردازش می‌کنیم، وگرنه به `env.ASSETS.fetch()` می‌سپاریم که فایل‌های ساخته‌شده‌ی
Vite رو تحویل بده.

---

## مرحله ۱ — ساخت ربات تلگرام

۱. در تلگرام به [@BotFather](https://t.me/BotFather) پیام بده و دستور `/newbot` رو بزن.
۲. یک اسم و یوزرنیم برای ربات انتخاب کن. در پایان یک **توکن** به این شکل می‌گیری:
   `123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   این توکن رو نگه دار (بعداً به‌عنوان `BOT_TOKEN` لازمت می‌شه).
۳. وارد کانال تلگرامی‌ات شو → **Administrators** → ربات رو به‌عنوان **ادمین** اضافه کن.

## مرحله ۲ — ساخت KV Namespace

۱. در داشبورد [Cloudflare](https://dash.cloudflare.com) → **Workers & Pages** → تب **KV**
۲. **Create a namespace** → اسمش رو بذار `POSTS` → **Add**
۳. روی namespace ساخته‌شده کلیک کن و **آیدی‌ش رو کپی کن** (یه رشته‌ی طولانی شبیه `a1b2c3...`)

## مرحله ۳ — تنظیم wrangler.toml

فایل `wrangler.toml` تو ریشه‌ی پروژه رو باز کن و دو جا رو ویرایش کن:

```toml
name = "arbaeen"   # <-- دقیقاً همون اسمی بذار که پروژه‌ت تو داشبورد Cloudflare داره

[[kv_namespaces]]
binding = "POSTS"
id = "REPLACE_WITH_YOUR_KV_NAMESPACE_ID"   # <-- آیدی که تو مرحله ۲ کپی کردی
```

> ⚠️ این فایل باید حتماً commit و push بشه — برخلاف پروژه‌های Pages قدیمی،
> اینجا Cloudflare تنظیمات (KV binding، اسم Worker، مسیر assets) رو مستقیم از
> همین فایل می‌خونه.

## مرحله ۴ — آپلود در گیت‌هاب

```bash
cd iraf-news
git init
git add .
git commit -m "اولین نسخه"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

اگه از قبل یه ریپو داری و فقط می‌خوای این نسخه رو جایگزین کنی:
```bash
# محتوای پوشه‌ی iraf-news رو بریز رو ریپوی قبلی، بعد:
git add .
git commit -m "بازسازی به‌صورت Worker واحد"
git push
```

## مرحله ۵ — ساخت/تنظیم پروژه در Cloudflare

اگه پروژه از قبل تو Cloudflare (Workers & Pages) وصل به این ریپوعه، همین که push کنی
خودش دوباره دیپلوی می‌شه. اگه از صفر می‌سازی:

۱. داشبورد Cloudflare → **Workers & Pages** → **Create** → **Import a repository** (یا مسیر مشابه برای Workers)
۲. ریپوی گیت‌هابت رو انتخاب کن.
۳. Build command: `npm run build` (باید از قبل خودکار تشخیص داده بشه چون Vite هست)
۴. Deploy رو بزن.

## مرحله ۶ — تنظیم متغیرهای محیطی (Secrets)

تو پروژه‌ی Worker خودت در داشبورد → **Settings** → **Variables and Secrets** → **Add**:

| نام | نوع | مقدار |
|---|---|---|
| `BOT_TOKEN` | Secret | توکنی که از BotFather گرفتی |
| `WEBHOOK_SECRET` | Secret | یک رشته‌ی تصادفی و طولانی خودت بساز (مثلاً با `openssl rand -hex 32`) |

بعد از اضافه‌کردن، یه بار از **Deployments** روی **Retry deployment** بزن (یا فقط یه commit خالی push کن) تا اعمال بشه.

## مرحله ۷ — وصل‌کردن وبهوک تلگرام

آدرس Workerت چیزی شبیه `https://arbaeen.YOUR-SUBDOMAIN.workers.dev` یا دامنه‌ی سفارشی‌خودته.
این لینک رو با مقادیر خودت پر کن و تو مرورگر باز کن:

```
https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook?url=https://YOUR-WORKER-URL/api/telegram-webhook&secret_token=YOUR_WEBHOOK_SECRET
```

جواب موفق: `{"ok":true,"result":true,...}`

برای بررسی وضعیت هر زمان:
```
https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo
```

## مرحله ۸ — تست

یک پیام (متن یا عکس) در کانال تلگرامی‌ات پست کن. تا ۱ دقیقه بعد باید در سایتت ظاهر بشه.

---

## توسعه‌ی محلی (اختیاری)

```bash
npm install
cp .dev.vars.example .dev.vars   # BOT_TOKEN و WEBHOOK_SECRET واقعی رو توش بذار
npm run build
npx wrangler dev
```
سایت روی `http://localhost:8787` بالا میاد (هم API و هم فایل‌های استاتیک).
اگه می‌خوای هم‌زمان با hot-reload ویرایش UI کار کنی:
```bash
npx wrangler dev &     # بک‌اند روی 8787
npm run dev             # فرانت‌اند Vite روی 5173 با پروکسی /api به 8787
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
├── worker/
│   └── index.js          ← کل بک‌اند: وبهوک تلگرام، تحویل پست‌ها، پروکسی عکس، سرو استاتیک
├── wrangler.toml          ← تنظیمات Worker (اسم، KV binding، مسیر assets) — باید commit بشه
└── package.json
```

## مرحله بعد

این نسخه فقط «پوشش زنده اخبار» رو پیاده می‌کنه. برای اضافه‌کردن بخش‌های دیگه
(مثل تحریریه هوشمند، چت، آرشیو و...) کافیه به همین ساختار ادامه بدیم.
