import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSettings } from './SettingsContext';

const MusicContext = createContext();

export function useMusic() {
  return useContext(MusicContext);
}

export function MusicProvider({ children }) {
  const { musicConfig } = useSettings();
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlist, setPlaylist] = useState([]);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [createdUrls, setCreatedUrls] = useState([]);

  // 清理创建的对象URL
  useEffect(() => {
    return () => {
      createdUrls.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (error) {
          console.warn('Failed to revoke URL:', url, error);
        }
      });
    };
  }, [createdUrls]);

  // 添加URL到清理列表
  const addUrlToCleanup = (url) => {
    if (url && url.startsWith('blob:')) {
      setCreatedUrls(prev => [...prev, url]);
    }
  };

  // 重新生成本地文件的URL（仅处理S3文件）
  const regenerateLocalUrls = (songs) => {
    return songs.map(song => {
      const updatedSong = { ...song };
      
      // 处理音频文件（仅S3文件）
      if (song.audioFile && song.audioFile.storageType === 's3' && song.audioFile.url) {
        updatedSong.musicUrl = song.audioFile.url;
      }
      
      // 处理图片文件（仅S3文件）
      if (song.imageFile && song.imageFile.storageType === 's3' && song.imageFile.url) {
        updatedSong.coverUrl = song.imageFile.url;
      }
      
      return updatedSong;
    });
  };

  // 获取完整的音乐列表（包括内置和自定义）
  const getMusicList = () => {
    const builtinSongs = [
      {
        id: 'builtin-flower',
        title: '鲜花',
        artist: '回春丹',
        musicUrl: 'https://pic.oneloved.top/2025-08/回春丹 - 鲜花_1755699293512.flac',
        coverUrl: '/images/xh.jpg',
        lyrics: 'builtin',
        isBuiltin: true
      }
    ];

    // 重新生成本地文件的URL
    const customSongs = regenerateLocalUrls(musicConfig.customSongs || []).map((song, index) => ({
      ...song,
      id: `custom-${index}`,
      isBuiltin: false
    }));

    return [...builtinSongs, ...customSongs];
  };

  // 当音乐配置变化时更新播放列表
  useEffect(() => {
    const newPlaylist = getMusicList();
    setPlaylist(newPlaylist);
    
    // 如果播放列表为空，重置状态
    if (newPlaylist.length === 0) {
      setCurrentSongIndex(0);
      setIsPlaying(false);
      return;
    }
    
    // 如果当前播放的歌曲不在新列表中，重置到第一首
    if (currentSongIndex >= newPlaylist.length) {
      setCurrentSongIndex(0);
    }
    
    // 如果没有当前歌曲且播放列表不为空，选择第一首
    if (currentSongIndex === 0 && newPlaylist.length > 0) {
      setCurrentSongIndex(0);
    }
  }, [musicConfig]);

  // 播放指定歌曲
  const playSong = (index) => {
    if (index >= 0 && index < playlist.length) {
      setCurrentSongIndex(index);
      setIsPlaying(true);
      
      // 通知全局播放器切换歌曲
      try {
        // 先暂停其他播放器
        window.dispatchEvent(new CustomEvent('music:pause-others'));
        // 然后开始播放
        window.dispatchEvent(new CustomEvent('music:play', {
          detail: { 
            title: playlist[index].title,
            artist: playlist[index].artist,
            musicUrl: playlist[index].musicUrl,
            coverUrl: playlist[index].coverUrl
          }
        }));
      } catch (error) {
        console.error('Failed to dispatch music:play event:', error);
      }
    }
  };

  // 播放下一首
  const playNext = () => {
    const nextIndex = (currentSongIndex + 1) % playlist.length;
    playSong(nextIndex);
  };

  // 播放上一首
  const playPrevious = () => {
    const prevIndex = currentSongIndex === 0 ? playlist.length - 1 : currentSongIndex - 1;
    playSong(prevIndex);
  };

  // 暂停/恢复播放
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    try {
      window.dispatchEvent(new CustomEvent(isPlaying ? 'music:pause' : 'music:play'));
    } catch (error) {
      console.error('Failed to dispatch play/pause event:', error);
    }
  };

  // 设置播放状态
  const setPlayingState = (playing) => {
    setIsPlaying(playing);
  };

  // 获取当前歌曲
  const getCurrentSong = () => {
    return playlist[currentSongIndex] || null;
  };

  // 监听全局播放状态事件
  useEffect(() => {
    const handleGlobalPlay = () => setPlayingState(true);
    const handleGlobalPause = () => setPlayingState(false);
    const handleGlobalDisable = () => {
      setPlayingState(false);
      setCurrentSongIndex(0);
    };

    window.addEventListener('music:playing', (e) => {
      if (e.detail && typeof e.detail.playing === 'boolean') {
        setPlayingState(e.detail.playing);
      }
    });
    window.addEventListener('music:play', handleGlobalPlay);
    window.addEventListener('music:pause', handleGlobalPause);
    window.addEventListener('music:globalDisable', handleGlobalDisable);

    return () => {
      window.removeEventListener('music:playing', handleGlobalPlay);
      window.removeEventListener('music:play', handleGlobalPlay);
      window.removeEventListener('music:pause', handleGlobalPause);
      window.removeEventListener('music:globalDisable', handleGlobalDisable);
    };
  }, []);

  return (
    <MusicContext.Provider value={{
      currentSongIndex,
      playlist,
      isPlaying,
      showPlaylist,
      setShowPlaylist,
      playSong,
      playNext,
      playPrevious,
      togglePlay,
      setPlayingState,
      getCurrentSong
    }}>
      {children}
    </MusicContext.Provider>
  );
}