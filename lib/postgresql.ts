/**
 * Client RPC – remplace le client AsyncStorage simulé
 * 
 * Ce fichier intercepte tous les appels de méthodes de PostgreSQLService
 * et les envoie au serveur backend via un POST /rpc.
 * 
 * L'adresse du serveur est définie dans BACKEND_URL.
 * 
 * Remplacez 192.168.x.x par l'adresse IP de votre PC sur le réseau local
 * (disponible avec `ipconfig` sur Windows).
 */

// ⚠️ IMPORTANT: remplacez cette IP par l'adresse IP de votre PC (pas 127.0.0.1)
// Exemples: 'http://192.168.1.42:3000', 'http://192.168.0.100:3000'
// Pour un émulateur Android uniquement : 'http://10.0.2.2:3000'
// ⚠️ IMPORTANT: Votre adresse IP locale détectée est 192.168.1.75
const BACKEND_URL = 'http://192.168.1.75:3000';

async function rpc(method: string, ...args: any[]): Promise<any> {
  try {
    const response = await fetch(`${BACKEND_URL}/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, args }),
    });

    const json = await response.json();

    if (!response.ok || json.error) {
      throw new Error(json.error || `Erreur serveur (${response.status})`);
    }

    return json.result;
  } catch (error: any) {
    console.error(`❌ Erreur RPC [${method}]:`, error.message);
    throw error;
  }
}

/**
 * PostgreSQLService proxy – même API qu'avant, mais connecté au vrai PostgreSQL
 */
export class PostgreSQLService {
  static isDemoEmail(email: string): boolean {
    return (email || '').includes('@demo.mychurch.com');
  }

  // Compatibilité avec l'ancien stockage de l'utilisateur courant
  private static _currentUser: any = null;

  static async setCurrentUser(user: any, isDemo: boolean = false): Promise<void> {
    this._currentUser = { ...user, isDemo };
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('my_church_current_user', JSON.stringify({ ...user, isDemo }));
    } catch {}
  }

  static async getCurrentUser(): Promise<any | null> {
    if (this._currentUser) return this._currentUser;
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const raw = await AsyncStorage.getItem('my_church_current_user');
      if (raw) { this._currentUser = JSON.parse(raw); return this._currentUser; }
    } catch {}
    return null;
  }

  static async clearCurrentUser(): Promise<void> {
    this._currentUser = null;
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem('my_church_current_user');
    } catch {}
  }

  // ========== Initialize ==========
  static async initialize(): Promise<void> {
    console.log('✅ Client RPC MyChurch connecté à', BACKEND_URL);
  }

  // ========== CHURCHES ==========
  static async createChurch(data: any, _isDemo?: boolean) { return rpc('createChurch', data); }
  static async getChurch(id: string, _isDemo?: boolean) { return rpc('getChurch', id); }
  static async getChurchByEmail(email: string, _isDemo?: boolean) { return rpc('getChurchByEmail', email); }
  static async getAllChurches(_isDemo?: boolean) { return rpc('getAllChurches'); }
  static async searchChurchesByName(name: string, _isDemo?: boolean) { return rpc('searchChurchesByName', name); }
  static async updateChurch(id: string, updates: any, _isDemo?: boolean) { return rpc('updateChurch', id, updates); }
  static async checkSubscriptionStatus(churchId: string, _isDemo?: boolean) { return rpc('checkSubscriptionStatus', churchId); }
  static async processSubscriptionPayment(churchId: string, type: string, txId: string, paidAt: string) {
    return rpc('processSubscriptionPayment', churchId, type, txId, paidAt);
  }
  static async getChurchById(id: string) { return rpc('getChurchById', id); }

  // ========== USERS ==========
  static async createUser(data: any, _isDemo?: boolean) { return rpc('createUser', data); }
  static async getUserByEmail(email: string, _isDemo?: boolean) { return rpc('getUserByEmail', email); }
  static async getUser(id: string, _isDemo?: boolean) { return rpc('getUser', id); }
  static async getChurchUsers(churchId: string, _isDemo?: boolean) { return rpc('getChurchUsers', churchId); }
  static async updateUser(id: string, updates: any, _isDemo?: boolean) { return rpc('updateUser', id, updates); }
  static async deleteUser(id: string, _isDemo?: boolean) { return rpc('deleteUser', id); }

  static async authenticateUser(email: string, password: string) {
    const result = await rpc('authenticateUser', email, password);
    if (result && result.user) await this.setCurrentUser(result.user, result.isDemo);
    return result;
  }

  static async authenticateByName(firstName: string, lastName: string, role: string, churchEmail: string, password: string) {
    const result = await rpc('authenticateByName', firstName, lastName, role, churchEmail, password);
    if (result && result.user) await this.setCurrentUser(result.user, result.isDemo);
    return result;
  }

  // ========== MEMBERS ==========
  static async createMember(data: any, _isDemo?: boolean) { return rpc('createMember', data); }
  static async getMembers(churchId: string, _isDemo?: boolean) { return rpc('getMembers', churchId); }
  static async getMember(id: string, _isDemo?: boolean) { return rpc('getMember', id); }
  static async updateMember(id: string, updates: any, _isDemo?: boolean) { return rpc('updateMember', id, updates); }
  static async deleteMember(id: string, _isDemo?: boolean) { return rpc('deleteMember', id); }
  static async regenerateMemberQR(id: string, _isDemo?: boolean) { return rpc('regenerateMemberQR', id); }

  // ========== FINANCIAL ==========
  static async createDailyReport(data: any, _isDemo?: boolean) { return rpc('createDailyReport', data); }
  static async getDailyReports(churchId: string, startDate?: string, endDate?: string, _isDemo?: boolean) {
    return rpc('getDailyReports', churchId, startDate, endDate);
  }
  static async createExpense(data: any, _isDemo?: boolean) { return rpc('createExpense', data); }
  static async getExpenses(churchId: string, startDate?: string, endDate?: string, _isDemo?: boolean) {
    return rpc('getExpenses', churchId, startDate, endDate);
  }
  static async approveExpense(id: string, approvedBy: string, _isDemo?: boolean) { return rpc('approveExpense', id, approvedBy); }
  static async updateChurchBalance(churchId: string, amount: number, method: string, type: string, _isDemo?: boolean) {
    return rpc('updateChurchBalance', churchId, amount, method, type);
  }
  static async getFinancialSummary(churchId: string, _isDemo?: boolean) { return rpc('getFinancialSummary', churchId); }

  // ========== EVENTS ==========
  static async createEvent(data: any, _isDemo?: boolean) { return rpc('createEvent', data); }
  static async getEvents(churchId: string, _isDemo?: boolean) { return rpc('getEvents', churchId); }
  static async updateEvent(id: string, updates: any, _isDemo?: boolean) { return rpc('updateEvent', id, updates); }
  static async deleteEvent(id: string, _isDemo?: boolean) { return rpc('deleteEvent', id); }
  static async createAttendance(data: any, _isDemo?: boolean) { return rpc('createAttendance', data); }
  static async getEventAttendances(eventId: string, _isDemo?: boolean) { return rpc('getEventAttendances', eventId); }
  static async updateAttendance(id: string, updates: any, _isDemo?: boolean) { return rpc('updateAttendance', id, updates); }

  // ========== PUBLIC LINKS ==========
  static async createPublicLink(data: any, _isDemo?: boolean) { return rpc('createPublicLink', data); }
  static async getChurchPublicLinks(churchId: string, _isDemo?: boolean) { return rpc('getChurchPublicLinks', churchId); }
  static async getPublicLinksByChurchName(name: string) { return rpc('getPublicLinksByChurchName', name); }
  static async deletePublicLink(id: string, _isDemo?: boolean) { return rpc('deletePublicLink', id); }

  // ========== ARCHIVES ==========
  static async createArchive(data: any, _isDemo?: boolean) { return rpc('createArchive', data); }
  static async getArchives(churchId: string, type?: string, _isDemo?: boolean) { return rpc('getArchives', churchId, type); }

  // ========== NOTIFICATIONS ==========
  static async createNotification(data: any, _isDemo?: boolean) { return rpc('createNotification', data); }
  static async getNotifications(churchId: string, _isDemo?: boolean) { return rpc('getNotifications', churchId); }
  static async markNotificationRead(id: string, _isDemo?: boolean) { return rpc('markNotificationRead', id); }

  // ========== PAYMENT TRANSACTIONS ==========
  static async createPaymentTransaction(data: any, _isDemo?: boolean) { return rpc('createPaymentTransaction', data); }
  static async getPaymentTransactions(churchId: string, _isDemo?: boolean) { return rpc('getPaymentTransactions', churchId); }
  static async updatePaymentTransaction(id: string, updates: any, _isDemo?: boolean) { return rpc('updatePaymentTransaction', id, updates); }

  // ========== AUDIT LOGS ==========
  static async createAuditLogEntry(data: any, _isDemo?: boolean) { return rpc('createAuditLogEntry', data); }
  static async getAuditLogs(churchId: string, _isDemo?: boolean) { return rpc('getAuditLogs', churchId); }

  // ========== MESSAGES ==========
  static async createMessage(data: any, _isDemo?: boolean) { return rpc('createMessage', data); }
  static async getMessages(churchId: string, userId: string, _isDemo?: boolean) { return rpc('getMessages', churchId, userId); }
  static async markMessageAsRead(id: string, _isDemo?: boolean) { return rpc('markMessageAsRead', id); }

  // ========== STATS ==========
  static async getChurchStats(churchId: string, _isDemo?: boolean) { return rpc('getChurchStats', churchId); }
}