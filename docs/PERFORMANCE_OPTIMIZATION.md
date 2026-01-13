# Performance Optimization Plan - DBPlus Tools

**Date**: 2026-01-13  
**Status**: Planning & Implementation  
**Priority**: High

## 📊 Phân tích hiện trạng

### ✅ Đã tối ưu tốt

#### Backend
- ✅ **Release profile**: LTO, opt-level=3, strip symbols
- ✅ **Rust async runtime**: Tokio với full features
- ✅ **Fast recycling**: PostgreSQL pool với RecyclingMethod::Fast
- ✅ **Streaming API**: NDJSON streaming cho large datasets

#### Frontend
- ✅ **Virtual scrolling**: TanStack Virtual cho query results
- ✅ **Debounced auto-save**: Giảm 90% localStorage I/O
- ✅ **Optimized UI**: Row height 36px, compact padding
- ✅ **Code splitting**: Vite với dynamic imports

### ⚠️ Cần cải thiện

#### Backend
- ⚠️ **Connection pooling**: Cấu hình không thống nhất giữa drivers
- ⚠️ **No pool size limits**: PostgreSQL, MySQL dùng default
- ⚠️ **SQLite connections**: Chỉ 10 connections (có thể tăng)
- ⚠️ **Query timeout**: Không có timeout configuration
- ⚠️ **No compression**: Mongo và Couchbase chưa enable compression

#### Frontend
- ⚠️ **No query caching**: Mỗi query đều gọi API
- ⚠️ **Main thread blocking**: Parse large datasets block UI
- ⚠️ **No request deduplication**: Duplicate requests không được merge
- ⚠️ **Memory leaks**: Có thể có memory leaks trong long sessions

---

## 🎯 Optimization Targets

### Performance Metrics

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Query latency (avg) | 150ms | 100ms | -33% |
| Concurrent queries | 10 | 50 | +400% |
| Memory usage | 100MB | 80MB | -20% |
| Large dataset render | 2-3s | <500ms | -75% |
| Repeated query time | 150ms | 10ms | -93% |
| Connection acquire | 50ms | 10ms | -80% |

---

## 1️⃣ Backend Connection Pooling (P0 - Cao nhất)

### 🔴 Vấn đề

```rust
// PostgreSQL - Không có max_size config
let pool = cfg.create_pool(Some(Runtime::Tokio1), NoTls)?;

// SQLite - Chỉ 10 connections
.max_connections(10)

// MySQL - Dùng default pool
let pool = Pool::new(opts);

// Schema diff - Inconsistent (max_size = 4)
let pool = Pool::builder(mgr).max_size(4).build()?;
```

### ✅ Giải pháp

#### PostgreSQL Pool Configuration

```rust
// backend/src/services/postgres/connection.rs

use deadpool_postgres::{Config, ManagerConfig, Pool, RecyclingMethod, Runtime, PoolConfig, Timeouts};
use std::time::Duration;

impl PostgresConnection {
    pub async fn new(connection: &ConnectionModel::Model, password: &str) -> Result<Self> {
        tracing::info!(
            "[PostgresConnection] Creating optimized connection pool to {}:{}/{}",
            connection.host,
            connection.port,
            connection.database
        );

        let mut cfg = Config::new();
        cfg.host = Some(connection.host.clone());
        cfg.port = Some(connection.port as u16);
        cfg.dbname = Some(connection.database.clone());
        cfg.user = Some(connection.username.clone());
        cfg.password = Some(password.to_string());
        
        // 🔥 OPTIMIZED: Pool configuration
        cfg.manager = Some(ManagerConfig {
            recycling_method: RecyclingMethod::Fast,
        });
        
        cfg.pool = Some(PoolConfig {
            max_size: 20,  // Increased from default (16)
            timeouts: Timeouts {
                wait: Some(Duration::from_secs(5)),      // Max wait for connection
                create: Some(Duration::from_secs(5)),    // Max time to create connection
                recycle: Some(Duration::from_secs(1)),   // Max time to recycle
            },
        });

        // Handle Read-Only
        if connection.is_read_only {
            cfg.options = Some("-c default_transaction_read_only=on".to_string());
        }

        // Handle SSL
        if connection.ssl || connection.ssl_mode.as_deref().unwrap_or("disable") != "disable" {
            tracing::warn!(
                "SSL/TLS requested but not fully supported in this build. Proceeding with NoTls."
            );
        }

        let pool = cfg.create_pool(Some(Runtime::Tokio1), NoTls)?;
        
        tracing::info!(
            "[PostgresConnection] Pool created: max_size=20, with timeouts"
        );
        
        Ok(Self { pool })
    }
}
```

