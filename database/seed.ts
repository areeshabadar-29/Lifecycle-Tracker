import fs from 'fs';
import path from 'path';
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

async function runSeed() {
  console.log('🌱 Starting Second-Hand Lifecycle Tracker Microsoft SQL Server seed...');

  const server = process.env.DB_SERVER || 'localhost';
  const port = parseInt(process.env.DB_PORT || '1433', 10);
  const user = process.env.DB_USER || 'sa';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'lifecycle_tracker';
  const encrypt = process.env.DB_ENCRYPT === 'true';
  const trustServerCertificate = process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false';

  const config: sql.config = {
    server,
    port,
    user,
    password,
    database: 'master', // connect to master first to create database
    options: {
      encrypt,
      trustServerCertificate,
      enableArithAbort: true
    }
  };

  let pool: sql.ConnectionPool | null = null;

  try {
    console.log(`Connecting to SQL Server at ${server}:${port} as ${user}...`);
    pool = await sql.connect(config);

    // Create database if not exists
    console.log(`Ensuring database [${database}] exists...`);
    await pool.request().query(`
      IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'${database}')
      BEGIN
        CREATE DATABASE [${database}];
      END
    `);
    await pool.close();

    // Reconnect to target database
    config.database = database;
    pool = await sql.connect(config);
    console.log(`Connected to [${database}].`);

    // Helper to run T-SQL batch separated by GO
    const runBatches = async (filePath: string) => {
      if (!fs.existsSync(filePath)) return;
      console.log(`Executing ${path.basename(filePath)}...`);
      const content = fs.readFileSync(filePath, 'utf-8');
      const batches = content
        .split(/^\s*GO\s*$/gim)
        .map((b) => b.trim())
        .filter((b) => b.length > 0);

      for (const batch of batches) {
        // Skip USE statement if already connected
        if (/^\s*USE\s+\[/i.test(batch)) continue;
        await pool!.request().query(batch);
      }
    };

    const schemaFile = path.resolve(process.cwd(), 'database/schema.sql');
    await runBatches(schemaFile);
    console.log('✅ Schema created successfully.');

    const seedFile = path.resolve(process.cwd(), 'database/seed.sql');
    await runBatches(seedFile);
    console.log('✅ Seed data and multi-owner demo item inserted successfully.');
  } catch (err) {
    console.error('❌ SQL Server setup/seed error:', err);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

runSeed();
