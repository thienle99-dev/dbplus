// @ts-ignore
import DataProcessorWorker from '../workers/dataProcessor.worker?worker';

class WorkerManager {
    private worker: Worker | null = null;
    private pendingRequests = new Map<number, {
        resolve: (value: any) => void;
        reject: (error: Error) => void;
    }>();
    private requestId = 0;

    constructor() {
        this.initWorker();
    }

    private initWorker() {
        if (typeof window === 'undefined') return;

        if (this.worker) {
            this.worker.terminate();
        }

        try {
            this.worker = new DataProcessorWorker();
            this.worker.onmessage = (e) => {
                const { requestId, success, data, error } = e.data;
                const request = this.pendingRequests.get(requestId);

                if (request) {
                    if (success) {
                        request.resolve(data);
                    } else {
                        request.reject(new Error(error));
                    }
                    this.pendingRequests.delete(requestId);
                }
            };

            this.worker.onerror = (error) => {
                console.error('[WorkerManager] Worker error:', error);
                // Restart worker if it crashed
                setTimeout(() => this.initWorker(), 1000);
            };
        } catch (err) {
            console.error('[WorkerManager] Failed to init worker:', err);
        }
    }

    async processData<T>(request: any): Promise<T> {
        if (!this.worker) {
            this.initWorker(); // Try to lazy init
            if (!this.worker) {
                throw new Error('Worker not initialized');
            }
        }

        const requestId = this.requestId++;

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(requestId, { resolve, reject });
            this.worker!.postMessage({ ...request, requestId });
        });
    }

    terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.pendingRequests.clear();
    }

    getStats() {
        return {
            pending: this.pendingRequests.size,
            initialized: this.worker !== null
        };
    }
}

export const workerManager = new WorkerManager();
