/**
 * Compression Middleware for Next.js API Routes
 * 
 * Supports brotli (br) and gzip compression with content-type based filtering.
 * Automatically detects Accept-Encoding header and applies appropriate compression.
 * 
 * @module compressionMiddleware
 * Requirements: 1.3 - WHEN the user requests a page THEN the system SHALL serve 
 * compressed assets using gzip or brotli compression
 */

import { promisify } from 'util';
import zlib from 'zlib';

// Promisify compression functions
const brotliCompress = promisify(zlib.brotliCompress);
const gzipCompress = promisify(zlib.gzip);

/**
 * Content types that should be compressed
 * Text-based formats benefit most from compression
 */
const COMPRESSIBLE_CONTENT_TYPES = [
  'text/html',
  'text/css',
  'text/plain',
  'text/xml',
  'text/javascript',
  'application/javascript',
  'application/json',
  'application/xml',
  'application/xhtml+xml',
  'application/rss+xml',
  'application/atom+xml',
  'image/svg+xml',
  'font/ttf',
  'font/otf',
  'application/font-woff',
  'application/font-woff2',
];

/**
 * Minimum size threshold for compression (in bytes)
 * Files smaller than this won't benefit from compression
 */
const MIN_COMPRESSION_SIZE = 1024; // 1KB

/**
 * Compression levels for optimal performance
 * Higher levels = better compression but slower
 */
const COMPRESSION_CONFIG = {
  brotli: {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 4, // 0-11, 4 is good balance
      [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
    },
  },
  gzip: {
    level: 6, // 1-9, 6 is default and good balance
  },
};

/**
 * Parse Accept-Encoding header to determine supported compression methods
 * @param {string} acceptEncoding - The Accept-Encoding header value
 * @returns {Object} Object with supported compression methods
 */
export function parseAcceptEncoding(acceptEncoding) {
  if (!acceptEncoding) {
    return { brotli: false, gzip: false, deflate: false };
  }

  const encodings = acceptEncoding.toLowerCase();
  
  return {
    brotli: encodings.includes('br'),
    gzip: encodings.includes('gzip'),
    deflate: encodings.includes('deflate'),
  };
}

/**
 * Determine the best compression method based on Accept-Encoding header
 * Prefers brotli over gzip as it provides better compression ratios
 * @param {string} acceptEncoding - The Accept-Encoding header value
 * @returns {string|null} The compression method to use, or null if none supported
 */
export function getBestCompression(acceptEncoding) {
  const supported = parseAcceptEncoding(acceptEncoding);
  
  // Prefer brotli as it provides better compression
  if (supported.brotli) return 'br';
  if (supported.gzip) return 'gzip';
  if (supported.deflate) return 'deflate';
  
  return null;
}

/**
 * Check if a content type should be compressed
 * @param {string} contentType - The Content-Type header value
 * @returns {boolean} Whether the content type should be compressed
 */
export function isCompressibleContentType(contentType) {
  if (!contentType) return false;
  
  // Extract the mime type without charset or other parameters
  const mimeType = contentType.split(';')[0].trim().toLowerCase();
  
  // Exact match against compressible content types
  return COMPRESSIBLE_CONTENT_TYPES.includes(mimeType);
}

/**
 * Compress data using the specified method
 * @param {Buffer|string} data - The data to compress
 * @param {string} method - The compression method ('br', 'gzip', or 'deflate')
 * @returns {Promise<Buffer>} The compressed data
 */
export async function compressData(data, method) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  
  switch (method) {
    case 'br':
      return brotliCompress(buffer, COMPRESSION_CONFIG.brotli);
    case 'gzip':
      return gzipCompress(buffer, COMPRESSION_CONFIG.gzip);
    case 'deflate':
      return promisify(zlib.deflate)(buffer);
    default:
      return buffer;
  }
}

/**
 * Compression middleware for Next.js API routes
 * Wraps a handler and automatically compresses responses based on Accept-Encoding
 * 
 * @param {Function} handler - The API route handler
 * @returns {Function} Wrapped handler with compression support
 * 
 * @example
 * // In an API route
 * import { withCompression } from '@/lib/server/compressionMiddleware';
 * 
 * function handler(req, res) {
 *   res.json({ data: 'large response' });
 * }
 * 
 * export default withCompression(handler);
 */
export function withCompression(handler) {
  return async function compressedHandler(req, res) {
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const compressionMethod = getBestCompression(acceptEncoding);
    
    // If no compression supported, just run the handler
    if (!compressionMethod) {
      return handler(req, res);
    }
    
    // Store original methods
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    const originalEnd = res.end.bind(res);
    
    // Override json method
    res.json = async function(data) {
      const jsonString = JSON.stringify(data);
      const buffer = Buffer.from(jsonString);
      
      // Only compress if above minimum size
      if (buffer.length < MIN_COMPRESSION_SIZE) {
        res.setHeader('Content-Type', 'application/json');
        return originalSend(jsonString);
      }
      
      try {
        const compressed = await compressData(buffer, compressionMethod);
        res.setHeader('Content-Encoding', compressionMethod);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Vary', 'Accept-Encoding');
        return originalEnd(compressed);
      } catch (error) {
        // Fallback to uncompressed on error
        console.error('Compression error:', error);
        res.setHeader('Content-Type', 'application/json');
        return originalSend(jsonString);
      }
    };
    
    // Override send method
    res.send = async function(data) {
      const contentType = res.getHeader('Content-Type') || 'text/html';
      
      // Check if content type is compressible
      if (!isCompressibleContentType(contentType)) {
        return originalSend(data);
      }
      
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
      
      // Only compress if above minimum size
      if (buffer.length < MIN_COMPRESSION_SIZE) {
        return originalSend(data);
      }
      
      try {
        const compressed = await compressData(buffer, compressionMethod);
        res.setHeader('Content-Encoding', compressionMethod);
        res.setHeader('Vary', 'Accept-Encoding');
        return originalEnd(compressed);
      } catch (error) {
        // Fallback to uncompressed on error
        console.error('Compression error:', error);
        return originalSend(data);
      }
    };
    
    return handler(req, res);
  };
}

/**
 * Create compression headers for static assets
 * Used in Next.js middleware for setting appropriate headers
 * 
 * @param {string} acceptEncoding - The Accept-Encoding header value
 * @param {string} contentType - The Content-Type of the asset
 * @returns {Object} Headers to set on the response
 */
export function getCompressionHeaders(acceptEncoding, contentType) {
  const headers = {
    'Vary': 'Accept-Encoding',
  };
  
  if (!isCompressibleContentType(contentType)) {
    return headers;
  }
  
  const method = getBestCompression(acceptEncoding);
  if (method) {
    headers['Content-Encoding'] = method;
  }
  
  return headers;
}

/**
 * Get compression statistics for monitoring
 * @param {Buffer} original - Original data
 * @param {Buffer} compressed - Compressed data
 * @returns {Object} Compression statistics
 */
export function getCompressionStats(original, compressed) {
  const originalSize = original.length;
  const compressedSize = compressed.length;
  const ratio = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);
  
  return {
    originalSize,
    compressedSize,
    savedBytes: originalSize - compressedSize,
    compressionRatio: `${ratio}%`,
  };
}

export default withCompression;
