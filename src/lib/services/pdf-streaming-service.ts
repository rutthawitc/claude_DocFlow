import fs from 'fs';
import path from 'path';
import { ReadableStream } from 'stream/web';
import { CacheService } from '@/lib/cache/cache-service';

export interface StreamingOptions {
  start?: number;
  end?: number;
  cacheStream?: boolean;
  chunkSize?: number;
}

export interface StreamStats {
  totalSize: number;
  rangeStart: number;
  rangeEnd: number;
  contentLength: number;
  isPartial: boolean;
}

class PDFStreamingService {
  private static cache = CacheService.getInstance();
  private static defaultChunkSize = 64 * 1024; // 64KB chunks

  /**
   * Stream a PDF file with range support for large files
   */
  static async streamPDF(
    filePath: string,
    options: StreamingOptions = {}
  ): Promise<{
    stream: ReadableStream<Uint8Array>;
    headers: Record<string, string>;
    status: number;
    stats: StreamStats;
  }> {
    const absolutePath = path.resolve(filePath);
    
    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Get file stats
    const fileStats = fs.statSync(absolutePath);
    const totalSize = fileStats.size;
    
    // Handle range requests
    const { start = 0, end = totalSize - 1, chunkSize = this.defaultChunkSize } = options;
    const contentLength = end - start + 1;
    const isPartial = start > 0 || end < totalSize - 1;

    console.log(`📁 Streaming PDF: ${path.basename(filePath)} (${this.formatBytes(totalSize)})`);
    if (isPartial) {
      console.log(`📄 Range request: ${start}-${end}/${totalSize} (${this.formatBytes(contentLength)})`);
    }

    // Create streaming headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/pdf',
      'Content-Length': contentLength.toString(),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000', // 1 year for immutable PDFs
      'Content-Disposition': `inline; filename="${path.basename(filePath)}"`,
    };

    if (isPartial) {
      headers['Content-Range'] = `bytes ${start}-${end}/${totalSize}`;
    }

    const stats: StreamStats = {
      totalSize,
      rangeStart: start,
      rangeEnd: end,
      contentLength,
      isPartial,
    };

    // Create readable stream
    const stream = this.createFileStream(absolutePath, start, end, chunkSize);
    