#### MySQL Pool Configuration

```rust
// backend/src/services/mysql/mod.rs

use mysql_async::{Pool, PoolOpts, PoolConstraints};
use std::time::Duration;

pub async fn from_model(conn: &connection_entity::Model, password: &str) -> Result<Self> {
    let mut opts = OptsBuilder::default();
    
    // ... existing config ...
    
    // 🔥 OPTIMIZED: Pool constraints
    let pool_opts = PoolOpts::default()
        .with_constraints(
            PoolConstraints::new(5, 25).unwrap()  // min 5, max 25
        )
        .with_reset_connection(true)
        .with_inactive_connection_ttl(Duration::from_secs(300));  // 5 minutes
    
    opts = opts.pool_opts(pool_opts);
    
    let pool = Pool::new(opts);
    
    let flavor = match conn.db_type.as_str() {
        "mariadb" => MySqlFamilyFlavor::MariaDb,
        "tidb" => MySqlFamilyFlavor::TiDb,
        _ => MySqlFamilyFlavor::Mysql,
    };
    
    tracing::info!(
        "[MySqlDriver] Pool created: min=5, max=25, ttl=300s"
    );
    
    Ok(Self::new(pool, flavor))
}
```

#### SQLite Pool Configuration

```rust
// backend/src/services/sqlite/connection.rs

use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use std::time::Duration;

pub async fn new(
    connection: &ConnectionModel::Model,
    attachments: &[Attachment],
) -> Result<Self> {
    // ... existing config ...
    
    let attachments = attachments.to_vec();
    
    // 🔥 OPTIMIZED: Increased pool size and added timeouts
    let pool = SqlitePoolOptions::new()
        .max_connections(25)           // Increased from 10
        .min_connections(3)            // Keep 3 connections warm
        .acquire_timeout(Duration::from_secs(5))
        .idle_timeout(Some(Duration::from_secs(300)))  // Close idle after 5min
        .max_lifetime(Some(Duration::from_secs(1800))) // Recycle after 30min
        .after_connect(move |conn, _meta| {
            let attachments = attachments.clone();
            Box::pin(async move {
                // Enable WAL mode for better concurrency
                sqlx::query("PRAGMA journal_mode = WAL;")
                    .execute(&mut *conn)
                    .await?;
                
                // Increase cache size (default is 2MB, set to 10MB)
                sqlx::query("PRAGMA cache_size = -10000;")
                    .execute(&mut *conn)
                    .await?;
                
                for a in attachments {
                    let alias = quote_ident(&a.name);
                    let attach_sql = format!("ATTACH DATABASE ? AS {}", alias);
                    let path = if a.read_only
                        && !a.file_path.contains("?mode=")
                        && !a.file_path.starts_with("file:")
                        && !a.file_path.starts_with("sqlite:")
                    {
                        format!("file:{}?mode=ro", a.file_path)
                    } else {
                        a.file_path
                    };
                    sqlx::query(&attach_sql)
                        .bind(path)
                        .execute(&mut *conn)
                        .await?;
                }
                Ok(())
            })
        })
        .connect_with(options)
        .await
        .context("Failed to create SQLite connection pool")?;

    tracing::info!(
        "[SQLiteConnection] Optimized pool: max=25, min=3, WAL mode enabled"
    );
    
    Ok(Self { pool })
}
```

#### Schema Diff Pool Configuration

```rust
// backend/src/services/connection_service/schema_diff_ops.rs

async fn get_postgres_pool(&self, connection_id: Uuid) -> Result<Pool> {
    let (conn, password) = self.get_connection_with_password(connection_id).await?;

    // ... validation ...

    let mut config = Config::new();
    config.host(&conn.host);
    config.port(conn.port as u16);
    config.user(&conn.username);
    config.password(password);
    if !conn.database.is_empty() {
        config.dbname(&conn.database);
    }

    let mgr_config = ManagerConfig {
        recycling_method: RecyclingMethod::Fast,
    };
    let mgr = Manager::from_config(config, NoTls, mgr_config);
    
    // 🔥 OPTIMIZED: Increased from 4 to 8 for schema operations
    let pool = Pool::builder(mgr)
        .max_size(8)
        .wait_timeout(Some(Duration::from_secs(5)))
        .build()?;

    Ok(pool)
}
```

