import React, { useState, useRef, useEffect } from 'react';
import DraggableMemo from './DraggableMemo';
import CanvasEditor from './CanvasEditor';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const CanvasMode = ({ 
  memos = [], 
  pinnedMemos = [], 
  onAddMemo,
  onUpdateMemo,
  onDeleteMemo,
  onTogglePin
}) => {
  const [draggingId, setDraggingId] = useState(null);
  const [connections, setConnections] = useState([]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const canvasRef = useRef(null);

  // 画布视图（缩放/平移）
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const panTranslateStartRef = useRef({ x: 0, y: 0 });

  // 合并所有 memos
  const allMemos = [...memos, ...pinnedMemos];

  // 更新画布大小
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // 连接计算
  const checkConnections = (draggedId, draggedPos) => {
    const newConnections = [];
    const connectionDistance = 160;
    allMemos.forEach(memo => {
      if (memo.id !== draggedId) {
        const distance = Math.hypot(draggedPos.x - (memo.canvasX || 0), draggedPos.y - (memo.canvasY || 0));
        if (distance < connectionDistance) newConnections.push({ from: draggedId, to: memo.id, distance });
      }
    });
    setConnections(newConnections);
  };

  // 拖拽回调
  const handleDragStart = (id) => setDraggingId(id);
  const handleDrag = (id, position) => {
    if (draggingId === id) checkConnections(id, position);
  };
  const handleDragEnd = (id, position) => {
    onUpdateMemo(id, { canvasX: position.x, canvasY: position.y });
    setDraggingId(null);
    setConnections([]);
  };

  // 双击创建
  const handleCanvasDoubleClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    // 将屏幕坐标反映射到世界坐标（考虑平移与缩放）
    const sx = e.clientX - rect.left - translate.x;
    const sy = e.clientY - rect.top - translate.y;
    const x = sx / scale;
    const y = sy / scale;

    const newMemo = {
      id: Date.now(),
      content: '',
      tags: [],
      canvasX: x,
      canvasY: y,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isNew: true
    };
    onAddMemo(newMemo);
  };

  // 初始化位置
  const initializeMemoPositions = () => {
    const updatedMemos = allMemos.map((memo, index) => {
      if (!memo.canvasX || !memo.canvasY) {
        const angle = (index / Math.max(allMemos.length, 1)) * 2 * Math.PI;
        const radius = 220;
        const centerX = canvasSize.width / 2;
        const centerY = canvasSize.height / 2;
        return { ...memo, canvasX: centerX + Math.cos(angle) * radius, canvasY: centerY + Math.sin(angle) * radius };
      }
      return memo;
    });
    updatedMemos.forEach(memo => {
      if (memo.canvasX !== undefined && memo.canvasY !== undefined) {
        onUpdateMemo(memo.id, { canvasX: memo.canvasX, canvasY: memo.canvasY });
      }
    });
  };

  useEffect(() => {
    if (canvasSize.width > 0 && canvasSize.height > 0) initializeMemoPositions();
  }, [canvasSize]);

  // 画布缩放（滚轮 / Ctrl+滚轮 / 触控板）
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const onWheel = (e) => {
      // 支持 Ctrl+滚轮缩放；触控板双指缩放会带有 ctrlKey
      if (!e.ctrlKey) return;
      e.preventDefault();

      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const prevScale = scale;
      const nextScale = clamp(prevScale * (e.deltaY < 0 ? 1.1 : 0.9), 0.4, 2.5);

      // 缩放围绕鼠标点，调整 translate 保持该点在屏幕位置不变
      const worldX = (mouseX - translate.x) / prevScale;
      const worldY = (mouseY - translate.y) / prevScale;
      const newTranslateX = mouseX - worldX * nextScale;
      const newTranslateY = mouseY - worldY * nextScale;

      setScale(nextScale);
      setTranslate({ x: newTranslateX, y: newTranslateY });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [scale, translate]);

  // 画布平移（鼠标中键拖拽）
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const onPointerDown = (e) => {
      // 只处理鼠标中键（button === 1）
      if (e.button !== 1) return;
      
      // 忽略从 memo 上开始的拖拽（让 memo 自己处理）
      if ((e.target instanceof HTMLElement) && e.target.closest('.draggable-memo')) return;
      
      e.preventDefault();
      panStartRef.current = { x: e.clientX, y: e.clientY };
      panTranslateStartRef.current = { ...translate };
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp, { once: true });
      window.addEventListener('pointercancel', onPointerUp, { once: true });
    };

    const onPointerMove = (e) => {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setTranslate({ x: panTranslateStartRef.current.x + dx, y: panTranslateStartRef.current.y + dy });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
    };

    el.addEventListener('pointerdown', onPointerDown);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
    };
  }, [translate]);

  return (
    <div className="relative w-full h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* 背景层（网格） */}
      <div 
        ref={canvasRef}
        className="absolute inset-0"
        onDoubleClick={handleCanvasDoubleClick}
      >
        {/* 变换容器：包含连接线 + memos */}
        <div
          className="absolute inset-0 origin-top-left"
          style={{ transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`, transformOrigin: '0 0' }}
        >
          {/* 网格背景随变换缩放 */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(rgba(107,114,128,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(107,114,128,0.08) 1px, transparent 1px)`,
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 0'
            }}
          />

          {/* 连接线（世界坐标） */}
          <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
            {connections.map((connection, index) => {
              const fromMemo = allMemos.find(m => m.id === connection.from);
              const toMemo = allMemos.find(m => m.id === connection.to);
              if (fromMemo && toMemo) {
                return (
                  <line
                    key={index}
                    x1={fromMemo.canvasX}
                    y1={fromMemo.canvasY}
                    x2={toMemo.canvasX}
                    y2={toMemo.canvasY}
                    stroke="rgba(59, 130, 246, 0.45)"
                    strokeWidth="2"
                    strokeDasharray="4 6"
                  />
                );
              }
              return null;
            })}
          </svg>

          {/* Memo 项 */}
          {allMemos.map(memo => (
            <DraggableMemo
              key={memo.id}
              memo={memo}
              onDragStart={handleDragStart}
              onDrag={handleDrag}
              onDragEnd={handleDragEnd}
              onUpdate={onUpdateMemo}
              onDelete={onDeleteMemo}
              onTogglePin={onTogglePin}
              scale={scale}
              style={{
                position: 'absolute',
                left: memo.canvasX || 0,
                top: memo.canvasY || 0,
                zIndex: draggingId === memo.id ? 10 : 5
              }}
            />
          ))}
        </div>

        {/* 底部编辑器（固定在屏幕坐标，不随画布缩放） */}
        <CanvasEditor onAddMemo={onAddMemo} canvasSize={canvasSize} scale={scale} translate={translate} />

        {/* 右下角工具条（不缩放，固定屏幕 UI） */}
        <div className="absolute right-4 bottom-4 z-30 flex flex-col items-end gap-2">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 shadow px-2 py-1 flex items-center gap-1">
            <button className="px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded" onClick={() => setScale(s => clamp(s * 0.9, 0.4, 2.5))}>-</button>
            <div className="px-2 text-sm tabular-nums text-gray-600 dark:text-gray-300">{Math.round(scale * 100)}%</div>
            <button className="px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded" onClick={() => setScale(s => clamp(s * 1.1, 0.4, 2.5))}>+</button>
            <button className="ml-1 px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded" onClick={() => { setScale(1); setTranslate({ x: 0, y: 0 }); }}>重置</button>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 shadow px-2 py-1 text-xs text-gray-500">鼠标中键拖拽画布，Ctrl+滚轮缩放</div>
        </div>
      </div>
    </div>
  );
};

export default CanvasMode;