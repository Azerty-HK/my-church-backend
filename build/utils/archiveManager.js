"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchiveManager = void 0;
require("react-native-get-random-values");
const database_1 = require("../lib/database");
class ArchiveManager {
    static async createMonthlyArchive(churchId, year, month) {
        try {
            console.log('📁 Création archive mensuelle:', year, month);
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];
            // Récupérer les données du mois
            const [dailyReports, expenses] = await Promise.all([
                database_1.DatabaseService.getDailyReports(churchId, startDateStr, endDateStr),
                database_1.DatabaseService.getExpenses(churchId, startDateStr, endDateStr)
            ]);
            const approvedExpenses = expenses.filter(expense => expense.is_approved);
            const totalIncome = dailyReports.reduce((sum, report) => sum + Number(report.amount), 0);
            const totalExpenses = approvedExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
            // Calculer les statistiques
            const daysInMonth = endDate.getDate();
            const averageDailyIncome = totalIncome / daysInMonth;
            const averageDailyExpense = totalExpenses / daysInMonth;
            // Calculer les catégories de dépenses
            const categoryTotals = new Map();
            approvedExpenses.forEach(expense => {
                const category = expense.category || 'Général';
                categoryTotals.set(category, (categoryTotals.get(category) || 0) + Number(expense.amount));
            });
            const topExpenseCategories = Array.from(categoryTotals.entries())
                .map(([category, total]) => ({ category, total }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 5);
            const archiveData = {
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
            const archive = {
                church_id: churchId,
                archive_type: 'monthly',
                period: `${year}-${month.toString().padStart(2, '0')}`,
                total_income: totalIncome,
                total_expenses: totalExpenses,
                balance: totalIncome - totalExpenses,
                data: archiveData
            };
            const result = await database_1.DatabaseService.createArchive(archive);
            console.log('✅ Archive mensuelle créée');
            return result;
        }
        catch (error) {
            console.error('💥 Erreur createMonthlyArchive:', error);
            throw new Error(`Erreur lors de la création de l'archive mensuelle: ${error.message}`);
        }
    }
    static async createYearlyArchive(churchId, year) {
        try {
            console.log('📁 Création archive annuelle:', year);
            // Récupérer toutes les archives mensuelles de l'année
            const monthlyArchives = await database_1.DatabaseService.getArchives(churchId, 'monthly');
            const yearArchives = monthlyArchives.filter(archive => archive.period.startsWith(year.toString()));
            const totalIncome = yearArchives.reduce((sum, archive) => sum + Number(archive.total_income || 0), 0);
            const totalExpenses = yearArchives.reduce((sum, archive) => sum + Number(archive.total_expenses || 0), 0);
            const yearlyData = {
                monthlyArchives: yearArchives,
                summary: {
                    totalMonths: yearArchives.length,
                    averageMonthlyIncome: yearArchives.length > 0 ? totalIncome / yearArchives.length : 0,
                    averageMonthlyExpenses: yearArchives.length > 0 ? totalExpenses / yearArchives.length : 0,
                    bestMonth: yearArchives.reduce((best, current) => (current.total_income || 0) > (best.total_income || 0) ? current : best, yearArchives[0]),
                    worstMonth: yearArchives.reduce((worst, current) => (current.total_income || 0) < (worst.total_income || 0) ? current : worst, yearArchives[0]),
                }
            };
            const archive = {
                church_id: churchId,
                archive_type: 'yearly',
                period: year.toString(),
                total_income: totalIncome,
                total_expenses: totalExpenses,
                balance: totalIncome - totalExpenses,
                data: yearlyData
            };
            const result = await database_1.DatabaseService.createArchive(archive);
            console.log('✅ Archive annuelle créée');
            return result;
        }
        catch (error) {
            console.error('💥 Erreur createYearlyArchive:', error);
            throw new Error(`Erreur lors de la création de l'archive annuelle: ${error.message}`);
        }
    }
    static shouldCreateMonthlyArchive() {
        const today = new Date();
        return today.getDate() === 1 && today.getHours() === 0; // Premier jour du mois à minuit
    }
    static shouldCreateYearlyArchive() {
        const today = new Date();
        return today.getMonth() === 0 && today.getDate() === 1 && today.getHours() === 0; // 1er janvier à minuit
    }
    static async autoArchive(churchId) {
        try {
            const today = new Date();
            if (this.shouldCreateYearlyArchive()) {
                console.log('📅 Création archive annuelle automatique');
                const lastYear = today.getFullYear() - 1;
                await this.createYearlyArchive(churchId, lastYear);
                // Notification automatique
                await database_1.DatabaseService.createNotification({
                    church_id: churchId,
                    title: '📁 Archive annuelle créée',
                    message: `L'archive automatique de l'année ${lastYear} a été générée avec succès.`,
                    type: 'info'
                });
            }
            else if (this.shouldCreateMonthlyArchive()) {
                console.log('📅 Création archive mensuelle automatique');
                const lastMonth = today.getMonth() === 0 ? 12 : today.getMonth();
                const year = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
                await this.createMonthlyArchive(churchId, year, lastMonth);
                // Notification automatique
                const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
                await database_1.DatabaseService.createNotification({
                    church_id: churchId,
                    title: '📁 Archive mensuelle créée',
                    message: `L'archive automatique de ${monthNames[lastMonth - 1]} ${year} a été générée avec succès.`,
                    type: 'info'
                });
            }
        }
        catch (error) {
            console.error('💥 Erreur autoArchive:', error);
        }
    }
    static getArchivePeriodName(archive) {
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
    static calculateGrowthRate(current, previous) {
        if (!previous || !previous.total_income || previous.total_income === 0) {
            return 0;
        }
        const currentIncome = current.total_income || 0;
        const previousIncome = previous.total_income || 0;
        return ((currentIncome - previousIncome) / previousIncome) * 100;
    }
}
exports.ArchiveManager = ArchiveManager;
