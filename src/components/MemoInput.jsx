import React from 'react';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import MemoEditor from '@/components/MemoEditor';
import MemoEditorMinimal from '@/components/MemoEditorMinimal';
import TestBasicInput from '@/components/TestBasicInput';
import TestMemoEditor from '@/components/TestMemoEditor';
import TestParentRender from '@/components/TestParentRender';
import TestRenderCounter from '@/components/TestRenderCounter';
import TestContextRender from '@/components/TestContextRender';
import TestDirectSetNewMemo from '@/components/TestDirectSetNewMemo';

// 🚀 使用 React.memo 优化，避免父组件重渲染时不必要的更新
const MemoInput = React.memo(({ newMemo, setNewMemo, onAddMemo, onEditorFocus, onEditorBlur, allMemos = [], onAddBacklink, onPreviewMemo, pendingNewBacklinks = [], onRemoveBacklink }) => {
  // 🚀 性能优化：使用本地状态管理输入，减少父组件重渲染
  const [localValue, setLocalValue] = React.useState(newMemo);
  const updateTimerRef = React.useRef(null);

  // 当外部 newMemo 变化时同步到本地状态（例如清空输入框）
  React.useEffect(() => {
    setLocalValue(newMemo);
  }, [newMemo]);

  // 🚀 性能优化方案：完全避免调用外部 setNewMemo，减少父组件重渲染
  const PERF_OPTIMIZED = true; // true = 启用优化方案（只用本地状态）

  // 🚀 极致优化：使用 requestAnimationFrame 批量更新，几乎无延迟感
  const rafRef = React.useRef(null);
  const pendingValueRef = React.useRef(null);
  
  const handleChange = React.useCallback((value) => {
    if (PERF_OPTIMIZED) {
      // 🚀 优化方案：只更新本地状态，不触发父组件重渲染
      setLocalValue(value);
      // 不调用 setNewMemo，避免父组件 Index.jsx 重渲染！
      return;
    }
    
    // 原始逻辑（保留用于对比）
    setLocalValue(value);
    pendingValueRef.current = value;
    
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    rafRef.current = requestAnimationFrame(() => {
      if (pendingValueRef.current !== null) {
        setNewMemo(pendingValueRef.current);
        pendingValueRef.current = null;
      }
    });
  }, [setNewMemo]);

  // 🚀 清理定时器和动画帧
  React.useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // 性能测试配置
  const TEST_MODE = 'optimized'; // 'optimized' = 使用优化方案
  const TEST_LEVEL = 1; // 1-5, 仅在 progressive 模式下有效
  
  // 🔬 handleChange 细粒度调试模式
  if (TEST_MODE === 'handlechange_debug') {
    return (
      <div className="flex-shrink-0 p-3 sm:p-4 sm:pb-2">
        <div style={{ 
          padding: '15px', 
          background: '#fff3e0', 
          border: '3px solid #ff6f00', 
          borderRadius: '8px',
          marginBottom: '15px'
        }}>
          <h3 style={{ color: '#e65100', marginBottom: '10px', fontSize: '16px', fontWeight: 'bold' }}>
            🔬 handleChange 内部业务逻辑排查（排除法）
          </h3>
          
          <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.8', background: '#fff', padding: '10px', borderRadius: '6px', marginBottom: '10px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#e65100' }}>
              📍 当前测试配置（修改代码第25-34行的 CONTROL_TEST）:
            </div>
            <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '6px', textAlign: 'left' }}>行号</th>
                  <th style={{ padding: '6px', textAlign: 'left' }}>代码</th>
                  <th style={{ padding: '6px', textAlign: 'center' }}>状态</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px', fontWeight: 'bold' }}>Line 1</td>
                  <td style={{ padding: '6px', fontFamily: 'monospace', fontSize: '10px' }}>console.log()</td>
                  <td style={{ padding: '6px', textAlign: 'center', color: CONTROL_TEST.enableLine1_ConsoleLog ? '#2196f3' : '#999', fontWeight: 'bold' }}>
                    {CONTROL_TEST.enableLine1_ConsoleLog ? '✅ 启用' : '⭕ 禁用'}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px', fontWeight: 'bold' }}>Line 2</td>
                  <td style={{ padding: '6px', fontFamily: 'monospace', fontSize: '10px' }}>performance.now()</td>
                  <td style={{ padding: '6px', textAlign: 'center', color: CONTROL_TEST.enableLine2_PerformanceNow ? '#2196f3' : '#999', fontWeight: 'bold' }}>
                    {CONTROL_TEST.enableLine2_PerformanceNow ? '✅ 启用' : '⭕ 禁用'}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee', background: CONTROL_TEST.enableLine3_SetLocalValue ? '#fff3e0' : 'transparent' }}>
                  <td style={{ padding: '6px', fontWeight: 'bold' }}>Line 3</td>
                  <td style={{ padding: '6px', fontFamily: 'monospace', fontSize: '10px', color: '#d32f2f' }}>setLocalValue(value)</td>
                  <td style={{ padding: '6px', textAlign: 'center', color: CONTROL_TEST.enableLine3_SetLocalValue ? '#ff9800' : '#999', fontWeight: 'bold' }}>
                    {CONTROL_TEST.enableLine3_SetLocalValue ? '🔥 启用' : '⭕ 禁用'}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px', fontWeight: 'bold' }}>Line 4</td>
                  <td style={{ padding: '6px', fontFamily: 'monospace', fontSize: '10px' }}>pendingValueRef = value</td>
                  <td style={{ padding: '6px', textAlign: 'center', color: CONTROL_TEST.enableLine4_PendingValueRef ? '#2196f3' : '#999', fontWeight: 'bold' }}>
                    {CONTROL_TEST.enableLine4_PendingValueRef ? '✅ 启用' : '⭕ 禁用'}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px', fontWeight: 'bold' }}>Line 5</td>
                  <td style={{ padding: '6px', fontFamily: 'monospace', fontSize: '10px' }}>cancelAnimationFrame()</td>
                  <td style={{ padding: '6px', textAlign: 'center', color: CONTROL_TEST.enableLine5_CancelRAF ? '#2196f3' : '#999', fontWeight: 'bold' }}>
                    {CONTROL_TEST.enableLine5_CancelRAF ? '✅ 启用' : '⭕ 禁用'}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px', fontWeight: 'bold' }}>Line 6</td>
                  <td style={{ padding: '6px', fontFamily: 'monospace', fontSize: '10px' }}>requestAnimationFrame()</td>
                  <td style={{ padding: '6px', textAlign: 'center', color: CONTROL_TEST.enableLine6_RequestRAF ? '#2196f3' : '#999', fontWeight: 'bold' }}>
                    {CONTROL_TEST.enableLine6_RequestRAF ? '✅ 启用' : '⭕ 禁用'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '6px', fontWeight: 'bold' }}>Line 7</td>
                  <td style={{ padding: '6px', fontFamily: 'monospace', fontSize: '10px' }}>setNewMemo()</td>
                  <td style={{ padding: '6px', textAlign: 'center', color: CONTROL_TEST.enableLine7_SetNewMemo ? '#2196f3' : '#999', fontWeight: 'bold' }}>
                    {CONTROL_TEST.enableLine7_SetNewMemo ? '✅ 启用' : '⭕ 禁用'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div style={{ fontSize: '12px', color: '#fff', background: '#c62828', padding: '10px', borderRadius: '6px', marginBottom: '10px', lineHeight: '1.6', border: '3px solid #ffeb3b' }}>
            <strong>🎯 最终验证测试（Line 7: setNewMemo）：</strong>
            <div style={{ marginTop: '8px', background: 'rgba(255,235,59,0.3)', padding: '8px', borderRadius: '4px', border: '2px solid #ffeb3b' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '14px' }}>📌 已启用全部代码 (Line 1-7)</div>
              <div style={{ fontSize: '10px' }}>✅ Line 1-6 全部测试通过（不卡）</div>
              <div style={{ fontSize: '12px', marginTop: '4px', color: '#ffeb3b', fontWeight: 'bold' }}>
                🔥 现在测试 Line 7: setNewMemo(pendingValueRef.current)
              </div>
            </div>
            <div style={{ margin: '8px 0', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', border: '2px solid #fff' }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#ffeb3b' }}>⚡ 最终验证：</div>
              <div style={{ fontSize: '12px', marginTop: '6px', lineHeight: '1.8' }}>
                <div>• <strong>预期：应该会卡！</strong></div>
                <div style={{ marginTop: '4px' }}>• <strong>如果卡了</strong> → 🎯 <span style={{ color: '#ffeb3b' }}>真凶确认：setNewMemo 触发父组件重渲染导致卡顿！</span></div>
                <div style={{ marginTop: '4px' }}>• <strong>如果不卡</strong> → 问题可能在父组件 Index.jsx 中</div>
              </div>
            </div>
            <div style={{ fontSize: '11px', color: '#ffeb3b', fontWeight: 'bold', textAlign: 'center', padding: '8px', background: 'rgba(0,0,0,0.4)', borderRadius: '4px' }}>
              🚨 这是完整的业务逻辑！快速打字验证是否卡顿！
            </div>
          </div>
        </div>
        
        <MemoEditorMinimal
          value={localValue}
          onChange={handleChange}
          placeholder="🔬 在这里打字测试 handleChange 性能..."
        />
        
        <div style={{ 
          marginTop: '10px', 
          padding: '10px', 
          background: '#e8f5e9', 
          borderRadius: '6px',
          fontSize: '11px',
          color: '#2e7d32'
        }}>
          <strong>💡 提示：</strong>打开控制台查看详细的性能日志，每个步骤的耗时都会显示
        </div>
        
        <Button
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={() => {
            if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            setNewMemo(localValue);
            setTimeout(onAddMemo, 0);
          }}
          disabled={!localValue.trim()}
          className="absolute bottom-12 right-2 rounded-lg bg-slate-600 hover:bg-slate-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white shadow-md px-3 py-2 flex items-center transition-colors"
          style={{ position: 'relative', marginTop: '10px', bottom: 'auto', right: 'auto' }}
        >
          <Send className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>
    );
  }
  
  // 🔍 极简模式：逐步添加功能来排查性能
  // 修改 MemoEditorMinimal.jsx 中的 TEST_LEVEL 来测试不同功能级别
  if (TEST_MODE === 'minimal') {
    return (
      <div className="flex-shrink-0 p-3 sm:p-4 sm:pb-2">
        <div style={{ 
          padding: '15px', 
          background: '#ffebee', 
          border: '3px solid #f44336', 
          borderRadius: '8px',
          marginBottom: '15px'
        }}>
          <h3 style={{ color: '#c62828', marginBottom: '10px', fontSize: '16px', fontWeight: 'bold' }}>
            🔍 业务逻辑隔离测试模式
          </h3>
          <div style={{ fontSize: '14px', color: '#d32f2f', marginBottom: '10px', fontWeight: 'bold' }}>
            <strong>当前测试级别：</strong>在 <code>src/components/MemoEditorMinimal.jsx</code> 第21行修改 <code>TEST_LEVEL</code>
          </div>
          <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.6', background: '#fff', padding: '10px', borderRadius: '6px' }}>
            <div style={{ color: '#2e7d32', fontWeight: 'bold' }}>✅ <strong>Level 0.0:</strong> 完全独立本地状态（已确认流畅）</div>
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #eee' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#1565c0' }}>🔬 渐进式业务逻辑测试：</div>
              <div><strong>0.1:</strong> + 调用onChange（测试函数调用开销）</div>
              <div><strong>0.2:</strong> + console.log</div>
              <div><strong>0.3:</strong> + performance.now()监控</div>
              <div><strong>0.4:</strong> + 使用外部value（测试重渲染）</div>
              <div><strong>0.5:</strong> + pendingValueRef + cancelAnimationFrame</div>
              <div><strong>0.6:</strong> + requestAnimationFrame调度</div>
              <div style={{ color: '#d32f2f', fontWeight: 'bold' }}><strong>0.7:</strong> + RAF内setNewMemo（完整逻辑）</div>
            </div>
          </div>
          <div style={{ marginTop: '10px', padding: '8px', background: '#fff3e0', borderRadius: '6px', fontSize: '12px', color: '#e65100', fontWeight: 'bold' }}>
            🎯 排除法：从0.1开始测试，找到第一个卡的级别 = 找到性能瓶颈！
          </div>
        </div>
        
        <MemoEditorMinimal
          value={localValue}
          onChange={handleChange}
          placeholder="测试输入..."
        />
        
        <div style={{ 
          marginTop: '10px', 
          padding: '10px', 
          background: '#e3f2fd', 
          borderRadius: '6px',
          fontSize: '12px',
          color: '#1565c0'
        }}>
          <strong>🔬 排除法测试步骤：</strong>
          <ol style={{ margin: '5px 0', paddingLeft: '20px', lineHeight: '1.6' }}>
            <li>✅ <strong>Level 0.0</strong> 已确认流畅</li>
            <li>改为 <code>TEST_LEVEL = 0.1</code>，快速打字测试
              <ul style={{ fontSize: '11px', marginTop: '2px' }}>
                <li>不卡 → 继续测试 0.2</li>
                <li>卡了 → 问题在 onChange 函数调用本身</li>
              </ul>
            </li>
            <li>逐步测试 0.2 → 0.3 → 0.4 → 0.5 → 0.6 → 0.7</li>
            <li><strong style={{ color: '#d32f2f' }}>找到第一个卡的级别 = 性能瓶颈确认！</strong></li>
          </ol>
        </div>
        
        <Button
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={() => {
            if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            setNewMemo(localValue);
            setTimeout(onAddMemo, 0);
          }}
          disabled={!localValue.trim()}
          className="absolute bottom-12 right-2 rounded-lg bg-slate-600 hover:bg-slate-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white shadow-md px-3 py-2 flex items-center transition-colors"
          style={{ position: 'relative', marginTop: '10px', bottom: 'auto', right: 'auto' }}
        >
          <Send className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>
    );
  }
  
  if (TEST_MODE === 'basic') {
    return (
      <div className="flex-shrink-0 p-3 sm:p-4 sm:pb-2">
        <TestBasicInput />
        <div className="mt-2 text-xs text-gray-500">🧪 当前使用基础输入框测试性能</div>
      </div>
    );
  }
  
  if (TEST_MODE === 'progressive') {
    return (
      <div className="flex-shrink-0 p-3 sm:p-4 sm:pb-2">
        <TestMemoEditor 
          testLevel={TEST_LEVEL}
          value={newMemo}
          onChange={setNewMemo}
          placeholder="测试渐进式功能..."
        />
        <div className="mt-2 text-xs text-gray-500">
          🧪 当前使用渐进式测试 Level {TEST_LEVEL} - 修改 TEST_LEVEL 来测试不同功能层级
        </div>
      </div>
    );
  }
  
  if (TEST_MODE === 'parent') {
    return (
      <div className="flex-shrink-0 p-3 sm:p-4 sm:pb-2">
        <TestParentRender />
        <div className="mt-2 text-xs text-red-500">
          🔥 当前测试父组件重渲染影响 - 这是独立测试，不受外部props影响
        </div>
      </div>
    );
  }
  
  if (TEST_MODE === 'ultra_basic') {
    return (
      <div className="flex-shrink-0 p-3 sm:p-4 sm:pb-2">
        <div className="bg-red-100 p-4 rounded border">
          <h3 className="text-red-800 font-bold mb-2">🚨 终极隔离测试</h3>
          <textarea 
            className="w-full p-2 border rounded"
            placeholder="如果这个都卡，说明问题在Context层面..."
            rows={5}
          />
          <div className="text-xs text-red-600 mt-2">
            这是最基础的HTML textarea，完全脱离React优化和props
          </div>
        </div>
      </div>
    );
  }
  
  if (TEST_MODE === 'context') {
    return (
      <div className="flex-shrink-0 p-3 sm:p-4 sm:pb-2">
        <TestContextRender />
        <div className="mt-2 text-xs text-orange-500">
          🔥 Context层面测试 - 检查ThemeContext和SettingsContext是否导致重渲染
        </div>
      </div>
    );
  }
  
  if (TEST_MODE === 'remaining_props') {
    // 🎯 测试剩余的props，找出真正的性能杀手
    const [localInput, setLocalInput] = React.useState('');
    
    return (
      <div className="p-2 sm:p-3 space-y-2" style={{minHeight: '100vh', paddingBottom: '50px', maxHeight: 'none', overflow: 'visible'}}>
        <div style={{padding: '15px', background: '#fff3e0', border: '2px solid #ff9800', borderRadius: '8px', marginBottom: '15px'}}>
          <h3 style={{color: '#e65100', marginBottom: '10px', fontSize: '16px'}}>🔬 剩余Props测试（找出真正的性能杀手）</h3>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            <div>
              <label style={{display: 'block', fontWeight: 'bold', marginBottom: '3px', fontSize: '14px'}}>
                1. 基线：所有backlinks功能（已确认不卡）
              </label>
              <MemoEditor
                value={localInput}
                onChange={(value) => {
                  const start = performance.now();
                  console.log('🟢 基线完整backlinks - Time:', Date.now(), '- 长度:', value.length);
                  setLocalInput(value);
                  setTimeout(() => console.log('🟢 基线完整backlinks异步阶段2 - 耗时:', performance.now() - start, 'ms'), 10);
                }}
                placeholder="完整backlinks功能基线..."
                memosList={allMemos}
                backlinks={pendingNewBacklinks}
                onAddBacklink={onAddBacklink}
                onRemoveBacklink={onRemoveBacklink}
                onPreviewMemo={onPreviewMemo}
                style={{minHeight: '60px'}}
              />
            </div>
            
            <div>
              <label style={{display: 'block', fontWeight: 'bold', marginBottom: '3px', fontSize: '14px'}}>
                2. + onSubmit回调
              </label>
              <MemoEditor
                value={localInput}
                onChange={(value) => {
                  const start = performance.now();
                  console.log('🟡 +onSubmit - Time:', Date.now(), '- 长度:', value.length);
                  setLocalInput(value);
                  setTimeout(() => console.log('🟡 +onSubmit异步阶段2 - 耗时:', performance.now() - start, 'ms'), 10);
                }}
                placeholder="添加onSubmit..."
                onSubmit={onAddMemo}
                memosList={allMemos}
                backlinks={pendingNewBacklinks}
                onAddBacklink={onAddBacklink}
                onRemoveBacklink={onRemoveBacklink}
                onPreviewMemo={onPreviewMemo}
                style={{minHeight: '60px'}}
              />
            </div>
            
            <div>
              <label style={{display: 'block', fontWeight: 'bold', marginBottom: '3px', fontSize: '14px'}}>
                3. + Focus/Blur回调
              </label>
              <MemoEditor
                value={localInput}
                onChange={(value) => {
                  const start = performance.now();
                  console.log('🟠 +Focus/Blur - Time:', Date.now(), '- 长度:', value.length);
                  setLocalInput(value);
                  setTimeout(() => console.log('🟠 +Focus/Blur异步阶段2 - 耗时:', performance.now() - start, 'ms'), 10);
                }}
                placeholder="添加Focus/Blur回调..."
                onSubmit={onAddMemo}
                memosList={allMemos}
                backlinks={pendingNewBacklinks}
                onAddBacklink={onAddBacklink}
                onRemoveBacklink={onRemoveBacklink}
                onPreviewMemo={onPreviewMemo}
                onFocus={onEditorFocus}
                onBlur={onEditorBlur}
                style={{minHeight: '60px'}}
              />
            </div>
            
            <div>
              <label style={{display: 'block', fontWeight: 'bold', marginBottom: '3px', fontSize: '14px'}}>
                4. + showCharCount + autoFocus
              </label>
              <MemoEditor
                value={localInput}
                onChange={(value) => {
                  const start = performance.now();
                  console.log('🔴 +字符计数 - Time:', Date.now(), '- 长度:', value.length);
                  setLocalInput(value);
                  setTimeout(() => console.log('🔴 +字符计数异步阶段2 - 耗时:', performance.now() - start, 'ms'), 10);
                }}
                placeholder="添加字符计数..."
                onSubmit={onAddMemo}
                memosList={allMemos}
                backlinks={pendingNewBacklinks}
                onAddBacklink={onAddBacklink}
                onRemoveBacklink={onRemoveBacklink}
                onPreviewMemo={onPreviewMemo}
                onFocus={onEditorFocus}
                onBlur={onEditorBlur}
                autoFocus={false}
                showCharCount={true}
                style={{minHeight: '60px'}}
              />
            </div>
            
            <div style={{marginTop: '15px', marginBottom: '20px', padding: '12px', background: '#ffebee', border: '3px solid #f44336', borderRadius: '8px'}}>
              <div style={{textAlign: 'center', marginBottom: '8px'}}>
                <label style={{display: 'block', fontWeight: 'bold', color: '#d32f2f', fontSize: '16px'}}>
                  🚨 第五个测试：真实setNewMemo版本 🚨
                </label>
                <div style={{fontSize: '12px', color: '#d32f2f', fontWeight: 'bold', marginTop: '3px'}}>
                  ⚡ 关键测试！检查性能优化是否生效 ⚡
                </div>
              </div>
              
              <MemoEditor
                value={newMemo}
                onChange={(value) => {
                  const start = performance.now();
                  console.log('🔵 真实setNewMemo版本 - Time:', Date.now(), '- 长度:', value.length);
                  setNewMemo(value);
                  setTimeout(() => console.log('🔵 真实setNewMemo版本异步阶段2 - 耗时:', performance.now() - start, 'ms'), 10);
                }}
                placeholder="🚨 在这里打字测试！检查性能优化是否生效..."
                onSubmit={onAddMemo}
                memosList={allMemos}
                backlinks={pendingNewBacklinks}
                onAddBacklink={onAddBacklink}
                onRemoveBacklink={onRemoveBacklink}
                onPreviewMemo={onPreviewMemo}
                onFocus={onEditorFocus}
                onBlur={onEditorBlur}
                autoFocus={false}
                showCharCount={true}
                style={{minHeight: '60px'}}
              />
              
              <div style={{fontSize: '14px', color: '#fff', fontWeight: 'bold', marginTop: '8px', padding: '8px', background: '#f44336', borderRadius: '4px', textAlign: 'center'}}>
                ⚡ 测试性能优化效果！应该不卡了！⚡
              </div>
            </div>
          </div>
          
          <div style={{fontSize: '14px', color: '#fff', background: '#4caf50', padding: '10px', borderRadius: '6px', marginTop: '15px', marginBottom: '15px', border: '2px solid #2e7d32', textAlign: 'center'}}>
            <strong>🎉 性能优化完成！</strong>
            <br />✅ 已移除debouncedSetNewMemo中的性能监控代码
            <br />🎯 第5个输入框现在应该不卡了！
            <br />📊 请测试确认性能优化效果
          </div>
        </div>
      </div>
    );
  }
  
  if (TEST_MODE === 'isolate_backlinks') {
    // 🎯 细分backlinks功能，找出具体的性能杀手
    const [localInput, setLocalInput] = React.useState('');
    
    return (
      <div className="flex-shrink-0 p-3 sm:p-4 sm:pb-2 space-y-4">
        <div style={{padding: '20px', background: '#e8f5e8', border: '2px solid #4caf50', borderRadius: '8px'}}>
          <h3 style={{color: '#2e7d32', marginBottom: '15px'}}>🔬 Backlinks功能细分测试（逐个添加backlinks props）</h3>
          
          <div className="space-y-4">
            <div>
              <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px'}}>
                1. 基线：MemoEditor + allMemos（已确认不卡）
              </label>
              <MemoEditor
                value={localInput}
                onChange={(value) => {
                  const start = performance.now();
                  console.log('🟢 基线测试 - Time:', Date.now(), '- 长度:', value.length);
                  setLocalInput(value);
                  setTimeout(() => console.log('🟢 基线异步阶段2 - 耗时:', performance.now() - start, 'ms'), 10);
                }}
                placeholder="基线测试（已确认不卡）..."
                memosList={allMemos}
              />
            </div>
            
            <div>
              <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px'}}>
                2. + backlinks数组 ({pendingNewBacklinks?.length || 0}条)
              </label>
              <MemoEditor
                value={localInput}
                onChange={(value) => {
                  const start = performance.now();
                  console.log('🟡 +backlinks数组 - Time:', Date.now(), '- 长度:', value.length);
                  setLocalInput(value);
                  setTimeout(() => console.log('🟡 +backlinks数组异步阶段2 - 耗时:', performance.now() - start, 'ms'), 10);
                }}
                placeholder="添加backlinks数组..."
                memosList={allMemos}
                backlinks={pendingNewBacklinks}
              />
            </div>
            
            <div>
              <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px'}}>
                3. + onAddBacklink回调
              </label>
              <MemoEditor
                value={localInput}
                onChange={(value) => {
                  const start = performance.now();
                  console.log('🟠 +onAddBacklink - Time:', Date.now(), '- 长度:', value.length);
                  setLocalInput(value);
                  setTimeout(() => console.log('🟠 +onAddBacklink异步阶段2 - 耗时:', performance.now() - start, 'ms'), 10);
                }}
                placeholder="添加onAddBacklink..."
                memosList={allMemos}
                backlinks={pendingNewBacklinks}
                onAddBacklink={onAddBacklink}
              />
            </div>
            
            <div>
              <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px'}}>
                4. + onRemoveBacklink回调
              </label>
              <MemoEditor
                value={localInput}
                onChange={(value) => {
                  const start = performance.now();
                  console.log('🔴 +onRemoveBacklink - Time:', Date.now(), '- 长度:', value.length);
                  setLocalInput(value);
                  setTimeout(() => console.log('🔴 +onRemoveBacklink异步阶段2 - 耗时:', performance.now() - start, 'ms'), 10);
                }}
                placeholder="添加onRemoveBacklink..."
                memosList={allMemos}
                backlinks={pendingNewBacklinks}
                onAddBacklink={onAddBacklink}
                onRemoveBacklink={onRemoveBacklink}
              />
            </div>
            
            <div>
              <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px'}}>
                5. + onPreviewMemo回调（完整backlinks功能）
              </label>
              <MemoEditor
                value={localInput}
                onChange={(value) => {
                  const start = performance.now();
                  console.log('🔵 +onPreviewMemo - Time:', Date.now(), '- 长度:', value.length);
                  setLocalInput(value);
                  setTimeout(() => console.log('🔵 +onPreviewMemo异步阶段2 - 耗时:', performance.now() - start, 'ms'), 10);
                }}
                placeholder="完整backlinks功能..."
                memosList={allMemos}
                backlinks={pendingNewBacklinks}
                onAddBacklink={onAddBacklink}
                onRemoveBacklink={onRemoveBacklink}
                onPreviewMemo={onPreviewMemo}
              />
            </div>
          </div>
          
          <div style={{fontSize: '12px', color: '#2e7d32', background: '#f1f8e9', padding: '8px', borderRadius: '4px', marginTop: '15px'}}>
            <strong>分析目标：</strong>找出从第几个开始卡顿
            <br />• allMemos: {allMemos?.length || 0}条（已确认正常）
            <br />• pendingBacklinks: {pendingNewBacklinks?.length || 0}条
            <br />• 重点关注：哪个回调函数导致20ms延迟
            <br />• <span style={{color: '#d32f2f', fontWeight: 'bold'}}>⚠️ 请务必测试第5个输入框！</span>
          </div>
        </div>
      </div>
    );
  }
  
  if (TEST_MODE === 'isolate_props') {
    // 🎯 逐个添加props，找出性能杀手
    const [localInput, setLocalInput] = React.useState('');
    
    return (
      <div className="flex-shrink-0 p-3 sm:p-4 sm:pb-2 space-y-4">
        <div style={{padding: '20px', background: '#f3e5f5', border: '2px solid #9c27b0', borderRadius: '8px'}}>
          <h3 style={{color: '#6a1b9a', marginBottom: '15px'}}>🔬 Props隔离测试（逐个添加props）</h3>
          
          <div className="space-y-4">
            <div>
              <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px'}}>
                1. 基础MemoEditor + setNewMemo
              </label>
              <MemoEditor
                value={newMemo}
                onChange={(value) => {
                  const start = performance.now();
                  console.log('🔬 setNewMemo测试 - Time:', Date.now(), '- 长度:', value.length);
                  
                  setNewMemo(value);
                  
                  setTimeout(() => console.log('🔬 setNewMemo异步阶段2 - 耗时:', performance.now() - start, 'ms'), 10);
                  requestAnimationFrame(() => console.log('🔬 setNewMemo渲染完成 - 总耗时:', performance.now() - start, 'ms'));
                }}
                placeholder="只有setNewMemo..."
              />
            </div>
            
            <div>
              <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px'}}>
                2. + allMemos数组 ({allMemos?.length || 0}条)
              </label>
              <MemoEditor
                value={localInput}
                onChange={(value) => {
                  const start = performance.now();
                  console.log('🔬 +allMemos测试 - Time:', Date.now(), '- 长度:', value.length);
                  
                  setLocalInput(value);
                  
                  setTimeout(() => console.log('🔬 +allMemos异步阶段2 - 耗时:', performance.now() - start, 'ms'), 10);
                  requestAnimationFrame(() => console.log('🔬 +allMemos渲染完成 - 总耗时:', performance.now() - start, 'ms'));
                }}
                placeholder="添加allMemos数组..."
                memosList={allMemos}
              />
            </div>
            
            <div>
              <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px'}}>
                3. + backlinks功能
              </label>
              <MemoEditor
                value={localInput}
                onChange={(value) => {
                  const start = performance.now();
                  console.log('🔬 +backlinks测试 - Time:', Date.now(), '- 长度:', value.length);
                  
                  setLocalInput(value);
                  
                  setTimeout(() => console.log('🔬 +backlinks异步阶段2 - 耗时:', performance.now() - start, 'ms'), 10);
                  requestAnimationFrame(() => console.log('🔬 +backlinks渲染完成 - 总耗时:', performance.now() - start, 'ms'));
                }}
                placeholder="添加backlinks功能..."
                memosList={allMemos}
                backlinks={pendingNewBacklinks}
                onAddBacklink={onAddBacklink}
                onRemoveBacklink={onRemoveBacklink}
                onPreviewMemo={onPreviewMemo}
              />
            </div>
            
            <div>
              <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px'}}>
                4. 完整功能（原始版本）
              </label>
              <MemoEditor
                value={newMemo}
                onChange={(value) => {
                  const start = performance.now();
                  console.log('🔬 完整版本测试 - Time:', Date.now(), '- 长度:', value.length);
                  
                  setNewMemo(value);
                  
                  setTimeout(() => console.log('🔬 完整版本异步阶段2 - 耗时:', performance.now() - start, 'ms'), 10);
                  requestAnimationFrame(() => console.log('🔬 完整版本渲染完成 - 总耗时:', performance.now() - start, 'ms'));
                }}
                placeholder="完整功能版本..."
                onSubmit={onAddMemo}
                memosList={allMemos}
                backlinks={pendingNewBacklinks}
                onAddBacklink={onAddBacklink}
                onRemoveBacklink={onRemoveBacklink}
                onPreviewMemo={onPreviewMemo}
                onFocus={onEditorFocus}
                onBlur={onEditorBlur}
                showCharCount={true}
              />
            </div>
          </div>
          
          <div style={{fontSize: '12px', color: '#6a1b9a', background: '#f8e1ff', padding: '8px', borderRadius: '4px', marginTop: '15px'}}>
            <strong>分析目标：</strong>
            <br />• 找出从第几个开始卡顿
            <br />• allMemos数组: {allMemos?.length || 0}条 
            <br />• pendingBacklinks: {pendingNewBacklinks?.length || 0}条
          </div>
        </div>
      </div>
    );
  }
  
  if (TEST_MODE === 'debug_memoeditor') {
    // 🎯 逐步测试MemoEditor的功能，找出性能瓶颈
    const [localInput, setLocalInput] = React.useState('');
    
    // 最基础的MemoEditor测试：只传必需props
    return (
      <div className="flex-shrink-0 p-3 sm:p-4 sm:pb-2 space-y-4">
        <div style={{padding: '20px', background: '#fff8e1', border: '2px solid #ff9800', borderRadius: '8px'}}>
          <h3 style={{color: '#e65100', marginBottom: '15px'}}>🔍 MemoEditor调试模式（逐步添加功能）</h3>
          
          <div className="space-y-4">
            <div>
              <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px'}}>
                1. 最基础MemoEditor（只有value和onChange）
              </label>
              <MemoEditor
                value={localInput}
                onChange={(value) => {
                  const start = performance.now();
                  console.log('🔍 基础MemoEditor开始 - Time:', Date.now(), '- 长度:', value.length);
                  
                  setLocalInput(value);
                  
                  const syncTime = performance.now() - start;
                  console.log('🔍 基础MemoEditor同步完成 - 耗时:', syncTime, 'ms');
                  
                  setTimeout(() => {
                    console.log('🔍 基础MemoEditor异步阶段1 - 耗时:', performance.now() - start, 'ms');
                    
                    setTimeout(() => {
                      console.log('🔍 基础MemoEditor异步阶段2 - 耗时:', performance.now() - start, 'ms');
                    }, 10);
                  }, 0);
                  
                  requestAnimationFrame(() => {
                    console.log('🔍 基础MemoEditor渲染完成 - 总耗时:', performance.now() - start, 'ms');
                  });
                }}
                placeholder="最基础的MemoEditor测试..."
              />
              <div style={{fontSize: '12px', color: '#666', marginTop: '5px'}}>
                字符数: {localInput.length}
              </div>
            </div>
            
            <div>
              <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px'}}>
                2. 添加所有原始props的MemoEditor
              </label>
              <MemoEditor
                value={newMemo}
                onChange={(value) => {
                  const start = performance.now();
                  console.log('🔍 完整MemoEditor开始 - Time:', Date.now(), '- 长度:', value.length);
                  
                  setNewMemo(value);
                  
                  const syncTime = performance.now() - start;
                  console.log('🔍 完整MemoEditor同步完成 - 耗时:', syncTime, 'ms');
                  
                  setTimeout(() => {
                    console.log('🔍 完整MemoEditor异步阶段1 - 耗时:', performance.now() - start, 'ms');
                    
                    setTimeout(() => {
                      console.log('🔍 完整MemoEditor异步阶段2 - 耗时:', performance.now() - start, 'ms');
                    }, 10);
                  }, 0);
                  
                  requestAnimationFrame(() => {
                    console.log('🔍 完整MemoEditor渲染完成 - 总耗时:', performance.now() - start, 'ms');
                  });
                }}
                placeholder="带所有props的MemoEditor..."
                onSubmit={onAddMemo}
                memosList={allMemos}
                backlinks={pendingNewBacklinks}
                onAddBacklink={onAddBacklink}
                onRemoveBacklink={onRemoveBacklink}
                onPreviewMemo={onPreviewMemo}
                onFocus={onEditorFocus}
                onBlur={onEditorBlur}
                autoFocus={false}
                showCharCount={true}
              />
              <div style={{fontSize: '12px', color: '#666', marginTop: '5px'}}>
                字符数: {newMemo.length}
              </div>
            </div>
          </div>
          
          <div style={{fontSize: '12px', color: '#e65100', background: '#fff3e0', padding: '8px', borderRadius: '4px', marginTop: '15px'}}>
            <strong>对比测试：</strong>
            <br />• 如果第1个不卡但第2个卡 → 问题在复杂props或MemoEditor内部逻辑
            <br />• 如果两个都卡 → 问题在MemoEditor的基础渲染机制
          </div>
        </div>
      </div>
    );
  }
  
  if (TEST_MODE === 'minimal_react') {
    // 🎯 极简React组件，无任何额外逻辑
    const [localInput, setLocalInput] = React.useState('');
    
    const handleChange = React.useCallback((e) => {
      const start = performance.now();
      console.log('⚡ 极简React开始 - Time:', Date.now(), '- 长度:', e.target.value.length);
      
      setLocalInput(e.target.value);
      
      const syncTime = performance.now() - start;
      console.log('⚡ 极简React同步完成 - 耗时:', syncTime, 'ms');
      
      setTimeout(() => {
        console.log('⚡ 极简React异步阶段1 - 耗时:', performance.now() - start, 'ms');
        
        setTimeout(() => {
          console.log('⚡ 极简React异步阶段2 - 耗时:', performance.now() - start, 'ms');
        }, 10);
      }, 0);
      
      requestAnimationFrame(() => {
        console.log('⚡ 极简React渲染完成 - 总耗时:', performance.now() - start, 'ms');
      });
    }, []);
    
    return (
      <div className="flex-shrink-0 p-3 sm:p-4 sm:pb-2 space-y-4">
        <div style={{padding: '20px', background: '#e3f2fd', border: '2px solid #2196f3', borderRadius: '8px'}}>
          <h3 style={{color: '#1976d2', marginBottom: '15px'}}>⚡ 极简React组件（移除所有MemoInput逻辑）</h3>
          
          <div>
            <label style={{display: 'block', fontWeight: 'bold', marginBottom: '5px'}}>
              极简React输入（测试是否还卡）
            </label>
            <textarea
              value={localInput}
              onChange={handleChange}
              placeholder="极简React，无props，无复杂逻辑..."
              style={{width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontFamily: 'inherit'}}
              rows={3}
            />
            <div style={{fontSize: '12px', color: '#666', marginTop: '5px'}}>
              字符数: {localInput.length}
            </div>
          </div>
          
          <div style={{fontSize: '12px', color: '#1976d2', background: '#e8f4fd', padding: '8px', borderRadius: '4px', marginTop: '15px'}}>
            <strong>对比测试：</strong>
            <br />• 纯HTML：13-25ms异步延迟，不卡
            <br />• 极简React：如果还卡，说明是React渲染机制问题
            <br />• 如果不卡，说明是MemoInput组件的复杂逻辑导致
          </div>
        </div>
      </div>
    );
  }
  
  if (TEST_MODE === 'pure_html') {
    // 🔥 完全脱离React的纯HTML测试
    React.useEffect(() => {
      const container = document.getElementById('pure-html-test');
      if (!container) return;
      
      container.innerHTML = `
        <div style="padding: 20px; background: #fff3cd; border: 2px solid #ff6b35; border-radius: 8px;">
          <h3 style="color: #d63384; margin-bottom: 15px;">🔥 纯HTML测试（完全脱离React）</h3>
          
          <div style="margin-bottom: 15px;">
            <label style="display: block; font-weight: bold; margin-bottom: 5px;">🎯 原生HTML输入（应该完全不卡）</label>
            <textarea 
              id="pure-textarea"
              placeholder="原生HTML，不经过任何React处理..."
              style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-family: inherit;"
              rows="3"
            ></textarea>
            <div id="char-count" style="font-size: 12px; color: #666;">字符数: 0</div>
          </div>
          
          <div style="font-size: 12px; color: #d63384; background: #ffe6e6; padding: 8px; border-radius: 4px;">
            <strong>判断标准：</strong>如果这个原生HTML都卡，说明是浏览器/系统问题；如果不卡，说明是React组件问题
          </div>
        </div>
      `;
      
      // 添加原生事件监听
      const textarea = document.getElementById('pure-textarea');
      const charCount = document.getElementById('char-count');
      
      if (textarea && charCount) {
        textarea.addEventListener('input', (e) => {
          const start = performance.now();
          console.log('🔥 纯HTML输入开始 - Time:', Date.now(), '- 长度:', e.target.value.length);
          
          // 更新字符计数
          charCount.textContent = `字符数: ${e.target.value.length}`;
          
          const syncTime = performance.now() - start;
          console.log('🔥 纯HTML同步完成 - 耗时:', syncTime, 'ms');
          
          setTimeout(() => {
            console.log('🔥 纯HTML异步阶段1 - 耗时:', performance.now() - start, 'ms');
            
            setTimeout(() => {
              console.log('🔥 纯HTML异步阶段2 - 耗时:', performance.now() - start, 'ms');
            }, 10);
          }, 0);
          
          requestAnimationFrame(() => {
            console.log('🔥 纯HTML渲染完成 - 总耗时:', performance.now() - start, 'ms');
          });
        });
      }
    }, []);
    
    return (
      <div className="flex-shrink-0 p-3 sm:p-4 sm:pb-2 space-y-4">
        <div id="pure-html-test">
          {/* 纯HTML将在这里注入 */}
        </div>
      </div>
    );
  }
  
  if (TEST_MODE === 'ultimate_debug') {
    const [localValue, setLocalValue] = React.useState('');
    
    // 🎯 终极测试：直接跳过所有中间层，测试React最原始的setState
    const directReactTest = React.useCallback((value) => {
      console.log('🎯 DIRECT REACT测试开始 - Time:', Date.now(), '- 强制缓存清除:', Math.random());
      
      const start = performance.now();
      
      // 使用最原始的React setState，跳过所有props传递
      setLocalValue(value);
      
      const syncTime = performance.now() - start;
      console.log('🎯 DIRECT REACT同步完成 - 耗时:', syncTime, 'ms');
      
      // 监控异步影响
      setTimeout(() => {
        console.log('🎯 DIRECT REACT异步阶段1 - 耗时:', performance.now() - start, 'ms');
        
        setTimeout(() => {
          console.log('🎯 DIRECT REACT异步阶段2 - 耗时:', performance.now() - start, 'ms');
        }, 10);
      }, 0);
      
      requestAnimationFrame(() => {
        console.log('🎯 DIRECT REACT渲染完成 - 总耗时:', performance.now() - start, 'ms');
      });
    }, []);
    
    // 🔥 强制缓存清除版本的setNewMemo测试
    const realSetNewMemoWithMonitoring = React.useCallback((value) => {
      console.log('💣 REAL setNewMemo测试 - Time:', Date.now(), '- 强制缓存清除:', Math.random());
      
      const start = performance.now();
      
      // 检查setNewMemo实际类型
      console.log('💣 setNewMemo类型检查:', typeof setNewMemo, setNewMemo.toString().substring(0, 200));
      
      // 监控调用栈
      console.trace('💣 setNewMemo 完整调用栈');
      
      setNewMemo(value);
      
      console.log('💣 REAL同步完成 - 耗时:', performance.now() - start, 'ms');
      
      // 详细异步监控
      setTimeout(() => {
        console.log('💣 REAL异步阶段1 - 耗时:', performance.now() - start, 'ms');
        
        setTimeout(() => {
          console.log('💣 REAL异步阶段2 - 耗时:', performance.now() - start, 'ms');
          console.log('💣 12ms延迟分析 - 推测是React状态更新触发的useEffect或重渲染');
        }, 10);
      }, 0);
      
      requestAnimationFrame(() => {
        console.log('💣 REAL渲染完成 - 总耗时:', performance.now() - start, 'ms');
      });
    }, [setNewMemo]);
    
    return (
      <div className="flex-shrink-0 p-3 sm:p-4 sm:pb-2 space-y-4">
        <div className="bg-red-50 p-3 rounded border-2 border-red-500">
          <h3 className="font-bold text-red-800 mb-2">🚨 缓存清除 + 终极对比测试</h3>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">🎯 直接React setState（基准测试）</label>
              <textarea
                key={Math.random()} // 强制重新创建
                value={localValue}
                onChange={(e) => directReactTest(e.target.value)}
                placeholder="最原始的React setState..."
                className="w-full p-2 border rounded mt-1"
                rows={2}
              />
              <div className="text-xs text-green-600">字符数: {localValue.length} - 这个应该完全不卡</div>
            </div>
            
            <div>
              <label className="text-sm font-medium">💣 真实setNewMemo（性能监控）</label>
              <textarea
                key={Math.random()} // 强制重新创建
                value={newMemo}
                onChange={(e) => realSetNewMemoWithMonitoring(e.target.value)}
                placeholder="真实setNewMemo + 详细分析..."
                className="w-full p-2 border rounded mt-1"
                rows={2}
              />
              <div className="text-xs text-red-600">字符数: {newMemo.length} - 检查12ms延迟源头</div>
            </div>
          </div>
          
          <div className="text-xs text-orange-600 mt-2 p-2 bg-orange-100 rounded">
            <strong>分析目标：</strong>直接React setState应该 &lt;1ms，如果setNewMemo &gt;10ms，说明props传递链或Index.jsx中有性能瓶颈
          </div>
        </div>
      </div>
    );
  }
  
  if (TEST_MODE === 'direct_bypass') {
    const [localValue, setLocalValue] = React.useState('');
    
    // 创建一个完全绕过外部setNewMemo的版本，直接调用原始React useState
    const handleDirectChange = (e) => {
      const start = performance.now();
      console.log('⚡ DIRECT BYPASS 开始 - 长度:', e.target.value.length, 'Time:', Date.now());
      
      setLocalValue(e.target.value);
      
      const syncTime = performance.now() - start;
      console.log('⚡ DIRECT BYPASS 同步完成 - 耗时:', syncTime, 'ms');
      
      setTimeout(() => {
        console.log('⚡ DIRECT BYPASS 异步完成 - 总耗时:', performance.now() - start, 'ms');
      }, 0);
      
      requestAnimationFrame(() => {
        console.log('⚡ DIRECT BYPASS 渲染完成 - 总耗时:', performance.now() - start, 'ms');
      });
    };
    
    // 测试调用外部setNewMemo但不通过MemoEditor
    const handleExternalCall = (e) => {
      const start = performance.now();
      console.log('🔴 EXTERNAL CALL 开始 - 长度:', e.target.value.length, 'Time:', Date.now());
      
      setNewMemo(e.target.value); // 直接调用外部函数
      
      const syncTime = performance.now() - start;
      console.log('🔴 EXTERNAL CALL 同步完成 - 耗时:', syncTime, 'ms');
      
      setTimeout(() => {
        console.log('🔴 EXTERNAL CALL 异步完成 - 总耗时:', performance.now() - start, 'ms');
      }, 0);
      
      requestAnimationFrame(() => {
        console.log('🔴 EXTERNAL CALL 渲染完成 - 总耗时:', performance.now() - start, 'ms');
      });
    };
    
    return (
      <div className="flex-shrink-0 p-3 sm:p-4 sm:pb-2 space-y-4">
        <div className="bg-green-50 p-3 rounded">
          <h3 className="font-bold text-green-800 mb-2">⚡ 直接绕过测试</h3>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">1. 完全本地React状态（应该不卡）</label>
              <textarea
                value={localValue}
                onChange={handleDirectChange}
                placeholder="完全独立的React状态..."
                className="w-full p-2 border rounded mt-1"
                rows={2}
              />
              <div className="text-xs text-gray-600">字符数: {localValue.length}</div>
            </div>
            
            <div>
              <label className="text-sm font-medium">2. 直接调用外部setNewMemo（如果卡，就是setNewMemo的问题）</label>
              <textarea
                value={newMemo}
                onChange={handleExternalCall}
                placeholder="直接调用外部setNewMemo..."
                className="w-full p-2 border rounded mt-1"
                rows={2}
              />
              <div className="text-xs text-gray-600">字符数: {newMemo.length}</div>
            </div>
          </div>
          
          <div className="text-xs text-orange-600 mt-2">
            如果测试1不卡但测试2卡，说明问题在setNewMemo函数或其触发的连锁反应中
          </div>
        </div>
      </div>
    );
  }
  
  if (TEST_MODE === 'emergency') {
    return (
      <div className="flex-shrink-0 p-3 sm:p-4 sm:pb-2">
        <TestDirectSetNewMemo />
        <div className="mt-2 text-xs text-red-500">
          🚨 紧急调试：如果这个都卡，说明问题在React/浏览器层面
        </div>
      </div>
    );
  }
  
  if (TEST_MODE === 'fix_callback') {
    const [localValue, setLocalValue] = React.useState('');
    
    // 创建一个简单的、非防抖的setNewMemo替代版本
    const simpleSetNewMemo = React.useCallback((value) => {
      console.log('🔥 简单setNewMemo调用 - 开始', value.length);
      const startTime = performance.now();
      
      // 直接调用原始的setNewMemo（绕过防抖）
      // 这里需要访问Index.jsx中的原始setNewMemo，而不是防抖版本
      
      console.log('🔥 简单setNewMemo调用 - 完成，耗时:', performance.now() - startTime, 'ms');
    }, []);
    
    // 测试使用简化版本
    const handleSimple = (e) => {
      console.log('🔥 测试简化版本 - 开始');
      const startTime = performance.now();
      setLocalValue(e.target.value);
      simpleSetNewMemo(e.target.value);
      console.log('🔥 测试简化版本 - 完成，耗时:', performance.now() - startTime, 'ms');
    };
    
    // 测试原始的卡顿版本
    const handleOriginal = (e) => {
      console.log('🔥 测试原始版本 - 开始');
      const startTime = performance.now();
      setNewMemo(e.target.value);
      console.log('🔥 测试原始版本 - 完成，耗时:', performance.now() - startTime, 'ms');
    };
    
    return (
      <div className="flex-shrink-0 p-3 sm:p-4 sm:pb-2 space-y-4">
        <div className="bg-green-50 p-3 rounded">
          <h3 className="font-bold text-green-800 mb-2">🔥 setNewMemo修复测试</h3>
          <p className="text-sm text-green-700 mb-3">问题确认：setNewMemo函数导致卡顿！</p>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">✅ 简化版本（绕过防抖）</label>
              <textarea
                value={localValue}
                onChange={handleSimple}
                placeholder="测试简化版本..."
                className="w-full p-2 border rounded mt-1"
                rows={2}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">❌ 原始版本（卡顿版）</label>
              <textarea
                value={newMemo}
                onChange={handleOriginal}
                placeholder="测试原始版本..."
                className="w-full p-2 border rounded mt-1"
                rows={2}
              />
            </div>
          </div>
          
          <div className="text-xs text-green-600 mt-2">
            如果简化版本不卡，说明问题在防抖逻辑中
          </div>
        </div>
      </div>
    );
  }
  
  if (TEST_MODE === 'callback_test') {
    const [localValue, setLocalValue] = React.useState('');
    
    // 测试1：完全本地状态，不触发任何外部回调
    const handleLocal = (e) => {
      console.log('🔥 本地状态onChange - 开始');
      setLocalValue(e.target.value);
      console.log('🔥 本地状态onChange - 完成');
    };
    
    // 测试2：调用外部setNewMemo，看看是否是这个函数的问题
    const handleExternal = (e) => {
      console.log('🔥 外部setNewMemo onChange - 开始');
      setNewMemo(e.target.value);
      console.log('🔥 外部setNewMemo onChange - 完成');
    };
    
    // 测试3：同时调用，看看是否有交互问题
    const handleBoth = (e) => {
      console.log('🔥 同时调用 onChange - 开始');
      setLocalValue(e.target.value);
      setNewMemo(e.target.value);
      console.log('🔥 同时调用 onChange - 完成');
    };
    
    return (
      <div className="flex-shrink-0 p-3 sm:p-4 sm:pb-2 space-y-4">
        <div className="bg-red-50 p-3 rounded">
          <h3 className="font-bold text-red-800 mb-2">🔥 回调函数测试</h3>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">1. 完全本地状态（不调用外部）</label>
              <textarea
                value={localValue}
                onChange={handleLocal}
                placeholder="测试本地状态..."
                className="w-full p-2 border rounded mt-1"
                rows={2}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">2. 只调用外部setNewMemo</label>
              <textarea
                value={newMemo}
                onChange={handleExternal}
                placeholder="测试外部setNewMemo..."
                className="w-full p-2 border rounded mt-1"
                rows={2}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">3. 同时调用两个</label>
              <textarea
                value={newMemo}
                onChange={handleBoth}
                placeholder="测试同时调用..."
                className="w-full p-2 border rounded mt-1"
                rows={2}
              />
            </div>
          </div>
          
          <div className="text-xs text-red-600 mt-2">
            测试哪个输入框卡，就能定位问题是本地状态还是外部setNewMemo函数
          </div>
        </div>
      </div>
    );
  }
  
  // 🚀 优化模式：使用本地状态 + 防抖更新
  if (TEST_MODE === 'optimized') {
    return (
      <div className="flex-shrink-0 p-3 sm:p-4 sm:pb-2">
        <div className="relative">
          <MemoEditor
            value={localValue}
            onChange={handleChange}
            onSubmit={onAddMemo}
            placeholder="现在的想法是……"
            maxLength={5000}
            showCharCount={true}
            autoFocus={false}
            onFocus={onEditorFocus}
            onBlur={onEditorBlur}
            memosList={allMemos}
            currentMemoId={null}
            backlinks={pendingNewBacklinks}
            onAddBacklink={onAddBacklink}
            onPreviewMemo={onPreviewMemo}
            onRemoveBacklink={onRemoveBacklink}
          />
          <Button
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={() => {
              // 提交时才同步父组件状态
              if (updateTimerRef.current) {
                clearTimeout(updateTimerRef.current);
              }
              if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
              }
              setNewMemo(localValue);
              setTimeout(onAddMemo, 0);
            }}
            disabled={!localValue.trim()}
            className="absolute bottom-12 right-2 rounded-lg bg-slate-600 hover:bg-slate-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white shadow-md px-3 py-2 flex items-center transition-colors"
          >
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 p-3 sm:p-4 sm:pb-2">
      <TestRenderCounter 
        name="MemoInput" 
        trackProps={{
          newMemo长度: newMemo?.length || 0,
          setNewMemo类型: typeof setNewMemo,
          allMemos数量: allMemos?.length || 0,
        }}
      />
      <div className="relative">
        <MemoEditor
          value={newMemo}
          onChange={setNewMemo}
          onSubmit={onAddMemo}
          placeholder="现在的想法是……"
          maxLength={5000}
          showCharCount={true}
          autoFocus={false}
          onFocus={onEditorFocus}
          onBlur={onEditorBlur}
          memosList={allMemos}
          currentMemoId={null}
          backlinks={pendingNewBacklinks}
          onAddBacklink={onAddBacklink}
          onPreviewMemo={onPreviewMemo}
          onRemoveBacklink={onRemoveBacklink}
        />
        <Button
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={onAddMemo}
          disabled={false} // 🔥 临时禁用disabled计算，测试是否是性能瓶颈
          className="absolute bottom-12 right-2 rounded-lg bg-slate-600 hover:bg-slate-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white shadow-md px-3 py-2 flex items-center transition-colors"
        >
          <Send className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>
    </div>
  );
});

MemoInput.displayName = 'MemoInput';

export default MemoInput;