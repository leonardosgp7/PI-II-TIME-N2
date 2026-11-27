/*
Autor: Leonardo Setti Garcia Peres
RA: 26029250
*/

import { readFile } from 'fs/promises';
import * as path from 'path';
import { createConnection, createPool, type Pool, type PoolOptions } from 'mysql2/promise';
import 'dotenv/config';

// Horário de Brasília. O Brasil não tem horário de verão desde 2019, então o
// deslocamento fixo de -03:00 vale o ano todo e não depende das tabelas de fuso do MySQL.
const FUSO_HORARIO = '-03:00';

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
    dateStrings: true,
  };

  const novoPool = createPool(config);

  // Toda conexão nova usa o horário de Brasília em NOW(), CURDATE() e CURRENT_TIMESTAMP
  novoPool.on('connection', (conexao) => {
    conexao.query(`SET time_zone = '${FUSO_HORARIO}'`);
  });

  return novoPool;
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
    // O seed usa NOW() e CURDATE(), então também precisa do horário de Brasília
    await bootstrapConnection.query(`SET time_zone = '${FUSO_HORARIO}'`);
    await bootstrapConnection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);

    const schemaPath = path.resolve(process.cwd(), 'src', 'database', 'schema', 'db.sql');
    const schemaSql = await readFile(schemaPath, 'utf8');

    await bootstrapConnection.query(`USE \`${DB_NAME}\`;`);
    await bootstrapConnection.query(schemaSql);

    // dados iniciais (perfis, status, usuários de teste...). Pode rodar várias vezes sem duplicar
    const seedPath = path.resolve(process.cwd(), 'src', 'database', 'schema', 'seed.sql');
    const seedSql = await readFile(seedPath, 'utf8');
    await bootstrapConnection.query(seedSql);
  } finally {
    await bootstrapConnection.end();
  }
}