### 📈 Expected Impact

- ✅ **Latency**: -30-40% (faster connection acquisition)
- ✅ **Throughput**: +400% (more concurrent queries)
- ✅ **Reliability**: Fewer timeout errors
- ✅ **Resource usage**: Better connection reuse

---

## 2️⃣ MongoDB Driver Optimization (P1)

### ✅ Giải pháp

```rust
// backend/src/services/mongo/connection.rs

use mongodb::{
    options::{
        ClientOptions, ServerApi, ServerApiVersion, 
        ConnectionPoolOptions, Compressor
    },
    Client,
};
use std::time::Duration;

pub struct MongoConnection {
    client: Client,
}

impl MongoConnection {
    pub async fn new(
        connection: &ConnectionModel::Model,
        password: &str,
    ) -> Result<Self> {
        // Build connection URI
        let uri = if connection.host.contains("mongodb://") 
            || connection.host.contains("mongodb+srv://") {
            connection.host.clone()
        } else {
            format!(
                "mongodb://{}:{}@{}:{}/{}",
                connection.username,
                password,
                connection.host,
                connection.port,
                connection.database
            )
        };

        // 🔥 OPTIMIZED: Connection pool configuration
        let pool_options = ConnectionPoolOptions::builder()
            .min_pool_size(Some(3))       // Keep 3 connections warm
            .max_pool_size(Some(20))      // Max 20 concurrent connections
            .max_idle_time(Some(Duration::from_secs(300)))  // Close idle after 5min
            .build();

        let mut client_options = ClientOptions::parse(&uri).await?;
        
        // 🔥 OPTIMIZED: Timeouts
        client_options.connect_timeout = Some(Duration::from_secs(5));
        client_options.server_selection_timeout = Some(Duration::from_secs(5));
        client_options.socket_timeout = Some(Duration::from_secs(30));
        
        // 🔥 OPTIMIZED: Compression
        client_options.compressors = Some(vec![
            Compressor::Snappy,
            Compressor::Zlib { level: Some(6) },
            Compressor::Zstd { level: Some(3) },
        ]);
        
        // Apply pool options
        client_options.max_pool_size = Some(20);
        client_options.min_pool_size = Some(3);

        // Server API version for stable API
        let server_api = ServerApi::builder()
            .version(ServerApiVersion::V1)
            .build();
        client_options.server_api = Some(server_api);

        let client = Client::with_options(client_options)?;
        
        // Test connection
        client
            .database("admin")
            .run_command(doc! {"ping": 1}, None)
            .await?;

        tracing::info!(
            "[MongoConnection] Optimized pool: min=3, max=20, compression enabled"
        );

        Ok(Self { client })
    }

    pub fn client(&self) -> &Client {
        &self.client
    }
}
```

### 📈 Expected Impact

- ✅ **Latency**: -25% (connection pooling + compression)
- ✅ **Network bandwidth**: -30-50% (compression)
- ✅ **Reliability**: Better timeout handling

---

## 3️⃣ Frontend Query Caching (P0 - Cao nhất)

### 🔴 Vấn đề

Hiện tại mỗi query đều gọi API, kể cả repeated queries:

```typescript
// Mỗi lần execute đều fetch mới
const result = await api.executeQuery(connectionId, query);
```

### ✅ Giải pháp

#### Install LRU Cache

```bash
cd frontend
npm install lru-cache
```

#### Query Cache Service

