import sql from 'mssql';
import dotenv from 'dotenv';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { initializeFallbackSchemaAndSeed } from './fallback-schema.js';

dotenv.config();

export interface DbResult<T = any> {
  recordset: T[];
  rowsAffected: number[];
}

export interface IDbRequest {
  input(name: string, typeOrValue: any, value?: any): IDbRequest;
  query<T = any>(command: string): Promise<DbResult<T>>;
}

export interface IDbTransaction {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  request(): IDbRequest;
}

export interface IDatabaseService {
  isFallback: boolean;
  status: string;
  request(): IDbRequest;
  transaction(): IDbTransaction;
}

// ----------------------------------------------------------------------------
// Real Microsoft SQL Server Adapter (mssql / tedious driver)
// ----------------------------------------------------------------------------
class MssqlAdapter implements IDatabaseService {
  public isFallback = false;
  public status = 'Connected to Microsoft SQL Server via tedious driver';

  constructor(private pool: sql.ConnectionPool) {}

  request(): IDbRequest {
    const req = this.pool.request();
    return {
      input(name: string, typeOrValue: any, value?: any) {
        if (value !== undefined) {
          req.input(name, typeOrValue, value);
        } else {
          req.input(name, typeOrValue);
        }
        return this;
      },
      async query<T = any>(command: string): Promise<DbResult<T>> {
        const res = await req.query<T>(command);
        return {
          recordset: res.recordset || [],
          rowsAffected: res.rowsAffected || [0]
        };
      }
    };
  }

  transaction(): IDbTransaction {
    const tx = new sql.Transaction(this.pool);
    return {
      async begin() {
        await tx.begin();
      },
      async commit() {
        await tx.commit();
      },
      async rollback() {
        await tx.rollback();
      },
      request(): IDbRequest {
        const req = new sql.Request(tx);
        return {
          input(name: string, typeOrValue: any, value?: any) {
            if (value !== undefined) {
              req.input(name, typeOrValue, value);
            } else {
              req.input(name, typeOrValue);
            }
            return this;
          },
          async query<T = any>(command: string): Promise<DbResult<T>> {
            const res = await req.query<T>(command);
            return {
              recordset: res.recordset || [],
              rowsAffected: res.rowsAffected || [0]
            };
          }
        };
      }
    };
  }
}

// ----------------------------------------------------------------------------
// Local T-SQL Emulation Adapter for Zero-Config Preview Mode
// ----------------------------------------------------------------------------
class MssqlFallbackAdapter implements IDatabaseService {
  private sqlDb!: SqlJsDatabase;
  public isFallback = true;
  public status = 'Running with local T-SQL engine (SQL Server not reachable on host)';
  private inTransaction = false;

  async init() {
    const SQL = await initSqlJs();
    this.sqlDb = new SQL.Database();
    initializeFallbackSchemaAndSeed(this.sqlDb);
    console.log('✅ Fallback T-SQL database initialized and seeded with lifecycle history.');
  }

