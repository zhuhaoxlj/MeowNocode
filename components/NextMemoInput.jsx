/**
 * Next.js 版本的备忘录输入组件
 * 使用新的 API 客户端
 */

import { useState } from 'react';
import { Button } from '../src/components/ui/button';
import { Textarea } from '../src/components/ui/textarea';
import { Badge } from '../src/components/ui/badge';
import { ImageUpload } from '../src/components/ImageUpload';
import { nextApiClient } from '../lib/client/nextApiClient';
import { toast } from 'sonner';
import { PlusIcon, ImageIcon, TagIcon } from 'lucide-react';

export function NextMemoInput({ onMemoCreated, onTagsUpdate }) {
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // 处理提交
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast.error('请输入备忘录内容');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const memo = await nextApiClient.createMemo({
        content: content.trim(),
        tags,
        pinned: false
      });

      // 清空输入
      setContent('');
      setTags([]);
      setShowImageUpload(false);
      setShowTagInput(false);
      
      toast.success('备忘录创建成功');
      
      if (onMemoCreated) {
        onMemoCreated(memo);
      }

    } catch (error) {
      toast.error(`创建失败: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理图片上传
  const handleImageUpload = async (files) => {
    try {
      const uploadPromises = files.map(file => 
        nextApiClient.uploadAttachment(file)
      );
      
      const attachments = await Promise.all(uploadPromises);
      
      // 在内容中插入图片引用
      const imageReferences = attachments.map(att => 
        `![${att.filename}](./local/${att.id})`
      ).join('\n');
      
      setContent(prev => prev + (prev ? '\n\n' : '') + imageReferences);
      toast.success(`成功上传 ${files.length} 张图片`);
      
    } catch (error) {
      toast.error(`图片上传失败: ${error.message}`);
    }
  };

  // 添加标签
  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      const newTags = [...tags, tag];
      setTags(newTags);
      setTagInput('');
      
      if (onTagsUpdate) {
        onTagsUpdate(newTags);
      }
    }
  };

  // 删除标签
  const removeTag = (tagToRemove) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    
    if (onTagsUpdate) {
      onTagsUpdate(newTags);
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-card">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 主要输入区域 */}
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="写点什么... (Ctrl/Cmd + Enter 快速提交)"
          className="min-h-[100px] resize-none"
          disabled={isSubmitting}
        />

        {/* 标签显示 */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <Badge 
                key={tag} 
                variant="secondary" 
                className="cursor-pointer"
                onClick={() => removeTag(tag)}
              >
                {tag} ×
              </Badge>
            ))}
          </div>
        )}

        {/* 标签输入 */}
        {showTagInput && (
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
                if (e.key === 'Escape') {
                  setShowTagInput(false);
                  setTagInput('');
                }
              }}
              placeholder="输入标签名..."
              className="flex-1 px-3 py-1 border rounded text-sm"
              autoFocus
            />
            <Button 
              type="button"
              size="sm"
              onClick={addTag}
              disabled={!tagInput.trim()}
            >
              添加
            </Button>
          </div>
        )}

        {/* 图片上传区域 */}
        {showImageUpload && (
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-4">
            <ImageUpload
              onImagesSelected={handleImageUpload}
              multiple
              accept="image/*"
            />
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowImageUpload(!showImageUpload)}
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              图片
            </Button>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowTagInput(!showTagInput)}
            >
              <TagIcon className="w-4 h-4 mr-2" />
              标签
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setContent('');
                setTags([]);
                setShowImageUpload(false);
                setShowTagInput(false);
              }}
              disabled={isSubmitting || (!content && tags.length === 0)}
            >
              清空
            </Button>
            
            <Button
              type="submit"
              disabled={isSubmitting || !content.trim()}
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              {isSubmitting ? '创建中...' : '创建备忘录'}
            </Button>
          </div>
        </div>
      </form>

      {/* 快捷键提示 */}
      <div className="text-xs text-muted-foreground mt-2">
        <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl</kbd> + 
        <kbd className="px-2 py-1 bg-muted rounded text-xs mx-1">Enter</kbd> 
        快速提交
      </div>
    </div>
  );
}