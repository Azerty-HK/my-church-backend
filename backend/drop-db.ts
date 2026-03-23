import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  database: process.env.DB_NAME || 'church_db',
  password: process.env.DB_PASSWORD || 'Azerty',
  port: Number(process.env.DB_PORT) || 5432,
});

async function dropAll() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    
    for (const row of res.rows) {
      console.log(`Dropping table ${row.table_name}...`);
      await pool.query(`DROP TABLE IF EXISTS "${row.table_name}" CASCADE`);
    }
    console.log('✅ All tables dropped!');
  } catch (err: any) {
    console.error('❌ Error dropping tables:', err.message);
  } finally {
    await pool.end();
  }
}

dropAll();