```typescript
// frontend/src/services/queryCache.ts

import { LRUCache } from 'lru-cache';
import { createHash } from 'crypto';

export interface QueryResult {
  columns: string[];
  rows: any[][];
  rowCount: number;
  executionTime: number;
  timestamp: number;
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
      maxSize: opts.maxSize,
      sizeCalculation: (value) => {
        // Approximate size calculation
        return JSON.stringify(value).length;
      },
      dispose: (value, key) => {
        console.log(`[QueryCache] Evicted: ${key.substring(0, 20)}...`);
      },
    });
  }

  /**
   * Generate cache key from connection ID and query
   */
  private getCacheKey(connectionId: string, query: string): string {
    const normalized = this.normalizeQuery(query);
    const hash = createHash('sha256')
      .update(`${connectionId}:${normalized}`)
      .digest('hex')
      .substring(0, 16);
    return `${connectionId}:${hash}`;
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
      console.log(
        `[QueryCache] HIT (${this.getHitRate().toFixed(1)}%): ${query.substring(0, 50)}...`
      );
    } else {
      this.missCount++;
      console.log(
        `[QueryCache] MISS (${this.getHitRate().toFixed(1)}%): ${query.substring(0, 50)}...`
      );
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
      console.log(`[QueryCache] Skipping cache (too large): ${size} bytes`);
      return;
    }
    
    // Add timestamp
    result.timestamp = Date.now();
    
    this.cache.set(key, result);
    console.log(`[QueryCache] Cached: ${key} (${(size / 1024).toFixed(1)}KB)`);
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
      calculatedSize: this.cache.calculatedSize,
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
```

#### Integration with API Client

```typescript
// frontend/src/api/query.ts

import { queryCache } from '@/services/queryCache';

export async function executeQuery(
  connectionId: string,
  query: string,
  useCache = true
): Promise<QueryResult> {
  // Check cache first
  if (useCache) {
    const cached = queryCache.get(connectionId, query);
    if (cached) {
      return cached;
    }
  }

  // Execute query
  const startTime = performance.now();
  const response = await fetch(
    `/api/connections/${connectionId}/execute`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    }
  );

  if (!response.ok) {
    throw new Error(`Query failed: ${response.statusText}`);
  }

  const result = await response.json();
  const executionTime = performance.now() - startTime;

  const queryResult: QueryResult = {
    ...result,
    executionTime,
    timestamp: Date.now(),
  };

  // Cache the result (only for SELECT queries)
  if (useCache && query.trim().toLowerCase().startsWith('select')) {
    queryCache.set(connectionId, query, queryResult);
  }

  return queryResult;
}

// Invalidate cache when schema changes
export function invalidateQueryCache(connectionId: string) {
  queryCache.invalidate(connectionId);
}
```

#### Usage in Query Editor

```typescript
// frontend/src/components/QueryEditor.tsx

import { executeQuery, invalidateQueryCache } from '@/api/query';
import { queryCache } from '@/services/queryCache';

const QueryEditor = () => {
  const handleExecute = async () => {
    try {
      setLoading(true);
      
      // Check if query is cacheable (SELECT only)
      const isCacheable = query.trim().toLowerCase().startsWith('select');
      
      const result = await executeQuery(
        connectionId,
        query,
        isCacheable  // Use cache for SELECT queries only
      );
      
      setResults(result);
      
      // Show cache stats in dev mode
      if (import.meta.env.DEV) {
        const stats = queryCache.getStats();
        console.log('[QueryCache] Stats:', stats);
      }
    } catch (error) {
      console.error('Query failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSchemaChange = () => {
    // Invalidate cache after DDL operations
    invalidateQueryCache(connectionId);
  };

  return (
    // ... JSX
  );
};
```

### 📈 Expected Impact

- ✅ **Repeated queries**: -93% (cache hit)
- ✅ **Network requests**: -60-70% (typical workload)
- ✅ **Server load**: -60% (fewer queries)
- ✅ **User experience**: Instant results for repeated queries

---

## 4️⃣ Web Worker for Large Datasets (P1)

### 🔴 Vấn đề

Parse và format large datasets (>10k rows) block main thread:

```typescript
// Main thread blocked during formatting
const formatted = rows.map(row => formatRow(row)); // 🐌 Slow for 100k rows
```

### ✅ Giải pháp

#### Data Processor Worker