  // Translates T-SQL query with OUTPUT INSERTED.<id>, TOP, etc., for the local engine
  private executeTSql<T = any>(command: string, params: Record<string, any>): DbResult<T> {
    let sqlText = command.trim();

    // Check if this is an INSERT with OUTPUT INSERTED.<col>
    const outputMatch = sqlText.match(/INSERT\s+INTO\s+([a-zA-Z0-9_\.\[\]]+)\s*\(([^\)]+)\)\s+OUTPUT\s+INSERTED\.([a-zA-Z0-9_]+)\s+VALUES\s*\(([^\)]+)\)/i);
    let outputCol: string | null = null;
    let targetTable: string | null = null;

    if (outputMatch) {
      targetTable = outputMatch[1].replace(/[\[\]]/g, '').replace(/^dbo\./i, '');
      outputCol = outputMatch[3];
      // Strip OUTPUT INSERTED.<col> for sqlite engine execution
      sqlText = sqlText.replace(/OUTPUT\s+INSERTED\.[a-zA-Z0-9_]+\s+/i, '');
    }

    // Strip dbo. schema prefix for local SQLite engine
    sqlText = sqlText.replace(/\bdbo\./gi, '');

    // Convert TOP in subqueries: (SELECT TOP 1 ... ORDER BY ...) -> (SELECT ... ORDER BY ... LIMIT 1)
    sqlText = sqlText.replace(/\(SELECT\s+TOP\s+(\d+)\s+([^)]+)\)/gi, '(SELECT $2 LIMIT $1)');

    // Convert outer SELECT TOP <n> to LIMIT <n>
    const topMatch = sqlText.match(/^SELECT\s+TOP\s+(\d+)\s+/i);
    let topLimit: number | null = null;
    if (topMatch) {
      topLimit = parseInt(topMatch[1], 10);
      sqlText = sqlText.replace(/^SELECT\s+TOP\s+\d+\s+/i, 'SELECT ');
    }

    // Replace @params with values safely
    const orderedParams: any[] = [];
    const normalizedSql = sqlText.replace(/@([a-zA-Z0-9_]+)/g, (_match, name) => {
      const val = params[name];
      orderedParams.push(val === undefined ? null : val);
      return '?';
    });

    let finalSql = normalizedSql;
    if (topLimit !== null && !/LIMIT\s+\d+/i.test(finalSql)) {
      finalSql += ` LIMIT ${topLimit}`;
    }

    const isSelect = /^\s*SELECT/i.test(finalSql);

    if (isSelect) {
      const stmt = this.sqlDb.prepare(finalSql);
      stmt.bind(orderedParams);
      const rows: any[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return { recordset: rows as T[], rowsAffected: [rows.length] };
    } else {
      this.sqlDb.run(finalSql, orderedParams);

      if (outputCol && targetTable) {
        // Query last inserted row's requested output column
        const lastIdRes = this.sqlDb.exec(`SELECT ${outputCol} FROM ${targetTable} ORDER BY ${outputCol} DESC LIMIT 1`);
        let insertedId = 0;
        if (lastIdRes.length && lastIdRes[0].values.length) {
          insertedId = Number(lastIdRes[0].values[0][0]) || 0;
        }
        const recordset = [{ [outputCol]: insertedId }] as unknown as T[];
        return { recordset, rowsAffected: [1] };
      }

      const changesRes = this.sqlDb.exec('SELECT changes() as affected');
      let affected = 1;
      if (changesRes.length && changesRes[0].values.length) {
        affected = Number(changesRes[0].values[0][0]) || 0;
      }
      return { recordset: [] as T[], rowsAffected: [affected] };
    }
  }

  request(): IDbRequest {
    const params: Record<string, any> = {};
    const self = this;

    return {
      input(name: string, typeOrValue: any, value?: any) {
        params[name] = value !== undefined ? value : typeOrValue;
        return this;
      },
      async query<T = any>(command: string): Promise<DbResult<T>> {
        return self.executeTSql<T>(command, params);
      }
    };
  }

  transaction(): IDbTransaction {
    const self = this;
    return {
      async begin() {
        self.sqlDb.run('BEGIN TRANSACTION;');
        self.inTransaction = true;
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
      request(): IDbRequest {
        return self.request();
      }
    };
  }
}

let activeDb: IDatabaseService | null = null;

export async function getDb(): Promise<IDatabaseService> {
  if (activeDb) return activeDb;

  const server = process.env.DB_SERVER;
  const port = parseInt(process.env.DB_PORT || '1433', 10);
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME || 'lifecycle_tracker';
  const encrypt = process.env.DB_ENCRYPT === 'true';
  const trustServerCertificate = process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false';

  if (server) {
    try {
      console.log(`🔌 Attempting Microsoft SQL Server connection to ${server}:${port} (Database: ${database})...`);
      const pool = await sql.connect({
        server,
        port,
        user,
        password,
        database,
        options: {
          encrypt,
          trustServerCertificate,
          connectTimeout: 3000
        }
      });

      console.log('✅ Successfully connected to Microsoft SQL Server via tedious!');
      activeDb = new MssqlAdapter(pool);
      return activeDb;
    } catch (err: any) {
      console.warn(`⚠️ Microsoft SQL Server connection to ${server} failed: ${err.message}. Engaging local T-SQL engine.`);
    }
  } else {
    console.log('ℹ️ DB_SERVER not configured in .env. Initializing local T-SQL engine.');
  }

  const fallback = new MssqlFallbackAdapter();
  await fallback.init();
  activeDb = fallback;
  return activeDb;
}

export { sql };
