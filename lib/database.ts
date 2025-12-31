import 'react-native-get-random-values';
import { PostgreSQLService } from './postgresql';
import type { 
  Church, 
  User,
  Member, 
  DailyReport, 
  Expense, 
  Event,
  Attendance,
  PublicLink, 
  Archive, 
  Notification, 
  PaymentTransaction,
  AuditLogEntry,
  FinancialSummary, 
  ChurchStats,
  CreateUserData,
  PaymentMethod,
  Message
} from '../types/database';

// Service de base de données unifié pour My Church
export class DatabaseService {
  private static currentUserIsDemo = false;

  static async initialize(): Promise<void> {
    await PostgreSQLService.initialize();
  }

  private static async getCurrentUserDemoStatus(): Promise<boolean> {
    try {
      const currentUser = await PostgreSQLService.getCurrentUser();
      return currentUser?.isDemo || false;
    } catch (error) {
      return false;
    }
  }

  // ==================== GESTION DES ÉGLISES ====================
  
  static async createChurch(churchData: Partial<Church>): Promise<Church> {
    const isDemo = PostgreSQLService.isDemoEmail(churchData.email || '');
    return await PostgreSQLService.createChurch(churchData, isDemo);
  }

  static async getChurch(churchId: string): Promise<Church | null> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.getChurch(churchId, isDemo);
  }

  static async updateChurch(churchId: string, updates: Partial<Church>): Promise<Church> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.updateChurch(churchId, updates, isDemo);
  }

  static async getAllChurches(): Promise<Church[]> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.getAllChurches(isDemo);
  }

  static async searchChurchesByName(name: string): Promise<Church[]> {
    // Chercher dans les deux bases (démo et réelle) pour les liens publics
    const [demoResults, realResults] = await Promise.all([
      PostgreSQLService.searchChurchesByName(name, true),
      PostgreSQLService.searchChurchesByName(name, false)
    ]);
    return [...demoResults, ...realResults];
  }

  // ==================== GESTION DES UTILISATEURS ====================

  static async createUser(userData: CreateUserData): Promise<User> {
    const isDemo = PostgreSQLService.isDemoEmail(userData.email);
    return await PostgreSQLService.createUser(userData, isDemo);
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    const isDemo = PostgreSQLService.isDemoEmail(email);
    return await PostgreSQLService.getUserByEmail(email, isDemo);
  }

  static async getUser(userId: string): Promise<User | null> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.getUser(userId, isDemo);
  }

  static async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.updateUser(userId, updates, isDemo);
  }

  static async deleteUser(userId: string): Promise<void> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.deleteUser(userId, isDemo);
  }

  static async getChurchUsers(churchId: string): Promise<User[]> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.getChurchUsers(churchId, isDemo);
  }

  static async authenticateUser(email: string, password: string): Promise<{ user: User; church: Church }> {
    const result = await PostgreSQLService.authenticateUser(email, password);
    this.currentUserIsDemo = result.isDemo;
    return { user: result.user, church: result.church };
  }

  static async authenticateByName(
    firstName: string,
    lastName: string,
    role: string,
    churchEmail: string,
    password: string
  ): Promise<{ user: User; church: Church }> {
    const result = await PostgreSQLService.authenticateByName(
      firstName,
      lastName,
      role,
      churchEmail,
      password
    );
    this.currentUserIsDemo = result.isDemo;
    return { user: result.user, church: result.church };
  }

  static async setCurrentUser(user: User): Promise<void> {
    const isDemo = PostgreSQLService.isDemoEmail(user.email);
    return await PostgreSQLService.setCurrentUser(user, isDemo);
  }

  static async getCurrentUser(): Promise<User | null> {
    return await PostgreSQLService.getCurrentUser();
  }

  static async clearCurrentUser(): Promise<void> {
    this.currentUserIsDemo = false;
    return await PostgreSQLService.clearCurrentUser();
  }

  // ==================== GESTION DES MEMBRES ====================
  
  static async createMember(memberData: Partial<Member>): Promise<Member> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.createMember(memberData, isDemo);
  }

  static async getMembers(churchId: string): Promise<Member[]> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.getMembers(churchId, isDemo);
  }

  static async updateMember(memberId: string, updates: Partial<Member>): Promise<Member> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.updateMember(memberId, updates, isDemo);
  }

  static async deleteMember(memberId: string): Promise<void> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.deleteMember(memberId, isDemo);
  }

  static async regenerateMemberQR(memberId: string): Promise<string> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.regenerateMemberQR(memberId, isDemo);
  }

  // ==================== GESTION FINANCIÈRE ====================
  
  static async createDailyReport(reportData: Partial<DailyReport>): Promise<DailyReport> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.createDailyReport(reportData, isDemo);
  }

  static async getDailyReports(churchId: string, startDate?: string, endDate?: string): Promise<DailyReport[]> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.getDailyReports(churchId, startDate, endDate, isDemo);
  }

  static async createExpense(expenseData: Partial<Expense>): Promise<{ expense: Expense; message: string }> {
    const isDemo = await this.getCurrentUserDemoStatus();
    const result = await PostgreSQLService.createExpense(expenseData, isDemo);
    
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

  static async getExpenses(churchId: string, startDate?: string, endDate?: string): Promise<Expense[]> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.getExpenses(churchId, startDate, endDate, isDemo);
  }

  static async approveExpense(expenseId: string, approvedBy: string): Promise<{ expense: Expense; message: string }> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.approveExpense(expenseId, approvedBy, isDemo);
  }

  static async updateChurchBalance(
    churchId: string, 
    amount: number, 
    paymentMethod: PaymentMethod, 
    type: 'income' | 'expense'
  ): Promise<void> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.updateChurchBalance(churchId, amount, paymentMethod, type, isDemo);
  }

  static async getFinancialSummary(churchId: string): Promise<FinancialSummary> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.getFinancialSummary(churchId, isDemo);
  }

  // ==================== GESTION DES ÉVÉNEMENTS ====================

  static async createEvent(eventData: Partial<Event>): Promise<Event> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.createEvent(eventData, isDemo);
  }

  static async getEvents(churchId: string): Promise<Event[]> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.getEvents(churchId, isDemo);
  }

  static async updateEvent(eventId: string, updates: Partial<Event>): Promise<Event> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.updateEvent(eventId, updates, isDemo);
  }

  static async deleteEvent(eventId: string): Promise<void> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.deleteEvent(eventId, isDemo);
  }

  static async createAttendance(attendanceData: Partial<Attendance>): Promise<Attendance> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.createAttendance(attendanceData, isDemo);
  }

  static async getEventAttendances(eventId: string): Promise<Attendance[]> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.getEventAttendances(eventId, isDemo);
  }

  static async updateAttendance(attendanceId: string, updates: Partial<Attendance>): Promise<Attendance> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.updateAttendance(attendanceId, updates, isDemo);
  }

  // ==================== AUDIT LOG ====================

  static async createAuditLogEntry(entryData: Partial<AuditLogEntry>): Promise<AuditLogEntry> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.createAuditLogEntry(entryData, isDemo);
  }

  static async getAuditLogs(churchId: string): Promise<AuditLogEntry[]> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.getAuditLogs(churchId, isDemo);
  }

  // ==================== LIENS PUBLICS ====================
  
  static async createPublicLink(linkData: Partial<PublicLink>): Promise<PublicLink> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.createPublicLink(linkData, isDemo);
  }

  static async getChurchPublicLinks(churchId: string): Promise<PublicLink[]> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.getChurchPublicLinks(churchId, isDemo);
  }

  static async getPublicLinksByChurchName(churchName: string): Promise<PublicLink[]> {
    return await PostgreSQLService.getPublicLinksByChurchName(churchName);
  }

  static async deletePublicLink(linkId: string): Promise<void> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.deletePublicLink(linkId, isDemo);
  }

  // ==================== ARCHIVES ====================
  
  static async createArchive(archiveData: Partial<Archive>): Promise<Archive> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.createArchive(archiveData, isDemo);
  }

  static async getArchives(churchId: string, type?: 'monthly' | 'yearly'): Promise<Archive[]> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.getArchives(churchId, type, isDemo);
  }

  // ==================== NOTIFICATIONS ====================
  
  static async createNotification(notificationData: Partial<Notification>): Promise<Notification> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.createNotification(notificationData, isDemo);
  }

  static async getNotifications(churchId: string): Promise<Notification[]> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.getNotifications(churchId, isDemo);
  }

  // ==================== TRANSACTIONS DE PAIEMENT ====================
  
  static async createPaymentTransaction(transactionData: Partial<PaymentTransaction>): Promise<PaymentTransaction> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.createPaymentTransaction(transactionData, isDemo);
  }

  static async updatePaymentTransaction(transactionId: string, updates: Partial<PaymentTransaction>): Promise<PaymentTransaction> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.updatePaymentTransaction(transactionId, updates, isDemo);
  }

  static async getPaymentTransactions(churchId: string): Promise<PaymentTransaction[]> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.getPaymentTransactions(churchId, isDemo);
  }

  // ==================== STATISTIQUES ====================
  
  static async getChurchStats(churchId: string): Promise<ChurchStats> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.getChurchStats(churchId, isDemo);
  }

  // ==================== ABONNEMENT ====================
  
  static async checkSubscriptionStatus(churchId: string): Promise<boolean> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.checkSubscriptionStatus(churchId, isDemo);
  }

  // ==================== MESSAGERIE ====================

  static async createMessage(messageData: Partial<Message>): Promise<Message> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.createMessage(messageData, isDemo);
  }

  static async getMessages(churchId: string, userId: string): Promise<Message[]> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.getMessages(churchId, userId, isDemo);
  }

  static async markMessageAsRead(messageId: string): Promise<void> {
    const isDemo = await this.getCurrentUserDemoStatus();
    return await PostgreSQLService.markMessageAsRead(messageId, isDemo);
  }
}