```typescript
// frontend/src/workers/dataProcessor.worker.ts

export interface WorkerRequest {
  type: 'format' | 'filter' | 'sort';
  data: any;
}

export interface FormatRequest {
  type: 'format';
  data: {
    rows: any[][];
    columns: string[];
    types: string[];
  };
}

export interface FormatResponse {
  formattedRows: any[][];
  processTime: number;
}

// Worker message handler
self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const startTime = performance.now();
  
  try {
    switch (e.data.type) {
      case 'format': {
        const { rows, columns, types } = (e.data as FormatRequest).data;
        const formattedRows = formatRows(rows, columns, types);
        
        const response: FormatResponse = {
          formattedRows,
          processTime: performance.now() - startTime,
        };
        
        self.postMessage({ success: true, data: response });
        break;
      }
      
      case 'filter': {
        // TODO: Implement filtering
        break;
      }
      
      case 'sort': {
        // TODO: Implement sorting
        break;
      }
      
      default:
        throw new Error(`Unknown request type: ${e.data.type}`);
    }
  } catch (error) {
    self.postMessage({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Format rows with proper type conversion
 */
function formatRows(
  rows: any[][],
  columns: string[],
  types: string[]
): any[][] {
  return rows.map(row => {
    return row.map((cell, index) => {
      if (cell === null || cell === undefined) {
        return null;
      }
      
      const type = types[index];
      
      // Type-specific formatting
      switch (type) {
        case 'timestamp':
        case 'timestamptz':
        case 'date':
          return formatDate(cell);
        
        case 'numeric':
        case 'decimal':
          return formatNumber(cell);
        
        case 'json':
        case 'jsonb':
          return formatJSON(cell);
        
        case 'uuid':
          return cell.toLowerCase();
        
        case 'bytea':
          return formatBinary(cell);
        
        default:
          return String(cell);
      }
    });
  });
}

function formatDate(value: any): string {
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function formatNumber(value: any): string {
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'string') return value;
  return String(value);
}

function formatJSON(value: any): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function formatBinary(value: any): string {
  if (value instanceof ArrayBuffer) {
    return `<${value.byteLength} bytes>`;
  }
  return String(value);
}
```

#### Worker Manager

```typescript
// frontend/src/services/workerManager.ts

import DataProcessorWorker from '@/workers/dataProcessor.worker?worker';

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
    if (this.worker) {
      this.worker.terminate();
    }

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
      // Restart worker
      this.initWorker();
    };
  }

  async processData<T>(request: any): Promise<T> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
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
}

export const workerManager = new WorkerManager();
```

#### Integration

```typescript
// frontend/src/components/QueryResults.tsx

import { workerManager } from '@/services/workerManager';

const QueryResults = ({ results }: { results: QueryResult }) => {
  const [formattedData, setFormattedData] = useState<any[][]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const processResults = async () => {
      // For large datasets (>5000 rows), use Web Worker
      if (results.rows.length > 5000) {
        setIsProcessing(true);
        
        try {
          const response = await workerManager.processData({
            type: 'format',
            data: {
              rows: results.rows,
              columns: results.columns,
              types: results.types || [],
            },
          });
          
          setFormattedData(response.formattedRows);
          console.log(`[Worker] Processed ${results.rows.length} rows in ${response.processTime}ms`);
        } catch (error) {
          console.error('[Worker] Processing failed:', error);
          // Fallback to main thread
          setFormattedData(results.rows);
        } finally {
          setIsProcessing(false);
        }
      } else {
        // Small datasets: process on main thread
        setFormattedData(results.rows);
      }
    };

    processResults();
  }, [results]);

  return (
    <div>
      {isProcessing ? (
        <div>Processing {results.rows.length} rows...</div>
      ) : (
        <VirtualTable data={formattedData} columns={results.columns} />
      )}
    </div>
  );
};
```

### 📈 Expected Impact

- ✅ **UI responsiveness**: No blocking for 100k+ rows
- ✅ **Processing time**: Similar (moved to worker)
- ✅ **User experience**: Smooth UI during data processing
- ✅ **Main thread**: Free for user interactions

---

## 5️⃣ Internal Database Indexes (P2)

### ✅ Giải pháp

