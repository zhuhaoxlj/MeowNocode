import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Loader2, Play, Pause, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '@/context/SettingsContext';
import fileStorageService from '@/lib/fileStorageService';
import s3StorageService from '@/lib/s3Storage';
import { useMusic } from '@/context/MusicContext';

// 轻量音乐搜索结果卡片
// - 根据关键词调用 163_search 获取候选
// - 点播放时按需调用 163_music(ids=) 获取播放地址与封面
// - 点爱心时将歌曲写入 musicConfig.customSongs
export default function MusicSearchCard({ open, keyword, onClose }) {
  const [query, setQuery] = useState(keyword || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);
  const prefetchedRef = useRef(new Set());
  const { musicConfig, updateMusicConfig } = useSettings();
  const { playExternalSong, isPlaying, getCurrentSong, togglePlay } = useMusic();

  useEffect(() => { setQuery(keyword || ''); }, [keyword]);

  // 当打开时自动搜索
  useEffect(() => {
    if (!open) return;
    const q = (keyword || '').trim();
    if (!q) return;
    let aborted = false;
    (async () => {
      try {
        setLoading(true); setError('');
        const url = `https://api.kxzjoker.cn/api/163_search?name=${encodeURIComponent(q)}&limit=10`;
        const res = await fetch(url, { method: 'GET' });
        if (!res.ok) throw new Error('搜索接口不可用');
        const data = await res.json();
        if (aborted) return;
        if (Number(data?.code) !== 200) throw new Error('搜索失败');
        const list = Array.isArray(data?.data) ? data.data : [];
        // 规范化
        setResults(list.map(item => ({
          id: String(item.id),
          name: item.name,
          artists: Array.isArray(item.artists) ? item.artists.map(a => a.name).join(' / ') : '',
          album: item.album?.name || '',
          duration: item.duration || '',
          // 默认用网易云图片占位（先尝试通过解析接口获取，再回退）
          pic: undefined,
          url: undefined,
          fetchingUrl: false,
          error: ''
        })));
      } catch (e) {
        setError(e?.message || '搜索失败');
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, [open, keyword]);

  // 自动为前几条结果预取封面（不需要点播放）
  useEffect(() => {
    if (!open || !Array.isArray(results) || results.length === 0) return;
    const candidates = results
      .filter(r => !r.pic && !r.fetchingUrl && !prefetchedRef.current.has(r.id));
    if (candidates.length === 0) return;
    candidates.forEach(async (item) => {
      prefetchedRef.current.add(item.id);
      try {
        await ensureSongDetail(item);
      } catch {}
    });
  }, [open, results]);

  const ensureSongDetail = async (song) => {
    if (!song || song.url) return song;
    const id = song.id;
    const idx = results.findIndex(r => r.id === id);
    if (idx < 0) return song;
    try {
      // 标记加载
      setResults(prev => prev.map((r, i) => i === idx ? { ...r, fetchingUrl: true, error: '' } : r));
      const url = `https://api.kxzjoker.cn/api/163_music?ids=${encodeURIComponent(id)}&level=exhigh&type=json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('解析失败');
  const data = await res.json();
  const urlStr = data?.url || '';
  const pic = data?.pic || '';
  const lyric = data?.lyric || '';
      if (!urlStr) throw new Error('无可用播放地址');
  const next = { ...song, url: urlStr, pic, lyric };
      setResults(prev => prev.map((r, i) => i === idx ? next : r));
      return next;
    } catch (e) {
      const msg = e?.message || '解析失败';
      setResults(prev => prev.map((r, i) => i === idx ? { ...r, fetchingUrl: false, error: msg } : r));
      throw e;
    } finally {
      setResults(prev => prev.map((r, i) => i === idx ? { ...r, fetchingUrl: false } : r));
    }
  };

  const handlePlay = async (song) => {
    try {
      // 若当前全局播放器已加载同一首，则切换暂停/播放
      const current = getCurrentSong?.();
      if (current && current.title === song.name) {
        togglePlay?.();
        setPlayingId(song.id);
        return;
      }

      // 否则解析并交给全局播放器播放
      const s = await ensureSongDetail(song);
      playExternalSong({
        title: s.name,
        artist: s.artists,
        musicUrl: s.url,
        coverUrl: s.pic,
        lyrics: s.lyric || ''
      });
      setPlayingId(s.id);
    } catch (e) {
      toast.error(e?.message || '播放失败');
    }
  };

  const handleAddToList = async (song) => {
    try {
      const s = await ensureSongDetail(song);
      const exists = (musicConfig?.customSongs || []).some(cs =>
        (cs.musicUrl && s.url && cs.musicUrl === s.url) ||
        (cs.title === s.name && (cs.artist || '') === (s.artists || ''))
      );
      if (exists) {
        toast.success('已在音乐列表中');
        return;
      }
      // 若已配置 S3，则尝试将音频与封面上传到 S3
      let audioMeta = null;
      let imageMeta = null;
      let musicUrl = s.url;
      let coverUrl = s.pic || '';
      try {
        if (s3StorageService.isConfigured()) {
          // 初始化一次（若未初始化由 Settings 已处理）
          try { fileStorageService.init(musicConfig?.s3Config || {}); } catch {}

          // 抓取音频为 Blob 并包装成 File
          if (s.url) {
            const audioBlob = await fetch(s.url).then(r => {
              if (!r.ok) throw new Error('拉取音频失败');
              return r.blob();
            });
            const safeName = `${(s.name || 'song').replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g, '_')}-${(s.artists || 'artist').replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g, '_')}`;
            const audioFile = new File([audioBlob], `${safeName}.mp3`, { type: audioBlob.type || 'audio/mpeg' });
            audioMeta = await s3StorageService.uploadFile(audioFile, { type: 'audio' });
            musicUrl = audioMeta.url || musicUrl;
          }
          // 抓取封面为 Blob 并包装成 File
          if (s.pic) {
            const imgBlob = await fetch(s.pic).then(r => {
              if (!r.ok) throw new Error('拉取封面失败');
              return r.blob();
            });
            const imgType = imgBlob.type || 'image/jpeg';
            const imgExt = imgType.split('/')[1] || 'jpg';
            const imgFile = new File([imgBlob], `${(s.name || 'cover').replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g, '_')}.${imgExt}`, { type: imgType });
            imageMeta = await s3StorageService.uploadFile(imgFile, { type: 'image' });
            coverUrl = imageMeta.url || coverUrl;
          }
        }
      } catch (err) {
        console.warn('S3上传失败，回退使用源地址:', err);
      }

      const payload = {
        title: s.name,
        artist: s.artists || '未知艺术家',
        musicUrl,
        coverUrl,
        lyrics: s.lyric || '',
        createdAt: new Date().toISOString(),
        ...(audioMeta ? { audioFile: audioMeta } : {}),
        ...(imageMeta ? { imageFile: imageMeta } : {})
      };
      const next = [...(musicConfig?.customSongs || []), payload];
      updateMusicConfig({ customSongs: next, lastModified: new Date().toISOString() });
      // 本地状态标记已收藏，供立即渲染爱心高亮
      setResults(prev => prev.map(r => r.id === s.id ? { ...r, _liked: true } : r));
      toast.success('已添加到音乐列表');
    } catch (e) {
      toast.error(e?.message || '添加失败');
    }
  };

  // 首次渲染或 musicConfig 变更时，同步已收藏标记
  useEffect(() => {
    const set = new Set((musicConfig?.customSongs || []).map(cs => cs.musicUrl));
    setResults(prev => prev.map(r => {
      const liked = r.url && set.has(r.url);
      return liked ? { ...r, _liked: true } : r;
    }));
  }, [musicConfig]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
    >
      {/* 点击遮罩关闭搜索卡片 */}
      <div className="absolute inset-0 bg-black/20" onMouseDown={() => onClose?.()} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 p-3 border-b border-gray-200 dark:border-gray-700">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                // 触发重新搜索
                const newQ = (query || '').trim();
                if (!newQ) return;
                // 简化：更新 url 的方式重新触发 useEffect
                window.requestAnimationFrame(() => {
                  setResults([]);
                  setError('');
                  setLoading(true);
                  fetch(`https://api.kxzjoker.cn/api/163_search?name=${encodeURIComponent(newQ)}&limit=10`).then(r => r.json()).then(data => {
                    if (Number(data?.code) !== 200) throw new Error('搜索失败');
                    const list = Array.isArray(data?.data) ? data.data : [];
                    setResults(list.map(item => ({
                      id: String(item.id),
                      name: item.name,
                      artists: Array.isArray(item.artists) ? item.artists.map(a => a.name).join(' / ') : '',
                      album: item.album?.name || '',
                      duration: item.duration || '',
                      pic: undefined,
                      url: undefined,
                      fetchingUrl: false,
                      error: ''
                    })));
                  }).catch(err => setError(err?.message || '搜索失败')).finally(() => setLoading(false));
                });
              }
            }}
            placeholder="搜索网易云音乐歌曲/歌手... 回车搜索"
            className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100"
          />
          <button className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800" onClick={onClose} title="关闭">
            <X className="w-4 h-4" />
          </button>
        </div>

  <div className="max-h-[60vh] overflow-auto scrollbar-theme">
          {loading && (
            <div className="flex items-center justify-center p-6 text-gray-500 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> 正在搜索...
            </div>
          )}
          {!loading && error && (
            <div className="p-6 text-center text-red-500">{error}</div>
          )}
          {!loading && !error && results.length === 0 && (
            <div className="p-6 text-center text-gray-500">未找到相关歌曲</div>
          )}
          {!loading && !error && results.length > 0 && (
            <ul className="divide-y divide-gray-200 dark:divide-gray-800">
              {results.map((s) => (
                <li key={s.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <div className="w-12 h-12 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center">
                    {s.pic ? (
                      <img src={s.pic} alt={s.name} className="w-full h-full object-cover" />
                    ) : (
                      // 自动预取封面：在无 pic 时尝试解析接口获取
                      <img
                        alt="cover"
                        className="w-full h-full object-cover opacity-60"
                        src={"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nNDgnIGhlaWdodD0nNDgnIHZpZXdCb3g9JzAgMCA0OCA0OCcgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz48cmVjdCB3aWR0aD0nNDgnIGhlaWdodD0nNDgnIGZpbGw9JyNFMEUwRTAnIC8+PHBhdGggZD0nTTIwIDI1YTIgMiAwIDEgMSAwIDQgMiAyIDAgMCAxIDAtNHptMTMgMTFIMTJhMSAxIDAgMCAxLS44Mi0xLjU3bDguNS0xMC42N2ExIDEgMCAwIDEgMS42NCAwbDQuNDkgNS42MyAxLjgzLTIuNDZhMSAxIDAgMCAxIDEuNTgtLjAybDUuMTcgNi43NUEgMSAxIDAgMCAxIDMzIDM2eiIgZmlsbD0nI0JCRUJDQicgLz48L3N2Zz4="}
                        onLoad={async () => {
                          if (!s.pic) {
                            try {
                              const detail = await ensureSongDetail(s);
                              // 已在 ensure 中更新 pic
                            } catch {}
                          }
                        }}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.name}</div>
                    <div className="text-xs text-gray-500 truncate">{s.artists} {s.duration ? `· ${s.duration}` : ''}</div>
                    {s.error && <div className="text-xs text-red-500 mt-1">{s.error}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                      onClick={() => handlePlay(s)}
                      disabled={s.fetchingUrl}
                    >
                      {s.fetchingUrl ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : playingId === s.id && isPlaying && getCurrentSong()?.title === s.name ? (
                        <><Pause className="inline w-3.5 h-3.5 mr-1" /> 暂停</>
                      ) : (
                        <><Play className="inline w-3.5 h-3.5 mr-1" /> 播放</>
                      )}
                    </button>
                    <button
                      className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${s._liked ? 'text-red-500' : ''}`}
                      title="加入音乐列表"
                      onClick={() => handleAddToList(s)}
                      disabled={s.fetchingUrl}
                    >
                      {s._liked ? (
                        <Heart className="w-4 h-4" fill="currentColor" stroke="none" />
                      ) : (
                        <Heart className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 不再使用卡片内播放器，交由全局播放器统一管理 */}
      </div>
    </div>
  );
}
