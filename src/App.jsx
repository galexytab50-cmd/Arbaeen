import React, { useEffect, useRef, useState } from 'react';
import {
  Newspaper, RefreshCw, ExternalLink, ImageOff, WifiOff, Loader2,
  Archive, ShieldAlert, CalendarDays, Hash, AlertTriangle,
} from 'lucide-react';

/* ---------------------------------------------------------------------
   هویت بصری — داشبورد زنده اخبار اربعین
--------------------------------------------------------------------- */
const C = {
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  surface2: '#F1F6F3',
  border: '#E1E8E4',
  borderSoft: '#ECF1EE',
  gold: '#1B7A4D',
  goldSoft: 'rgba(27,122,77,0.10)',
  maroon: '#D6373F',
  maroonSoft: 'rgba(214,55,63,0.08)',
  text: '#111111',
  textMuted: '#5A5A5A',
  textFaint: '#8C8C8C',
};

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;600;700&family=Vazirmatn:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

* { box-sizing: border-box; }
button { font-family: inherit; }
input { font-family: inherit; }
.iraf-root { font-family: 'Vazirmatn', 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif; background: ${C.bg}; color: ${C.text}; min-height: 100vh; direction: rtl; }
.iraf-mono { font-family: 'JetBrains Mono', monospace; direction: ltr; unicode-bidi: isolate; }
.iraf-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
.iraf-scroll::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
.iraf-scroll::-webkit-scrollbar-track { background: transparent; }

@keyframes iraf-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.3; transform: scale(0.65); } }
@keyframes iraf-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes iraf-fadeup { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.iraf-fadeup { animation: iraf-fadeup 0.4s ease both; }

.iraf-card {
  background: ${C.surface}; border: 1px solid ${C.border}; border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04); overflow: hidden; min-width: 0;
}
.iraf-refresh-btn {
  display: flex; align-items: center; gap: 6px; background: ${C.goldSoft}; color: ${C.gold};
  border: 1px solid transparent; border-radius: 7px; padding: 8px 14px; font-size: 12.5px;
  font-weight: 600; cursor: pointer; transition: background 0.15s ease;
}
.iraf-refresh-btn:hover { background: rgba(27,122,77,0.18); }
.iraf-refresh-btn:disabled { opacity: 0.6; cursor: default; }

.iraf-tab-btn {
  display: flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 8px 8px 0 0;
  font-size: 13px; font-weight: 700; cursor: pointer; border: none; background: transparent;
  color: ${C.textFaint}; border-bottom: 2px solid transparent; transition: all 0.15s ease;
}
.iraf-tab-btn:hover { color: ${C.gold}; background: ${C.goldSoft}; }
.iraf-tab-btn.active { color: ${C.gold}; border-bottom: 2px solid ${C.gold}; background: ${C.goldSoft}; }

.iraf-date-input {
  font-family: inherit; border: 1px solid ${C.border}; border-radius: 8px; padding: 9px 12px;
  font-size: 13px; color: ${C.text}; background: ${C.surface}; cursor: pointer;
}
.iraf-date-input:focus { outline: 2px solid ${C.goldSoft}; }

.iraf-chip {
  display: inline-flex; align-items: center; gap: 5px; background: ${C.goldSoft}; color: ${C.gold};
  border-radius: 999px; padding: 5px 12px; font-size: 12px; font-weight: 600;
}

@media (max-width: 640px) {
  .iraf-main { padding: 18px 14px 50px !important; }
  .iraf-header-row { flex-direction: column; align-items: flex-start !important; gap: 10px !important; }
  .iraf-tabs-row { overflow-x: auto; }
}
`;

const POLL_INTERVAL_MS = 45000;

function timeAgoFa(dateMs) {
  const diffSec = Math.max(0, Math.floor((Date.now() - dateMs) / 1000));
  if (diffSec < 60) return 'همین الان';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin.toLocaleString('fa-IR')} دقیقه پیش`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour.toLocaleString('fa-IR')} ساعت پیش`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay.toLocaleString('fa-IR')} روز پیش`;
}

function todayIsoDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* ---------------------------------------------------------------------
   کارت پست
