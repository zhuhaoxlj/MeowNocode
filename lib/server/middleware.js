// Re-export compression middleware for convenience
export { 
  withCompression, 
  parseAcceptEncoding, 
  getBestCompression, 
  isCompressibleContentType,
  compressData,
  getCompressionHeaders,
  getCompressionStats
} from './compressionMiddleware.js';

export function withMethods(allowedMethods) {
  return function (handler) {
    return async function (req, res) {
      if (!allowedMethods.includes(req.method)) {
        res.setHeader('Allow', allowedMethods.join(', '));
        return res.status(405).json({ error: 'Method Not Allowed' });
      }
      
      try {
        await handler(req, res);
      } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    };
  };
}

export function withCors(handler) {
  return async function (req, res) {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // 处理预检请求
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    return handler(req, res);
  };
}

/**
 * Middleware for handling file uploads
 * @param {Function} handler - The API handler function
 * @returns {Function} - Wrapped handler with file upload support
 */
export function withFileUpload(handler) {
  return async function (req, res) {
    // Disable body parsing for file uploads
    // The handler should use formidable or similar library
    try {
      await handler(req, res);
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ error: 'File upload failed' });
    }
  };
}

/**
 * Generic API handler wrapper with error handling
 * @param {Function} handler - The API handler function
 * @returns {Function} - Wrapped handler with error handling
 */
export function withApiHandler(handler) {
  return async function (req, res) {
    try {
      await handler(req, res);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ 
        error: error.message || 'Internal Server Error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
}