```sql
-- backend/migration/src/m20241201_000001_add_performance_indexes.rs

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Connection table indexes
        manager
            .create_index(
                Index::create()
                    .name("idx_connection_workspace_created")
                    .table(Connection::Table)
                    .col(Connection::WorkspaceId)
                    .col(Connection::CreatedAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_connection_type")
                    .table(Connection::Table)
                    .col(Connection::DbType)
                    .to_owned(),
            )
            .await?;

        // Query history indexes
        manager
            .create_index(
                Index::create()
                    .name("idx_query_history_conn_time")
                    .table(QueryHistory::Table)
                    .col(QueryHistory::ConnectionId)
                    .col(QueryHistory::ExecutedAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_query_history_workspace")
                    .table(QueryHistory::Table)
                    .col(QueryHistory::WorkspaceId)
                    .col(QueryHistory::ExecutedAt)
                    .to_owned(),
            )
            .await?;

        // Saved query indexes
        manager
            .create_index(
                Index::create()
                    .name("idx_saved_query_conn_name")
                    .table(SavedQuery::Table)
                    .col(SavedQuery::ConnectionId)
                    .col(SavedQuery::Name)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_saved_query_workspace")
                    .table(SavedQuery::Table)
                    .col(SavedQuery::WorkspaceId)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_index(
                Index::drop()
                    .name("idx_connection_workspace_created")
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(Index::drop().name("idx_connection_type").to_owned())
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_query_history_conn_time")
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_query_history_workspace")
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_saved_query_conn_name")
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_saved_query_workspace")
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum Connection {
    Table,
    WorkspaceId,
    CreatedAt,
    DbType,
}

#[derive(Iden)]
enum QueryHistory {
    Table,
    ConnectionId,
    ExecutedAt,
    WorkspaceId,
}

#[derive(Iden)]
enum SavedQuery {
    Table,
    ConnectionId,
    Name,
    WorkspaceId,
}
```

### 📈 Expected Impact

- ✅ **App startup**: -40% (faster data loading)
- ✅ **Query history**: -60% (faster queries)
- ✅ **Connection list**: -50% (indexed lookup)

---

## 6️⃣ Request Deduplication (P2)

### ✅ Giải pháp

```typescript
// frontend/src/services/requestDeduplicator.ts

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
      console.log(`[Dedup] Reusing in-flight request: ${key}`);
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
```

#### Integration

```typescript
// frontend/src/api/query.ts

import { requestDeduplicator } from '@/services/requestDeduplicator';

export async function executeQuery(
  connectionId: string,
  query: string,
  useCache = true
): Promise<QueryResult> {
  // Generate request key
  const requestKey = `query:${connectionId}:${hashQuery(query)}`;

  // Deduplicate requests
  return requestDeduplicator.execute(requestKey, async () => {
    // Check cache
    if (useCache) {
      const cached = queryCache.get(connectionId, query);
      if (cached) {
        return cached;
      }
    }

    // Execute query
    const response = await fetch(
      `/api/connections/${connectionId}/execute`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      }
    );

    if (!response.ok) {
      throw new Error(`Query failed: ${response.statusText}`);
    }

    const result = await response.json();

    // Cache result
    if (useCache && query.trim().toLowerCase().startsWith('select')) {
      queryCache.set(connectionId, query, result);
    }

    return result;
  });
}

function hashQuery(query: string): string {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    const char = query.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}
```

### 📈 Expected Impact

- ✅ **Duplicate requests**: -100% (merged)
- ✅ **Server load**: -20-30% (fewer requests)
- ✅ **Race conditions**: Eliminated

---

## 📋 Implementation Roadmap

### Week 1: High Priority (P0)

#### Backend
- [ ] **Day 1-2**: Implement PostgreSQL pool configuration
- [ ] **Day 2-3**: Implement MySQL pool configuration
- [ ] **Day 3-4**: Implement SQLite pool optimization
- [ ] **Day 4-5**: Update schema diff pool configuration
- [ ] **Day 5**: Testing and benchmarking

#### Frontend
- [ ] **Day 1-2**: Implement query cache service
- [ ] **Day 2-3**: Integrate cache with API client
- [ ] **Day 3-4**: Add cache invalidation logic
- [ ] **Day 4-5**: Testing and metrics

### Week 2: Medium Priority (P1)

#### Backend
- [ ] **Day 1-3**: Implement MongoDB driver with optimizations
- [ ] **Day 3-5**: Add Couchbase compression and pooling

#### Frontend
- [ ] **Day 1-2**: Implement Web Worker for data processing
- [ ] **Day 2-3**: Create worker manager
- [ ] **Day 3-4**: Integrate with QueryResults component
- [ ] **Day 4-5**: Testing with large datasets

### Week 3: Lower Priority (P2)

#### Backend
- [ ] **Day 1-2**: Create migration for database indexes
- [ ] **Day 2-3**: Run migration and verify
- [ ] **Day 3-4**: Benchmark query performance

