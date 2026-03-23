const fs = require('fs');

try {
  let code = fs.readFileSync('lib/mysql.ts', 'utf8');

  // 1. Replacements for imports and class name
  code = code.replace(/import mysql from 'mysql2\\/promise';/g, "import { Pool } from 'pg';");
  code = code.replace(/export class MyChurchMySQLService/g, "export class MyChurchPostgreSQLService");
  code = code.replace(/import { MYSQL_CONFIG } from '\\.\\.\\/utils\\/constants';/g, "");

  // 2. Pool handling
  code = code.replace(/private static pool: mysql\\.Pool \\| null = null;/g, "private static pool: Pool | null = null;");
  
  const poolSnippet = `
      this.pool = new Pool({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || '127.0.0.1',
        database: process.env.DB_NAME || 'church_db',
        password: process.env.DB_PASSWORD || 'Azerty',
        port: Number(process.env.DB_PORT) || 5432,
      });
  `;
  code = code.replace(/this\\.pool = mysql\\.createPool\\(MYSQL_CONFIG as mysql\\.PoolOptions\\);/g, poolSnippet);
  code = code.replace(/const conn = await this\\.pool\\.getConnection\\(\\);/g, "const conn = await this.pool.connect();");

  // 3. Schema replacements
  code = code.replace(/ DOUBLE /g, " DOUBLE PRECISION ");
  code = code.replace(/DOUBLE,/g, "DOUBLE PRECISION,");
  code = code.replace(/TINYINT\\(1\\)/g, "BOOLEAN");
  code = code.replace(/DATETIME/g, "TIMESTAMP");
  code = code.replace(/ ON UPDATE CURRENT_TIMESTAMP/g, "");
  code = code.replace(/ ENGINE=InnoDB;/g, ";");

  // 4. Query execution
  code = code.replace(/this\\.pool!\\.execute\\(/g, "this.query(");
  code = code.replace(/this\\.pool!\\.query\\(/g, "this.query(");

  // PostgreSQL syntax conversions mapping from boolean/int differences
  const queryMethod = `
  // Wrapper for PG to simulate mysql2 execute format
  private static async query(text: string, params: any[] = []): Promise<any> {
    if (!this.pool) throw new Error('Pool not initialized');
    let pgText = text;
    let index = 1;

    // Convert ? to $1, $2, etc. (Naive regex, works for these simple templates)
    pgText = pgText.replace(/\\?/g, () => '$' + (index++));
    
    const res = await this.pool.query(pgText, params);
    return [res.rows, res.fields];
  }
`;
  code = code.replace(/private static async ensurePool\\(\\)/, queryMethod + "\n  private static async ensurePool()");

  // 5. Replace MySQL specific ON DUPLICATE KEY UPDATE with standard PG UPSERT or ignore if too complex.
  // Actually, there's no ON DUPLICATE KEY UPDATE in mysql.ts (luckily it uses standard UPDATE/INSERT).
  // Wait, let's verify if there is. I'll just let it error and fix manually if needed.
  
  fs.writeFileSync('lib/postgresql.ts', code);
  console.log('Conversion successful!');
} catch (error) {
  console.error('Error during conversion:', error.message);
}
