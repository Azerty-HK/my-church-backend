import 'react-native-get-random-values';
import { DatabaseService } from '../lib/database';
import type { Archive, DailyReport, Expense } from '../types/database';

export interface ArchiveData {
  dailyReports: DailyReport[];
  expenses: Expense[];
  summary: {
    totalTransactions: number;
    approvedExpenses: number;
    pendingExpenses: number;
    averageDailyIncome: number;
    averageDailyExpense: number;
    topExpenseCategories: { category: string; total: number }[];
  };
}

export class ArchiveManager {
  static async createMonthlyArchive(churchId: string, year: number, month: number): Promise<Archive> {
    try {
      console.log('📁 Création archive mensuelle:', year, month);
      
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Récupérer les données du mois
      const [dailyReports, expenses] = await Promise.all([
        DatabaseService.getDailyReports(churchId, startDateStr, endDateStr),
        DatabaseService.getExpenses(churchId, startDateStr, endDateStr)
      ]);

      const approvedExpenses = expenses.filter(expense => expense.is_approved);
      const totalIncome = dailyReports.reduce((sum, report) => sum + Number(report.amount), 0);
      const totalExpenses = approvedExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

      // Calculer les statistiques
      const daysInMonth = endDate.getDate();
      const averageDailyIncome = totalIncome / daysInMonth;
      const averageDailyExpense = totalExpenses / daysInMonth;

      // Calculer les catégories de dépenses
      const categoryTotals = new Map<string, number>();
      approvedExpenses.forEach(expense => {
        const category = expense.category || 'Général';
        categoryTotals.set(category, (categoryTotals.get(category) || 0) + Number(expense.amount));
      });

      const topExpenseCategories = Array.from(categoryTotals.entries())
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      const archiveData: ArchiveData = {
        dailyReports,
        expenses,
        summary: {
          totalTransactions: dailyReports.length + expenses.length,
          approvedExpenses: approvedExpenses.length,
          pendingExpenses: expenses.length - approvedExpenses.length,
          averageDailyIncome,
          averageDailyExpense,
          topExpenseCategories,
        }
      };

      const archive: Partial<Archive> = {
        church_id: churchId,
        archive_type: 'monthly',
        period: `${year}-${month.toString().padStart(2, '0')}`,
        total_income: totalIncome,
        total_expenses: totalExpenses,
        balance: totalIncome - totalExpenses,
        data: archiveData
      };

      const result = await DatabaseService.createArchive(archive);
      console.log('✅ Archive mensuelle créée');
      return result;
    } catch (error: any) {
      console.error('💥 Erreur createMonthlyArchive:', error);
      throw new Error(`Erreur lors de la création de l'archive mensuelle: ${error.message}`);
    }
  }

  static async createYearlyArchive(churchId: string, year: number): Promise<Archive> {
    try {
      console.log('📁 Création archive annuelle:', year);
      
      // Récupérer toutes les archives mensuelles de l'année
      const monthlyArchives = await DatabaseService.getArchives(churchId, 'monthly');
      const yearArchives = monthlyArchives.filter(archive => 
        archive.period.startsWith(year.toString())
      );

      const totalIncome = yearArchives.reduce((sum, archive) => sum + Number(archive.total_income || 0), 0);
      const totalExpenses = yearArchives.reduce((sum, archive) => sum + Number(archive.total_expenses || 0), 0);

      const yearlyData = {
        monthlyArchives: yearArchives,
        summary: {
          totalMonths: yearArchives.length,
          averageMonthlyIncome: yearArchives.length > 0 ? totalIncome / yearArchives.length : 0,
          averageMonthlyExpenses: yearArchives.length > 0 ? totalExpenses / yearArchives.length : 0,
          bestMonth: yearArchives.reduce((best, current) => 
            (current.total_income || 0) > (best.total_income || 0) ? current : best, 
            yearArchives[0]
          ),
          worstMonth: yearArchives.reduce((worst, current) => 
            (current.total_income || 0) < (worst.total_income || 0) ? current : worst, 
            yearArchives[0]
          ),
        }
      };

      const archive: Partial<Archive> = {
        church_id: churchId,
        archive_type: 'yearly',
        period: year.toString(),
        total_income: totalIncome,
        total_expenses: totalExpenses,
        balance: totalIncome - totalExpenses,
        data: yearlyData
      };

      const result = await DatabaseService.createArchive(archive);
      console.log('✅ Archive annuelle créée');
      return result;
    } catch (error: any) {
      console.error('💥 Erreur createYearlyArchive:', error);
      throw new Error(`Erreur lors de la création de l'archive annuelle: ${error.message}`);
    }
  }

  static shouldCreateMonthlyArchive(): boolean {
    const today = new Date();
    return today.getDate() === 1 && today.getHours() === 0; // Premier jour du mois à minuit
  }

  static shouldCreateYearlyArchive(): boolean {
    const today = new Date();
    return today.getMonth() === 0 && today.getDate() === 1 && today.getHours() === 0; // 1er janvier à minuit
  }

  static async autoArchive(churchId: string): Promise<void> {
    try {
      const today = new Date();
      
      if (this.shouldCreateYearlyArchive()) {
        console.log('📅 Création archive annuelle automatique');
        const lastYear = today.getFullYear() - 1;
        await this.createYearlyArchive(churchId, lastYear);
        
        // Notification automatique
        await DatabaseService.createNotification({
          church_id: churchId,
          title: '📁 Archive annuelle créée',
          message: `L'archive automatique de l'année ${lastYear} a été générée avec succès.`,
          type: 'info'
        });
      } else if (this.shouldCreateMonthlyArchive()) {
        console.log('📅 Création archive mensuelle automatique');
        const lastMonth = today.getMonth() === 0 ? 12 : today.getMonth();
        const year = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
        await this.createMonthlyArchive(churchId, year, lastMonth);
        
        // Notification automatique
        const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
          'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        await DatabaseService.createNotification({
          church_id: churchId,
          title: '📁 Archive mensuelle créée',
          message: `L'archive automatique de ${monthNames[lastMonth - 1]} ${year} a été générée avec succès.`,
          type: 'info'
        });
      }
    } catch (error) {
      console.error('💥 Erreur autoArchive:', error);
    }
  }

  static getArchivePeriodName(archive: Archive): string {
    if (archive.archive_type === 'yearly') {
      return `Année ${archive.period}`;
    }
    
    const [year, month] = archive.period.split('-');
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    
    const monthIndex = parseInt(month) - 1;
    return `${monthNames[monthIndex]} ${year}`;
  }

  static calculateGrowthRate(current: Archive, previous: Archive): number {
    if (!previous || !previous.total_income || previous.total_income === 0) {
      return 0;
    }
    
    const currentIncome = current.total_income || 0;
    const previousIncome = previous.total_income || 0;
    
    return ((currentIncome - previousIncome) / previousIncome) * 100;
  }
}