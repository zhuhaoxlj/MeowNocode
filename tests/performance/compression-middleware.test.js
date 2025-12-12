/**
 * Unit Tests for Compression Middleware
 * 
 * Tests the compression middleware functionality including:
 * - Accept-Encoding header parsing
 * - Content-type based compression filtering
 * - Brotli and gzip compression
 * 
 * Requirements: 1.3 - WHEN the user requests a page THEN the system SHALL serve 
 * compressed assets using gzip or brotli compression
 */

import { describe, it, expect } from 'vitest';
import {
  parseAcceptEncoding,
  getBestCompression,
  isCompressibleContentType,
  compressData,
  getCompressionStats,
} from '../../lib/server/compressionMiddleware.js';

describe('Compression Middleware', () => {
  describe('parseAcceptEncoding', () => {
    it('should parse Accept-Encoding header with brotli support', () => {
      const result = parseAcceptEncoding('gzip, deflate, br');
      expect(result.brotli).toBe(true);
      expect(result.gzip).toBe(true);
      expect(result.deflate).toBe(true);
    });

    it('should parse Accept-Encoding header without brotli', () => {
      const result = parseAcceptEncoding('gzip, deflate');
      expect(result.brotli).toBe(false);
      expect(result.gzip).toBe(true);
      expect(result.deflate).toBe(true);
    });

    it('should handle empty Accept-Encoding header', () => {
      const result = parseAcceptEncoding('');
      expect(result.brotli).toBe(false);
      expect(result.gzip).toBe(false);
      expect(result.deflate).toBe(false);
    });

    it('should handle null Accept-Encoding header', () => {
      const result = parseAcceptEncoding(null);
      expect(result.brotli).toBe(false);
      expect(result.gzip).toBe(false);
      expect(result.deflate).toBe(false);
    });

    it('should be case-insensitive', () => {
      const result = parseAcceptEncoding('GZIP, BR, DEFLATE');
      expect(result.brotli).toBe(true);
      expect(result.gzip).toBe(true);
      expect(result.deflate).toBe(true);
    });
  });

  describe('getBestCompression', () => {
    it('should prefer brotli when available', () => {
      expect(getBestCompression('gzip, deflate, br')).toBe('br');
    });

    it('should fall back to gzip when brotli not available', () => {
      expect(getBestCompression('gzip, deflate')).toBe('gzip');
    });

    it('should fall back to deflate when only deflate available', () => {
      expect(getBestCompression('deflate')).toBe('deflate');
    });

    it('should return null when no compression supported', () => {
      expect(getBestCompression('')).toBe(null);
      expect(getBestCompression(null)).toBe(null);
    });
  });

  describe('isCompressibleContentType', () => {
    it('should return true for text/html', () => {
      expect(isCompressibleContentType('text/html')).toBe(true);
    });

    it('should return true for application/json', () => {
      expect(isCompressibleContentType('application/json')).toBe(true);
    });

    it('should return true for text/css', () => {
      expect(isCompressibleContentType('text/css')).toBe(true);
    });

    it('should return true for application/javascript', () => {
      expect(isCompressibleContentType('application/javascript')).toBe(true);
    });

    it('should return true for image/svg+xml', () => {
      expect(isCompressibleContentType('image/svg+xml')).toBe(true);
    });

    it('should handle content-type with charset', () => {
      expect(isCompressibleContentType('application/json; charset=utf-8')).toBe(true);
    });

    it('should return false for binary content types', () => {
      expect(isCompressibleContentType('image/png')).toBe(false);
      expect(isCompressibleContentType('image/jpeg')).toBe(false);
      expect(isCompressibleContentType('application/octet-stream')).toBe(false);
    });

    it('should return false for null or empty content type', () => {
      expect(isCompressibleContentType(null)).toBe(false);
      expect(isCompressibleContentType('')).toBe(false);
    });
  });

  describe('compressData', () => {
    const testData = 'Hello, World! '.repeat(100); // ~1.4KB of data

    it('should compress data using brotli', async () => {
      const compressed = await compressData(testData, 'br');
      expect(compressed.length).toBeLessThan(Buffer.from(testData).length);
    });

    it('should compress data using gzip', async () => {
      const compressed = await compressData(testData, 'gzip');
      expect(compressed.length).toBeLessThan(Buffer.from(testData).length);
    });

    it('should compress data using deflate', async () => {
      const compressed = await compressData(testData, 'deflate');
      expect(compressed.length).toBeLessThan(Buffer.from(testData).length);
    });

    it('should return original data for unknown method', async () => {
      const original = Buffer.from(testData);
      const result = await compressData(testData, 'unknown');
      expect(result.length).toBe(original.length);
    });

    it('should handle Buffer input', async () => {
      const buffer = Buffer.from(testData);
      const compressed = await compressData(buffer, 'gzip');
      expect(compressed.length).toBeLessThan(buffer.length);
    });
  });

  describe('getCompressionStats', () => {
    it('should calculate compression statistics correctly', () => {
      const original = Buffer.from('a'.repeat(1000));
      const compressed = Buffer.from('a'.repeat(100));
      
      const stats = getCompressionStats(original, compressed);
      
      expect(stats.originalSize).toBe(1000);
      expect(stats.compressedSize).toBe(100);
      expect(stats.savedBytes).toBe(900);
      expect(stats.compressionRatio).toBe('90.00%');
    });
  });
});
