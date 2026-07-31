import React, { useEffect, useRef, useState } from 'react';
import { Newspaper, RefreshCw, ExternalLink, ImageOff, WifiOff, Loader2 } from 'lucide-react';

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
  text: '#111111',
  textMuted: '#5A5A5A',
  textFaint: '#8C8C8C',
};

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;600;700&family=Vazirmatn:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

* { box-sizing: border-box; }
button { font-family: inherit; }
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

@media (max-width: 640px) {
  .iraf-main { padding: 18px 14px 50px !important; }
  .iraf-header-row { flex-direction: column; align-items: flex-start !important; gap: 10px !important; }
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

function PostCard(props) {
  const post = props.post;
  const [imgFailed, setImgFailed] = useState(false);
  const dateMs = new Date(post.date).getTime();
  const timeLabel = timeAgoFa(dateMs);
  const fullDate = new Date(post.date).toLocaleString('fa-IR');

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
          <span className="iraf-mono" style={{ fontSize: 10.5, color: C.textFaint }} title={fullDate}>
            {timeLabel}
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

export default function App() {
  const [posts, setPosts] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | empty | error
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const cancelledRef = useRef(false);

  const load = async (isManual) => {
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
      if (!cancelledRef.current) setStatus(function (prev) { return prev === 'ready' ? prev : 'error'; });
    } finally {
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    cancelledRef.current = false;
    load(false);
    const interval = setInterval(function () { load(false); }, POLL_INTERVAL_MS);
    return () => { cancelledRef.current = true; clearInterval(interval); };
  }, []);

  return (
    <div className="iraf-root">
      <style>{FONT_IMPORT}</style>

      <div style={{ background: C.gold, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px' }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: '#FFFFFF', animation: 'iraf-pulse 1.4s ease-in-out infinite', flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, color: '#FFFFFF', fontWeight: 600 }}>پوشش زنده — به‌روزرسانی خودکار هر ۴۵ ثانیه</span>
        </div>
      </div>

      <main className="iraf-scroll iraf-main" style={{ maxWidth: 1280, margin: '0 auto', padding: '26px 24px 60px' }}>
        <div className="iraf-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: C.goldSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold }}>
              <Newspaper size={19} />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800 }}>داشبورد زنده اخبار اربعین</div>
              <div style={{ fontSize: 11.5, color: C.textFaint }}>
                {lastUpdated ? `آخرین به‌روزرسانی: ${lastUpdated.toLocaleTimeString('fa-IR')}` : 'در حال بارگذاری...'}
              </div>
            </div>
          </div>
          <button className="iraf-refresh-btn" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw size={13} style={refreshing ? { animation: 'iraf-spin 1s linear infinite' } : undefined} />
            بروزرسانی
          </button>
        </div>

        {status === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '70px 0', color: C.textFaint }}>
            <Loader2 size={22} style={{ animation: 'iraf-spin 1s linear infinite' }} />
            <span style={{ fontSize: 13 }}>در حال دریافت اخبار...</span>
          </div>
        )}

        {status === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '70px 0', color: C.maroon }}>
            <WifiOff size={22} />
            <span style={{ fontSize: 13 }}>ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.</span>
          </div>
        )}

        {status === 'empty' && (
          <div style={{ textAlign: 'center', padding: '70px 0', color: C.textFaint, fontSize: 13 }}>
            هنوز خبری دریافت نشده. به محض انتشار پست جدید در کانال تلگرام، اینجا نمایش داده می‌شود.
          </div>
        )}

        {status === 'ready' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, alignItems: 'start' }}>
            {posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
