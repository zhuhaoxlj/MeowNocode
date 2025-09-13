import { useState, useEffect } from 'react';
import Head from 'next/head';
import CompleteMemoApp from '../components/nextjs/CompleteMemoApp.jsx';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">正在加载...</p>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <Head>
        <title>MeowNocode - 记忆热力图</title>
        <meta name="description" content="MeowNocode 完整功能版本 - Next.js 驱动，支持热力图、音乐播放、AI对话、画布编辑" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <CompleteMemoApp />
    </>
  );
}
