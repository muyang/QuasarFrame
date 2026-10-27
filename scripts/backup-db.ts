import { mkdirSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const source = process.env.DATABASE_URL || path.join(process.cwd(), 'quasarframe.db');
const directory = path.join(process.cwd(), 'data', 'backups');
mkdirSync(directory, { recursive: true });
const name = `quasarframe-${new Date().toISOString().replaceAll(':', '-')}.db`;
const destination = path.join(directory, name);
async function main() {
  const database = new Database(source, { readonly: true, fileMustExist: true });
  try {
    await database.backup(destination);
    console.log(`数据库快照已保存到 ${destination}`);
  } finally { database.close(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
