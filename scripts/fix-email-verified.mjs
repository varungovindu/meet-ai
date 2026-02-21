import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const line = env.split('\n').find((l) => l.trim().startsWith('DATABASE_URL='));
if (!line) {
  throw new Error('DATABASE_URL not found in .env');
}
let url = line.split('DATABASE_URL=')[1].trim();
if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
  url = url.slice(1, -1);
}

const sql = neon(url);
await sql('ALTER TABLE "users" ALTER COLUMN "emailVerified" TYPE boolean USING ("emailVerified" IS NOT NULL)');
await sql('ALTER TABLE "users" ALTER COLUMN "emailVerified" SET DEFAULT false');
console.log('emailVerified column converted to boolean');
