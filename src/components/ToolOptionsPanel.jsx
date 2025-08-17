import React from 'react';
import ImageUpload from './ImageUpload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDownToLine, ArrowUpToLine, ArrowDown, ArrowUp, Palette, Square, Circle, Type, Eraser, Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLORS = ['#3b82f6', '#111827', '#ef4444', '#10b981', '#f59e0b'];

const ColorSwatch = ({ value, active, onClick, title }) => (
  <button
    title={title}
    className={cn('w-6 h-6 rounded-md border shadow-sm', active ? 'ring-2 ring-blue-500' : 'border-gray-200 dark:border-gray-700')}
    style={{ background: value }}
    onClick={onClick}
  />
);

const Section = ({ children }) => (
  <div className="space-y-2">
    {children}
  </div>
);

const Label = ({ children }) => (
  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
    {children}
  </div>
);

const ToolIcon = ({ tool }) => {
  const map = {
    rectangle: Square,
    ellipse: Circle,
    text: Type,
    eraser: Eraser,
  };
  const Icon = map[tool] || Palette;
  return <Icon className="w-4 h-4" />;
};

const ToolOptionsPanel = ({ visible, tool, options, onChange, onLayer, onImagePicked }) => {
  if (!visible) return null;

  const set = (k, v) => onChange({ ...options, [k]: v });

  if (tool === 'eraser') {
    return (
  <div className="absolute top-20 left-3 z-40 w-72 canvas-ui">
        <Card className="border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ToolIcon tool={tool} />
              橡皮擦设置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Section>
              <Label>类型</Label>
              <Select value={options.eraseType || 'partial'} onValueChange={(v) => set('eraseType', v)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="partial">
                    <div className="flex items-center gap-2"><Eraser className="w-4 h-4" />局部擦除</div>
                  </SelectItem>
                  <SelectItem value="object">
                    <div className="flex items-center gap-2"><Scissors className="w-4 h-4" />对象擦除</div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </Section>
            <Section>
              <Label>画笔大小</Label>
              <div className="flex items-center gap-2">
                {[2, 4, 8].map(w => (
                  <Button key={w} variant={options.strokeWidth === w ? 'secondary' : 'outline'} size="sm" onClick={() => set('strokeWidth', w)}>
                    <div className="w-6" style={{ borderTop: `${w}px solid currentColor` }} />
                  </Button>
                ))}
              </div>
            </Section>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tool === 'image') {
    // 图片工具：在左侧面板展示上传/直链/拖拽
    const handlePicked = (val) => {
      if (onImagePicked) onImagePicked(val);
    };
    return (
      <div className="absolute top-20 left-3 z-40 w-80 canvas-ui">
        <Card className="border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ToolIcon tool={tool} />
              图片上传
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ImageUpload value={''} onChange={handlePicked} />
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">也可将图片直接拖到页面上</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const common = (
    <>
      <Section>
        <Label>颜色</Label>
        <div className="flex items-center gap-2">
          {COLORS.map(c => (
            <ColorSwatch key={c} value={c} active={options.stroke === c} onClick={() => set('stroke', c)} />
          ))}
          <input type="color" className="w-6 h-6 rounded-md overflow-hidden" value={options.stroke || '#3b82f6'} onChange={(e) => set('stroke', e.target.value)} />
        </div>
      </Section>

      {tool !== 'text' && (
        <Section>
          <Label>填充</Label>
          <div className="flex items-center gap-2">
            <Button variant={options.fill === 'transparent' ? 'secondary' : 'outline'} size="sm" onClick={() => set('fill', 'transparent')}>透明</Button>
            {COLORS.map(c => (
              <ColorSwatch key={c} value={c} active={options.fill === c} onClick={() => set('fill', c)} />
            ))}
            <input type="color" className="w-6 h-6 rounded-md overflow-hidden" value={options.fill && options.fill !== 'transparent' ? options.fill : '#ffffff'} onChange={(e) => set('fill', e.target.value)} />
          </div>
        </Section>
      )}

      {tool !== 'text' && (
        <Section>
          <Label>边框宽度</Label>
          <div className="flex items-center gap-2">
            {[1, 2, 4].map(w => (
              <Button key={w} variant={options.strokeWidth === w ? 'secondary' : 'outline'} size="sm" onClick={() => set('strokeWidth', w)}>
                <div className="w-6" style={{ borderTop: `${w}px solid currentColor` }} />
              </Button>
            ))}
          </div>
        </Section>
      )}

      {tool !== 'text' && (
        <Section>
          <Label>边框样式</Label>
          <Select value={options.strokeStyle || 'solid'} onValueChange={(v) => set('strokeStyle', v)}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="solid">实线</SelectItem>
              <SelectItem value="dashed">长虚线</SelectItem>
              <SelectItem value="dotted">点虚线</SelectItem>
            </SelectContent>
          </Select>
        </Section>
      )}

      {tool === 'rectangle' && (
        <Section>
          <Label>圆角</Label>
          <Select value={String(options.cornerRadius || 0)} onValueChange={(v) => set('cornerRadius', Number(v))}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">直角</SelectItem>
              <SelectItem value="8">圆角</SelectItem>
            </SelectContent>
          </Select>
        </Section>
      )}

      <Section>
        <Label>透明度</Label>
        <Slider value={[Math.round((options.opacity ?? 1) * 100)]} onValueChange={([v]) => set('opacity', v / 100)} />
      </Section>

      <Section>
        <Label>图层</Label>
        <div className="grid grid-cols-4 gap-2">
          <Button variant="outline" size="sm" onClick={() => onLayer('to-front')} title="置顶"><ArrowUpToLine className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => onLayer('up')} title="上移"><ArrowUp className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => onLayer('down')} title="下移"><ArrowDown className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => onLayer('to-back')} title="置底"><ArrowDownToLine className="w-4 h-4" /></Button>
        </div>
      </Section>
    </>
  );

  const textOnly = (
    <>
      <Section>
        <Label>文字颜色</Label>
        <div className="flex items-center gap-2">
          {COLORS.map(c => (
            <ColorSwatch key={c} value={c} active={options.color === c} onClick={() => set('color', c)} />
          ))}
          <input type="color" className="w-6 h-6 rounded-md overflow-hidden" value={options.color || '#111827'} onChange={(e) => set('color', e.target.value)} />
        </div>
      </Section>
      <Section>
        <Label>字号</Label>
        <Select value={String(options.fontSize || 16)} onValueChange={(v) => set('fontSize', Number(v))}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[12, 14, 16, 20, 24, 32].map(s => (
              <SelectItem key={s} value={String(s)}>{s}px</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Section>
      <Section>
        <Label>对齐</Label>
        <Select value={options.textAlign || 'left'} onValueChange={(v) => set('textAlign', v)}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">左</SelectItem>
            <SelectItem value="center">中</SelectItem>
            <SelectItem value="right">右</SelectItem>
          </SelectContent>
        </Select>
      </Section>
      <Section>
        <Label>透明度</Label>
        <Slider value={[Math.round((options.opacity ?? 1) * 100)]} onValueChange={([v]) => set('opacity', v / 100)} />
      </Section>
      <Section>
        <Label>图层</Label>
        <div className="grid grid-cols-4 gap-2">
          <Button variant="outline" size="sm" onClick={() => onLayer('to-front')} title="置顶"><ArrowUpToLine className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => onLayer('up')} title="上移"><ArrowUp className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => onLayer('down')} title="下移"><ArrowDown className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => onLayer('to-back')} title="置底"><ArrowDownToLine className="w-4 h-4" /></Button>
        </div>
      </Section>
    </>
  );

  return (
  <div className="absolute top-20 left-3 z-40 w-72 canvas-ui">
      <Card className="border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ToolIcon tool={tool} />
            工具设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tool === 'text' ? textOnly : common}
        </CardContent>
      </Card>
    </div>
  );
};

export default ToolOptionsPanel;
