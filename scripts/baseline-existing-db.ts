import { createHash } from 'node:crypto';
import { mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import Database from 'better-sqlite3';

async function main() {
const dbPath = path.resolve(process.env.DATABASE_URL ?? './quasarframe.db');
await stat(dbPath); // Never create a new database by accident.
const snapshot = JSON.parse(await readFile('drizzle/meta/0000_snapshot.json', 'utf8')) as {
  tables: Record<string, { columns: Record<string, unknown> }>;
};
const journal = JSON.parse(await readFile('drizzle/meta/_journal.json', 'utf8')) as {
  entries: Array<{ tag: string; when: number }>;
};

const db = new Database(dbPath);
try {
  const hasJournal = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'").get();
  if (hasJournal) throw new Error('数据库已有迁移记录，无需建立基线');
  for (const [tableName, table] of Object.entries(snapshot.tables)) {
    const columns = db.prepare(`PRAGMA table_info("${tableName}")`).all() as Array<{ name: string }>;
    const expected = Object.keys(table.columns).sort();
    const actual = columns.map(({ name }) => name).sort();
    if (expected.join(',') !== actual.join(',')) {
      throw new Error(`表 ${tableName} 与初始迁移结构不一致，已停止`);
    }
  }
  const duplicateUnlocks = db.prepare(`SELECT 1 FROM unlocks
    GROUP BY user_id, resource_type, resource_id HAVING COUNT(*) > 1 LIMIT 1`).get();
  if (duplicateUnlocks) throw new Error('发现重复解锁记录，需先人工核对');

  const backupDir = path.join(process.cwd(), 'data', 'backups');
  await mkdir(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `quasarframe-before-baseline-${Date.now()}.db`);
  await db.backup(backupPath);

  const first = journal.entries[0];
  if (!first || first.tag !== '0000_puzzling_raider') throw new Error('初始迁移记录不符');
  const hash = createHash('sha256')
    .update(await readFile(`drizzle/${first.tag}.sql`)).digest('hex');
  db.transaction(() => {
    db.exec(`CREATE TABLE __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT, hash TEXT NOT NULL, created_at NUMERIC
    )`);
    db.prepare('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)')
      .run(hash, first.when);
  })();
  console.log(`已建立旧库迁移基线，备份：${backupPath}`);
} finally {
  db.close();
}
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
