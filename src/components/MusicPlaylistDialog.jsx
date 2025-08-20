import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Music, Play, Pause } from 'lucide-react';

export default function MusicPlaylistDialog({ 
  isOpen, 
  onClose, 
  playlist, 
  currentSongIndex, 
  isPlaying, 
  onSongSelect, 
  onTogglePlay 
}) {
  const handleSongClick = (index) => {
    onSongSelect(index);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            播放列表
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2">
          {playlist.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Music className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>播放列表为空</p>
            </div>
          ) : (
            playlist.map((song, index) => (
              <Card 
                key={song.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  index === currentSongIndex 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => handleSongClick(index)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={song.coverUrl || '/images/default-music-cover.svg'}
                      alt={song.title}
                      className="w-12 h-12 rounded object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm truncate ${
                        index === currentSongIndex ? 'text-blue-600 dark:text-blue-400' : ''
                      }`}>
                        {song.title}
                      </div>
                      <div className="text-xs text-gray-500 truncate">{song.artist}</div>
                      {song.isBuiltin && (
                        <div className="text-xs text-blue-600">内置歌曲</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {index === currentSongIndex && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePlay();
                          }}
                          className="h-8 w-8 p-0"
                        >
                          {isPlaying ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      {index === currentSongIndex && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* 播放列表底部信息 */}
        {playlist.length > 0 && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center text-sm text-gray-500">
              <span>共 {playlist.length} 首歌曲</span>
              <span>当前播放: {currentSongIndex + 1}/{playlist.length}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}