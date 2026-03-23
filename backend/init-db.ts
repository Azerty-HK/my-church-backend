import 'dotenv/config';
import { initDB } from './lib/postgres';

async function main() {
  try {
    console.log('🚀 Initialisation de la base de données PostgreSQL (church_db)...');
    await initDB();
    console.log('✅ Base de données prête ! Toutes les tables ont été créées.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    process.exit(1);
  }
}

main();
