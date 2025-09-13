import React, { useEffect, useRef, useState } from 'react';
import { Heart, Loader2, Play, Pause, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '@/context/SettingsContext';
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
  // 分页/更多控制
  const [fetchLimit, setFetchLimit] = useState(10);
  const [loadingMore, setLoadingMore] = useState(false);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const { musicConfig, updateMusicConfig, s3Config } = useSettings();
  const { playExternalSong, isPlaying, getCurrentSong, togglePlay } = useMusic();
  // 记录正在进行 S3 上传的歌曲，避免重复上传（按搜索结果 id）
  const uploadingRef = useRef(new Set());
  // 记录已排队等待上传的歌曲，进一步避免并发点击导致的重复排队
  const pendingUploadRef = useRef(new Set());

  useEffect(() => { setQuery(keyword || ''); }, [keyword]);

  // 工具：规范化搜索项
  const normalizeItem = (item) => ({
    id: String(item.id),
    name: item.name,
    artists: Array.isArray(item.artists) ? item.artists.map(a => a.name).join(' / ') : '',
    album: item.album?.name || '',
    duration: item.duration || '',
    pic: undefined,
    url: undefined,
    lyric: undefined,
    fetchingUrl: false,
    error: '',
    _liked: false,
    _uploading: false
  });

  // 工具：是否在自定义列表中（按 URL 或 标题+歌手）
  const isLiked = (name, artists, url) => {
    const custom = musicConfig?.customSongs || [];
    return custom.some(cs => (
      (url && cs.musicUrl && cs.musicUrl === url) ||
      ((cs.title || '').trim() === (name || '').trim() && (cs.artist || '').trim() === (artists || '').trim())
    ));
  };

  // 工具：合并新老结果，保留老项的解析与收藏/上传状态，并基于当前 musicConfig 计算 _liked
  const mergeResults = (prev, rawList) => {
    const mapPrev = new Map(prev.map(r => [r.id, r]));
    const next = rawList.map(item => {
      const base = normalizeItem(item);
      if (mapPrev.has(base.id)) {
        const old = mapPrev.get(base.id);
        const merged = { ...base, ...(['url','pic','lyric','_liked','_uploading','fetchingUrl','error'].reduce((acc, k) => (old[k] != null ? (acc[k]=old[k], acc) : acc), {})) };
        // 如果已被收藏，则保持为收藏
        merged._liked = merged._liked || isLiked(merged.name, merged.artists, merged.url);
        return merged;
      }
      return { ...base, _liked: isLiked(base.name, base.artists, base.url) };
    });
    return next;
  };

  // 拉取搜索结果
  const loadSearch = async (q, limit) => {
    setError('');
    const url = `https://api.kxzjoker.cn/api/163_search?name=${encodeURIComponent(q)}&limit=${limit}`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) throw new Error('搜索接口不可用');
    const data = await res.json();
    if (Number(data?.code) !== 200) throw new Error('搜索失败');
    const list = Array.isArray(data?.data) ? data.data : [];
  setResults(prev => mergeResults(prev, list));
    // 如果没有比之前更多，则认为到顶
    setCanLoadMore(list.length > results.length);
  };

  // 当打开时自动搜索（重置为10条）
  useEffect(() => {
    if (!open) return;
    const q = (keyword || '').trim();
    if (!q) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setResults([]);
        setFetchLimit(10);
        setCanLoadMore(true);
        await loadSearch(q, 10);
      } catch (e) {
        if (!cancelled) setError(e?.message || '搜索失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, keyword]);

  // 取消自动解析预取，改为按需解析

  // 工具：将解析得到的音频与封面上传到 S3（若启用），返回 { musicUrl, coverUrl, audioMeta, imageMeta }
  const uploadToS3IfEnabled = async (s) => {
    let musicUrl = s.url;
    let coverUrl = s.pic || '';
    let audioMeta = null;
    let imageMeta = null;
    try {
      const enabled = !!(s3Config && s3Config.enabled);
      if (!enabled) return { musicUrl, coverUrl, audioMeta, imageMeta };
      try { s3StorageService.init(s3Config); } catch {}
      const configured = s3StorageService.isConfigured();
      if (!configured) return { musicUrl, coverUrl, audioMeta, imageMeta };

      if (s.url) {
        const audioResp = await fetch(s.url);
        if (audioResp.ok) {
          const audioBlob = await audioResp.blob();
          const safeName = `${(s.name || 'song').replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g, '_')}-${(s.artists || 'artist').replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g, '_')}`;
          const ext = (audioBlob.type && audioBlob.type.split('/')[1]) || 'mp3';
          const audioFile = new File([audioBlob], `${safeName}.${ext}`, { type: audioBlob.type || 'audio/mpeg' });
          audioMeta = await s3StorageService.uploadFile(audioFile, { type: 'audio' });
          if (audioMeta?.url) musicUrl = audioMeta.url;
        }
      }
      if (s.pic) {
        const imgResp = await fetch(s.pic);
        if (imgResp.ok) {
          const imgBlob = await imgResp.blob();
          const imgType = imgBlob.type || 'image/jpeg';
          const imgExt = imgType.split('/')[1] || 'jpg';
          const imgFile = new File([imgBlob], `${(s.name || 'cover').replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g, '_')}.${imgExt}`, { type: imgType });
          imageMeta = await s3StorageService.uploadFile(imgFile, { type: 'image' });
          if (imageMeta?.url) coverUrl = imageMeta.url;
        }
      }
    } catch {}
    return { musicUrl, coverUrl, audioMeta, imageMeta };
  };

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

  // 后台上传队列：确保同一首歌只会排队/上传一次
  const queueBackgroundUpload = (s) => {
    try {
      if (!s3Config?.enabled) return;
      const id = s.id;
      if (!id) return;
      // 若自定义列表里已存在并且已上传过（有 audioFile 或已替换为非 API 原始链接），则不再上传
      const custom = musicConfig?.customSongs || [];
      const exists = custom.find(cs => (
        (cs.musicUrl && s.url && cs.musicUrl === s.url) ||
        ((cs.title || '').trim() === (s.name || '').trim() && (cs.artist || '').trim() === (s.artists || '').trim())
      ));
      if (exists) {
        const uploaded = !!(exists.audioFile && exists.audioFile.storageType === 's3') || (!!exists.audioFile) || (exists.musicUrl && exists.musicUrl !== s.url);
        if (uploaded) return;
      }
      if (uploadingRef.current.has(id) || pendingUploadRef.current.has(id)) return;
      pendingUploadRef.current.add(id);
      setResults(prev => prev.map(r => r.id === id ? { ...r, _uploading: true } : r));
      (async () => {
        try {
          uploadingRef.current.add(id);
          const { musicUrl, coverUrl, audioMeta, imageMeta } = await uploadToS3IfEnabled(s);
          if (!musicUrl && !coverUrl && !audioMeta && !imageMeta) return;
          const custom = musicConfig?.customSongs || [];
          const idx = custom.findIndex(cs => (
            (cs.musicUrl && s.url && cs.musicUrl === s.url) ||
            ((cs.title || '').trim() === (s.name || '').trim() && (cs.artist || '').trim() === (s.artists || '').trim())
          ));
          if (idx >= 0) {
            const next = [...custom];
            const old = next[idx] || {};
            next[idx] = {
              ...old,
              musicUrl: musicUrl || old.musicUrl || s.url,
              coverUrl: coverUrl || old.coverUrl || s.pic || '',
              lyrics: old.lyrics && old.lyrics.length > 0 ? old.lyrics : (s.lyric || ''),
              ...(audioMeta && !old.audioFile ? { audioFile: audioMeta } : {}),
              ...(imageMeta && !old.imageFile ? { imageFile: imageMeta } : {}),
              updatedAt: new Date().toISOString()
            };
            updateMusicConfig({ customSongs: next, lastModified: new Date().toISOString() });
          } else {
            const payload = {
              title: s.name,
              artist: s.artists || '未知艺术家',
              musicUrl: musicUrl || s.url,
              coverUrl: coverUrl || s.pic || '',
              lyrics: s.lyric || '',
              createdAt: new Date().toISOString(),
              ...(audioMeta ? { audioFile: audioMeta } : {}),
              ...(imageMeta ? { imageFile: imageMeta } : {})
            };
            const next = [...custom, payload];
            updateMusicConfig({ customSongs: next, lastModified: new Date().toISOString() });
          }
        } catch {}
        finally {
          uploadingRef.current.delete(id);
          pendingUploadRef.current.delete(id);
          setResults(prev => prev.map(r => r.id === id ? { ...r, _uploading: false, _liked: true } : r));
        }
      })();
    } catch {}
  };

  const handlePlay = async (song) => {
    try {
      // 若当前全局播放器已加载同一首，则切换暂停/播放
      const current = getCurrentSong?.();
      if (current && current.title === song.name) {
        // 确保封面已解析（若还没有）
        if (!song.pic) {
          try { ensureSongDetail(song); } catch {}
        }
        togglePlay?.();
        setPlayingId(song.id);
        return;
      }

      // 否则解析并交给全局播放器播放
      const s = await ensureSongDetail(song);
      // 若自定义列表已存在该歌曲，用 API 源地址临时覆盖其播放地址，确保立即可播
      try {
        const custom = musicConfig?.customSongs || [];
        const idx = custom.findIndex(cs => (
          (cs.musicUrl && s.url && cs.musicUrl === s.url) ||
          ((cs.title || '').trim() === (s.name || '').trim() && (cs.artist || '').trim() === (s.artists || '').trim())
        ));
        if (idx >= 0) {
          const list = [...custom];
          const old = list[idx] || {};
          list[idx] = {
            ...old,
            // 用 API 源地址保证立刻可播放（上传完成后队列会再替换为 S3）
            musicUrl: s.url,
            coverUrl: s.pic || old.coverUrl || '',
            lyrics: old.lyrics && old.lyrics.length > 0 ? old.lyrics : (s.lyric || ''),
            updatedAt: new Date().toISOString()
          };
          updateMusicConfig({ customSongs: list, lastModified: new Date().toISOString() });
        }
      } catch {}
      // 立即使用 API 源地址播放，避免等待 S3 上传
      playExternalSong({
        title: s.name,
        artist: s.artists,
        musicUrl: s.url,
        coverUrl: s.pic,
        lyrics: s.lyric || ''
      });
  // 后台异步进行 S3 上传并同步更新自定义列表为 S3 地址（下次播放走 S3）
  queueBackgroundUpload(s);
      setPlayingId(s.id);
    } catch (e) {
      toast.error(e?.message || '播放失败');
    }
  };

  const handleAddToList = async (song) => {
    try {
      const s = await ensureSongDetail(song);
      const custom = musicConfig?.customSongs || [];
      const existsIdx = custom.findIndex(cs => (
        (cs.musicUrl && s.url && cs.musicUrl === s.url) ||
        ((cs.title || '').trim() === (s.name || '').trim() && (cs.artist || '').trim() === (s.artists || '').trim())
      ));
  // 若已在上传中或已排队，直接返回并标记爱心
  if (uploadingRef.current.has(s.id) || pendingUploadRef.current.has(s.id)) {
        setResults(prev => prev.map(r => r.id === s.id ? { ...r, _liked: true } : r));
        toast.success('正在后台处理');
        return;
      }
      // 若已存在且已有存储元数据/或 S3 链接，则不重复上传
      if (existsIdx >= 0) {
        const old = custom[existsIdx] || {};
        const hasUploaded = !!(old.audioFile || (old.musicUrl && old.musicUrl !== s.url));
        if (hasUploaded) {
          setResults(prev => prev.map(r => r.id === s.id ? { ...r, _liked: true } : r));
          toast.success('已在音乐列表中');
          return;
        }
      }
      uploadingRef.current.add(s.id);
      setResults(prev => prev.map(r => r.id === s.id ? { ...r, _uploading: true } : r));
      const { musicUrl, coverUrl, audioMeta, imageMeta } = await uploadToS3IfEnabled(s);

      if (existsIdx >= 0) {
        const currentList = [...custom];
        const old = currentList[existsIdx] || {};
        currentList[existsIdx] = {
          ...old,
          musicUrl: old.musicUrl || musicUrl,
          coverUrl: old.coverUrl || coverUrl,
          lyrics: (old.lyrics && old.lyrics.length > 0) ? old.lyrics : (s.lyric || ''),
          ...(audioMeta && !old.audioFile ? { audioFile: audioMeta } : {}),
          ...(imageMeta && !old.imageFile ? { imageFile: imageMeta } : {}),
          updatedAt: new Date().toISOString()
        };
        updateMusicConfig({ customSongs: currentList, lastModified: new Date().toISOString() });
      } else {
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
        const next = [...custom, payload];
        updateMusicConfig({ customSongs: next, lastModified: new Date().toISOString() });
      }
      // 本地状态标记已收藏，供立即渲染爱心高亮
      setResults(prev => prev.map(r => r.id === s.id ? { ...r, _liked: true } : r));
      toast.success('已添加到音乐列表');
    } catch (e) {
      toast.error(e?.message || '添加失败');
    } finally {
      // 清理上传标记
      const id = song?.id;
      if (id) {
        uploadingRef.current.delete(String(id));
        setResults(prev => prev.map(r => r.id === String(id) ? { ...r, _uploading: false } : r));
      }
    }
  };

  // 首次渲染或 musicConfig 变更时，同步已收藏标记
  useEffect(() => {
    setResults(prev => prev.map(r => {
      const liked = (musicConfig?.customSongs || []).some(cs => (
        (cs.musicUrl && r.url && cs.musicUrl === r.url) ||
        ((cs.title || '').trim() === (r.name || '').trim() && (cs.artist || '').trim() === (r.artists || '').trim())
      ));
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
                window.requestAnimationFrame(async () => {
                  try {
                    setLoading(true);
                    setResults([]);
                    setFetchLimit(10);
                    setCanLoadMore(true);
                    await loadSearch(newQ, 10);
                  } catch (err) {
                    setError(err?.message || '搜索失败');
                  } finally {
                    setLoading(false);
                  }
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
                  {/* 封面：若已解析到图片则显示图片，否则显示首字文字封面 */}
                  <div className="w-12 h-12 rounded overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    {s.pic ? (
                      <img src={s.pic} alt={s.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-base font-semibold text-gray-800 dark:text-gray-100">
                        {(s.name || '').trim().slice(0, 1) || '?'}
                      </span>
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
                      disabled={s.fetchingUrl || s._uploading}
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
                      disabled={s.fetchingUrl || s._uploading}
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
          {/* 底部：显示更多 */}
          {!loading && !error && results.length > 0 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex justify-center">
              {canLoadMore ? (
                <button
                  className="px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                  disabled={loadingMore}
                  onClick={async () => {
                    const q = (query || keyword || '').trim();
                    if (!q) return;
                    try {
                      setLoadingMore(true);
                      const prevLen = results.length;
                      const nextLimit = fetchLimit + 10;
                      await loadSearch(q, nextLimit);
                      setFetchLimit(nextLimit);
                      // 若无新增则禁用
                      if (results.length <= prevLen) setCanLoadMore(false);
                    } catch (e) {
                      setCanLoadMore(false);
                    } finally {
                      setLoadingMore(false);
                    }
                  }}
                >
                  {loadingMore ? (<span className="inline-flex items-center gap-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> 加载中</span>) : '显示更多'}
                </button>
              ) : (
                <span className="text-xs text-gray-500">没有更多了</span>
              )}
            </div>
          )}
        </div>

        {/* 不再使用卡片内播放器，交由全局播放器统一管理 */}
      </div>
    </div>
  );
}
