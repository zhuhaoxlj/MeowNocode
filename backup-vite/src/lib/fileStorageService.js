import s3StorageService from './s3Storage';
import largeFileStorage from './largeFileStorage';
import { toast } from 'sonner';

// 统一文件处理服务
class FileStorageService {
  constructor() {
    this.config = null;
  }

  // 初始化配置
  init(config) {
    this.config = config;
    if (config.enabled) {
      s3StorageService.init(config);
    }
  }

  // 检查是否启用了S3
  isS3Enabled() {
    return this.config && this.config.enabled;
  }

  // 获取文件大小阈值（1MB）
  getSizeThreshold() {
    return 1 * 1024 * 1024; // 1MB
  }

  // 处理文件上传（统一入口）
  async processFile(file, options = {}) {
    const { type = 'file', onProgress } = options;
    const fileSize = file.size;
    const threshold = this.getSizeThreshold();

    try {
      // 显示开始处理提示
      if (onProgress) onProgress('start', 0);
      
      let result;
      
      if (this.isS3Enabled() && fileSize >= threshold) {
        // 大文件且启用了S3 -> 上传到S3
        result = await this.uploadToS3(file, { type, onProgress });
      } else if (fileSize >= 5 * 1024 * 1024) {
        // 大文件但未启用S3 -> 使用IndexedDB
        result = await this.uploadToIndexedDB(file, { type, onProgress });
      } else {
        // 小文件 -> 使用Base64
        result = await this.uploadToBase64(file, { type, onProgress });
      }

      // 显示完成提示
      if (onProgress) onProgress('complete', 100);
      
      return result;
    } catch (error) {
      console.error('File processing failed:', error);
      if (onProgress) onProgress('error', 0);
      throw error;
    }
  }

  // 上传到S3
  async uploadToS3(file, options = {}) {
    const { type = 'file', onProgress } = options;
    
    try {
      if (onProgress) onProgress('uploading', 30);
      
      const result = await s3StorageService.uploadFile(file, {
        type,
        fileName: options.fileName
      });

      if (onProgress) onProgress('processing', 80);
      
      return {
        ...result,
        storageType: 's3',
        isLocal: false,
        processedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('S3 upload failed:', error);
      throw new Error(`S3上传失败: ${error.message}`);
    }
  }

  // 上传到IndexedDB
  async uploadToIndexedDB(file, options = {}) {
    const { type = 'file', onProgress } = options;
    
    console.log('🔍 DEBUG fileStorageService.uploadToIndexedDB: Starting upload', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });
    
    try {
      if (onProgress) onProgress('processing', 30);
      
      // 先转换为Base64
      const base64Data = await this.fileToBase64(file);
      console.log('🔍 DEBUG fileStorageService.uploadToIndexedDB: Base64 conversion complete', {
        base64Length: base64Data?.length
      });
      
      if (onProgress) onProgress('storing', 60);
      
      // 存储到IndexedDB
      const fileInfo = {
        name: file.name,
        size: file.size,
        type: file.type,
        data: base64Data,
        base64Data: base64Data,
        isLocal: true
      };
      
      console.log('🔍 DEBUG fileStorageService.uploadToIndexedDB: Calling largeFileStorage.storeFile with:', {
        name: fileInfo.name,
        size: fileInfo.size,
        type: fileInfo.type,
        hasData: !!fileInfo.data
      });
      
      const result = await largeFileStorage.storeFile(fileInfo);
      
      console.log('🔍 DEBUG fileStorageService.uploadToIndexedDB: largeFileStorage.storeFile result:', result);
      
      if (onProgress) onProgress('complete', 100);
      
      const finalResult = {
        ...result,
        storageType: 'indexeddb',
        isLocal: true,
        processedAt: new Date().toISOString()
      };
      
      console.log('🔍 DEBUG fileStorageService.uploadToIndexedDB: Final result:', finalResult);
      
      return finalResult;
    } catch (error) {
      console.error('IndexedDB upload failed:', error);
      throw new Error(`本地存储失败: ${error.message}`);
    }
  }

  // 上传到Base64（小文件）
  async uploadToBase64(file, options = {}) {
    const { type = 'file', onProgress } = options;
    
    try {
      if (onProgress) onProgress('processing', 50);
      
      const base64Data = await this.fileToBase64(file);
      
      if (onProgress) onProgress('complete', 100);
      
      return {
        name: file.name,
        size: file.size,
        type: file.type,
        data: base64Data,
        base64Data: base64Data,
        storageType: 'base64',
        isLocal: true,
        processedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Base64 conversion failed:', error);
      throw new Error(`文件处理失败: ${error.message}`);
    }
  }

  // 文件转Base64
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  }

