import React, { useState, useRef, useEffect } from 'react';
import DraggableMemo from './DraggableMemo';
import CanvasEditor from './CanvasEditor';
import CanvasToolbar from './CanvasToolbar';
import ToolOptionsPanel from './ToolOptionsPanel';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const CanvasMode = ({ 
  memos = [], 
  pinnedMemos = [], 
  onAddMemo,
  onUpdateMemo,
  onDeleteMemo,
  onTogglePin,
  onToolPanelVisibleChange
}) => {
  const [draggingId, setDraggingId] = useState(null);
  const [connections, setConnections] = useState([]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);

  // 画布视图（缩放/平移）
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const panTranslateStartRef = useRef({ x: 0, y: 0 });
  
  // 缩放提示tooltip
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0 });

  // 绘图工具状态
  const [selectedTool, setSelectedTool] = useState(null); // 'rectangle' | 'ellipse' | 'text' | 'arrow' | 'line' | 'pencil' | 'eraser'
  const [toolOptions, setToolOptions] = useState({
    // 通用
  stroke: '#3b82f6',
    fill: 'transparent',
    strokeWidth: 2,
    strokeStyle: 'solid', // solid|dashed|dotted
    cornerRadius: 8,
    opacity: 1,
    // 文本
    color: '#111827',
    fontSize: 16,
  textAlign: 'left',
  // 橡皮擦
  eraseType: (typeof window !== 'undefined' && localStorage.getItem('canvas.eraseType')) || 'partial',
  });
  const [shapes, setShapes] = useState([]); // {id, type, props, z}
  // 按图形聚合的擦除点：shapeId -> {x,y,r}[]，更稳定地提交局部擦除
  const [eraseByShape, setEraseByShape] = useState({});
  const [activeShapeId, setActiveShapeId] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  // 对象擦除预览：高亮当前命中的对象（id 集合）
  const [erasePreviewIds, setErasePreviewIds] = useState(null);

  // refs to avoid stale closures in event handlers
  const selectedToolRef = useRef(selectedTool);
  const translateRef = useRef(translate);
  const scaleRef = useRef(scale);
  const toolOptionsRef = useRef(toolOptions);
  const shapesRef = useRef(shapes);
  const activeShapeIdRef = useRef(activeShapeId);
  const isDrawingRef = useRef(isDrawing);
  const drawStartRef = useRef(drawStart);
  // 绘制一次后的“下一次点击退出工具”开关（橡皮擦例外）
  const awaitingExitRef = useRef(false);
  // 当前橡皮擦拖拽的点集合（避免 setState 异步导致抬起时读取到旧值）
  const eraserPointsRef = useRef(null);

  useEffect(() => { selectedToolRef.current = selectedTool; }, [selectedTool]);
  useEffect(() => { translateRef.current = translate; }, [translate]);
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { toolOptionsRef.current = toolOptions; }, [toolOptions]);
  // 本地持久化：仅存储橡皮擦类型（不云同步）
  useEffect(() => {
    try {
      if (toolOptions.eraseType) localStorage.setItem('canvas.eraseType', toolOptions.eraseType);
    } catch {}
  }, [toolOptions.eraseType]);
  useEffect(() => { shapesRef.current = shapes; }, [shapes]);
  useEffect(() => { activeShapeIdRef.current = activeShapeId; }, [activeShapeId]);
  useEffect(() => { isDrawingRef.current = isDrawing; }, [isDrawing]);
  useEffect(() => { drawStartRef.current = drawStart; }, [drawStart]);
  const eraseByShapeRef = useRef(eraseByShape);
  useEffect(() => { eraseByShapeRef.current = eraseByShape; }, [eraseByShape]);

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

  // 同步工具面板可见性到外部（用于屏蔽左侧栏 hover）
  useEffect(() => {
    if (typeof onToolPanelVisibleChange === 'function') {
      onToolPanelVisibleChange(!!selectedTool);
      return () => onToolPanelVisibleChange(false);
    }
  }, [selectedTool, onToolPanelVisibleChange]);

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
    // 忽略在memo上的双击（兼容 SVG/HTML 元素）
    const targetEl = e.target instanceof Element ? e.target : null;
  if (targetEl && (targetEl.closest('.draggable-memo') || targetEl.closest('.canvas-ui'))) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    // 将屏幕坐标反映射到世界坐标（考虑平移与缩放）
    const sx = e.clientX - rect.left - translate.x;
    const sy = e.clientY - rect.top - translate.y;
    const x = sx / scale;
    const y = sy / scale;
    
    if (selectedTool === 'text') {
      // 新建文本形状，后续可在 ContentEditable 中编辑
      const id = `shape_${Date.now()}`;
      setShapes((prev) => ([
        ...prev,
        { 
          id, 
          type: 'text', 
          z: prev.length, 
          props: { 
            x, 
            y, 
            text: '双击编辑', 
            color: toolOptions.color || '#111827', 
            fontSize: toolOptions.fontSize || 16, 
            textAlign: toolOptions.textAlign || 'left', 
            opacity: toolOptions.opacity || 1 
          } 
        }
      ]));
      setActiveShapeId(id);
  // 文本创建后，下一次点击退出工具
  awaitingExitRef.current = true;
      
      // 延迟一下让文本元素渲染完成后再进入编辑模式
      setTimeout(() => {
        const textElement = document.querySelector(`[data-shape-id="${id}"]`);
        if (textElement) {
          textElement.focus();
          // 选中所有文本
          const range = document.createRange();
          range.selectNodeContents(textElement);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }, 100);
    } else {
      // 原有的创建备忘录逻辑
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
    }
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

  // 显示缩放提示
  const showTooltip = (e) => {
    const rect = e.target.getBoundingClientRect();
    const tooltipWidth = 160;
    const tooltipHeight = 30;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = rect.left + rect.width / 2 - tooltipWidth / 2;
    let y = rect.top - tooltipHeight - 10;

    // 边界检查
    if (x < 10) {
      x = 10;
    } else if (x + tooltipWidth > viewportWidth - 10) {
      x = viewportWidth - tooltipWidth - 10;
    }

    if (y < 10) {
      y = rect.bottom + 10;
    }

    setTooltip({
      show: true,
      x,
      y
    });
  };

  // 隐藏缩放提示
  const hideTooltip = () => {
    setTooltip({ ...tooltip, show: false });
  };

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
  const targetEl = e.target instanceof Element ? e.target : null;
  if (targetEl && (targetEl.closest('.draggable-memo') || targetEl.closest('.canvas-ui'))) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      panStartRef.current = { x: e.clientX, y: e.clientY };
      panTranslateStartRef.current = { ...translate };
      
      const onPointerMove = (e) => {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setTranslate({ x: panTranslateStartRef.current.x + dx, y: panTranslateStartRef.current.y + dy });
      };

      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
      };
      
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    };

    el.addEventListener('pointerdown', onPointerDown);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
    };
  }, [translate]);

  // 绘图手势（左键在画布上绘制形状，忽略拖拽 memo）
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const onPointerDown = (e) => {
      if (e.button !== 0) return; // 只处理左键
      const targetEl = e.target instanceof Element ? e.target : null;
  // 忽略在 memo 或 UI 面板/工具栏上的点击
  if (targetEl && (targetEl.closest('.draggable-memo') || targetEl.closest('.canvas-ui'))) return;
      // 如果上一次绘制完成后处于“等待退出”状态，且当前工具不是橡皮擦，则本次点击先退出工具
      if (awaitingExitRef.current && selectedToolRef.current && selectedToolRef.current !== 'eraser') {
        awaitingExitRef.current = false;
        setSelectedTool(null);
        return;
      }
      const currentTool = selectedToolRef.current;
      if (!currentTool || currentTool === 'text') return; // 文字工具由双击处理
      
      e.preventDefault();
      e.stopPropagation();
      
      const rect = el.getBoundingClientRect();
      const t = translateRef.current;
      const s = scaleRef.current;
      const sx = e.clientX - rect.left - t.x;
      const sy = e.clientY - rect.top - t.y;
      const x = sx / s;
      const y = sy / s;
      
      setIsDrawing(true);
      setDrawStart({ x, y });
      isDrawingRef.current = true;
      drawStartRef.current = { x, y };
      
      const id = `shape_${Date.now()}`;
      const opts = toolOptionsRef.current;
      const zIndex = shapesRef.current.length;
      let shape = null;
      
  if (currentTool === 'rectangle' || currentTool === 'ellipse') {
        shape = {
          id, type: currentTool, z: zIndex, props: {
            x, y, w: 1, h: 1,
      stroke: opts.stroke || '#3b82f6', fill: opts.fill,
            strokeWidth: opts.strokeWidth, strokeStyle: opts.strokeStyle,
            cornerRadius: opts.cornerRadius, opacity: opts.opacity
          }
        };
  } else if (currentTool === 'line' || currentTool === 'arrow') {
        shape = { 
          id, 
          type: currentTool, 
          z: zIndex, 
          props: { 
            x1: x, 
            y1: y, 
            x2: x, 
            y2: y, 
    stroke: opts.stroke || '#3b82f6', 
            strokeWidth: opts.strokeWidth, 
            strokeStyle: opts.strokeStyle, 
            opacity: opts.opacity 
          } 
        };
      } else if (currentTool === 'pencil' || currentTool === 'eraser') {
        // 橡皮擦采用 mask 擦除：记录点与半径，不直接绘制白色线条
  const baseRadius = currentTool === 'eraser' ? Math.max(14, (opts.strokeWidth || 2) * 6) : (opts.strokeWidth || 2);
        if (currentTool === 'eraser') {
          // 创建一个临时的当前擦除段（未提交），保存到 active eraser shape 仅用于显示尾巴（不参与实际擦除）
          shape = { 
            id, 
            type: 'eraser', 
            z: zIndex, 
            props: { points: [{ x, y }], radius: baseRadius, opacity: 1 }
          };
      // 启动本次擦除的点集合记录
      eraserPointsRef.current = [{ x, y, r: baseRadius }];
        } else {
          shape = { 
            id, 
            type: 'pencil', 
            z: zIndex, 
            props: { points: [{ x, y }], stroke: opts.stroke || '#3b82f6', strokeWidth: opts.strokeWidth || 2, opacity: opts.opacity }
          };
        }
      }
      
      if (shape) {
        setShapes(prev => [...prev, shape]);
        setActiveShapeId(id);
        shapesRef.current = [...shapesRef.current, shape];
        activeShapeIdRef.current = id;
      }
      const onMove = (e) => {
      if (!isDrawingRef.current || !activeShapeIdRef.current || !drawStartRef.current) return;
      
      const rect = el.getBoundingClientRect();
      const t = translateRef.current;
      const s = scaleRef.current;
      const sx = e.clientX - rect.left - t.x;
      const sy = e.clientY - rect.top - t.y;
      const x = sx / s;
      const y = sy / s;

      setShapes(prev => {
        const idx = prev.findIndex(sh => sh.id === activeShapeIdRef.current);
        if (idx === -1) return prev;
        
        const clone = [...prev];
        const sh = { ...clone[idx], props: { ...clone[idx].props } };
        
        if (sh.type === 'rectangle' || sh.type === 'ellipse') {
          const sx0 = drawStartRef.current.x; 
          const sy0 = drawStartRef.current.y;
          sh.props.x = Math.min(sx0, x);
          sh.props.y = Math.min(sy0, y);
          sh.props.w = Math.max(1, Math.abs(x - sx0));
          sh.props.h = Math.max(1, Math.abs(y - sy0));
        } else if (sh.type === 'line' || sh.type === 'arrow') {
          sh.props.x2 = x; 
          sh.props.y2 = y;
        } else if (sh.type === 'pencil' || sh.type === 'eraser') {
          sh.props.points = [...(sh.props.points || []), { x, y }];
          if (sh.type === 'eraser' && eraserPointsRef.current) {
            const baseR = sh.props.radius || Math.max(14, (toolOptionsRef.current.strokeWidth || 2) * 6);
            eraserPointsRef.current.push({ x, y, r: baseR });
          }
        }
        
        clone[idx] = sh;
        return clone;
      });

      // 对象擦除：计算实时预览命中对象
      if (selectedToolRef.current === 'eraser' && (toolOptionsRef.current.eraseType || 'partial') === 'object') {
        const current = shapesRef.current.find(sh => sh.id === activeShapeIdRef.current && sh.type === 'eraser');
        const points = (eraserPointsRef.current && eraserPointsRef.current.length ? eraserPointsRef.current : (current?.props?.points || []).map(p => ({ x: p.x, y: p.y, r: current?.props?.radius || 15 })));
        const samples = points.slice(-12); // 采样最后若干点，避免过多计算
        const targets = shapesRef.current.filter(s => s.type !== 'eraser');
        const hit = new Set();
        samples.forEach(pt => {
          const r = pt.r || 15;
          targets.forEach(s => { if (isHitShape(s, pt.x, pt.y, r)) hit.add(s.id); });
        });
        setErasePreviewIds(hit);
      } else {
        if (erasePreviewIds) setErasePreviewIds(null);
      }
      };

      const onUpOrCancel = () => {
        if (isDrawingRef.current) {
          setIsDrawing(false);
          setDrawStart(null);
          isDrawingRef.current = false;
          drawStartRef.current = null;
          // 若是橡皮擦：在抬起时生成一个"擦除段"，只作用于抬起瞬间的目标图形集合
          if (selectedToolRef.current === 'eraser') {
            const current = shapesRef.current.find(sh => sh.id === activeShapeIdRef.current && sh.type === 'eraser');
            // 目标集合：根据配置决定
            const eraseType = (toolOptionsRef.current.eraseType || 'partial');
            const targets = shapesRef.current.filter(s => s.type !== 'eraser');
            const eraserPoints = eraserPointsRef.current || (current?.props?.points || []).map(p => ({ x: p.x, y: p.y, r: current?.props?.radius || 15 }));
            
            if (eraseType === 'object') {
              // 对象擦除：完全删除被碰到的图形
              if (eraserPoints && eraserPoints.length > 0) {
                const hitIds = new Set();
                eraserPoints.forEach(pt => {
                  const r = pt.r || 15;
                  targets.forEach(s => {
                    if (isHitShape(s, pt.x, pt.y, r)) hitIds.add(s.id);
                  });
                });
                if (hitIds.size > 0) {
                  setShapes(prev => {
                    const newShapes = prev.filter(s => !hitIds.has(s.id));
                    shapesRef.current = newShapes;
                    return newShapes;
                  });
                }
              }
            } else {
              // 局部擦除：创建擦除段，只包含当前存在的图形
              const pts = (eraserPoints || []).map(p => ({ x: p.x, y: p.y, r: p.r || 15 }));
              if (pts.length > 0) {
                setEraseByShape(prev => {
                  const next = { ...prev };
                  for (const s of targets) {
                    const list = next[s.id] ? next[s.id].slice() : [];
                    list.push(...pts);
                    next[s.id] = list;
                  }
                  eraseByShapeRef.current = next;
                  return next;
                });
              }
            }
            // 擦除段提交后，移除临时 eraser shape 并清空临时点
            if (current) {
              setShapes(prev => prev.filter(s => s.id !== current.id));
              shapesRef.current = shapesRef.current.filter(s => s.id !== current.id);
            }
            eraserPointsRef.current = null;
            // 清除预览
            if (erasePreviewIds) setErasePreviewIds(null);
          }
        }
        // 橡皮擦不会触发“下一次点击退出”
        if (selectedToolRef.current && selectedToolRef.current !== 'eraser') {
          awaitingExitRef.current = true;
        }
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUpOrCancel);
        window.removeEventListener('pointercancel', onUpOrCancel);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUpOrCancel);
      window.addEventListener('pointercancel', onUpOrCancel);
    };

    el.addEventListener('pointerdown', onPointerDown);
  // pointermove/up/cancel 都由 window 级监听（onPointerDown 内部注册）统一处理，避免竞争条件

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
    };
  }, []);

  const handleLayerAction = (action) => {
    if (!activeShapeId) return;
    setShapes(prev => {
      const idx = prev.findIndex(s => s.id === activeShapeId);
      if (idx === -1) return prev;
      const list = [...prev];
      if (action === 'up' && idx < list.length - 1) {
        [list[idx], list[idx + 1]] = [list[idx + 1], list[idx]];
      } else if (action === 'down' && idx > 0) {
        [list[idx], list[idx - 1]] = [list[idx - 1], list[idx]];
      } else if (action === 'to-front') {
        const [item] = list.splice(idx, 1);
        list.push(item);
      } else if (action === 'to-back') {
        const [item] = list.splice(idx, 1);
        list.unshift(item);
      }
      return list.map((s, i) => ({ ...s, z: i }));
    });
  };

  return (
    <div className="relative w-full h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* 背景层（网格） */}
      <div 
        ref={canvasRef}
        className="absolute inset-0"
        onDoubleClick={handleCanvasDoubleClick}
      >
  {/* 顶部工具栏 */}
  <CanvasToolbar selectedTool={selectedTool} onSelectTool={setSelectedTool} />
  {/* 左侧工具设置 */}
  <ToolOptionsPanel visible={!!selectedTool} tool={selectedTool} options={toolOptions} onChange={setToolOptions} onLayer={handleLayerAction} />
  {/* 屏蔽左侧 hover 区域：当工具面板可见时，拦截左侧靠边触发悬浮的鼠标事件 */}
  {selectedTool && (
    <div
      className="absolute top-0 left-0 h-full z-30"
      style={{ width: 360, pointerEvents: 'auto' }}
      onMouseEnter={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
      onMouseLeave={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    />
  )}
        {/* 变换容器：包含连接线 + memos */}
        <div
          className="absolute inset-0 origin-top-left"
          style={{ transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`, transformOrigin: '0 0' }}
        >
          {/* 网格背景随变换缩放 - 填充容器 */}
      <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(rgba(107,114,128,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(107,114,128,0.08) 1px, transparent 1px)`,
              backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 0',
        pointerEvents: 'none'
            }}
          />

          {/* 连接线（世界坐标） */}
          <svg 
            className="absolute inset-0"
            style={{ zIndex: 1, width: '100%', height: '100%', pointerEvents: 'auto' }}
          >
            {/* 定义：箭头标记与局部擦除段遮罩 */}
            <defs>
              {shapes.filter(s => s.type === 'arrow').map(s => (
                <marker key={`arrow-${s.id}`} id={`arrow-${s.id}`} markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L9,3 z" fill={s.props.stroke} />
                </marker>
              ))}
              {/* 为每个图形生成合成遮罩（白=保留，黑=擦除） */}
              {shapes.filter(s => s.type !== 'eraser').map(s => {
                // 历史擦除点：来自按图形聚合的列表
                const relatedPoints = (eraseByShape[s.id] || []);
                // 实时预览：当工具为局部擦除且正在拖拽时，将当前橡皮擦路径也加入遮罩
                const showPreview = selectedTool === 'eraser' && (toolOptions.eraseType || 'partial') === 'partial' && isDrawing;
                let previewPoints = [];
                if (showPreview && activeShapeId) {
                  const currentEraser = shapes.find(sh => sh.id === activeShapeId && sh.type === 'eraser');
                  const baseR = currentEraser?.props?.radius || Math.max(15, (toolOptions.strokeWidth || 2) * 5);
                  const pts = (currentEraser?.props?.points || []).map(p => ({ x: p.x, y: p.y, r: baseR }));
                  if (pts.length) previewPoints = pts;
                }
                const allPoints = relatedPoints.concat(previewPoints);
                if (!allPoints.length) return null;
                return (
                  <mask
                    key={`mask-shape-${s.id}`}
                    id={`mask-shape-${s.id}`}
                    maskUnits="userSpaceOnUse"
                    maskContentUnits="userSpaceOnUse"
                    maskType="luminance"
                    x="-100000"
                    y="-100000"
                    width="200000"
                    height="200000"
                  >
                    <rect x="-100000" y="-100000" width="200000" height="200000" fill="white" />
                    {allPoints.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="black" />
                    ))}
                  </mask>
                );
              })}
            </defs>
            
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

            {/* 绘制的形状层：每个图形应用其合成遮罩 */}
            {shapes.filter(s => s.type !== 'eraser').map((s) => {
              const previewHit = !!(erasePreviewIds && erasePreviewIds.has && erasePreviewIds.has(s.id));
              // 与 <defs> 中一致地汇总该图形的所有擦除点（历史 + 预览）
              const relatedPoints = (eraseByShape[s.id] || []);
              let previewPoints = [];
              if (selectedTool === 'eraser' && (toolOptions.eraseType || 'partial') === 'partial' && isDrawing && activeShapeId) {
                const currentEraser = shapes.find(sh => sh.id === activeShapeId && sh.type === 'eraser');
                const baseR = currentEraser?.props?.radius || Math.max(15, (toolOptions.strokeWidth || 2) * 5);
                const pts = (currentEraser?.props?.points || []).map(p => ({ x: p.x, y: p.y, r: baseR }));
                if (pts.length) previewPoints = pts;
              }
              const allPoints = relatedPoints.concat(previewPoints);
              const hasMask = allPoints.length > 0;
              const maybeWrap = (node) => hasMask ? (
                <g key={`wrap-${s.id}`} mask={`url(#mask-shape-${s.id})`}>{node}</g>
              ) : node;
              const baseOpacity = s.props.opacity ?? 1;
              const opacity = previewHit ? Math.max(0.25, baseOpacity * 0.4) : baseOpacity;
              if (s.type === 'rectangle') {
                const dash = s.props.strokeStyle === 'dashed' ? '6 6' : s.props.strokeStyle === 'dotted' ? '2 6' : undefined;
                const node = (
                  <rect x={s.props.x} y={s.props.y} width={Math.abs(s.props.w)} height={Math.abs(s.props.h)} rx={s.props.cornerRadius || 0}
                    fill={s.props.fill === 'transparent' ? 'none' : s.props.fill}
                    stroke={s.props.stroke}
                    strokeWidth={s.props.strokeWidth}
                    strokeDasharray={dash}
                    opacity={opacity}
                  />
                );
                return <React.Fragment key={s.id}>{maybeWrap(node)}</React.Fragment>;
              }
              if (s.type === 'ellipse') {
                const dash = s.props.strokeStyle === 'dashed' ? '6 6' : s.props.strokeStyle === 'dotted' ? '2 6' : undefined;
                const node = (
                  <ellipse cx={s.props.x + Math.abs(s.props.w)/2} cy={s.props.y + Math.abs(s.props.h)/2} rx={Math.abs(s.props.w)/2} ry={Math.abs(s.props.h)/2}
                    fill={s.props.fill === 'transparent' ? 'none' : s.props.fill}
                    stroke={s.props.stroke}
                    strokeWidth={s.props.strokeWidth}
                    strokeDasharray={dash}
                    opacity={opacity}
                  />
                );
                return <React.Fragment key={s.id}>{maybeWrap(node)}</React.Fragment>;
              }
              if (s.type === 'line' || s.type === 'arrow') {
                const dash = s.props.strokeStyle === 'dashed' ? '6 6' : s.props.strokeStyle === 'dotted' ? '2 6' : undefined;
                const node = (
                  <line x1={s.props.x1} y1={s.props.y1} x2={s.props.x2} y2={s.props.y2}
                    stroke={s.props.stroke} strokeWidth={s.props.strokeWidth} strokeDasharray={dash} opacity={opacity}
                    markerEnd={s.type === 'arrow' ? `url(#arrow-${s.id})` : undefined}
                  />
                );
                return <React.Fragment key={s.id}>{maybeWrap(node)}</React.Fragment>;
              }
              if (s.type === 'pencil') {
                const d = (s.props.points || []).map((p, i) => `${i===0?'M':'L'} ${p.x} ${p.y}`).join(' ');
                const node = (
                  <path d={d} fill="none" stroke={s.props.stroke} strokeWidth={s.props.strokeWidth} strokeLinecap="round" strokeLinejoin="round" opacity={opacity} />
                );
                return <React.Fragment key={s.id}>{maybeWrap(node)}</React.Fragment>;
              }
              if (s.type === 'text') {
                const node = (
                  <foreignObject x={s.props.x} y={s.props.y} width="200" height="50" opacity={s.props.opacity ?? 1}>
                    <div
                      data-shape-id={s.id}
                      contentEditable
                      suppressContentEditableWarning
                      style={{
                        color: s.props.color,
                        fontSize: `${s.props.fontSize}px`,
                        textAlign: s.props.textAlign,
                        fontFamily: 'inherit',
                        lineHeight: '1.2',
                        outline: 'none',
                        cursor: 'text',
                        padding: '2px 4px',
                        borderRadius: '2px',
                        border: activeShapeId === s.id ? '1px dashed #3b82f6' : '1px solid transparent',
                        minWidth: '50px',
                        minHeight: '20px'
                      }}
                      onFocus={(e) => setActiveShapeId(s.id)}
                      onBlur={(e) => {
                        const newText = e.target.textContent || '双击编辑';
                        setShapes(prev => prev.map(shape => 
                          shape.id === s.id 
                            ? { ...shape, props: { ...shape.props, text: newText } }
                            : shape
                        ));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.target.blur();
                        }
                      }}
                    >
                      {s.props.text}
                    </div>
                  </foreignObject>
                );
                return <React.Fragment key={s.id}>{maybeWrap(node)}</React.Fragment>;
              }
              return null;
            })}

            {/* 橡皮擦可视化（当前拖动时的白色半透明圆+更长尾巴，静止自动淡出） */}
            {activeShapeId && (() => {
              const erasing = shapes.find(sh => sh.id === activeShapeId && sh.type === 'eraser');
              if (!erasing) return null;
              const pts = erasing.props.points || [];
              const baseR = erasing.props.radius || 12;
              const tailCount = Math.min(32, pts.length); // 加长尾迹
              const tail = pts.slice(-tailCount);
              // 静止淡出：根据是否绘制中控制整体透明度
              const groupOpacity = isDrawingRef.current ? 1 : 0; // 通过 CSS 过渡由 1 -> 0
              return (
                <g className="pointer-events-none transition-opacity duration-400" style={{ opacity: groupOpacity }}>
                  {tail.map((p, i) => {
                    const t = (i + 1) / tail.length; // 0..1
                    const r = baseR * (0.28 + 0.72 * t); // 逐渐变小
                    const opacity = 0.12 + 0.28 * t; // 尾巴更透明
                    return <circle key={i} cx={p.x} cy={p.y} r={r} fill="#ffffff" opacity={opacity} />;
                  })}
                </g>
              );
            })()}
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
            <div 
              className="px-2 text-sm tabular-nums text-gray-600 dark:text-gray-300 cursor-help relative"
              onMouseEnter={showTooltip}
              onMouseLeave={hideTooltip}
            >
              {Math.round(scale * 100)}%
            </div>
            <button className="px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded" onClick={() => setScale(s => clamp(s * 1.1, 0.4, 2.5))}>+</button>
            <button className="ml-1 px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded" onClick={() => { setScale(1); setTranslate({ x: 0, y: 0 }); }}>重置</button>
          </div>
        </div>

        {/* 缩放提示tooltip */}
        <div
          className={`fixed bg-gray-900 dark:bg-gray-800 text-white p-2 rounded text-xs pointer-events-none transition-opacity whitespace-nowrap shadow-lg border border-gray-700 ${
            tooltip.show ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            zIndex: 50,
            transform: tooltip.show ? 'scale(1)' : 'scale(0.95)',
            transition: 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out'
          }}
        >
          鼠标中键拖拽画布，Ctrl+滚轮缩放
        </div>
      </div>
    </div>
  );
};

// 命中测试：判断 (x,y) 是否命中图形（用于对象擦除）
function isHitShape(shape, x, y, eraserR = 0) {
  if (!shape || !shape.props) return false;
  const p = shape.props;
  if (shape.type === 'rectangle') {
  const x0 = p.x;
  const y0 = p.y;
  const w = Math.abs(p.w);
  const h = Math.abs(p.h);
  const x1 = x0 + w;
  const y1 = y0 + h;
  const hasFill = p.fill && p.fill !== 'transparent' && p.fill !== 'none';
  const strokeW = p.strokeWidth || 2;
  const tol = strokeW / 2 + 4 + eraserR;
  // 如果有填充，内部即命中
  if (hasFill && x >= x0 && y >= y0 && x <= x1 && y <= y1) return true;
  // 否则/另外：检测边框邻近（到四条边的距离）
  const clampedX = Math.max(x0, Math.min(x, x1));
  const clampedY = Math.max(y0, Math.min(y, y1));
  const dx = Math.min(Math.abs(x - x0), Math.abs(x - x1));
  const dy = Math.min(Math.abs(y - y0), Math.abs(y - y1));
  const nearHorizontal = (y >= y0 - tol && y <= y0 + tol && x >= x0 - tol && x <= x1 + tol) ||
               (y >= y1 - tol && y <= y1 + tol && x >= x0 - tol && x <= x1 + tol);
  const nearVertical = (x >= x0 - tol && x <= x0 + tol && y >= y0 - tol && y <= y1 + tol) ||
             (x >= x1 - tol && x <= x1 + tol && y >= y0 - tol && y <= y1 + tol);
  return nearHorizontal || nearVertical || (Math.min(dx, dy) <= tol && x >= x0 - tol && x <= x1 + tol && y >= y0 - tol && y <= y1 + tol);
  }
  if (shape.type === 'ellipse') {
  const cx = p.x + Math.abs(p.w) / 2;
  const cy = p.y + Math.abs(p.h) / 2;
  const rx = Math.abs(p.w) / 2;
  const ry = Math.abs(p.h) / 2;
  if (rx === 0 || ry === 0) return false;
  const nx = (x - cx) / rx;
  const ny = (y - cy) / ry;
  const r2 = nx * nx + ny * ny;
  const hasFill = p.fill && p.fill !== 'transparent' && p.fill !== 'none';
  if (hasFill && r2 <= 1) return true; // 内部命中
  // 边框命中：接近椭圆边界 r ~= 1
  const strokeW = p.strokeWidth || 2;
  const tol = (strokeW / Math.min(rx, ry)) + 0.1 + (eraserR / Math.min(rx, ry)); // 粗略容差
  const r = Math.sqrt(r2);
  return Math.abs(r - 1) <= tol;
  }
  if (shape.type === 'line' || shape.type === 'arrow') {
    // 点到线段距离
    const { x1, y1, x2, y2 } = p;
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    const t = len_sq !== 0 ? Math.max(0, Math.min(1, dot / len_sq)) : 0;
    const projX = x1 + t * C;
    const projY = y1 + t * D;
    const dist = Math.hypot(x - projX, y - projY);
  const tol = (p.strokeWidth || 4) + 4 + eraserR;
    return dist <= tol;
  }
  if (shape.type === 'pencil') {
    // 到折线最近距离（简单取最近点）
    const pts = p.points || [];
  const tol = (p.strokeWidth || 2) + 6 + eraserR;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const A = x - a.x;
      const B = y - a.y;
      const C = b.x - a.x;
      const D = b.y - a.y;
      const dot = A * C + B * D;
      const len_sq = C * C + D * D;
      const t = len_sq !== 0 ? Math.max(0, Math.min(1, dot / len_sq)) : 0;
      const projX = a.x + t * C;
      const projY = a.y + t * D;
      if (Math.hypot(x - projX, y - projY) <= tol) return true;
    }
    return false;
  }
  if (shape.type === 'text') {
    // 使用一个简易包围盒
    const w = 200;
    const h = 50;
    return x >= p.x && y >= p.y && x <= p.x + w && y <= p.y + h;
  }
  return false;
}

export default CanvasMode;