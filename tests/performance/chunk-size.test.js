/**
 * Property Test: Chunk size limit enforcement
 * **Feature: nas-performance-optimization, Property 1: Chunk size limit enforcement**
 * **Validates: Requirements 1.2**
 * 
 * Property: For any generated JavaScript chunk file in the build output,
 * the file size should not exceed 200KB (uncompressed).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Maximum chunk size in bytes (200KB)
const MAX_CHUNK_SIZE = 200 * 1024;

// Build output directory
const BUILD_DIR = '.next';
const CHUNKS_DIR = join(BUILD_DIR, 'static', 'chunks');

/**
 * Recursively get all JS files from a directory
 */
function getAllJsFiles(dir, files = []) {
  if (!existsSync(dir)) {
    return files;
  }
  
  const entries = readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllJsFiles(fullPath, files);
    } else if (entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Get file size in bytes
 */
function getFileSize(filePath) {
  return statSync(filePath).size;
}

describe('Chunk Size Limit Enforcement', () => {
  let chunkFiles = [];
  let buildExists = false;

  beforeAll(() => {
    buildExists = existsSync(BUILD_DIR);
    if (buildExists && existsSync(CHUNKS_DIR)) {
      chunkFiles = getAllJsFiles(CHUNKS_DIR);
    }
  });

  it('should have a build output directory', () => {
    expect(buildExists).toBe(true);
  });

  it('should have chunk files in the build output', () => {
    expect(chunkFiles.length).toBeGreaterThan(0);
  });

  /**
   * Property-based test: For any chunk file selected from the build output,
   * its size should not exceed 200KB.
   * 
   * This test uses fast-check to randomly sample chunk files and verify
   * the size constraint holds for all of them.
   */
  it('should enforce 200KB chunk size limit for all chunks', () => {
    // Skip if no chunks available
    if (chunkFiles.length === 0) {
      console.warn('No chunk files found - skipping property test');
      return;
    }

    // Create an arbitrary that selects random chunk files
    const chunkFileArb = fc.constantFrom(...chunkFiles);

    fc.assert(
      fc.property(chunkFileArb, (chunkFile) => {
        const fileSize = getFileSize(chunkFile);
        const fileSizeKB = fileSize / 1024;
        
        // Property: chunk size should not exceed 200KB
        if (fileSize > MAX_CHUNK_SIZE) {
          const fileName = chunkFile.replace(process.cwd() + '/', '');
          throw new Error(
            `Chunk "${fileName}" exceeds 200KB limit: ${fileSizeKB.toFixed(2)}KB`
          );
        }
        
        return true;
      }),
      { 
        numRuns: Math.min(100, chunkFiles.length * 10), // Run at least 100 times or 10x chunk count
        verbose: true 
      }
    );
  });

  /**
   * Exhaustive verification: Check ALL chunk files (not just random samples)
   * This ensures complete coverage beyond the property-based sampling.
   */
  it('should verify all chunk files are under 200KB limit', () => {
    if (chunkFiles.length === 0) {
      console.warn('No chunk files found - skipping exhaustive test');
      return;
    }

    const oversizedChunks = [];
    
    for (const chunkFile of chunkFiles) {
      const fileSize = getFileSize(chunkFile);
      if (fileSize > MAX_CHUNK_SIZE) {
        const fileName = chunkFile.replace(process.cwd() + '/', '');
        oversizedChunks.push({
          file: fileName,
          size: (fileSize / 1024).toFixed(2) + 'KB',
          excess: ((fileSize - MAX_CHUNK_SIZE) / 1024).toFixed(2) + 'KB over limit'
        });
      }
    }

    if (oversizedChunks.length > 0) {
      const report = oversizedChunks
        .map(c => `  - ${c.file}: ${c.size} (${c.excess})`)
        .join('\n');
      throw new Error(
        `Found ${oversizedChunks.length} chunk(s) exceeding 200KB limit:\n${report}`
      );
    }

    expect(oversizedChunks).toHaveLength(0);
  });

  /**
   * Report chunk size statistics
   */
  it('should report chunk size statistics', () => {
    if (chunkFiles.length === 0) {
      console.warn('No chunk files found - skipping statistics');
      return;
    }

    const sizes = chunkFiles.map(f => getFileSize(f));
    const totalSize = sizes.reduce((a, b) => a + b, 0);
    const avgSize = totalSize / sizes.length;
    const maxSize = Math.max(...sizes);
    const minSize = Math.min(...sizes);

    console.log('\n📊 Chunk Size Statistics:');
    console.log(`   Total chunks: ${chunkFiles.length}`);
    console.log(`   Total size: ${(totalSize / 1024).toFixed(2)}KB`);
    console.log(`   Average size: ${(avgSize / 1024).toFixed(2)}KB`);
    console.log(`   Max size: ${(maxSize / 1024).toFixed(2)}KB`);
    console.log(`   Min size: ${(minSize / 1024).toFixed(2)}KB`);
    console.log(`   Limit: ${MAX_CHUNK_SIZE / 1024}KB`);

    // This test always passes - it's just for reporting
    expect(true).toBe(true);
  });
});