  // 从存储中恢复文件
  async restoreFile(fileInfo) {
    console.log('🔍 DEBUG fileStorageService.restoreFile: Input fileInfo:', fileInfo);
    
    if (!fileInfo) {
      console.log('🔍 DEBUG fileStorageService.restoreFile: No fileInfo provided');
      return null;
    }

    try {
      switch (fileInfo.storageType) {
        case 's3':
          console.log('🔍 DEBUG fileStorageService.restoreFile: Handling S3 file');
          // S3文件直接返回URL
          return {
            url: fileInfo.url,
            type: fileInfo.type,
            name: fileInfo.originalName || fileInfo.name
          };
        
        case 'indexeddb':
          console.log('🔍 DEBUG fileStorageService.restoreFile: Handling IndexedDB file, ID:', fileInfo.id);
          // 从IndexedDB恢复
          if (fileInfo.id) {
            const storedFile = await largeFileStorage.getFile(fileInfo.id);
            console.log('🔍 DEBUG fileStorageService.restoreFile: largeFileStorage.getFile result:', {
              success: !!storedFile,
              hasData: !!(storedFile && storedFile.data),
              dataType: storedFile?.data ? typeof storedFile.data : 'none'
            });
            
            if (storedFile && storedFile.data) {
              return {
                data: storedFile.data,
                type: fileInfo.type,
                name: fileInfo.name
              };
            }
          } else {
            console.log('🔍 DEBUG fileStorageService.restoreFile: No ID provided for IndexedDB file');
          }
          break;
        
        case 'base64':
          // Base64数据直接返回
          if (fileInfo.data || fileInfo.base64Data) {
            return {
              data: fileInfo.data || fileInfo.base64Data,
              type: fileInfo.type,
              name: fileInfo.name
            };
          }
          break;
        
        default:
          console.warn('Unknown storage type:', fileInfo.storageType);
      }
      
      return null;
    } catch (error) {
      console.error('Failed to restore file:', error);
      return null;
    }
  }

  // 删除文件
  async deleteFile(fileInfo) {
    if (!fileInfo) return;

    try {
      switch (fileInfo.storageType) {
        case 's3':
          // 从S3删除
          if (fileInfo.fileName) {
            await s3StorageService.deleteFile(fileInfo.fileName);
          }
          break;
        
        case 'indexeddb':
          // 从IndexedDB删除
          if (fileInfo.id) {
            await largeFileStorage.deleteFile(fileInfo.id);
          }
          break;
        
        case 'base64':
          // Base64文件无需特殊删除
          break;
        
        default:
          console.warn('Unknown storage type for deletion:', fileInfo.storageType);
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }

  // 获取存储统计信息
  async getStorageStats() {
    try {
      const stats = {
        s3: null,
        indexeddb: null,
        base64: null,
        totalFiles: 0,
        totalSize: 0
      };

      // S3统计
      if (this.isS3Enabled()) {
        stats.s3 = await s3StorageService.getStorageStats();
      }

      // IndexedDB统计
      stats.indexeddb = await largeFileStorage.getStorageStats();

      // 计算总统计
      if (stats.indexeddb) {
        stats.totalFiles += stats.indexeddb.totalFiles;
        stats.totalSize += stats.indexeddb.totalSize;
      }

      return stats;
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return null;
    }
  }

  // 测试所有存储服务
  async testAllServices() {
    const results = {
      s3: null,
      indexeddb: null,
      base64: true // Base64总是可用的
    };

    // 测试S3
    if (this.isS3Enabled()) {
      try {
        results.s3 = await s3StorageService.testConnection();
      } catch (error) {
        results.s3 = { success: false, error: error.message };
      }
    }

    // 测试IndexedDB
    try {
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      const testFile = new File([testBlob], 'test.txt');
      const result = await this.uploadToIndexedDB(testFile, { type: 'test' });
      await this.deleteFile(result);
      results.indexeddb = { success: true };
    } catch (error) {
      results.indexeddb = { success: false, error: error.message };
    }

    return results;
  }

  // 获取推荐存储方式
  getRecommendedStorage(fileSize) {
    const threshold = this.getSizeThreshold();
    
    if (this.isS3Enabled() && fileSize >= threshold) {
      return {
        type: 's3',
        reason: '大文件推荐使用S3存储',
        confidence: 'high'
      };
    } else if (fileSize >= 5 * 1024 * 1024) {
      return {
        type: 'indexeddb',
        reason: '大文件推荐使用IndexedDB存储',
        confidence: 'medium'
      };
    } else {
      return {
        type: 'base64',
        reason: '小文件使用Base64存储',
        confidence: 'high'
      };
    }
  }
}

// 创建全局实例
const fileStorageService = new FileStorageService();

export default fileStorageService;