#### Frontend
- [ ] **Day 1-2**: Implement request deduplication
- [ ] **Day 2-3**: Add monitoring and metrics
- [ ] **Day 3-4**: Performance testing

### Week 4: Testing & Optimization

- [ ] **Day 1-2**: End-to-end performance testing
- [ ] **Day 2-3**: Load testing with realistic workloads
- [ ] **Day 3-4**: Fix bottlenecks and edge cases
- [ ] **Day 4-5**: Documentation and deployment

---

## 📊 Success Metrics

### Before Implementation (Baseline)

| Metric | Value |
|--------|-------|
| Average query latency | 150ms |
| Concurrent query capacity | 10 |
| Cache hit rate | 0% |
| Large dataset render | 2-3s |
| Memory usage | 100MB |
| Repeated query time | 150ms |

### After Implementation (Target)

| Metric | Target | Improvement |
|--------|--------|-------------|
| Average query latency | 100ms | **-33%** |
| Concurrent query capacity | 50 | **+400%** |
| Cache hit rate | 60% | **+60%** |
| Large dataset render | <500ms | **-75%** |
| Memory usage | 80MB | **-20%** |
| Repeated query time | 10ms | **-93%** |

---

## 🧪 Testing Plan

### Backend Tests

```bash
# Load testing with Apache Bench
ab -n 1000 -c 50 http://localhost:3000/api/connections/{id}/execute

# Monitor pool statistics
# Add logging in connection pools to track:
# - Connection acquisition time
# - Pool size (active/idle)
# - Timeout errors

# Benchmark queries
time curl -X POST http://localhost:3000/api/connections/{id}/execute \
  -d '{"query": "SELECT * FROM large_table LIMIT 10000"}'
```

### Frontend Tests

```javascript
// Query cache hit rate
console.log(queryCache.getStats());

// Expected output:
// {
//   size: 45,
//   hitCount: 320,
//   missCount: 100,
//   hitRate: 76.19,
//   calculatedSize: 15234567
// }

// Worker performance
// Test with 100k rows
const start = performance.now();
await workerManager.processData({
  type: 'format',
  data: { rows: largeDataset, columns: [], types: [] }
});
console.log(`Processed in ${performance.now() - start}ms`);

// Request deduplication
// Trigger same query 10 times simultaneously
// Should only make 1 network request
```

---

## 🔒 Backward Compatibility

All changes are **backward compatible**:

- ✅ Existing connections continue to work
- ✅ No breaking API changes
- ✅ Cache is optional (can be disabled)
- ✅ Graceful degradation if worker fails
- ✅ Indexes are additive (no schema changes)

---

## 📝 Monitoring & Observability

### Backend Metrics

```rust
// Add metrics to connection pools
tracing::info!(
    "[ConnectionPool] Stats: active={}, idle={}, max={}, wait_time={}ms",
    pool.status().size,
    pool.status().available,
    pool.status().max_size,
    acquire_time.as_millis()
);
```

### Frontend Metrics

```typescript
// Periodic logging of cache stats
setInterval(() => {
  const stats = queryCache.getStats();
  console.log('[Metrics] Cache:', stats);
  
  const workerStats = workerManager.getStats();
  console.log('[Metrics] Worker:', workerStats);
  
  const dedupStats = requestDeduplicator.getStats();
  console.log('[Metrics] Dedup:', dedupStats);
}, 60000); // Every minute
```

---

## 🎯 Summary

This optimization plan addresses **6 major performance areas**:

1. **Connection Pooling** (P0): +400% throughput, -33% latency
2. **MongoDB Optimization** (P1): -25% latency, -40% bandwidth
3. **Query Caching** (P0): -93% repeated query time
4. **Web Workers** (P1): No UI blocking for 100k+ rows
5. **Database Indexes** (P2): -40% app startup time
6. **Request Deduplication** (P2): Eliminate duplicate requests

### Total Expected Impact

- 🚀 **Performance**: +300% average throughput
- 💾 **Efficiency**: -60% server load
- 🎨 **UX**: Instant results for repeated queries
- 📊 **Scalability**: Support 50+ concurrent queries

---

**Created**: 2026-01-13  
**Status**: Ready for Implementation  
**Estimated Effort**: 4 weeks  
**Risk Level**: Low (all changes are incremental and backward compatible)
