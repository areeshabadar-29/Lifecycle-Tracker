import mysql, { Pool, PoolConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { initializeFallbackSchemaAndSeed } from './fallback-schema.js';

dotenv.config();

export interface QueryResult {
  insertId: number;
  affectedRows: number;
}

export interface DbConnection {
  beginTransaction(): Promise<void>;
  query<T = any>(sql: string, params?: any[]): Promise<[T, any]>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  release(): void;
}

export interface DatabaseService {
  query<T = any>(sql: string, params?: any[]): Promise<[T, any]>;
  getConnection(): Promise<DbConnection>;
  isFallback: boolean;
  status: string;
}

class SqlJsFallbackAdapter implements DatabaseService {
  private sqlDb!: SqlJsDatabase;
  public isFallback = true;
  public status = 'Initializing Fallback In-Memory Engine';
  private inTransaction = false;

  async init() {
    const SQL = await initSqlJs();
    this.sqlDb = new SQL.Database();
    this.status = 'Running with SQLite/sql.js local engine (MySQL not detected)';
    this.setupSchemaAndSeed();
  }

  private setupSchemaAndSeed() {
    try {
      initializeFallbackSchemaAndSeed(this.sqlDb);
      console.log('✅ Fallback database initialized and seeded with lifecycle history.');
    } catch (err) {
      console.error('Error initializing fallback schema/seed:', err);
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<[T, any]> {
    // Normalization of parameters for sql.js
    const normalizedParams = params.map(p => {
      if (p === undefined) return null;
      if (typeof p === 'boolean') return p ? 1 : 0;
      return p;
    });

    const isSelect = /^\s*(SELECT|PRAGMA|SHOW)/i.test(sql);

    if (isSelect) {
      const stmt = this.sqlDb.prepare(sql);
      stmt.bind(normalizedParams);
      const rows: any[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return [rows as unknown as T, null];
    } else {
      this.sqlDb.run(sql, normalizedParams);
      // Query last inserted ID and affected rows
      const lastIdRes = this.sqlDb.exec('SELECT last_insert_rowid() as id, changes() as affected');
      let insertId = 0;
      let affectedRows = 0;
      if (lastIdRes.length && lastIdRes[0].values.length) {
        insertId = (lastIdRes[0].values[0][0] as number) || 0;
        affectedRows = (lastIdRes[0].values[0][1] as number) || 0;
      }
      const result: QueryResult = { insertId, affectedRows };
      return [result as unknown as T, null];
    }
  }

  async getConnection(): Promise<DbConnection> {
    const self = this;
    return {
      async beginTransaction() {
        self.sqlDb.run('BEGIN TRANSACTION;');
        self.inTransaction = true;
      },
      async query<T = any>(sql: string, params: any[] = []) {
        return self.query<T>(sql, params);
      },
      async commit() {
        if (self.inTransaction) {
          self.sqlDb.run('COMMIT;');
          self.inTransaction = false;
        }
      },
      async rollback() {
        if (self.inTransaction) {
          self.sqlDb.run('ROLLBACK;');
          self.inTransaction = false;
        }
      },
      release() {
        // no-op for in-memory single connection
      }
    };
  }
}

class MySQLAdapter implements DatabaseService {
  public isFallback = false;
  public status = 'Connected to MySQL 8';

  constructor(private pool: Pool) {}

  async query<T = any>(sql: string, params: any[] = []): Promise<[T, any]> {
    return this.pool.query(sql, params) as Promise<[T, any]>;
  }

  async getConnection(): Promise<DbConnection> {
    const conn = await this.pool.getConnection();
    return {
      async beginTransaction() {
        await conn.beginTransaction();
      },
      async query<T = any>(sql: string, params: any[] = []) {
        return conn.query(sql, params) as Promise<[T, any]>;
      },
      async commit() {
        await conn.commit();
      },
      async rollback() {
        await conn.rollback();
      },
      release() {
        conn.release();
      }
    };
  }
}

let activeDb: DatabaseService;

export async function getDb(): Promise<DatabaseService> {
  if (activeDb) return activeDb;

  const dbHost = process.env.DB_HOST;
  const dbUser = process.env.DB_USER;
  const dbPassword = process.env.DB_PASSWORD;
  const dbName = process.env.DB_NAME || 'lifecycle_tracker';
  const dbPort = parseInt(process.env.DB_PORT || '3306', 10);

  // If DB_HOST is set, try MySQL2 first
  if (dbHost) {
    try {
      console.log(`🔌 Attempting MySQL 8 connection to ${dbHost}:${dbPort} as ${dbUser}...`);
      const pool = mysql.createPool({
        host: dbHost,
        port: dbPort,
        user: dbUser,
        password: dbPassword,
        database: dbName,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 3000
      });

      // Test connection
      const [rows] = await pool.query('SELECT 1 as test');
      console.log('✅ Successfully connected to MySQL 8 server!');
      activeDb = new MySQLAdapter(pool);
      return activeDb;
    } catch (err: any) {
      console.warn(`⚠️ MySQL connection to ${dbHost} failed (${err.code || err.message}). Switching to pure SQL.js fallback.`);
    }
  } else {
    console.log('ℹ️ DB_HOST not specified in .env. Initializing local SQL engine.');
  }

  // Fallback to pure SQLite/sql.js
  const fallback = new SqlJsFallbackAdapter();
  await fallback.init();
  activeDb = fallback;
  return activeDb;
}
