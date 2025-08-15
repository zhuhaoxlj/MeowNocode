import React, { useState } from 'react';

/**
 * Spoiler 组件
 * props:
 * - text: string 要隐藏/显示的内容
 * - styleType: 'blur' | 'box' 显示风格
 * - color: string | undefined 仅在 styleType==='box' 时使用，矩形遮罩颜色
 * 交互：
 * - 初始隐藏；悬停临时显示；点击切换锁定显示/隐藏
 */
const Spoiler = ({ text = '', styleType = 'blur', color }) => {
  const [revealed, setRevealed] = useState(false);
  const [hovered, setHovered] = useState(false);

  const isVisible = revealed || hovered;

  const commonHandlers = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    onClick: (e) => { e.stopPropagation(); setRevealed(v => !v); },
    role: 'button',
    tabIndex: 0,
  onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setRevealed(v => !v); } },
    className: 'inline-block align-baseline cursor-pointer transition-all duration-150',
  };

  if (styleType === 'box') {
    const boxColor = color || '#000';
    return (
      <span
        {...commonHandlers}
        style={
          isVisible
            ? { backgroundColor: 'transparent' }
            : { backgroundColor: boxColor, borderRadius: 4, padding: '0.1em 0.25em' }
        }
      >
        <span
          style={{
            color: isVisible ? 'inherit' : 'transparent',
            // 保持占位尺寸，避免布局抖动
            textShadow: isVisible ? 'none' : '0 0 0 transparent',
          }}
        >
          {text}
        </span>
      </span>
    );
  }

  // 默认风格：模糊
  return (
    <span {...commonHandlers}>
      <span
        style={{
          filter: isVisible ? 'none' : 'blur(5px)',
          transition: 'filter 150ms ease',
        }}
      >
        {text}
      </span>
    </span>
  );
};

export default Spoiler;
