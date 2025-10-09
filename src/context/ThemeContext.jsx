
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(false);
  const [themeColor, setThemeColor] = useState('#818CF8');
  const [currentFont, setCurrentFont] = useState('default');

  // 字体URL配置
  const fontUrls = {
    jinghua: 'https://pic.oneloved.top/2025-07/songti_1753944378889.ttf',
    lxgw: 'https://pic.oneloved.top/2025-07/LXGWWenKai-Regular_1753944392267.ttf',
    kongshan: 'https://pic.oneloved.top/2025-07/kongshan_1753944354149.ttf'
  };

  // 预加载当前选择的字体（按需预加载）
  useEffect(() => {
    // 移除之前的预加载链接
    const existingPreloads = document.querySelectorAll('link[rel="preload"][as="font"][data-custom-font]');
    existingPreloads.forEach(link => link.remove());

    // 只预加载当前选择的字体
    if (currentFont !== 'default' && fontUrls[currentFont]) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = fontUrls[currentFont];
      link.as = 'font';
      link.crossOrigin = 'anonymous';
      link.setAttribute('data-custom-font', currentFont);
      document.head.appendChild(link);
    }
  }, [currentFont]);

  useEffect(() => {
    // 从localStorage加载主题设置
    const savedDarkMode = localStorage.getItem('darkMode');
    const savedThemeColor = localStorage.getItem('themeColor');
    const savedFontConfig = localStorage.getItem('fontConfig');

    if (savedDarkMode !== null) {
      setDarkMode(JSON.parse(savedDarkMode));
    }
    if (savedThemeColor !== null) {
      setThemeColor(savedThemeColor);
    }
    if (savedFontConfig !== null) {
      try {
        const fontConfig = JSON.parse(savedFontConfig);
        setCurrentFont(fontConfig.selectedFont || 'default');
      } catch (error) {
        console.warn('Failed to parse font config:', error);
      }
    }
  }, []);

  useEffect(() => {
    // 保存主题设置到localStorage
    localStorage.setItem('darkMode', JSON.stringify(darkMode));

    // 切换html元素的类名
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  try { window.dispatchEvent(new CustomEvent('app:dataChanged', { detail: { part: 'theme.darkMode' } })); } catch {}
  }, [darkMode]);

  useEffect(() => {
    // 保存主题色设置到localStorage
    localStorage.setItem('themeColor', themeColor);

    // 应用主题色到CSS变量
    document.documentElement.style.setProperty('--theme-color', themeColor);

    // 将主题色转换为HSL格式并应用到ring变量
    const hexToHsl = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h, s, l = (max + min) / 2;

      if (max === min) {
        h = s = 0;
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }

      return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
    };

    try {
      const [h, s, l] = hexToHsl(themeColor);
      document.documentElement.style.setProperty('--ring', `${h} ${s}% ${l}%`);

      // 设置文本选择颜色
      const hexToRgba = (hex, alpha = 0.2) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      };

      // 创建动态样式
      let styleElement = document.getElementById('theme-selection-style');
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'theme-selection-style';
        document.head.appendChild(styleElement);
      }

      styleElement.textContent = `
        .theme-selection::selection {
          background-color: ${hexToRgba(themeColor, 0.2)};
          color: ${themeColor};
        }
        .theme-selection::-moz-selection {
          background-color: ${hexToRgba(themeColor, 0.2)};
          color: ${themeColor};
        }
      `;
    } catch (error) {
      console.warn('Invalid color format:', themeColor);
    }
  try { window.dispatchEvent(new CustomEvent('app:dataChanged', { detail: { part: 'theme.color' } })); } catch {}
  }, [themeColor]);

  // 监听字体配置变化 - 使用定时器检查localStorage变化
  useEffect(() => {
    const checkFontConfig = () => {
      try {
        const savedFontConfig = localStorage.getItem('fontConfig');
        if (savedFontConfig) {
          const fontConfig = JSON.parse(savedFontConfig);
          const newFont = fontConfig.selectedFont || 'default';
          if (newFont !== currentFont) {
            setCurrentFont(newFont);
          }
        }
      } catch (error) {
        console.warn('Failed to parse font config:', error);
      }
    };

    // 每500ms检查一次字体配置变化
    const interval = setInterval(checkFontConfig, 500);
    return () => clearInterval(interval);
  }, [currentFont]);

  // 应用字体设置
  useEffect(() => {
    // 移除之前的字体样式
    const existingFontStyle = document.getElementById('custom-font-style');
    if (existingFontStyle) {
      existingFontStyle.remove();
    }

    if (currentFont !== 'default' && fontUrls[currentFont]) {
      // 创建字体样式
      const fontStyle = document.createElement('style');
      fontStyle.id = 'custom-font-style';

      const fontFamilyName = `CustomFont-${currentFont}`;

      fontStyle.textContent = `
        @font-face {
          font-family: '${fontFamilyName}';
          src: url('${fontUrls[currentFont]}') format('truetype');
          font-display: swap;
        }

        .custom-font-content,
        .custom-font-content * {
          font-family: '${fontFamilyName}', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif !important;
        }

        /* 确保编辑器字体应用 */
        .custom-font-content textarea,
        .custom-font-content input,
        .custom-font-content p,
        .custom-font-content div,
        .custom-font-content span {
          font-family: '${fontFamilyName}', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif !important;
        }
      `;

      document.head.appendChild(fontStyle);
    }
  }, [currentFont]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const updateThemeColor = (color) => {
    setThemeColor(color);
  };

  return (
    <ThemeContext.Provider value={{
      darkMode,
      toggleDarkMode,
      themeColor,
      updateThemeColor,
      currentFont
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

