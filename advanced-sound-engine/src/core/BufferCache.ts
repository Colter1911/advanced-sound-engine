import type { CacheEntry, CacheStats } from '@t/audio';
import { Logger } from '@utils/logger';

const DEFAULT_MAX_SIZE = 500 * 1024 * 1024; // 500MB

export class BufferCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number;
  private currentSize: number = 0;
  private hits: number = 0;
  private misses: number = 0;

  constructor(maxSize: number = DEFAULT_MAX_SIZE) {
    this.maxSize = maxSize;
  }

  has(url: string): boolean {
    return this.cache.has(url);
  }

  get(url: string): AudioBuffer | null {
    const entry = this.cache.get(url);
    
    if (entry) {
      entry.lastAccessed = Date.now();
      this.hits++;
      return entry.buffer;
    }
    
    this.misses++;
    return null;
  }

  set(url: string, buffer: AudioBuffer): void {
    // Вычисляем размер buffer (примерно)
    const size = this.estimateBufferSize(buffer);
    
    // Если буфер больше максимального размера кеша - не кешируем
    if (size > this.maxSize) {
      Logger.warn(`Buffer too large to cache: ${url} (${this.formatSize(size)})`);
      return;
    }
    
    // Освобождаем место если нужно
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      this.evictLRU();
    }
    
    // Удаляем старую запись если есть
    if (this.cache.has(url)) {
      const old = this.cache.get(url)!;
      this.currentSize -= old.size;
    }
    
    this.cache.set(url, {
      buffer,
      size,
      lastAccessed: Date.now(),
      url
    });
    
    this.currentSize += size;
    Logger.debug(`Cached: ${url} (${this.formatSize(size)})`);
  }

  private evictLRU(): void {
    let oldest: CacheEntry | null = null;
    
    for (const entry of this.cache.values()) {
      if (!oldest || entry.lastAccessed < oldest.lastAccessed) {
        oldest = entry;
      }
    }
    
    if (oldest) {
      this.cache.delete(oldest.url);
      this.currentSize -= oldest.size;
      Logger.debug(`Evicted: ${oldest.url}`);
    }
  }

  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
    this.hits = 0;
    this.misses = 0;
  }

  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      entries: this.cache.size,
      currentSize: this.currentSize,
      maxSize: this.maxSize,
      hitRate: total > 0 ? this.hits / total : 0
    };
  }

  private estimateBufferSize(buffer: AudioBuffer): number {
    // AudioBuffer size = channels * length * 4 bytes (Float32)
    return buffer.numberOfChannels * buffer.length * 4;
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
}