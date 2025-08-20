import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Music, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

export default function MusicListManager({ musicConfig, updateMusicConfig }) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSong, setEditingSong] = useState(null);
  const [createdUrls, setCreatedUrls] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    musicUrl: '',
    coverUrl: '',
    lyrics: '',
    audioFile: null,
    imageFile: null
  });

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

  // 获取音乐列表（包括内置和自定义）
  const getMusicList = () => {
    const builtinSongs = [
      {
        id: 'builtin-flower',
        title: '鲜花',
        artist: '回春丹',
        musicUrl: 'https://pic.oneloved.top/2025-08/回春丹 - 鲜花_1755699293512.flac', // 假设的音频文件路径
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

  const handleAddSong = () => {
    if (!formData.title.trim()) {
      toast.error('请输入歌曲名称');
      return;
    }

    const newSong = {
      title: formData.title.trim(),
      artist: formData.artist.trim() || '未知艺术家',
      musicUrl: formData.musicUrl.trim(),
      coverUrl: formData.coverUrl.trim(),
      lyrics: formData.lyrics.trim(),
      audioFile: formData.audioFile || null,
      imageFile: formData.imageFile || null,
      createdAt: new Date().toISOString()
    };

    const updatedSongs = [...(musicConfig.customSongs || []), newSong];
    updateMusicConfig({ 
      customSongs: updatedSongs,
      lastModified: new Date().toISOString()
    });

    setFormData({
      title: '',
      artist: '',
      musicUrl: '',
      coverUrl: '',
      lyrics: '',
      audioFile: null,
      imageFile: null
    });
    setIsAddDialogOpen(false);
    toast.success('歌曲添加成功');
  };

  const handleEditSong = (song) => {
    setEditingSong(song);
    setFormData({
      title: song.title,
      artist: song.artist,
      musicUrl: song.musicUrl,
      coverUrl: song.coverUrl,
      lyrics: song.lyrics || '',
      audioFile: song.audioFile || null,
      imageFile: song.imageFile || null
    });
  };

  const handleUpdateSong = () => {
    if (!formData.title.trim()) {
      toast.error('请输入歌曲名称');
      return;
    }

    const updatedSongs = (musicConfig.customSongs || []).map((song, index) => {
      if (song.title === editingSong.title && song.artist === editingSong.artist) {
        return {
          ...song,
          title: formData.title.trim(),
          artist: formData.artist.trim() || '未知艺术家',
          musicUrl: formData.musicUrl.trim(),
          coverUrl: formData.coverUrl.trim(),
          lyrics: formData.lyrics.trim(),
          audioFile: formData.audioFile || song.audioFile || null,
          imageFile: formData.imageFile || song.imageFile || null,
          updatedAt: new Date().toISOString()
        };
      }
      return song;
    });

    updateMusicConfig({ 
      customSongs: updatedSongs,
      lastModified: new Date().toISOString()
    });

    setEditingSong(null);
    setFormData({
      title: '',
      artist: '',
      musicUrl: '',
      coverUrl: '',
      lyrics: '',
      audioFile: null,
      imageFile: null
    });
    toast.success('歌曲更新成功');
  };

  const handleDeleteSong = (songToDelete) => {
    const updatedSongs = (musicConfig.customSongs || []).filter(song => 
      !(song.title === songToDelete.title && song.artist === songToDelete.artist)
    );

    updateMusicConfig({ 
      customSongs: updatedSongs,
      lastModified: new Date().toISOString()
    });

    toast.success('歌曲删除成功');
  };

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === 'audio' && !file.type.startsWith('audio/')) {
      toast.error('请选择音频文件');
      return;
    }

    if (type === 'image' && !file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }

    // 创建对象URL用于预览
    const url = URL.createObjectURL(file);
    addUrlToCleanup(url);
    
    // 读取文件为Base64用于持久化存储
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target.result;
      const fileInfo = {
        data: base64Data,
        name: file.name,
        size: file.size,
        type: file.type,
        isLocal: true,
        lastModified: file.lastModified
      };

      setFormData(prev => ({
        ...prev,
        [type === 'audio' ? 'musicUrl' : 'coverUrl']: url,
        [type === 'audio' ? 'audioFile' : 'imageFile']: fileInfo
      }));
    };
    
    if (type === 'audio') {
      reader.readAsDataURL(file);
    } else {
      reader.readAsDataURL(file);
    }
  };

  // 从Base64数据重新创建Blob和URL
  const createBlobFromBase64 = (base64Data, mimeType) => {
    try {
      // 移除Base64前缀（如果有）
      const base64Content = base64Data.split(',')[1] || base64Data;
      const byteCharacters = atob(base64Content);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      const url = URL.createObjectURL(blob);
      addUrlToCleanup(url);
      return url;
    } catch (error) {
      console.error('Failed to create blob from base64:', error);
      return null;
    }
  };

  // 重新生成本地文件的URL
  const regenerateLocalUrls = (songs) => {
    return songs.map(song => {
      const updatedSong = { ...song };
      
      // 处理音频文件
      if (song.audioFile && song.audioFile.isLocal && song.audioFile.data) {
        const audioUrl = createBlobFromBase64(song.audioFile.data, song.audioFile.type);
        if (audioUrl) {
          updatedSong.musicUrl = audioUrl;
        } else {
          console.warn('Failed to regenerate audio URL for:', song.title);
          updatedSong.musicUrl = '';
        }
      }
      
      // 处理图片文件
      if (song.imageFile && song.imageFile.isLocal && song.imageFile.data) {
        const imageUrl = createBlobFromBase64(song.imageFile.data, song.imageFile.type);
        if (imageUrl) {
          updatedSong.coverUrl = imageUrl;
        } else {
          console.warn('Failed to regenerate image URL for:', song.title);
          updatedSong.coverUrl = '/images/default-music-cover.svg';
        }
      }
      
      return updatedSong;
    });
  };

  const resetForm = () => {
    setFormData({
      title: '',
      artist: '',
      musicUrl: '',
      coverUrl: '',
      lyrics: '',
      audioFile: null,
      imageFile: null
    });
    setEditingSong(null);
  };

  const musicList = getMusicList();

  return (
    <div className="space-y-4">
      {/* 添加歌曲按钮 */}
      <div className="flex justify-between items-center">
        <Label className="text-sm font-medium">音乐列表</Label>
        <Dialog open={isAddDialogOpen || !!editingSong} onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setEditingSong(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              添加歌曲
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 shadow-xl">
            <DialogHeader>
              <DialogTitle>{editingSong ? '编辑歌曲' : '添加歌曲'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* 歌曲名称 */}
              <div className="space-y-2">
                <Label htmlFor="title">歌曲名称 *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="输入歌曲名称"
                />
              </div>

              {/* 歌手名称 */}
              <div className="space-y-2">
                <Label htmlFor="artist">歌手名称</Label>
                <Input
                  id="artist"
                  value={formData.artist}
                  onChange={(e) => setFormData(prev => ({ ...prev, artist: e.target.value }))}
                  placeholder="输入歌手名称"
                />
              </div>

              {/* 歌曲URL */}
              <div className="space-y-2">
                <Label htmlFor="musicUrl">歌曲URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="musicUrl"
                    value={formData.musicUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, musicUrl: e.target.value }))}
                    placeholder="输入歌曲URL或选择本地文件"
                    className="flex-1"
                  />
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => handleFileUpload(e, 'audio')}
                    className="hidden"
                    id="audio-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('audio-upload').click()}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* 封面URL */}
              <div className="space-y-2">
                <Label htmlFor="coverUrl">封面URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="coverUrl"
                    value={formData.coverUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, coverUrl: e.target.value }))}
                    placeholder="输入封面URL或选择本地文件"
                    className="flex-1"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'image')}
                    className="hidden"
                    id="cover-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('cover-upload').click()}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* 歌词内容 */}
              <div className="space-y-2">
                <Label htmlFor="lyrics">歌词内容</Label>
                <Textarea
                  id="lyrics"
                  value={formData.lyrics}
                  onChange={(e) => setFormData(prev => ({ ...prev, lyrics: e.target.value }))}
                  placeholder="输入歌词内容（每行一句歌词）"
                  rows={6}
                />
                <p className="text-xs text-gray-500">
                  提示：直接输入歌词文本，每行一句歌词。系统会自动处理时间轴。
                </p>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setEditingSong(null);
                    resetForm();
                  }}
                  className="flex-1"
                >
                  取消
                </Button>
                <Button
                  onClick={editingSong ? handleUpdateSong : handleAddSong}
                  className="flex-1"
                >
                  {editingSong ? '更新' : '添加'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 音乐列表 */}
      <div className="space-y-2">
        {musicList.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Music className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>暂无音乐，点击上方按钮添加歌曲</p>
          </div>
        ) : (
          musicList.map((song) => (
            <Card key={song.id} className="p-3">
              <div className="flex items-center gap-3">
                <img
                  src={song.coverUrl || '/images/default-music-cover.svg'}
                  alt={song.title}
                  className="w-12 h-12 rounded object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{song.title}</div>
                  <div className="text-xs text-gray-500 truncate">{song.artist}</div>
                  {song.isBuiltin && (
                    <div className="text-xs text-blue-600">内置歌曲</div>
                  )}
                </div>
                {!song.isBuiltin && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditSong(song)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSong(song)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* 统计信息 */}
      <div className="text-xs text-gray-500 pt-2 border-t">
        共 {musicList.length} 首歌曲（{musicList.filter(s => s.isBuiltin).length} 首内置，{musicList.filter(s => !s.isBuiltin).length} 首自定义）
      </div>
    </div>
  );
}