    return {
      stream,
      headers,
      status: isPartial ? 206 : 200, // 206 Partial Content for range requests
      stats,
    };
  }

  /**
   * Create a ReadableStream for file content
   */
  private static createFileStream(
    filePath: string,
    start: number,
    end: number,
    chunkSize: number
  ): ReadableStream<Uint8Array> {
    let position = start;
    let fileHandle: fs.promises.FileHandle | null = null;

    return new ReadableStream({
      async start(controller) {
        try {
          fileHandle = await fs.promises.open(filePath, 'r');
        } catch (error) {
          controller.error(error);
          return;
        }
      },

      async pull(controller) {
        if (!fileHandle) {
          controller.error(new Error('File handle not available'));
          return;
        }

        try {
          const remainingBytes = end - position + 1;
          const bytesToRead = Math.min(chunkSize, remainingBytes);

          if (bytesToRead <= 0) {
            controller.close();
            return;
          }

          const buffer = Buffer.allocUnsafe(bytesToRead);
          const { bytesRead } = await fileHandle.read(buffer, 0, bytesToRead, position);

          if (bytesRead === 0) {
            controller.close();
            return;
          }

          position += bytesRead;
          controller.enqueue(new Uint8Array(buffer.subarray(0, bytesRead)));

          // Check if we've read all requested bytes
          if (position > end) {
            controller.close();
          }
        } catch (error) {
          controller.error(error);
        }
      },

      async cancel() {
        if (fileHandle) {
          await fileHandle.close();
          fileHandle = null;
        }
      },
    });
  }

  /**
   * Get PDF metadata without loading the entire file
   */
  static async getPDFMetadata(filePath: string): Promise<{
    size: number;
    lastModified: Date;
    filename: string;
    extension: string;
    mimeType: string;
  }> {
    const cacheKey = `pdf_metadata:${filePath}`;
    
    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const absolutePath = path.resolve(filePath);
        
        if (!fs.existsSync(absolutePath)) {
          throw new Error(`File not found: ${filePath}`);
        }

        const stats = fs.statSync(absolutePath);
        const filename = path.basename(filePath);
        const extension = path.extname(filePath);

        return {
          size: stats.size,
          lastModified: stats.mtime,
          filename,
          extension,
          mimeType: 'application/pdf',
        };
      },
      {
        ttl: 3600, // 1 hour - file metadata doesn't change often
        tags: [`file:${path.basename(filePath)}`],
      },
      'pdf_metadata'
    );
  }

  /**
   * Parse Range header for HTTP range requests
   */
  static parseRangeHeader(
    rangeHeader: string | null,
    fileSize: number
  ): { start: number; end: number } | null {
    if (!rangeHeader || !rangeHeader.startsWith('bytes=')) {
      return null;
    }

    const ranges = rangeHeader.substring(6).split(',');
    const range = ranges[0]; // Only handle single range for now

    if (range === '-') {
      // Request for last N bytes: bytes=-500
      const suffix = parseInt(range.substring(1));
      return {
        start: Math.max(0, fileSize - suffix),
        end: fileSize - 1,
      };
    }

    const [startStr, endStr] = range.split('-');
    const start = startStr ? parseInt(startStr) : 0;
    const end = endStr ? parseInt(endStr) : fileSize - 1;

    // Validate range
    if (start >= fileSize || end >= fileSize || start > end) {
      return null;
    }

    return { start, end };
  }

  /**
   * Check if client supports range requests
   */
  static supportsRangeRequests(headers: Headers): boolean {
    const acceptRanges = headers.get('accept-ranges');
    return acceptRanges === 'bytes';
  }

  /**
   * Generate optimized cache key for PDF streams
   */
  static generateCacheKey(filePath: string, start?: number, end?: number): string {
    const filename = path.basename(filePath);
    const rangeKey = start !== undefined && end !== undefined ? `_${start}-${end}` : '';
    return `pdf_stream:${filename}${rangeKey}`;
  }

  /**
   * Prefetch PDF chunks for better performance
   */
  static async prefetchPDFChunks(
    filePath: string,
    chunkSize: number = this.defaultChunkSize
  ): Promise<void> {
    try {
      const metadata = await this.getPDFMetadata(filePath);
      const totalChunks = Math.ceil(metadata.size / chunkSize);
      
      console.log(`🚀 Prefetching ${totalChunks} chunks for ${metadata.filename}`);

      // Prefetch first few chunks (most commonly accessed)
      const chunksToPreload = Math.min(5, totalChunks);
      
      for (let i = 0; i < chunksToPreload; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize - 1, metadata.size - 1);
        
        const cacheKey = this.generateCacheKey(filePath, start, end);
        
        // Check if already cached
        const exists = await this.cache.exists(cacheKey, 'pdf_chunks');
        if (!exists) {
          // Stream and cache this chunk
          const { stream } = await this.streamPDF(filePath, { start, end });
          
          // Read the stream and cache it
          const chunks: Uint8Array[] = [];
          const reader = stream.getReader();
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              chunks.push(value);
            }
            
            const chunkData = new Uint8Array(
              chunks.reduce((acc, chunk) => acc + chunk.length, 0)
            );
            let offset = 0;
            for (const chunk of chunks) {
              chunkData.set(chunk, offset);
              offset += chunk.length;
            }
            
            await this.cache.set(
              cacheKey,
              Array.from(chunkData), // Convert to array for JSON serialization
              {
                ttl: 3600, // 1 hour
                tags: [`file:${metadata.filename}`],
              },
              'pdf_chunks'
            );
          } finally {
            reader.releaseLock();
          }
        }
      }
      
      console.log(`✅ Prefetched ${chunksToPreload} chunks for ${metadata.filename}`);
    } catch (error) {
      console.error('Error prefetching PDF chunks:', error);
    }
  }

  /**
   * Clean up cached chunks for a file
   */
  static async clearFileCache(filePath: string): Promise<void> {
    const filename = path.basename(filePath);
    await this.cache.invalidateByTag(`file:${filename}`);
    console.log(`🗑️ Cleared cache for ${filename}`);
  }

  /**
   * Format bytes to human readable format
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get streaming statistics
   */
  static async getStreamingStats(): Promise<{
    cacheHitRate: number;
    totalStreams: number;
    totalBytesStreamed: number;
    averageChunkSize: number;
  }> {
    const cacheStats = await this.cache.getStats();
    
    return {
      cacheHitRate: cacheStats.hitRate,
      totalStreams: cacheStats.hits + cacheStats.misses,
      totalBytesStreamed: 0, // Would need to track this separately
      averageChunkSize: this.defaultChunkSize,
    };
  }
}

export default PDFStreamingService;
export { PDFStreamingService };