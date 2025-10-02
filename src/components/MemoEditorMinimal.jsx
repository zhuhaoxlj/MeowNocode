import React, { useState, useRef, useCallback } from 'react';

/**
 * 🔍 极简版 MemoEditor - 逐步添加业务逻辑来排查性能瓶颈
 * 
 * 🎯 渐进式测试方案（排除法找出卡顿原因）：
 * 
 * ✅ LEVEL 0.0: 完全本地状态（已确认流畅）
 * 
 * LEVEL 0.1: + 调用外部onChange（但onChange内部为空）
 * LEVEL 0.2: + onChange内部console.log
 * LEVEL 0.3: + onChange内部performance.now()监控
 * LEVEL 0.4: + onChange内部setLocalValue（MemoInput本地状态）
 * LEVEL 0.5: + pendingValueRef + cancelAnimationFrame
 * LEVEL 0.6: + requestAnimationFrame调度
 * LEVEL 0.7: + RAF内部setNewMemo（父组件状态更新）
 * LEVEL 1.0: 完整业务逻辑（原始版本）
 * 
 * 🔬 测试方法：从0.1开始，每个级别都快速打字测试
 * 找到第一个开始卡顿的级别 = 找到性能瓶颈！
 */

const TEST_LEVEL = 0.1; // 🔧 修改这个值来测试 - 从0.1开始逐步测试

