import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Square, Circle, Type, ArrowRight, Minus, Pencil, Eraser } from 'lucide-react';
import { cn } from '@/lib/utils';

const TOOLS = [
  { id: 'rectangle', icon: Square, hotkey: '1', label: '矩形' },
  { id: 'ellipse', icon: Circle, hotkey: '2', label: '圆形' },
  { id: 'text', icon: Type, hotkey: '3', label: '文字' },
  { id: 'arrow', icon: ArrowRight, hotkey: '4', label: '箭头' },
  { id: 'line', icon: Minus, hotkey: '5', label: '直线' },
  { id: 'pencil', icon: Pencil, hotkey: '6', label: '画笔' },
  { id: 'eraser', icon: Eraser, hotkey: '7', label: '橡皮擦' },
];

const CanvasToolbar = ({ selectedTool, onSelectTool }) => {
  // 固定数字快捷键
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;
      const found = TOOLS.find(t => t.hotkey === e.key);
      if (found) {
        e.preventDefault();
        onSelectTool(found.id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onSelectTool]);

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 canvas-ui">
      <div className="flex items-center gap-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur shadow-lg px-2 py-1">
        <TooltipProvider>
          {TOOLS.map(({ id, icon: Icon, hotkey, label }) => (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={label}
                  className={cn(
                    'rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 relative',
                    selectedTool === id && 'bg-gray-100 dark:bg-gray-700'
                  )}
                  onClick={() => onSelectTool(id)}
                >
                  <Icon className="h-5 w-5" />
                  <span
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 text-[11px] leading-none font-semibold pointer-events-none select-none',
                      'text-gray-900 dark:text-gray-100',
                      '[text-shadow:_0_0_2px_rgba(255,255,255,0.6)] dark:[text-shadow:_0_0_2px_rgba(0,0,0,0.6)]'
                    )}
                    aria-hidden
                  >
                    {hotkey}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="select-none">
                <div className="flex items-center gap-2">
                  <span>{label}</span>
                  <span className="text-xs text-gray-400">{hotkey}</span>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
    </div>
  );
};

export default CanvasToolbar;
