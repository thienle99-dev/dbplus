import { LRUCache } from 'lru-cache';

export interface QueryResult {
    columns: string[];
    rows: any[][];
    rowCount: number;
    executionTime: number;
    timestamp?: number;
}

interface CacheOptions {
    maxSize: number;      // Maximum cache size in bytes
    maxAge: number;       // TTL in milliseconds
    maxItems: number;     // Maximum number of cached queries
}

class QueryCacheService {
    private cache: LRUCache<string, QueryResult>;
    private hitCount = 0;
    private missCount = 0;

    constructor(options: Partial<CacheOptions> = {}) {
        const defaultOptions: CacheOptions = {
            maxSize: 50_000_000,      // 50MB
            maxAge: 1000 * 60 * 5,    // 5 minutes
            maxItems: 100,            // 100 queries
        };

        const opts = { ...defaultOptions, ...options };

        this.cache = new LRUCache<string, QueryResult>({
            max: opts.maxItems,
            ttl: opts.maxAge,
            // sizeCalculation: (value) => {
            //   // Approximate size calculation
            //   return JSON.stringify(value).length;
            // },
            // dispose: (value, key) => {
            // console.log(`[QueryCache] Evicted: ${key.substring(0, 20)}...`);
            // },
        });
    }

    /**
     * Generate cache key from connection ID and query
     * Simplified hashing for browser compatibility
     */
    private getCacheKey(connectionId: string, query: string): string {
        const normalized = this.normalizeQuery(query);
        return `${connectionId}:${normalized}`;
    }

    /**
     * Normalize query for consistent caching
     * (removes extra whitespace, converts to lowercase)
     */
    private normalizeQuery(query: string): string {
        return query
            .trim()
            .replace(/\s+/g, ' ')
            .toLowerCase();
    }

    /**
     * Get cached query result
     */
    get(connectionId: string, query: string): QueryResult | undefined {
        const key = this.getCacheKey(connectionId, query);
        const result = this.cache.get(key);

        if (result) {
            this.hitCount++;
            // console.log(
            //   `[QueryCache] HIT (${this.getHitRate().toFixed(1)}%): ${query.substring(0, 50)}...`
            // );
        } else {
            this.missCount++;
            // console.log(
            //   `[QueryCache] MISS (${this.getHitRate().toFixed(1)}%): ${query.substring(0, 50)}...`
            // );
        }

        return result;
    }

    /**
     * Set query result in cache
     */
    set(connectionId: string, query: string, result: QueryResult): void {
        const key = this.getCacheKey(connectionId, query);

        // Don't cache very large results (> 10MB)
        const size = JSON.stringify(result).length;
        if (size > 10_000_000) {
            // console.log(`[QueryCache] Skipping cache (too large): ${size} bytes`);
            return;
        }

        // Add timestamp
        result.timestamp = Date.now();

        this.cache.set(key, result);
        // console.log(`[QueryCache] Cached: ${key.substring(0, 30)}... (${(size / 1024).toFixed(1)}KB)`);
    }

    /**
     * Invalidate cache for a connection (e.g., after schema change)
     */
    invalidate(connectionId: string): void {
        const keys = Array.from(this.cache.keys());
        const removed = keys.filter(key => key.startsWith(`${connectionId}:`));

        removed.forEach(key => this.cache.delete(key));

        console.log(`[QueryCache] Invalidated ${removed.length} entries for ${connectionId}`);
    }

    /**
     * Clear entire cache
     */
    clear(): void {
        this.cache.clear();
        this.hitCount = 0;
        this.missCount = 0;
        console.log('[QueryCache] Cleared all entries');
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            size: this.cache.size,
            hitCount: this.hitCount,
            missCount: this.missCount,
            hitRate: this.getHitRate(),
            // calculatedSize: this.cache.calculatedSize,
        };
    }

    private getHitRate(): number {
        const total = this.hitCount + this.missCount;
        return total === 0 ? 0 : (this.hitCount / total) * 100;
    }
}

// Singleton instance
export const queryCache = new QueryCacheService();

// Export for testing
export { QueryCacheService };
