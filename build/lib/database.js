"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
require("react-native-get-random-values");
const postgresql_1 = require("./postgresql");
const mysql_1 = require("./mysql");
const constants_1 = require("../utils/constants");
// Service de base de données unifié pour My Church
function getDb() {
    return constants_1.DB_PROVIDER === 'mysql' ? mysql_1.MySQLService : postgresql_1.PostgreSQLService;
}
class DatabaseService {
    static async initialize() {
        await getDb().initialize();
    }
    static async getCurrentUserDemoStatus() {
        try {
            const currentUser = await getDb().getCurrentUser();
            return currentUser?.isDemo || false;
        }
        catch (error) {
            return false;
        }
    }
    // ==================== GESTION DES ÉGLISES ====================
    static async createChurch(churchData) {
        const DBImpl = getDb();
        const isDemo = DBImpl.isDemoEmail(churchData.email || '');
        return await DBImpl.createChurch(churchData, isDemo);
    }
    static async getChurch(churchId) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().getChurch(churchId, isDemo);
    }
    static async updateChurch(churchId, updates) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().updateChurch(churchId, updates, isDemo);
    }
    static async getAllChurches() {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().getAllChurches(isDemo);
    }
    static async searchChurchesByName(name) {
        // Chercher dans les deux bases (démo et réelle) pour les liens publics
        const DBImpl = getDb();
        const [demoResults, realResults] = await Promise.all([
            DBImpl.searchChurchesByName(name, true),
            DBImpl.searchChurchesByName(name, false)
        ]);
        return [...demoResults, ...realResults];
    }
    // ==================== GESTION DES UTILISATEURS ====================
    static async createUser(userData) {
        const DBImpl = getDb();
        const isDemo = DBImpl.isDemoEmail(userData.email);
        return await DBImpl.createUser(userData, isDemo);
    }
    static async getUserByEmail(email) {
        const DBImpl = getDb();
        const isDemo = DBImpl.isDemoEmail(email);
        return await DBImpl.getUserByEmail(email, isDemo);
    }
    static async getUser(userId) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().getUser(userId, isDemo);
    }
    static async updateUser(userId, updates) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().updateUser(userId, updates, isDemo);
    }
    static async deleteUser(userId) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().deleteUser(userId, isDemo);
    }
    static async getChurchUsers(churchId) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().getChurchUsers(churchId, isDemo);
    }
    static async authenticateUser(email, password) {
        const result = await getDb().authenticateUser(email, password);
        this.currentUserIsDemo = result.isDemo;
        return { user: result.user, church: result.church };
    }
    static async authenticateByName(firstName, lastName, role, churchEmail, password) {
        const result = await getDb().authenticateByName(firstName, lastName, role, churchEmail, password);
        this.currentUserIsDemo = result.isDemo;
        return { user: result.user, church: result.church };
    }
    static async setCurrentUser(user) {
        const DBImpl = getDb();
        const isDemo = DBImpl.isDemoEmail(user.email);
        return await DBImpl.setCurrentUser(user, isDemo);
    }
    static async getCurrentUser() {
        return await getDb().getCurrentUser();
    }
    static async clearCurrentUser() {
        this.currentUserIsDemo = false;
        return await getDb().clearCurrentUser();
    }
    // ==================== GESTION DES MEMBRES ====================
    static async createMember(memberData) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().createMember(memberData, isDemo);
    }
    static async getMembers(churchId) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().getMembers(churchId, isDemo);
    }
    static async updateMember(memberId, updates) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().updateMember(memberId, updates, isDemo);
    }
    static async deleteMember(memberId) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().deleteMember(memberId, isDemo);
    }
    static async regenerateMemberQR(memberId) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().regenerateMemberQR(memberId, isDemo);
    }
    // ==================== GESTION FINANCIÈRE ====================
    static async createDailyReport(reportData) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().createDailyReport(reportData, isDemo);
    }
    static async getDailyReports(churchId, startDate, endDate) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().getDailyReports(churchId, startDate, endDate, isDemo);
    }
    static async createExpense(expenseData) {
        const isDemo = await this.getCurrentUserDemoStatus();
        const result = await getDb().createExpense(expenseData, isDemo);
        // Vérifier si on dépasse le seuil d'approbation et envoyer notifications
        if (expenseData.church_id && expenseData.amount) {
            const church = await this.getChurch(expenseData.church_id);
            if (church && expenseData.amount > (church.expense_limit || 1000)) {
                // Notification au créateur de la dépense (généralement trésorier)
                await this.createNotification({
                    church_id: expenseData.church_id,
                    title: '⚠️ Dépense en attente d\'approbation',
                    message: `Votre dépense de ${expenseData.amount} ${church.currency} pour "${expenseData.description}" dépasse le seuil d'approbation (${church.expense_limit} ${church.currency}). Elle nécessite l'approbation de l'administrateur.`,
                    type: 'warning'
                });
                // Notification à l'administrateur
                await this.createNotification({
                    church_id: expenseData.church_id,
                    title: '🔔 Nouvelle dépense à approuver',
                    message: `Le trésorier a créé une dépense de ${expenseData.amount} ${church.currency} pour "${expenseData.description}" qui dépasse le seuil d'approbation (${church.expense_limit} ${church.currency}). Votre approbation est requise.`,
                    type: 'info'
                });
            }
        }
        return result;
    }
    static async getExpenses(churchId, startDate, endDate) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().getExpenses(churchId, startDate, endDate, isDemo);
    }
    static async approveExpense(expenseId, approvedBy) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().approveExpense(expenseId, approvedBy, isDemo);
    }
    static async updateChurchBalance(churchId, amount, paymentMethod, type) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().updateChurchBalance(churchId, amount, paymentMethod, type, isDemo);
    }
    static async getFinancialSummary(churchId) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().getFinancialSummary(churchId, isDemo);
    }
    // ==================== GESTION DES ÉVÉNEMENTS ====================
    static async createEvent(eventData) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().createEvent(eventData, isDemo);
    }
    static async getEvents(churchId) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().getEvents(churchId, isDemo);
    }
    static async updateEvent(eventId, updates) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().updateEvent(eventId, updates, isDemo);
    }
    static async deleteEvent(eventId) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().deleteEvent(eventId, isDemo);
    }
    static async createAttendance(attendanceData) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().createAttendance(attendanceData, isDemo);
    }
    static async getEventAttendances(eventId) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().getEventAttendances(eventId, isDemo);
    }
    static async updateAttendance(attendanceId, updates) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().updateAttendance(attendanceId, updates, isDemo);
    }
    // ==================== AUDIT LOG ====================
    static async createAuditLogEntry(entryData) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().createAuditLogEntry(entryData, isDemo);
    }
    static async getAuditLogs(churchId) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().getAuditLogs(churchId, isDemo);
    }
    // ==================== LIENS PUBLICS ====================
    static async createPublicLink(linkData) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().createPublicLink(linkData, isDemo);
    }
    static async getChurchPublicLinks(churchId) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().getChurchPublicLinks(churchId, isDemo);
    }
    static async getPublicLinksByChurchName(churchName) {
        return await getDb().getPublicLinksByChurchName(churchName);
    }
    static async deletePublicLink(linkId) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().deletePublicLink(linkId, isDemo);
    }
    // ==================== ARCHIVES ====================
    static async createArchive(archiveData) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().createArchive(archiveData, isDemo);
    }
    static async getArchives(churchId, type) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().getArchives(churchId, type, isDemo);
    }
    // ==================== NOTIFICATIONS ====================
    static async createNotification(notificationData) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().createNotification(notificationData, isDemo);
    }
    static async getNotifications(churchId) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().getNotifications(churchId, isDemo);
    }
    // ==================== TRANSACTIONS DE PAIEMENT ====================
    static async createPaymentTransaction(transactionData) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().createPaymentTransaction(transactionData, isDemo);
    }
    static async updatePaymentTransaction(transactionId, updates) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().updatePaymentTransaction(transactionId, updates, isDemo);
    }
    static async getPaymentTransactions(churchId) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().getPaymentTransactions(churchId, isDemo);
    }
    // ==================== STATISTIQUES ====================
    static async getChurchStats(churchId) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().getChurchStats(churchId, isDemo);
    }
    // ==================== ABONNEMENT ====================
    static async checkSubscriptionStatus(churchId) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().checkSubscriptionStatus(churchId, isDemo);
    }
    // ==================== MESSAGERIE ====================
    static async createMessage(messageData) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().createMessage(messageData, isDemo);
    }
    static async getMessages(churchId, userId) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().getMessages(churchId, userId, isDemo);
    }
    static async markMessageAsRead(messageId) {
        const isDemo = await this.getCurrentUserDemoStatus();
        return await getDb().markMessageAsRead(messageId, isDemo);
    }
}
exports.DatabaseService = DatabaseService;
DatabaseService.currentUserIsDemo = false;
