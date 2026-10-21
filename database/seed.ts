import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function runSeed() {
  console.log('🌱 Starting Second-Hand Lifecycle Tracker database seed...');

  const dbHost = process.env.DB_HOST || 'localhost';
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'lifecycle_tracker';
  const dbPort = parseInt(process.env.DB_PORT || '3306', 10);

  const connection = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    multipleStatements: true
  });

  try {
    console.log(`Connected to MySQL server at ${dbHost}:${dbPort}`);

    // Create database if not exists
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await connection.query(`USE \`${dbName}\`;`);

    // Run schema
    const schemaFile = path.resolve(process.cwd(), 'database/schema.sql');
    if (fs.existsSync(schemaFile)) {
      console.log('Running schema.sql...');
      const schemaSql = fs.readFileSync(schemaFile, 'utf-8');
      await connection.query(schemaSql);
      console.log('Schema created successfully.');
    }

    // Run seed
    const seedFile = path.resolve(process.cwd(), 'database/seed.sql');
    if (fs.existsSync(seedFile)) {
      console.log('Running seed.sql...');
      const seedSql = fs.readFileSync(seedFile, 'utf-8');
      await connection.query(seedSql);
      console.log('Seed data inserted successfully.');
    }

    console.log('✅ Database setup and demo item with multiple owners seeded successfully!');
  } catch (err) {
    console.error('❌ Error during seeding:', err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runSeed();
