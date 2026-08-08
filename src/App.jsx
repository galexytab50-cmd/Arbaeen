import React, { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import {
  Newspaper, RefreshCw, ExternalLink, ImageOff, WifiOff, Loader2,
  Archive, ShieldAlert, CalendarDays, Hash, AlertTriangle, Image as ImageIcon, Download, Clock,
} from 'lucide-react';
import raviLogo from './assets/ravi-logo.png';

/* ---------------------------------------------------------------------
   هویت بصری — راوی (بر اساس رنگ لوگو: آبی سرمه‌ای)
--------------------------------------------------------------------- */
const C = {
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  surface2: '#F0F1FA',
  border: '#DEE0F2',
  borderSoft: '#EBECF8',
  gold: '#15159C',
  goldSoft: 'rgba(21,21,156,0.10)',
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
.iraf-refresh-btn:hover { background: rgba(21,21,156,0.18); }
.iraf-refresh-btn:disabled { opacity: 0.6; cursor: default; }

.iraf-layout { display: flex; gap: 22px; align-items: flex-start; }
.iraf-sidebar { width: 216px; flex-shrink: 0; display: flex; flex-direction: column; gap: 4px; position: sticky; top: 20px; }
.iraf-side-btn {
  display: flex; align-items: center; gap: 10px; padding: 11px 14px; border-radius: 9px;
  font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent;
  background: transparent; color: ${C.textFaint}; text-align: right; width: 100%; transition: all 0.15s ease;
}
.iraf-side-btn:hover { background: ${C.goldSoft}; color: ${C.gold}; }
.iraf-side-btn.active { background: ${C.gold}; color: #FFFFFF; box-shadow: 0 2px 6px rgba(21,21,156,0.30); }

.iraf-date-input {
  font-family: inherit; border: 1px solid ${C.border}; border-radius: 8px; padding: 9px 12px;
  font-size: 13px; color: ${C.text}; background: ${C.surface}; cursor: pointer;
}
.iraf-date-input:focus { outline: 2px solid ${C.goldSoft}; }

.iraf-chip {
  display: inline-flex; align-items: center; gap: 5px; background: ${C.goldSoft}; color: ${C.gold};
  border-radius: 999px; padding: 5px 12px; font-size: 12px; font-weight: 600;
}

@media (max-width: 780px) {
  .iraf-layout { flex-direction: column; }
  .iraf-sidebar { width: 100%; flex-direction: row; overflow-x: auto; position: static; }
  .iraf-side-btn { flex-shrink: 0; width: auto; white-space: nowrap; }
}
@media (max-width: 640px) {
  .iraf-layout { padding: 16px 14px 50px !important; }
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
   ساعت زنده (به وقت بغداد)
--------------------------------------------------------------------- */
function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString('fa-IR', {
    timeZone: 'Asia/Baghdad', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const dateStr = now.toLocaleDateString('fa-IR', {
    timeZone: 'Asia/Baghdad', weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div className="iraf-mono" style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', gap: 6 }}>
      <Clock size={13} />
      <span>{timeStr}</span>
      <span style={{ opacity: 0.7 }}>· {dateStr} · به‌وقت بغداد</span>
    </div>
  );
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
  const [clearing, setClearing] = useState(false);
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

  const handleClearAll = async () => {
    const confirmed = window.confirm('همه‌ی اخبار ذخیره‌شده (پوشش زنده و آرشیو) برای همیشه پاک می‌شود. مطمئنی؟');
    if (!confirmed) return;

    const secret = window.prompt('برای تأیید، رمز مدیریتی (WEBHOOK_SECRET) را وارد کن:');
    if (!secret) return;

    setClearing(true);
    try {
      const res = await fetch('/api/admin/clear-posts', {
        method: 'POST',
        headers: { 'X-Admin-Secret': secret },
      });
      const data = await res.json();
      if (data.ok) {
        setPosts([]);
        setStatus('empty');
        window.alert('همه‌ی اخبار پاک شد.');
      } else {
        window.alert(data.error || 'پاک‌کردن اخبار با خطا مواجه شد.');
      }
    } catch (e) {
      window.alert('ارتباط با سرور برقرار نشد.');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <span style={{ fontSize: 11.5, color: C.textFaint }}>
          {lastUpdated ? `آخرین به‌روزرسانی: ${lastUpdated.toLocaleTimeString('fa-IR')}` : 'در حال بارگذاری...'}
          {status === 'ready' && ` · ${posts.length.toLocaleString('fa-IR')} خبر`}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="iraf-refresh-btn" onClick={handleClearAll} disabled={clearing} style={{ background: C.maroonSoft, color: C.maroon }}>
            <AlertTriangle size={13} />
            {clearing ? 'در حال پاک‌کردن...' : 'پاک‌کردن همه‌ی اخبار'}
          </button>
          <button className="iraf-refresh-btn" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw size={13} style={refreshing ? { animation: 'iraf-spin 1s linear infinite' } : undefined} />
            بروزرسانی
          </button>
        </div>
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
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);

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

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch('/api/psyop-report/generate', { method: 'POST' });
      const data = await res.json();
      if (data.ok && data.report) {
        setReport(data.report);
        setStatus('ready');
      } else {
        setGenerateError(data.error || 'خطا در تولید گزارش.');
      }
    } catch (e) {
      setGenerateError('ارتباط با سرور برقرار نشد.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <span style={{ fontSize: 11.5, color: C.textFaint, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldAlert size={14} color={C.maroon} />
          گزارش اخبار امروز، از نیمه‌شب (وقت عراق) تا لحظه‌ی تولید گزارش
        </span>
        <button className="iraf-refresh-btn" onClick={handleGenerate} disabled={generating}>
          <RefreshCw size={13} style={generating ? { animation: 'iraf-spin 1s linear infinite' } : undefined} />
          {generating ? 'در حال تولید گزارش...' : 'تولید گزارش'}
        </button>
      </div>

      {generateError && (
        <div className="iraf-card" style={{ padding: '10px 14px', marginBottom: 16, background: C.maroonSoft, borderColor: C.maroonSoft, fontSize: 12.5, color: C.maroon, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} /> {generateError}
        </div>
      )}

      {status === 'loading' && <StateBlock icon={<Loader2 size={22} style={{ animation: 'iraf-spin 1s linear infinite' }} />} text="در حال دریافت گزارش..." />}
      {status === 'error' && <StateBlock icon={<WifiOff size={22} />} text="ارتباط با سرور برقرار نشد." color={C.maroon} />}
      {status === 'empty' && <StateBlock icon={<ShieldAlert size={22} />} text="هنوز هیچ گزارشی تولید نشده. روی دکمه‌ی «تولید گزارش» بزن." />}

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
   تب ۴ — اینفوگرافیک (خروجی JPEG از گزارش عملیات روانی، بدون هیچ API بیرونی)
--------------------------------------------------------------------- */
function PosterBar({ word, count, max }) {
  const pct = Math.max(6, Math.round((count / max) * 100));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ fontSize: 12, width: 90, flexShrink: 0, textAlign: 'left', color: C.textMuted }}>
        {count.toLocaleString('fa-IR')}
      </span>
      <div style={{ flex: 1, background: C.surface2, borderRadius: 6, overflow: 'hidden', height: 16 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: C.gold, borderRadius: 6 }} />
      </div>
      <span style={{ fontSize: 12.5, width: 90, flexShrink: 0, fontWeight: 700 }}>{word}</span>
    </div>
  );
}

function InfographicTab() {
  const [report, setReport] = useState(null);
  const [status, setStatus] = useState('loading');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const posterRef = useRef(null);

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

  const handleDownload = async () => {
    if (!posterRef.current || !report) return;
    setExporting(true);
    setExportError(null);
    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      const canvas = await html2canvas(posterRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const dateLabel = new Date(report.generatedAt).toISOString().slice(0, 10);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `گزارش-عملیات-روانی-${dateLabel}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      setExportError('ساخت فایل JPEG با خطا مواجه شد. دوباره تلاش کنید.');
    } finally {
      setExporting(false);
    }
  };

  const maxWordCount = report && report.topWords && report.topWords.length > 0
    ? Math.max(...report.topWords.map((w) => w.count))
    : 1;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <span style={{ fontSize: 11.5, color: C.textFaint, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ImageIcon size={14} color={C.gold} />
          اینفوگرافیک از آخرین گزارش عملیات روانی تولیدشده
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="iraf-refresh-btn" onClick={load}>
            <RefreshCw size={13} />
            بروزرسانی
          </button>
          {status === 'ready' && (
            <button className="iraf-refresh-btn" onClick={handleDownload} disabled={exporting} style={{ background: C.gold, color: '#fff' }}>
              <Download size={13} style={exporting ? { animation: 'iraf-spin 1s linear infinite' } : undefined} />
              {exporting ? 'در حال ساخت...' : 'دانلود JPEG'}
            </button>
          )}
        </div>
      </div>

      {exportError && (
        <div className="iraf-card" style={{ padding: '10px 14px', marginBottom: 16, background: C.maroonSoft, borderColor: C.maroonSoft, fontSize: 12.5, color: C.maroon, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} /> {exportError}
        </div>
      )}

      {status === 'loading' && <StateBlock icon={<Loader2 size={22} style={{ animation: 'iraf-spin 1s linear infinite' }} />} text="در حال دریافت گزارش..." />}
      {status === 'error' && <StateBlock icon={<WifiOff size={22} />} text="ارتباط با سرور برقرار نشد." color={C.maroon} />}
      {status === 'empty' && <StateBlock icon={<ImageIcon size={22} />} text="هنوز گزارشی وجود نداره. اول از تب «عملیات روانی» یه گزارش بساز." />}

      {status === 'ready' && report && (
        <div style={{ display: 'flex', justifyContent: 'center', overflowX: 'auto', padding: '8px 0' }}>
          <div
            ref={posterRef}
            style={{
              width: 760, background: '#FFFFFF', padding: '34px 38px', direction: 'rtl',
              fontFamily: "'Vazirmatn', sans-serif", border: `1px solid ${C.border}`,
            }}
          >
            {/* سربرگ پوستر */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `3px solid ${C.gold}`, paddingBottom: 16, marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.gold }}>گزارش عملیات روانی</div>
                <div style={{ fontSize: 12.5, color: C.textFaint, marginTop: 4 }}>راوی عراق</div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div className="iraf-mono" style={{ fontSize: 11, color: C.textFaint }}>
                  {new Date(report.generatedAt).toLocaleDateString('fa-IR')}
                </div>
                <div className="iraf-mono" style={{ fontSize: 11, color: C.textFaint }}>
                  {new Date(report.generatedAt).toLocaleTimeString('fa-IR')}
                </div>
              </div>
            </div>

            {/* تعداد اخبار */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 26 }}>
              <div style={{ flex: 1, background: C.goldSoft, borderRadius: 10, padding: '16px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: C.gold }}>{report.newsCount.toLocaleString('fa-IR')}</div>
                <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 4 }}>خبر بررسی‌شده</div>
              </div>
              <div style={{ flex: 1, background: C.maroonSoft, borderRadius: 10, padding: '16px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: C.maroon }}>{(report.techniques || []).length.toLocaleString('fa-IR')}</div>
                <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 4 }}>تکنیک شناسایی‌شده</div>
              </div>
              <div style={{ flex: 1, background: C.surface2, borderRadius: 10, padding: '16px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: C.text }}>{(report.topWords || []).length.toLocaleString('fa-IR')}</div>
                <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 4 }}>کلمه‌ی پرتکرار</div>
              </div>
            </div>

            {/* خلاصه‌ی مدیریتی */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 8 }}>خلاصه‌ی مدیریتی</div>
              <div style={{ fontSize: 12.5, lineHeight: 2, background: C.surface2, borderRadius: 8, padding: '12px 14px' }}>
                {report.summary || 'خلاصه‌ای ثبت نشده است.'}
              </div>
            </div>

            {/* ۵ خبر مهم */}
            {report.top5News && report.top5News.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 8 }}>۵ خبر مهم این بازه</div>
                <div>
                  {report.top5News.map((n, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 12, lineHeight: 1.9 }}>
                      <span style={{ color: C.gold, fontWeight: 800, flexShrink: 0 }}>{(i + 1).toLocaleString('fa-IR')}.</span>
                      <span>{n}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* تکنیک‌های عملیات روانی */}
            {report.techniques && report.techniques.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 8, color: C.maroon }}>تکنیک‌های عملیات روانی شناسایی‌شده</div>
                <div>
                  {report.techniques.map((t, i) => (
                    <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 6, fontSize: 11.5, lineHeight: 1.9 }}>
                      <span style={{ color: C.maroon, flexShrink: 0 }}>▸</span>
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* پرتکرارترین کلمات - نمودار میله‌ای */}
            {report.topWords && report.topWords.length > 0 && (
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 10 }}>پرتکرارترین کلمات</div>
                {report.topWords.slice(0, 10).map((w, i) => (
                  <PosterBar key={i} word={w.word} count={w.count} max={maxWordCount} />
                ))}
              </div>
            )}

            <div style={{ marginTop: 26, paddingTop: 14, borderTop: `1px solid ${C.borderSoft}`, textAlign: 'center', fontSize: 10.5, color: C.textFaint }}>
              تولیدشده توسط راوی عراق
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/* ---------------------------------------------------------------------
   اپ اصلی — هدر با لوگو، ساعت زنده و ناوبری مناطق
--------------------------------------------------------------------- */
const TABS = [
  { key: 'live', label: 'پوشش زنده اخبار', icon: Newspaper },
  { key: 'archive', label: 'آرشیو مطالب', icon: Archive },
  { key: 'psyop', label: 'عملیات روانی', icon: ShieldAlert },
  { key: 'infographic', label: 'اینفوگرافیک', icon: ImageIcon },
];

const REGIONS = [
  { key: 'iraq', label: 'راوی عراق' },
  { key: 'usa', label: 'راوی آمریکا' },
  { key: 'europe', label: 'راوی اروپا' },
  { key: 'latam', label: 'راوی آمریکای لاتین' },
];

function ComingSoonRegion({ label }) {
  return (
    <div style={{ textAlign: 'center', padding: '110px 20px', color: C.textFaint }}>
      <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 10, color: C.text }}>{label}</div>
      <div style={{ fontSize: 13.5 }}>این بخش به‌زودی راه‌اندازی می‌شود.</div>
    </div>
  );
}

export default function App() {
  const [activeRegion, setActiveRegion] = useState('iraq');
  const [activeTab, setActiveTab] = useState('live');

  return (
    <div className="iraf-root">
      <style>{FONT_IMPORT}</style>

      {/* نوار باریک بالا: ساعت زنده به وقت بغداد */}
      <div style={{ background: '#0D0D6E' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '6px 20px', display: 'flex', justifyContent: 'flex-end' }}>
          <LiveClock />
        </div>
      </div>

      {/* هدر اصلی: لوگو + ناوبری مناطق */}
      <div style={{ background: C.gold, borderBottom: `1px solid ${C.border}` }}>
        <div
          className="iraf-header-inner"
          style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '10px 20px', flexWrap: 'wrap' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={raviLogo} alt="راوی" style={{ height: 42, width: 'auto', display: 'block' }} />
          </div>

          <nav style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {REGIONS.map((r) => (
              <button
                key={r.key}
                onClick={() => setActiveRegion(r.key)}
                style={{
                  background: activeRegion === r.key ? 'rgba(255,255,255,0.22)' : 'transparent',
                  color: '#FFFFFF',
                  border: `1px solid ${activeRegion === r.key ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)'}`,
                  borderRadius: 8, padding: '8px 15px', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.15s ease',
                }}
              >
                {r.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {activeRegion === 'iraq' ? (
        <div className="iraf-layout iraf-scroll" style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 24px 60px' }}>
          <aside className="iraf-sidebar">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  className={`iraf-side-btn ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </aside>

          <main style={{ flex: 1, minWidth: 0 }}>
            {activeTab === 'live' && <LiveTab />}
            {activeTab === 'archive' && <ArchiveTab />}
            {activeTab === 'psyop' && <PsyopTab />}
            {activeTab === 'infographic' && <InfographicTab />}
          </main>
        </div>
      ) : (
        <ComingSoonRegion label={REGIONS.find((r) => r.key === activeRegion).label} />
      )}
    </div>
  );
}
