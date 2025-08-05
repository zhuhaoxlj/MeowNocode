import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Loader2, AlertCircle } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { Dialog, DialogPortal, DialogOverlay, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const AIDialog = ({ isOpen, onClose, memos }) => {
  const { aiConfig } = useSettings();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // 初始化欢迎消息
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: '你好！我是你的AI助手。我可以帮你分析、总结或回答关于你的笔记的问题。请告诉我你需要什么帮助？',
          timestamp: new Date().toISOString()
        }
      ]);
    }
  }, [isOpen, messages.length]);

  // 滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  // 自动调整输入框高度
  const adjustTextareaHeight = () => {
    const textarea = document.querySelector('.ai-dialog-textarea');
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      // 限制最大高度为3行（约120px）
      const newHeight = Math.min(scrollHeight, 120);
      textarea.style.height = `${newHeight}px`;
    }
  };

  // 监听输入内容变化，调整输入框高度
  useEffect(() => {
    adjustTextareaHeight();
  }, [inputMessage]);

  // 处理发送消息
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    // 检查AI配置
    if (!aiConfig.enabled || !aiConfig.baseUrl || !aiConfig.apiKey) {
      setError('请先在设置中启用AI功能并配置API');
      return;
    }

    // 清除之前的错误
    setError(null);

    // 创建新的AbortController
    abortControllerRef.current = new AbortController();

    // 添加用户消息
    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setStreamingMessage('');

    try {
      // 准备对话历史
      const conversationHistory = [
        {
          role: 'system',
          content: `你是一个专业的笔记助手，可以帮助用户分析、总结或回答关于笔记的问题。
          
用户的笔记内容如下：
${memos.map(memo => `- ${memo.content}`).join('\n')}

请根据这些笔记内容回答用户的问题，提供有用的分析和建议。`
        },
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: inputMessage
        }
      ];

      // 调用AI API
      const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiConfig.apiKey}`
        },
        body: JSON.stringify({
          model: aiConfig.model || 'gpt-3.5-turbo',
          messages: conversationHistory,
          stream: true
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'AI请求失败');
      }

      // 处理流式响应
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiResponseContent = '';
      let buffer = ''; // 用于处理不完整的JSON数据

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // 按行分割，保留最后一个可能不完整的行
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              // 流式响应结束
              if (aiResponseContent) {
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: aiResponseContent,
                  timestamp: new Date().toISOString()
                }]);
              }
              setStreamingMessage('');
              break;
            }
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              aiResponseContent += content;
              setStreamingMessage(aiResponseContent);
            } catch (e) {
              // 忽略解析错误，可能是流式数据不完整
            }
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        // 用户主动取消，不显示错误
        return;
      }
      
      console.error('AI对话失败:', error);
      const errorMessage = error.message || '抱歉，我遇到了一些问题。请检查你的AI配置或稍后再试。';
      setError(errorMessage);
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date().toISOString()
      }]);
      
      toast.error('AI对话失败: ' + errorMessage);
    } finally {
      setIsLoading(false);
      setStreamingMessage('');
      abortControllerRef.current = null;
    }
  };

  // 取消正在进行的请求
  const cancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setStreamingMessage('');
      abortControllerRef.current = null;
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 对话框关闭时取消请求
  useEffect(() => {
    if (!isOpen) {
      cancelRequest();
    }
  }, [isOpen]);

  // 格式化时间
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="bg-black/20 backdrop-blur-sm" />
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border dark:border-gray-700 [&>button]:hidden">
          <div className="flex flex-col h-full pt-2 relative">
            {/* 关闭按钮 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-2 right-4 z-10 h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          {/* 消息区域 */}
          <ScrollArea className="flex-1 p-4 max-h-[60vh] overflow-y-auto scrollbar-transparent">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex gap-3",
                    message.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-3 py-2",
                      message.role === 'user'
                        ? "bg-indigo-500 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    )}
                  >
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                    <div className="text-xs opacity-70 mt-1">
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center">
                      <span className="text-white text-sm font-medium">你</span>
                    </div>
                  )}
                </div>
              ))}
              
              {/* 正在加载的消息 */}
              {isLoading && !streamingMessage && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                  </div>
                  <div className="max-w-[80%] rounded-lg px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[40px] flex items-center">
                    <div className="text-sm flex items-center justify-center w-full">
                      <span className="flex space-x-1">
                        <span className="inline-block w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="inline-block w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="inline-block w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* 流式消息 */}
              {streamingMessage && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                  </div>
                  <div className="max-w-[80%] rounded-lg px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                    <div className="text-sm whitespace-pre-wrap">{streamingMessage}</div>
                    {isLoading && (
                      <div className="flex items-center gap-1 mt-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span className="text-xs opacity-70">正在输入...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          {/* 错误提示 */}
          {error && (
            <div className="mx-4 mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
            </div>
          )}
          
          {/* 输入区域 */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入你的问题..."
                className="flex-1 resize-none pr-10 ai-dialog-textarea scrollbar-transparent"
                rows={1}
                disabled={isLoading}
                style={{ minHeight: '40px', maxHeight: '120px' }}
              />
              <Button
                onClick={isLoading ? cancelRequest : handleSendMessage}
                disabled={!inputMessage.trim() && !isLoading}
                size="icon"
                className="absolute top-1/2 right-2 h-8 w-8 -translate-y-1/2"
                variant="ghost"
              >
                {isLoading ? (
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full border-2 border-current"></div>
                      <div className="absolute w-1.5 h-1.5 bg-current rounded-sm"></div>
                    </div>
                    <div className="w-4 h-4"></div>
                  </div>
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
    </Dialog>
  );
};

export default AIDialog;