--------------------------------------------------------------------- */
function PostCard({ post }) {
  const [imgFailed, setImgFailed] = useState(false);
  const dateMs = new Date(post.date).getTime();

  return (
    <div className="iraf-card iraf-fadeup" style={{ width: '100%' }}>
      {post.photoUrl && !imgFailed && (
        <img
          src={post.photoUrl}
          alt=""
          loading="lazy"
          onError={() => setImgFailed(true)}
          style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block', borderBottom: `1px solid ${C.borderSoft}` }}
        />
      )}
      <div style={{ padding: '13px 15px' }}>
        {post.text && (
          <div style={{ fontSize: 13.5, lineHeight: 1.9, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {post.text}
          </div>
        )}
        {!post.text && !post.photoUrl && (
          <div style={{ fontSize: 12.5, color: C.textFaint, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ImageOff size={14} /> پیام بدون متن یا تصویر
          </div>
        )}
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.borderSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span className="iraf-mono" style={{ fontSize: 10.5, color: C.textFaint }} title={new Date(post.date).toLocaleString('fa-IR')}>
            {timeAgoFa(dateMs)}
          </span>
          {post.link && (
            <a href={post.link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C.gold, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', fontWeight: 600 }}>
              مشاهده در تلگرام <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function PostGrid({ posts }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, alignItems: 'start' }}>
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </div>
  );
}

function StateBlock({ icon, text, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '70px 0', color: color || C.textFaint }}>
      {icon}
      <span style={{ fontSize: 13 }}>{text}</span>
    </div>
  );
}

/* ---------------------------------------------------------------------
   تب ۱ — پوشش زنده اخبار
--------------------------------------------------------------------- */
function LiveTab() {
  const [posts, setPosts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const cancelledRef = useRef(false);

  const load = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch('/api/telegram-posts');
      const data = await res.json();
      if (cancelledRef.current) return;
      if (data.posts && data.posts.length > 0) {
        setPosts(data.posts);
        setStatus('ready');
      } else {
        setPosts([]);
        setStatus('empty');
      }
      setLastUpdated(new Date());
    } catch (e) {
      if (!cancelledRef.current) setStatus((prev) => (prev === 'ready' ? prev : 'error'));
    } finally {
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    cancelledRef.current = false;
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => { cancelledRef.current = true; clearInterval(interval); };
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <span style={{ fontSize: 11.5, color: C.textFaint }}>
          {lastUpdated ? `آخرین به‌روزرسانی: ${lastUpdated.toLocaleTimeString('fa-IR')}` : 'در حال بارگذاری...'}
          {status === 'ready' && ` · ${posts.length.toLocaleString('fa-IR')} خبر`}
        </span>
        <button className="iraf-refresh-btn" onClick={() => load(true)} disabled={refreshing}>
          <RefreshCw size={13} style={refreshing ? { animation: 'iraf-spin 1s linear infinite' } : undefined} />
          بروزرسانی
        </button>
      </div>

      {status === 'loading' && <StateBlock icon={<Loader2 size={22} style={{ animation: 'iraf-spin 1s linear infinite' }} />} text="در حال دریافت اخبار..." />}
      {status === 'error' && <StateBlock icon={<WifiOff size={22} />} text="ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید." color={C.maroon} />}
      {status === 'empty' && <StateBlock icon={<Newspaper size={22} />} text="هنوز خبری دریافت نشده. به محض انتشار پست جدید در کانال تلگرام، اینجا نمایش داده می‌شود." />}
      {status === 'ready' && <PostGrid posts={posts} />}
    </div>
  );
}

/* ---------------------------------------------------------------------
   تب ۲ — آرشیو مطالب (با تقویم قابل کلیک)
--------------------------------------------------------------------- */
function ArchiveTab() {
  const [date, setDate] = useState(todayIsoDate());
  const [posts, setPosts] = useState([]);
  const [status, setStatus] = useState('loading');

  const loadDate = async (d) => {
    setStatus('loading');
    try {
      const res = await fetch(`/api/archive?date=${encodeURIComponent(d)}`);
      const data = await res.json();
      if (data.posts && data.posts.length > 0) {
        setPosts(data.posts);
        setStatus('ready');
      } else {
        setPosts([]);
        setStatus('empty');
      }
    } catch (e) {
      setStatus('error');
    }
  };

  useEffect(() => { loadDate(date); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDateChange = (e) => {
    const d = e.target.value;
    setDate(d);
    loadDate(d);
  };

  const dateLabel = (() => {
    try {
      return new Date(date + 'T00:00:00').toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return '';
    }
  })();

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CalendarDays size={16} color={C.gold} />
          <span style={{ fontSize: 12.5, color: C.textMuted, fontWeight: 600 }}>{dateLabel}</span>
        </div>
        <input type="date" className="iraf-date-input" value={date} max={todayIsoDate()} onChange={handleDateChange} />
      </div>

      {status === 'loading' && <StateBlock icon={<Loader2 size={22} style={{ animation: 'iraf-spin 1s linear infinite' }} />} text="در حال جست‌وجو در آرشیو..." />}
      {status === 'error' && <StateBlock icon={<WifiOff size={22} />} text="ارتباط با سرور برقرار نشد." color={C.maroon} />}
      {status === 'empty' && <StateBlock icon={<Archive size={22} />} text="هیچ مطلبی برای این تاریخ ثبت نشده است." />}
      {status === 'ready' && <PostGrid posts={posts} />}
    </div>
  );
}

/* ---------------------------------------------------------------------
   تب ۳ — عملیات روانی (گزارش خودکار AI)
--------------------------------------------------------------------- */
function ReportSection({ title, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 10, color: C.text }}>{title}</div>
      {children}
    </div>
  );
}

function PsyopTab() {
  const [report, setReport] = useState(null);
  const [status, setStatus] = useState('loading');

  const load = async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/psyop-report');
      const data = await res.json();
      if (data.report) {
        setReport(data.report);
        setStatus('ready');
      } else {
        setStatus('empty');
      }
    } catch (e) {
      setStatus('error');
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <span style={{ fontSize: 11.5, color: C.textFaint, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldAlert size={14} color={C.maroon} />
          گزارش خودکار — هر روز ساعت ۱۲ ظهر و ۰۰:۰۰ به‌وقت عراق
        </span>
        <button className="iraf-refresh-btn" onClick={load}>
          <RefreshCw size={13} />
          بروزرسانی
        </button>
      </div>

      {status === 'loading' && <StateBlock icon={<Loader2 size={22} style={{ animation: 'iraf-spin 1s linear infinite' }} />} text="در حال دریافت گزارش..." />}
      {status === 'error' && <StateBlock icon={<WifiOff size={22} />} text="ارتباط با سرور برقرار نشد." color={C.maroon} />}
      {status === 'empty' && <StateBlock icon={<ShieldAlert size={22} />} text="هنوز هیچ گزارشی تولید نشده. اولین گزارش در نوبت بعدی (ظهر یا نیمه‌شب عراق) ساخته می‌شود." />}

      {status === 'ready' && report && (
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
            <span className="iraf-chip"><Newspaper size={13} /> {report.newsCount.toLocaleString('fa-IR')} خبر در این بازه</span>
            <span className="iraf-chip" style={{ background: C.surface2, color: C.textMuted }}>
              تولید: {new Date(report.generatedAt).toLocaleString('fa-IR')}
            </span>
          </div>

          <ReportSection title="خلاصه‌ی مدیریتی">
            <div className="iraf-card" style={{ padding: '14px 16px', fontSize: 13.5, lineHeight: 2 }}>
              {report.summary || 'خلاصه‌ای ثبت نشده است.'}
            </div>
          </ReportSection>

          <ReportSection title="۵ خبر مهم این بازه">
            {report.top5News && report.top5News.length > 0 ? (
              <div className="iraf-card" style={{ padding: '6px 0' }}>
                {report.top5News.map((n, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 16px', borderBottom: i < report.top5News.length - 1 ? `1px solid ${C.borderSoft}` : 'none' }}>
                    <span style={{ color: C.gold, fontWeight: 800, fontSize: 13 }}>{(i + 1).toLocaleString('fa-IR')}</span>
                    <span style={{ fontSize: 13, lineHeight: 1.9 }}>{n}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: 12.5, color: C.textFaint }}>موردی ثبت نشده است.</span>
            )}
          </ReportSection>

          <ReportSection title="اخبار مهم شناسایی‌شده">
            {report.importantNews && report.importantNews.length > 0 ? (
              <ul style={{ margin: 0, paddingRight: 20, fontSize: 13, lineHeight: 2.1 }}>
                {report.importantNews.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            ) : (
              <span style={{ fontSize: 12.5, color: C.textFaint }}>موردی ثبت نشده است.</span>
            )}
          </ReportSection>

          <ReportSection title="تکنیک‌های عملیات روانی شناسایی‌شده">
            {report.techniques && report.techniques.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {report.techniques.map((t, i) => (
                  <div key={i} className="iraf-card" style={{ padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start', borderColor: C.maroonSoft, background: C.maroonSoft }}>
                    <AlertTriangle size={15} color={C.maroon} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 12.5, lineHeight: 1.9 }}>{t}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: 12.5, color: C.textFaint }}>موردی شناسایی نشده است.</span>
            )}
          </ReportSection>

          <ReportSection title="پرتکرارترین کلمات (بدون احتساب هشتگ‌ها)">
            {report.topWords && report.topWords.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {report.topWords.map((w, i) => (
                  <span key={i} className="iraf-chip">
                    <Hash size={11} /> {w.word} <span style={{ opacity: 0.7 }}>({w.count.toLocaleString('fa-IR')})</span>
                  </span>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: 12.5, color: C.textFaint }}>داده‌ای ثبت نشده است.</span>
            )}
          </ReportSection>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------
   اپ اصلی — نوار تب‌ها بالای صفحه
--------------------------------------------------------------------- */
const TABS = [
  { key: 'live', label: 'پوشش زنده اخبار', icon: Newspaper },
  { key: 'archive', label: 'آرشیو مطالب', icon: Archive },
  { key: 'psyop', label: 'عملیات روانی', icon: ShieldAlert },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('live');

  return (
    <div className="iraf-root">
      <style>{FONT_IMPORT}</style>

      <div style={{ background: C.gold, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px' }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: '#FFFFFF', animation: 'iraf-pulse 1.4s ease-in-out infinite', flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, color: '#FFFFFF', fontWeight: 600 }}>داشبورد زنده اخبار اربعین</span>
        </div>
      </div>

      <div style={{ borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        <div className="iraf-tabs-row" style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', gap: 4, padding: '0 20px' }}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                className={`iraf-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <main className="iraf-scroll iraf-main" style={{ maxWidth: 1280, margin: '0 auto', padding: '26px 24px 60px' }}>
        {activeTab === 'live' && <LiveTab />}
        {activeTab === 'archive' && <ArchiveTab />}
        {activeTab === 'psyop' && <PsyopTab />}
      </main>
    </div>
  );
}