const MemoEditorMinimal = ({
  value = '',
  onChange,
  placeholder = '现在的想法是……',
  disabled = false,
}) => {
  const textareaRef = useRef(null);
  const [charCount, setCharCount] = useState(0);
  
  // 🔥 Level 0.x: 渐进式增加业务逻辑
  const [localValue, setLocalValue] = useState('');
  const pendingValueRef = useRef(null);
  const rafRef = useRef(null);

  // ============ LEVEL 0.0: 完全独立的本地状态（基线，已确认流畅）============
  if (TEST_LEVEL === 0 || TEST_LEVEL === 0.0) {
    return (
      <div style={{ padding: '20px', background: '#e8f5e9', borderRadius: '8px', border: '3px solid #4caf50' }}>
        <div style={{ marginBottom: '10px', color: '#2e7d32', fontWeight: 'bold', fontSize: '16px' }}>
          ✅ Level 0.0: 完全独立本地状态（已确认流畅✨）
        </div>
        <textarea
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '12px',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#2e7d32', fontWeight: 'bold' }}>
          字符数: {localValue.length} | ✅ 零业务逻辑基线
        </div>
      </div>
    );
  }

  // ============ LEVEL 0.1: + 调用外部onChange（测试函数调用开销）============
  if (TEST_LEVEL === 0.1) {
    return (
      <div style={{ padding: '20px', background: '#e3f2fd', borderRadius: '8px', border: '2px solid #2196f3' }}>
        <div style={{ marginBottom: '10px', color: '#1565c0', fontWeight: 'bold', fontSize: '16px' }}>
          🔬 Level 0.1: + 调用外部onChange（测试函数调用本身的开销）
        </div>
        <textarea
          value={localValue}
          onChange={(e) => {
            const newValue = e.target.value;
            setLocalValue(newValue);
            // 调用外部onChange，但MemoInput的handleChange会执行
            onChange?.(newValue);
          }}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '12px',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#1565c0' }}>
          字符数: {localValue.length} | 🔬 测试：如果这个卡 → 问题在handleChange内部
        </div>
      </div>
    );
  }

  // ============ LEVEL 0.2: 模拟handleChange的console.log ============
  if (TEST_LEVEL === 0.2) {
    return (
      <div style={{ padding: '20px', background: '#fff3e0', borderRadius: '8px', border: '2px solid #ff9800' }}>
        <div style={{ marginBottom: '10px', color: '#e65100', fontWeight: 'bold', fontSize: '16px' }}>
          🔬 Level 0.2: + console.log性能监控代码
        </div>
        <textarea
          value={localValue}
          onChange={(e) => {
            const newValue = e.target.value;
            console.log('🔍 [Level 0.2] handleChange 开始, 值长度:', newValue.length);
            setLocalValue(newValue);
            onChange?.(newValue);
          }}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '12px',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#e65100' }}>
          字符数: {localValue.length} | 🔬 测试：如果这个卡 → console.log过多导致
        </div>
      </div>
    );
  }

  // ============ LEVEL 0.3: + performance.now()监控 ============
  if (TEST_LEVEL === 0.3) {
    return (
      <div style={{ padding: '20px', background: '#fce4ec', borderRadius: '8px', border: '2px solid #e91e63' }}>
        <div style={{ marginBottom: '10px', color: '#c2185b', fontWeight: 'bold', fontSize: '16px' }}>
          🔬 Level 0.3: + performance.now()性能监控
        </div>
        <textarea
          value={localValue}
          onChange={(e) => {
            const start = performance.now();
            const newValue = e.target.value;
            console.log('🔍 [Level 0.3] 开始, 值长度:', newValue.length);
            
            setLocalValue(newValue);
            const step1 = performance.now();
            console.log(`🔍 [Level 0.3] setLocalValue 耗时: ${(step1 - start).toFixed(2)}ms`);
            
            onChange?.(newValue);
            console.log(`🔍 [Level 0.3] 总耗时: ${(performance.now() - start).toFixed(2)}ms\n`);
          }}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '12px',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#c2185b' }}>
          字符数: {localValue.length} | 🔬 测试：如果这个卡 → performance监控代码导致
        </div>
      </div>
    );
  }

  // ============ LEVEL 0.4: 使用真实的value（模拟MemoInput的localValue）============
  if (TEST_LEVEL === 0.4) {
    return (
      <div style={{ padding: '20px', background: '#f3e5f5', borderRadius: '8px', border: '2px solid #9c27b0' }}>
        <div style={{ marginBottom: '10px', color: '#6a1b9a', fontWeight: 'bold', fontSize: '16px' }}>
          🔬 Level 0.4: 使用外部value（模拟MemoInput.localValue → handleChange → setLocalValue循环）
        </div>
        <textarea
          value={value}
          onChange={(e) => {
            const start = performance.now();
            const newValue = e.target.value;
            console.log('🔍 [Level 0.4] 开始, 值长度:', newValue.length);
            
            onChange?.(newValue);
            
            console.log(`🔍 [Level 0.4] 总耗时: ${(performance.now() - start).toFixed(2)}ms\n`);
          }}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '12px',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#6a1b9a' }}>
          字符数: {value.length} | 🔬 测试：如果这个卡 → value prop更新导致重渲染问题
        </div>
      </div>
    );
  }

  // ============ LEVEL 0.5: + pendingValueRef和cancelAnimationFrame ============
  if (TEST_LEVEL === 0.5) {
    return (
      <div style={{ padding: '20px', background: '#fff8e1', borderRadius: '8px', border: '2px solid #fbc02d' }}>
        <div style={{ marginBottom: '10px', color: '#f57f17', fontWeight: 'bold', fontSize: '16px' }}>
          🔬 Level 0.5: + pendingValueRef + cancelAnimationFrame逻辑
        </div>
        <textarea
          value={value}
          onChange={(e) => {
            const start = performance.now();
            const newValue = e.target.value;
            console.log('🔍 [Level 0.5] 开始, 值长度:', newValue.length);
            
            // 模拟MemoInput的RAF准备工作
            pendingValueRef.current = newValue;
            if (rafRef.current) {
              cancelAnimationFrame(rafRef.current);
              console.log('🔍 [Level 0.5] 取消了之前的RAF');
            }
            
            onChange?.(newValue);
            
            console.log(`🔍 [Level 0.5] 总耗时: ${(performance.now() - start).toFixed(2)}ms\n`);
          }}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '12px',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#f57f17' }}>
          字符数: {value.length} | 🔬 测试：如果这个卡 → RAF调度准备工作导致
        </div>
      </div>
    );
  }

  // ============ LEVEL 0.6: + requestAnimationFrame调度（但不更新父状态）============
  if (TEST_LEVEL === 0.6) {
    return (
      <div style={{ padding: '20px', background: '#e0f2f1', borderRadius: '8px', border: '2px solid #00897b' }}>
        <div style={{ marginBottom: '10px', color: '#00695c', fontWeight: 'bold', fontSize: '16px' }}>
          🔬 Level 0.6: + requestAnimationFrame调度（不更新父状态）
        </div>
        <textarea
          value={value}
          onChange={(e) => {
            const start = performance.now();
            const newValue = e.target.value;
            console.log('🔍 [Level 0.6] 开始, 值长度:', newValue.length);
            
            onChange?.(newValue);
            
            // 使用RAF但不做任何事
            pendingValueRef.current = newValue;
            if (rafRef.current) {
              cancelAnimationFrame(rafRef.current);
            }
            
            rafRef.current = requestAnimationFrame(() => {
              const rafStart = performance.now();
              console.log(`🔍 [Level 0.6] RAF执行，但不更新状态`);
              console.log(`🔍 [Level 0.6] RAF耗时: ${(performance.now() - rafStart).toFixed(2)}ms`);
            });
            
            console.log(`🔍 [Level 0.6] 同步耗时: ${(performance.now() - start).toFixed(2)}ms\n`);
          }}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '12px',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#00695c' }}>
          字符数: {value.length} | 🔬 测试：如果这个卡 → RAF调度本身导致
        </div>
      </div>
    );
  }

  // ============ LEVEL 0.7: 完整RAF + setNewMemo（完整业务逻辑）============
  if (TEST_LEVEL === 0.7) {
    return (
      <div style={{ padding: '20px', background: '#ffebee', borderRadius: '8px', border: '3px solid #d32f2f' }}>
        <div style={{ marginBottom: '10px', color: '#c62828', fontWeight: 'bold', fontSize: '16px' }}>
          🔬 Level 0.7: 完整RAF + 父状态更新（完整业务逻辑）
        </div>
        <textarea
          value={value}
          onChange={(e) => {
            const start = performance.now();
            const newValue = e.target.value;
            console.log('🔍 [Level 0.7] 开始, 值长度:', newValue.length);
            
            onChange?.(newValue); // 这会触发MemoInput的setLocalValue
            
            // 完整的RAF + setNewMemo逻辑
            pendingValueRef.current = newValue;
            if (rafRef.current) {
              cancelAnimationFrame(rafRef.current);
            }
            
            rafRef.current = requestAnimationFrame(() => {
              const rafStart = performance.now();
              if (pendingValueRef.current !== null) {
                // 这里会触发setNewMemo，导致父组件重渲染
                console.log(`🔍 [Level 0.7] RAF内部，准备更新父状态`);
                pendingValueRef.current = null;
              }
              console.log(`🔍 [Level 0.7] RAF耗时: ${(performance.now() - rafStart).toFixed(2)}ms`);
            });
            
            console.log(`🔍 [Level 0.7] 同步耗时: ${(performance.now() - start).toFixed(2)}ms\n`);
          }}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '12px',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#c62828', fontWeight: 'bold' }}>
          字符数: {value.length} | 🔬 关键测试：如果这个卡 → setNewMemo触发父组件重渲染导致！
        </div>
      </div>
    );
  }

  // ============ LEVEL 1: 最基础的 textarea ============
  if (TEST_LEVEL === 1) {
    console.log('📝 [Level 1] 纯 textarea，但会调用onChange（触发业务逻辑）');
    return (
      <div style={{ padding: '20px', background: '#f0f0f0', borderRadius: '8px' }}>
        <div style={{ marginBottom: '10px', color: '#00a67d', fontWeight: 'bold' }}>
          ✅ Level 1: 纯 textarea（会触发MemoInput的handleChange业务逻辑）
        </div>
        <textarea
          value={value}
          onChange={(e) => {
            console.log('📝 [Level 1] 调用onChange，触发业务逻辑');
            onChange?.(e.target.value);
          }}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '12px',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
      </div>
    );
  }

  // ============ LEVEL 2: + onChange + 性能日志 ============
  if (TEST_LEVEL === 2) {
    const handleChange = useCallback((e) => {
      const start = performance.now();
      const newValue = e.target.value;
      
      onChange?.(newValue);
      
      const elapsed = performance.now() - start;
      console.log(`📝 [Level 2] onChange 耗时: ${elapsed.toFixed(2)}ms`);
    }, [onChange]);

    return (
      <div style={{ padding: '20px', background: '#f0f8ff', borderRadius: '8px' }}>
        <div style={{ marginBottom: '10px', color: '#0066cc', fontWeight: 'bold' }}>
          ✅ Level 2: + onChange 回调 + 性能监控
        </div>
        <textarea
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '12px',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
          打开控制台查看性能日志
        </div>
      </div>
    );
  }

  // ============ LEVEL 3: + 字符计数 ============
  if (TEST_LEVEL === 3) {
    const handleChange = useCallback((e) => {
      const start = performance.now();
      const newValue = e.target.value;
      
      // 计算字符数
      setCharCount(newValue.length);
      
      onChange?.(newValue);
      
      const elapsed = performance.now() - start;
      console.log(`📝 [Level 3] onChange + 字符计数耗时: ${elapsed.toFixed(2)}ms`);
    }, [onChange]);

    return (
      <div style={{ padding: '20px', background: '#fff5e6', borderRadius: '8px' }}>
        <div style={{ marginBottom: '10px', color: '#cc6600', fontWeight: 'bold' }}>
          ✅ Level 3: + 字符计数
        </div>
        <textarea
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '12px',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
          字符数: {charCount} | 查看控制台性能日志
        </div>
      </div>
    );
  }

  // ============ LEVEL 4: + 自动高度调整 ============
  if (TEST_LEVEL === 4) {
    const adjustHeight = useCallback(() => {
      const start = performance.now();
      
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        textarea.style.height = 'auto';
        const newHeight = Math.max(120, Math.min(400, textarea.scrollHeight));
        textarea.style.height = newHeight + 'px';
      }
      
      const elapsed = performance.now() - start;
      console.log(`📝 [Level 4] 高度调整耗时: ${elapsed.toFixed(2)}ms`);
    }, []);

    const handleChange = useCallback((e) => {
      const start = performance.now();
      const newValue = e.target.value;
      
      setCharCount(newValue.length);
      onChange?.(newValue);
      
      // 🔍 测试：每次输入都调整高度（可能是性能瓶颈）
      adjustHeight();
      
      const elapsed = performance.now() - start;
      console.log(`📝 [Level 4] 总耗时: ${elapsed.toFixed(2)}ms`);
    }, [onChange, adjustHeight]);

    return (
      <div style={{ padding: '20px', background: '#f0fff0', borderRadius: '8px' }}>
        <div style={{ marginBottom: '10px', color: '#006600', fontWeight: 'bold' }}>
          ✅ Level 4: + 自动高度调整（每次输入都调整）
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%',
            minHeight: '120px',
            maxHeight: '400px',
            padding: '12px',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            resize: 'none',
            fontFamily: 'inherit',
            overflow: 'hidden',
          }}
        />
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
          字符数: {charCount} | 高度自动调整 | 查看控制台
        </div>
      </div>
    );
  }

  // ============ LEVEL 5: + CSS 过渡动画 ============
  if (TEST_LEVEL === 5) {
    const [isFocused, setIsFocused] = useState(false);
    
    const adjustHeight = useCallback(() => {
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        textarea.style.height = 'auto';
        const newHeight = Math.max(120, Math.min(400, textarea.scrollHeight));
        textarea.style.height = newHeight + 'px';
      }
    }, []);

    const handleChange = useCallback((e) => {
      const start = performance.now();
      const newValue = e.target.value;
      
      setCharCount(newValue.length);
      onChange?.(newValue);
      adjustHeight();
      
      const elapsed = performance.now() - start;
      console.log(`📝 [Level 5] 总耗时: ${elapsed.toFixed(2)}ms`);
    }, [onChange, adjustHeight]);

    return (
      <div style={{ padding: '20px', background: '#fff0f5', borderRadius: '8px' }}>
        <div style={{ marginBottom: '10px', color: '#cc0066', fontWeight: 'bold' }}>
          ✅ Level 5: + CSS 过渡动画（可能导致视觉卡顿）
        </div>
        <div
          style={{
            border: isFocused ? '2px solid #4CAF50' : '1px solid #ccc',
            borderRadius: '8px',
            background: 'white',
            transition: 'all 0.2s ease', // 🔍 过渡动画可能是卡顿原因
            boxShadow: isFocused ? '0 0 0 3px rgba(76, 175, 80, 0.1)' : 'none',
          }}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            style={{
              width: '100%',
              minHeight: '120px',
              maxHeight: '400px',
              padding: '12px',
              fontSize: '14px',
              border: 'none',
              borderRadius: '8px',
              resize: 'none',
              fontFamily: 'inherit',
              overflow: 'hidden',
              outline: 'none',
            }}
          />
          <div style={{
            padding: '8px 12px',
            borderTop: '1px solid #f0f0f0',
            fontSize: '12px',
            color: '#666',
            background: '#fafafa',
          }}>
            字符数: {charCount}
          </div>
        </div>
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#999' }}>
          🔍 如果这个级别卡，可能是 CSS transition 导致的视觉延迟
        </div>
      </div>
    );
  }

  // ============ LEVEL 6: 无过渡动画版本 ============
  if (TEST_LEVEL === 6) {
    const [isFocused, setIsFocused] = useState(false);
    
    const adjustHeight = useCallback(() => {
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        textarea.style.height = 'auto';
        const newHeight = Math.max(120, Math.min(400, textarea.scrollHeight));
        textarea.style.height = newHeight + 'px';
      }
    }, []);

    const handleChange = useCallback((e) => {
      const start = performance.now();
      const newValue = e.target.value;
      
      setCharCount(newValue.length);
      onChange?.(newValue);
      adjustHeight();
      
      const elapsed = performance.now() - start;
      console.log(`📝 [Level 6] 总耗时: ${elapsed.toFixed(2)}ms`);
    }, [onChange, adjustHeight]);

    return (
      <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
        <div style={{ marginBottom: '10px', color: '#333', fontWeight: 'bold' }}>
          ✅ Level 6: 移除所有过渡动画（对比 Level 5）
        </div>
        <div
          style={{
            border: isFocused ? '2px solid #4CAF50' : '1px solid #ccc',
            borderRadius: '8px',
            background: 'white',
            // 🔍 移除 transition
            boxShadow: isFocused ? '0 0 0 3px rgba(76, 175, 80, 0.1)' : 'none',
          }}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            style={{
              width: '100%',
              minHeight: '120px',
              maxHeight: '400px',
              padding: '12px',
              fontSize: '14px',
              border: 'none',
              borderRadius: '8px',
              resize: 'none',
              fontFamily: 'inherit',
              overflow: 'hidden',
              outline: 'none',
            }}
          />
          <div style={{
            padding: '8px 12px',
            borderTop: '1px solid #f0f0f0',
            fontSize: '12px',
            color: '#666',
            background: '#fafafa',
          }}>
            字符数: {charCount}
          </div>
        </div>
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#999' }}>
          🔍 如果 Level 5 卡但 Level 6 不卡 → CSS transition 是问题
        </div>
      </div>
    );
  }

  // 默认返回
  return <div>请设置 TEST_LEVEL (1-6)</div>;
};

MemoEditorMinimal.displayName = 'MemoEditorMinimal';

export default MemoEditorMinimal;
