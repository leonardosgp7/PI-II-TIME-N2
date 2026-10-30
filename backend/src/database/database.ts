/*
Autor: Leonardo Setti Garcia Peres
RA: 26029250
*/

import { readFile } from 'fs/promises';
import * as path from 'path';
import { createConnection, createPool, type Pool, type PoolOptions } from 'mysql2/promise';
import 'dotenv/config';

function getDbConfig() {
  return {
    DB_HOST: process.env.DB_HOST ?? 'localhost',
    DB_USER: process.env.DB_USER ?? 'root',
    DB_PASSWORD: process.env.DB_PASSWORD ?? '',
    DB_NAME: process.env.DB_NAME ?? 'sistema_demandas',
  };
}

export function criarDatabasePool(): Pool {
  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = getDbConfig();

  const config: PoolOptions = {
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true,
  };

  return createPool(config);
}

export const pool = criarDatabasePool();

export async function inicializarDatabase(): Promise<void> {
  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = getDbConfig();

  const bootstrapConnection = await createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  });

  try {
    await bootstrapConnection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);

    const schemaPath = path.resolve(process.cwd(), 'src', 'database', 'schema', 'db.sql');
    const schemaSql = await readFile(schemaPath, 'utf8');

    await bootstrapConnection.query(`USE \`${DB_NAME}\`;`);
    await bootstrapConnection.query(schemaSql);
  } finally {
    await bootstrapConnection.end();
  }
}