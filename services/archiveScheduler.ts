import { DatabaseService } from '../lib/database';
import { ArchiveManager } from '../utils/archiveManager';
import { NotificationService } from './NotificationService';

export class ArchiveScheduler {
  private static checkInterval: NodeJS.Timeout | null = null;
  private static lastCheckDate: string | null = null;

  /**
   * Initialise le planificateur d'archives automatiques
   */
  static async initialize(churchId: string) {
    console.log('🗄️ Initialisation du planificateur d\'archives...');

    // Vérifier immédiatement si des archives doivent être créées
    await this.checkAndCreateArchives(churchId);

    // Vérifier toutes les heures si on doit créer des archives
    this.checkInterval = setInterval(async () => {
      await this.checkAndCreateArchives(churchId);
    }, 60 * 60 * 1000); // Toutes les heures

    console.log('✅ Planificateur d\'archives initialisé');
  }

  /**
   * Arrête le planificateur
   */
  static stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('🛑 Planificateur d\'archives arrêté');
    }
  }

  /**
   * Vérifie et crée les archives de manière rétroactive si nécessaire
   */
  static async checkAndCreateArchives(churchId: string) {
    try {
      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];

      // Éviter de vérifier plusieurs fois la même heure dans un délai de 5 minutes
      const lastCheck = this.lastCheckDate;
      const currentCheck = now.getTime();
      if (lastCheck && (currentCheck - parseInt(lastCheck)) < 5 * 60 * 1000) {
        return;
      }

      this.lastCheckDate = currentCheck.toString();

      console.log(`📅 Vérification des archives (rétroactive)`);

      // Archive mensuelle: vérifie toujours le mois précédent
      await this.createMonthlyArchive(churchId, now);

      // Archive annuelle: vérifie toujours l'année précédente
      await this.createYearlyArchive(churchId, now);
    } catch (error) {
      console.error('❌ Erreur vérification archives:', error);
    }
  }

  /**
   * Crée une archive mensuelle pour le mois précédent
   */
  private static async createMonthlyArchive(churchId: string, now: Date) {
    try {
      // Calculer le mois précédent
      const previousMonth = new Date(now);
      previousMonth.setMonth(previousMonth.getMonth() - 1);

      const year = previousMonth.getFullYear();
      const month = previousMonth.getMonth() + 1;

      console.log(`📦 Création archive mensuelle: ${year}-${month.toString().padStart(2, '0')}`);

      // Vérifier si l'archive existe déjà
      const existingArchives = await DatabaseService.getArchives(churchId);
      const archiveExists = existingArchives.some(
        archive =>
          archive.period_type === 'monthly' &&
          archive.period_start.startsWith(`${year}-${month.toString().padStart(2, '0')}`)
      );

      if (archiveExists) {
        console.log('ℹ️ Archive mensuelle déjà existante');
        return;
      }

      // Créer l'archive
      const result = await ArchiveManager.createMonthlyArchive(churchId, year, month);

      if (result.success) {
        console.log('✅ Archive mensuelle créée avec succès');

        // Envoyer une notification push
        await this.sendArchiveNotification(
          'Archive mensuelle créée',
          `L'archive de ${this.getMonthName(month)} ${year} a été créée automatiquement.`
        );

        // Envoyer une notification in-app
        await DatabaseService.createNotification({
          church_id: churchId,
          title: '📁 Archive mensuelle créée',
          message: `L'archive automatique de ${this.getMonthName(month)} ${year} a été générée avec succès.`,
          type: 'info'
        });

        // Log l'événement
        const church = await DatabaseService.getChurchById(churchId);
        if (church) {
          await DatabaseService.createAuditLogEntry({
            church_id: churchId,
            user_id: 'SYSTEM',
            action: 'CREATE_ARCHIVE',
            resource_type: 'Archive',
            resource_id: result.archiveId || 'unknown',
            details: {
              type: 'monthly',
              period: `${year}-${month.toString().padStart(2, '0')}`,
              auto: true
            }
          });
        }
      }
    } catch (error) {
      console.error('❌ Erreur création archive mensuelle:', error);
    }
  }

  /**
   * Crée une archive annuelle pour l'année précédente
   */
  private static async createYearlyArchive(churchId: string, now: Date) {
    try {
      const previousYear = now.getFullYear() - 1;

      console.log(`📦 Création archive annuelle: ${previousYear}`);

      // Vérifier si l'archive existe déjà
      const existingArchives = await DatabaseService.getArchives(churchId);
      const archiveExists = existingArchives.some(
        archive =>
          archive.period_type === 'yearly' &&
          archive.period_start.startsWith(`${previousYear}`)
      );

      if (archiveExists) {
        console.log('ℹ️ Archive annuelle déjà existante');
        return;
      }

      // Créer l'archive
      const result = await ArchiveManager.createYearlyArchive(churchId, previousYear);

      if (result.success) {
        console.log('✅ Archive annuelle créée avec succès');

        // Envoyer une notification push
        await this.sendArchiveNotification(
          'Archive annuelle créée',
          `L'archive de l'année ${previousYear} a été créée automatiquement.`
        );

        // Envoyer une notification in-app
        await DatabaseService.createNotification({
          church_id: churchId,
          title: '📁 Archive annuelle créée',
          message: `L'archive automatique de l'année ${previousYear} a été générée avec succès.`,
          type: 'info'
        });

        // Log l'événement
        const church = await DatabaseService.getChurchById(churchId);
        if (church) {
          await DatabaseService.createAuditLogEntry({
            church_id: churchId,
            user_id: 'SYSTEM',
            action: 'CREATE_ARCHIVE',
            resource_type: 'Archive',
            resource_id: result.archiveId || 'unknown',
            details: {
              type: 'yearly',
              period: `${previousYear}`,
              auto: true
            }
          });
        }
      }
    } catch (error) {
      console.error('❌ Erreur création archive annuelle:', error);
    }
  }

  /**
   * Envoie une notification pour informer de la création d'archive
   */
  private static async sendArchiveNotification(title: string, body: string) {
    try {
      await NotificationService.scheduleLocalNotification(title, body, {});
    } catch (error) {
      console.error('❌ Erreur envoi notification:', error);
    }
  }

  /**
   * Retourne le nom du mois en français
   */
  private static getMonthName(month: number): string {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return months[month - 1];
  }

  /**
   * Force la création d'une archive mensuelle (pour test ou manuel)
   */
  static async forceMonthlyArchive(churchId: string, year: number, month: number) {
    await this.createMonthlyArchive(churchId, new Date(year, month - 1, 1));
  }

  /**
   * Force la création d'une archive annuelle (pour test ou manuel)
   */
  static async forceYearlyArchive(churchId: string, year: number) {
    await this.createYearlyArchive(churchId, new Date(year, 0, 1));
  }
}
