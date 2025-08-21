// S3存储服务 - 支持Cloudflare R2（使用预签名URL）
class S3StorageService {
  constructor() {
    this.config = null;
    this.initialized = false;
  }

  // 初始化S3配置
  init(config) {
    this.config = {
      endpoint: config.endpoint,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      bucket: config.bucket,
      region: config.region || 'auto',
      publicUrl: config.publicUrl || config.endpoint
    };
    this.initialized = true;
  }

  // 检查是否已配置
  isConfigured() {
    return this.initialized && this.config && 
           this.config.endpoint && this.config.accessKeyId && 
           this.config.secretAccessKey && this.config.bucket;
  }

  // 生成唯一文件名
  generateFileName(originalName, type = 'file') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();
    const cleanName = originalName.split('.')[0].replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_');
    return `${type}/${timestamp}_${random}_${cleanName}.${extension}`;
  }

  // 上传文件到S3（使用预签名URL）
  async uploadFile(file, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('S3存储未配置');
    }

    const fileName = options.fileName || this.generateFileName(file.name, options.type || 'file');
    const contentType = file.type || 'application/octet-stream';

    try {
      // 构建上传URL
      const uploadUrl = `${this.config.endpoint}/${this.config.bucket}/${fileName}`;
      
      // 创建预签名URL（这里简化处理，实际应该在后端生成签名）
      const signedUrl = await this.createPresignedUrl(uploadUrl, 'PUT', contentType);
      
      // 上传文件
      const response = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: file
      });

      if (!response.ok) {
        throw new Error(`上传失败: ${response.statusText}`);
      }

      // 生成公共URL
      const publicUrl = this.getPublicUrl(fileName);

      return {
        success: true,
        fileName: fileName,
        originalName: file.name,
        size: file.size,
        type: file.type,
        url: publicUrl,
        storageType: 's3',
        uploadedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('S3上传失败:', error);
      throw error;
    }
  }

  // 创建预签名URL（简化版本，实际应该在后端实现）
  async createPresignedUrl(url, method, contentType) {
    // 注意：这是一个简化的实现
    // 在生产环境中，预签名URL应该在后端服务器生成
    // 这里我们假设已经配置了CORS和适当的权限
    
    // 对于Cloudflare R2，可以直接使用R2的域名进行上传
    // 如果需要预签名，应该通过后端API获取
    
    return url;
  }

  // 获取公共URL
  getPublicUrl(fileName) {
    if (this.config.publicUrl) {
      return `${this.config.publicUrl}/${this.config.bucket}/${fileName}`;
    }
    return `${this.config.endpoint}/${this.config.bucket}/${fileName}`;
  }

  // 删除文件
  async deleteFile(fileName) {
    if (!this.isConfigured()) {
      throw new Error('S3存储未配置');
    }

    try {
      const deleteUrl = `${this.config.endpoint}/${this.config.bucket}/${fileName}`;
      const signedUrl = await this.createPresignedUrl(deleteUrl, 'DELETE');
      
      const response = await fetch(signedUrl, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`删除失败: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      console.error('S3删除失败:', error);
      throw error;
    }
  }

  // 检查文件是否存在
  async fileExists(fileName) {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const fileUrl = this.getPublicUrl(fileName);
      const response = await fetch(fileUrl, {
        method: 'HEAD'
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // 获取存储统计信息
  async getStorageStats() {
    if (!this.isConfigured()) {
      return null;
    }

    return {
      provider: 'S3/Cloudflare R2',
      endpoint: this.config.endpoint,
      bucket: this.config.bucket,
      configured: true
    };
  }

  // 测试连接
  async testConnection() {
    if (!this.isConfigured()) {
      return { success: false, error: 'S3存储未配置' };
    }

    try {
      // 创建一个测试文件来验证连接
      const testFileName = `test/connection_test_${Date.now()}.txt`;
      const testContent = new Blob(['Connection test'], { type: 'text/plain' });
      
      await this.uploadFile(testContent, { 
        fileName: testFileName,
        type: 'test'
      });
      
      // 清理测试文件
      await this.deleteFile(testFileName);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// 创建全局实例
const s3StorageService = new S3StorageService();

export default s3StorageService;