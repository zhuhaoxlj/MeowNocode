/**
 * Next.js Edge Middleware for Compression and Cache Headers
 * 
 * This middleware runs on the Edge runtime and handles:
 * - Setting compression-related headers
 * - Cache headers for static assets
 * - Content-type based compression filtering
 * 
 * Requirements: 1.3 - WHEN the user requests a page THEN the system SHALL serve 
 * compressed assets using gzip or brotli compression
 */

import { NextResponse } from 'next/server';

/**
 * Content types that should be compressed
 */
const COMPRESSIBLE_EXTENSIONS = [
  '.js',
  '.css',
  '.html',
  '.json',
  '.xml',
  '.svg',
  '.txt',
  '.map',
];

/**
 * Static asset extensions for long-term caching
 */
const STATIC_ASSET_EXTENSIONS = [
  '.js',
  '.css',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.ico',
  '.svg',
];

/**
 * Check if a path is a static asset that should have long-term cache
 * @param {string} pathname - The request pathname
 * @returns {boolean}
 */
function isStaticAsset(pathname) {
  return STATIC_ASSET_EXTENSIONS.some(ext => pathname.endsWith(ext));
}

/**
 * Check if a path is compressible based on extension
 * @param {string} pathname - The request pathname
 * @returns {boolean}
 */
function isCompressible(pathname) {
  return COMPRESSIBLE_EXTENSIONS.some(ext => pathname.endsWith(ext));
}

/**
 * Check if the path contains a content hash (for cache busting)
 * Next.js adds hashes like: _next/static/chunks/pages/index-abc123.js
 * @param {string} pathname - The request pathname
 * @returns {boolean}
 */
function hasContentHash(pathname) {
  // Match patterns like: filename-[hash].ext or filename.[hash].ext
  return /[-\.][a-f0-9]{8,}\./.test(pathname) || 
         pathname.includes('/_next/static/');
}

/**
 * Get the best compression method from Accept-Encoding header
 * @param {string} acceptEncoding - The Accept-Encoding header value
 * @returns {string|null}
 */
function getBestCompression(acceptEncoding) {
  if (!acceptEncoding) return null;
  
  const encodings = acceptEncoding.toLowerCase();
  
  // Prefer brotli as it provides better compression
  if (encodings.includes('br')) return 'br';
  if (encodings.includes('gzip')) return 'gzip';
  if (encodings.includes('deflate')) return 'deflate';
  
  return null;
}

/**
 * Main middleware function
 * @param {Request} request - The incoming request
 * @returns {NextResponse}
 */
export function middleware(request) {
  const { pathname } = request.nextUrl;
  const acceptEncoding = request.headers.get('accept-encoding') || '';
  
  // Skip middleware for API routes (handled by API middleware)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  // Create response with modified headers
  const response = NextResponse.next();
  
  // Add Vary header for proper caching with different encodings
  response.headers.set('Vary', 'Accept-Encoding');
  
  // Set compression-related headers for compressible content
  if (isCompressible(pathname)) {
    const compressionMethod = getBestCompression(acceptEncoding);
    if (compressionMethod) {
      // Note: Actual compression is handled by Next.js/server
      // This header indicates the expected encoding
      response.headers.set('X-Compression-Available', compressionMethod);
    }
  }
  
  // Set cache headers for static assets with content hashes
  if (isStaticAsset(pathname) && hasContentHash(pathname)) {
    // Long-term cache for hashed assets (1 year)
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (pathname.endsWith('.html') || pathname === '/') {
    // No cache for HTML files
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  
  return response;
}

/**
 * Configure which paths the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/image|favicon.ico).*)',
  ],
};
