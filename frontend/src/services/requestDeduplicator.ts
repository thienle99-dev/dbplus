interface PendingRequest<T> {
    promise: Promise<T>;
    timestamp: number;
}

class RequestDeduplicator {
    private pending = new Map<string, PendingRequest<any>>();
    private readonly maxAge = 1000; // 1 second

    /**
     * Execute request with deduplication
     * If same request is in-flight, return existing promise
     */
    async execute<T>(
        key: string,
        request: () => Promise<T>
    ): Promise<T> {
        // Clean up old requests
        this.cleanup();

        // Check if request is already in-flight
        const existing = this.pending.get(key);
        if (existing) {
            // console.log(`[Dedup] Reusing in-flight request: ${key}`);
            return existing.promise;
        }

        // Execute new request
        const promise = request().finally(() => {
            // Remove from pending when done
            this.pending.delete(key);
        });

        this.pending.set(key, {
            promise,
            timestamp: Date.now(),
        });

        return promise;
    }

    /**
     * Clean up old requests (>maxAge)
     */
    private cleanup() {
        const now = Date.now();
        for (const [key, req] of this.pending.entries()) {
            if (now - req.timestamp > this.maxAge) {
                this.pending.delete(key);
            }
        }
    }

    /**
     * Cancel all pending requests
     */
    clear() {
        this.pending.clear();
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            pending: this.pending.size,
        };
    }
}

export const requestDeduplicator = new RequestDeduplicator();
