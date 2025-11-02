import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="zh-CN">
      <Head>
        {/* DNS 预解析和预连接 - 优化网络请求性能 */}
        <link rel="preconnect" href="https://v1.hitokoto.cn" />
        <link rel="preconnect" href="http://111.170.174.134:18081" />
        <link rel="dns-prefetch" href="https://bmp.ovh" />

        {/* 预加载关键 API */}
        <link
          rel="preload"
          href="/api/auth-status"
          as="fetch"
          crossOrigin="anonymous"
        />

        {/* 字体优化 - 使用 font-display: swap 防止布局偏移 */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @font-face {
              font-family: system-ui;
              font-display: swap;
            }
          `
        }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
