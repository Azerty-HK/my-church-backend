// init-db.ts
import 'dotenv/config'; // Charge automatiquement les variables d'environnement depuis .env
import MyChurchMySQLService from './backend/lib/mysql.ts'; 

/**
 * Script d'initialisation de la base de données MyChurch
 * 
 * Ce script se contente d'appeler la méthode `initialize` définie dans
 * backend/lib/mysql.ts. Toute la logique de création de tables et de 
 * connexion MySQL est gérée dans ce fichier.
 * 
 * Usage:
 *   npx ts-node init-db.ts       # Initialise la base de données
 *   npm run init-db              # Si tu as défini un script npm
 */

async function initDB() {
  try {
    console.log('🚀 Initialisation de la base MyChurch MySQL...');

    // Appel de l'initialisation
    await MyChurchMySQLService.initialize();

    console.log('✅ Base MySQL prête pour MyChurch !');

    // Sortie propre avec code succès
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation MySQL :', error);

    // Sortie avec code d'erreur
    process.exit(1);
  }
}

// Exécution du script
initDB();
