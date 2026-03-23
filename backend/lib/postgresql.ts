import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
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
} from '../../types/database';

// Service PostgreSQL simulé avec AsyncStorage pour My Church
export class PostgreSQLService {
  private static readonly STORAGE_KEYS = {
    CHURCHES: 'my_church_churches',
    CHURCHES_DEMO: 'my_church_churches_demo',
    USERS: 'my_church_users',
    USERS_DEMO: 'my_church_users_demo',
    MEMBERS: 'my_church_members',
    MEMBERS_DEMO: 'my_church_members_demo',
    DAILY_REPORTS: 'my_church_daily_reports',
    DAILY_REPORTS_DEMO: 'my_church_daily_reports_demo',
    EXPENSES: 'my_church_expenses',
    EXPENSES_DEMO: 'my_church_expenses_demo',
    EVENTS: 'my_church_events',
    EVENTS_DEMO: 'my_church_events_demo',
    ATTENDANCES: 'my_church_attendances',
    ATTENDANCES_DEMO: 'my_church_attendances_demo',
    PUBLIC_LINKS: 'my_church_public_links',
    PUBLIC_LINKS_DEMO: 'my_church_public_links_demo',
    ARCHIVES: 'my_church_archives',
    ARCHIVES_DEMO: 'my_church_archives_demo',
    NOTIFICATIONS: 'my_church_notifications',
    NOTIFICATIONS_DEMO: 'my_church_notifications_demo',
    PAYMENT_TRANSACTIONS: 'my_church_payment_transactions',
    PAYMENT_TRANSACTIONS_DEMO: 'my_church_payment_transactions_demo',
    AUDIT_LOGS: 'my_church_audit_logs',
    AUDIT_LOGS_DEMO: 'my_church_audit_logs_demo',
    MESSAGES: 'my_church_messages',
    MESSAGES_DEMO: 'my_church_messages_demo',
    CURRENT_USER: 'my_church_current_user',
  };

  static async initialize(): Promise<void> {
    try {
      console.log('🚀 Initialisation PostgreSQL My Church...');
      await this.createDemoData();
      console.log('✅ PostgreSQL My Church initialisé avec succès');
    } catch (error) {
      console.error('💥 Erreur initialisation PostgreSQL:', error);
      throw error;
    }
  }

  static isDemoEmail(email: string): boolean {
    return email.includes('@demo.mychurch.com');
  }

  private static getStorageKey(baseKey: string, isDemo: boolean): string {
    return isDemo ? `${baseKey}_DEMO` : baseKey;
  }

  private static async getData<T>(key: string, isDemo: boolean = false): Promise<T[]> {
    try {
      const storageKey = this.getStorageKey(key, isDemo);
      const data = await AsyncStorage.getItem(storageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`❌ Erreur lecture ${key}:`, error);
      return [];
    }
  }

  private static async setData<T>(key: string, data: T[], isDemo: boolean = false): Promise<void> {
    try {
      const storageKey = this.getStorageKey(key, isDemo);
      await AsyncStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.error(`❌ Erreur écriture ${key}:`, error);
      throw error;
    }
  }

  // ==================== CRÉATION DES DONNÉES DE DÉMO ====================
  
  private static async createDemoData(): Promise<void> {
    try {
      const existingChurches = await this.getData<Church>(this.STORAGE_KEYS.CHURCHES, true);
      if (existingChurches.length > 0) {
        console.log('✅ Données démo My Church déjà présentes');
        return;
      }

      console.log('🎭 Création données démo My Church...');

      // Créer l'église de démo
      const demoChurch: Church = {
        id: uuidv4(),
        name: 'Église de Démonstration My Church',
        address: '123 Avenue de la Paix, Kinshasa, RDC',
        email: 'admin@demo.mychurch.com',
        phone: '+243 123 456 789',
        logo_url: 'https://images.pexels.com/photos/208315/pexels-photo-208315.jpeg?auto=compress&cs=tinysrgb&w=400',
        currency: 'FC',
        initial_amount: 50000,
        current_balance: 75000,
        bank_balance: 25000,
        theme: 'blue',
        expense_limit: 5000,
        subscription_type: 'yearly',
        subscription_start: new Date().toISOString(),
        subscription_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        trial_end: null,
        setup_completed: true,
        is_active: true,
        api_key: 'MC_API_DEMO_2024_HENOCK_ADUMA',
        update_code: 'MC_UPDATE_DEMO_2024',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await this.setData(this.STORAGE_KEYS.CHURCHES, [demoChurch], true);

      // Créer les utilisateurs de démo
      const demoUsers: User[] = [
        {
          id: uuidv4(),
          church_id: demoChurch.id,
          email: 'admin@demo.mychurch.com',
          password_hash: await bcrypt.hash('demo123', 10),
          role: 'Admin',
          first_name: 'Admin',
          last_name: 'Principal',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: uuidv4(),
          church_id: demoChurch.id,
          email: 'tresorier@demo.mychurch.com',
          password_hash: await bcrypt.hash('demo123', 10),
          role: 'Trésorier',
          first_name: 'Marie',
          last_name: 'Trésorier',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: uuidv4(),
          church_id: demoChurch.id,
          email: 'secretaire@demo.mychurch.com',
          password_hash: await bcrypt.hash('demo123', 10),
          role: 'Secrétaire',
          first_name: 'Jean',
          last_name: 'Secrétaire',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: uuidv4(),
          church_id: demoChurch.id,
          email: 'lecteur@demo.mychurch.com',
          password_hash: await bcrypt.hash('demo123', 10),
          role: 'Lecteur',
          first_name: 'Paul',
          last_name: 'Lecteur',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      await this.setData(this.STORAGE_KEYS.USERS, demoUsers, true);

      // Créer des membres de démo
      const demoMembers: Member[] = [
        {
          id: uuidv4(),
          church_id: demoChurch.id,
          first_name: 'Pasteur',
          last_name: 'Principal',
          email: 'pasteur@demo.mychurch.com',
          phone: '+243 987 654 321',
          address: '456 Rue de l\'Église, Kinshasa',
          member_type: 'Personnel',
          position: 'Pasteur',
          departments: ['Chorale', 'Intercession'],
          salary: 800,
          qr_code: 'MC-DEMO-00001-2024',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: uuidv4(),
          church_id: demoChurch.id,
          first_name: 'Sophie',
          last_name: 'Choriste',
          email: 'sophie@demo.mychurch.com',
          phone: '+243 555 123 456',
          member_type: 'Membre',
          departments: ['Chorale', 'Musique'],
          qr_code: 'MC-DEMO-00002-2024',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: uuidv4(),
          church_id: demoChurch.id,
          first_name: 'David',
          last_name: 'Sécurité',
          email: 'david@demo.mychurch.com',
          phone: '+243 777 888 999',
          member_type: 'Personnel',
          position: 'Sécurité',
          departments: ['Sécurité', 'Accueil'],
          salary: 300,
          qr_code: 'MC-DEMO-00003-2024',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      await this.setData(this.STORAGE_KEYS.MEMBERS, demoMembers, true);

      // Créer des comptes rendus de démo
      const demoReports: DailyReport[] = [
        {
          id: uuidv4(),
          church_id: demoChurch.id,
          amount: 15000,
          description: 'Offrandes du dimanche matin',
          category: 'Offrandes',
          recorded_by: 'Marie Trésorier',
          payment_method: 'cash',
          date: new Date().toISOString().split('T')[0],
          bills_breakdown: [
            { bill_value: 1000, bill_label: '1000 FC', quantity: 10, total: 10000 },
            { bill_value: 500, bill_label: '500 FC', quantity: 10, total: 5000 },
          ],
          total_calculated: 15000,
          created_at: new Date().toISOString(),
        },
        {
          id: uuidv4(),
          church_id: demoChurch.id,
          amount: 8000,
          description: 'Dîmes du mois',
          category: 'Dîmes',
          recorded_by: 'Marie Trésorier',
          payment_method: 'bank',
          date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          created_at: new Date().toISOString(),
        },
      ];

      await this.setData(this.STORAGE_KEYS.DAILY_REPORTS, demoReports, true);

      // Créer des dépenses de démo
      const demoExpenses: Expense[] = [
        {
          id: uuidv4(),
          church_id: demoChurch.id,
          amount: 3000,
          description: 'Achat matériel de nettoyage',
          category: 'Maintenance',
          recorded_by: 'Jean Secrétaire',
          payment_method: 'cash',
          requires_approval: false,
          is_approved: true,
          approved_by: 'Admin Principal',
          date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
        },
        {
          id: uuidv4(),
          church_id: demoChurch.id,
          amount: 7000,
          description: 'Réparation système sonore',
          category: 'Équipement',
          recorded_by: 'Marie Trésorier',
          payment_method: 'cash',
          requires_approval: true,
          is_approved: false,
          date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
        },
      ];

      await this.setData(this.STORAGE_KEYS.EXPENSES, demoExpenses, true);

      // Créer des liens publics de démo
      const demoLinks: PublicLink[] = [
        {
          id: uuidv4(),
          church_id: demoChurch.id,
          title: 'Chaîne YouTube officielle',
          url: 'https://youtube.com/demo-church',
          description: 'Retrouvez tous nos cultes en direct et en replay',
          platform: 'YouTube',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: uuidv4(),
          church_id: demoChurch.id,
          title: 'Page Facebook',
          url: 'https://facebook.com/demo-church',
          description: 'Suivez notre actualité et nos événements',
          platform: 'Facebook',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      await this.setData(this.STORAGE_KEYS.PUBLIC_LINKS, demoLinks, true);

      console.log('✅ Données démo My Church créées avec succès');
    } catch (error) {
      console.error('💥 Erreur création données démo:', error);
      throw error;
    }
  }

  // ==================== GESTION DES ÉGLISES ====================
  
  static async createChurch(churchData: Partial<Church>, isDemo: boolean = false): Promise<Church> {
    try {
      const churches = await this.getData<Church>(this.STORAGE_KEYS.CHURCHES, isDemo);
      
      const church: Church = {
        id: uuidv4(),
        name: churchData.name || '',
        address: churchData.address,
        email: churchData.email || '',
        phone: churchData.phone,
        logo_url: churchData.logo_url,
        currency: churchData.currency || 'FC',
        initial_amount: churchData.initial_amount || 0,
        current_balance: churchData.initial_amount || 0,
        bank_balance: 0,
        theme: churchData.theme || 'blue',
        expense_limit: churchData.expense_limit || 1000,
        subscription_type: churchData.subscription_type || 'trial',
        subscription_start: churchData.subscription_start,
        subscription_end: churchData.subscription_end,
        trial_end: churchData.trial_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        setup_completed: true,
        is_active: true,
        api_key: `MC_API_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        update_code: `MC_UPDATE_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      churches.push(church);
      await this.setData(this.STORAGE_KEYS.CHURCHES, churches, isDemo);
      
      return church;
    } catch (error) {
      console.error('💥 Erreur createChurch:', error);
      throw error;
    }
  }

  static async getChurch(churchId: string, isDemo: boolean = false): Promise<Church | null> {
    try {
      const churches = await this.getData<Church>(this.STORAGE_KEYS.CHURCHES, isDemo);
      return churches.find(c => c.id === churchId) || null;
    } catch (error) {
      console.error('💥 Erreur getChurch:', error);
      return null;
    }
  }

  static async updateChurch(churchId: string, updates: Partial<Church>, isDemo: boolean = false): Promise<Church> {
    try {
      const churches = await this.getData<Church>(this.STORAGE_KEYS.CHURCHES, isDemo);
      const index = churches.findIndex(c => c.id === churchId);
      
      if (index === -1) {
        throw new Error('Église introuvable');
      }

      churches[index] = {
        ...churches[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };

      await this.setData(this.STORAGE_KEYS.CHURCHES, churches, isDemo);
      return churches[index];
    } catch (error) {
      console.error('💥 Erreur updateChurch:', error);
      throw error;
    }
  }

  static async getAllChurches(isDemo: boolean = false): Promise<Church[]> {
    return await this.getData<Church>(this.STORAGE_KEYS.CHURCHES, isDemo);
  }

  static async searchChurchesByName(name: string, isDemo: boolean = false): Promise<Church[]> {
    try {
      const churches = await this.getData<Church>(this.STORAGE_KEYS.CHURCHES, isDemo);
      const query = name.toLowerCase().trim();
      return churches.filter(church => 
        church.name.toLowerCase().includes(query)
      );
    } catch (error) {
      console.error('💥 Erreur searchChurchesByName:', error);
      return [];
    }
  }

  // ==================== GESTION DES UTILISATEURS ====================

  static async createUser(userData: CreateUserData, isDemo: boolean = false): Promise<User> {
    try {
      const users = await this.getData<User>(this.STORAGE_KEYS.USERS, isDemo);
      
      // Vérifier si l'email existe déjà
      const existingUser = users.find(u => u.email === userData.email.toLowerCase());
      if (existingUser) {
        throw new Error('Un utilisateur avec cet email existe déjà');
      }

      const user: User = {
        id: uuidv4(),
        church_id: userData.churchId,
        email: userData.email.toLowerCase(),
        password_hash: await bcrypt.hash(userData.password, 10),
        role: userData.role,
        first_name: userData.firstName,
        last_name: userData.lastName,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      users.push(user);
      await this.setData(this.STORAGE_KEYS.USERS, users, isDemo);
      
      return user;
    } catch (error) {
      console.error('💥 Erreur createUser:', error);
      throw error;
    }
  }

  static async getUserByEmail(email: string, isDemo: boolean = false): Promise<User | null> {
    try {
      const users = await this.getData<User>(this.STORAGE_KEYS.USERS, isDemo);
      return users.find(u => u.email === email.toLowerCase()) || null;
    } catch (error) {
      console.error('💥 Erreur getUserByEmail:', error);
      return null;
    }
  }

  static async getUser(userId: string, isDemo: boolean = false): Promise<User | null> {
    try {
      const users = await this.getData<User>(this.STORAGE_KEYS.USERS, isDemo);
      return users.find(u => u.id === userId) || null;
    } catch (error) {
      console.error('💥 Erreur getUser:', error);
      return null;
    }
  }

  static async updateUser(userId: string, updates: Partial<User>, isDemo: boolean = false): Promise<User> {
    try {
      const users = await this.getData<User>(this.STORAGE_KEYS.USERS, isDemo);
      const index = users.findIndex(u => u.id === userId);
      
      if (index === -1) {
        throw new Error('Utilisateur introuvable');
      }

      if (updates.password_hash) {
        updates.password_hash = await bcrypt.hash(updates.password_hash, 10);
      }

      users[index] = {
        ...users[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };

      await this.setData(this.STORAGE_KEYS.USERS, users, isDemo);
      return users[index];
    } catch (error) {
      console.error('💥 Erreur updateUser:', error);
      throw error;
    }
  }

  static async deleteUser(userId: string, isDemo: boolean = false): Promise<void> {
    try {
      const users = await this.getData<User>(this.STORAGE_KEYS.USERS, isDemo);
      const filteredUsers = users.filter(u => u.id !== userId);
      await this.setData(this.STORAGE_KEYS.USERS, filteredUsers, isDemo);
    } catch (error) {
      console.error('💥 Erreur deleteUser:', error);
      throw error;
    }
  }

  static async getChurchUsers(churchId: string, isDemo: boolean = false): Promise<User[]> {
    try {
      const users = await this.getData<User>(this.STORAGE_KEYS.USERS, isDemo);
      return users.filter(u => u.church_id === churchId);
    } catch (error) {
      console.error('💥 Erreur getChurchUsers:', error);
      return [];
    }
  }

  static async authenticateUser(email: string, password: string): Promise<{ user: User; church: Church; isDemo: boolean }> {
    try {
      const isDemo = this.isDemoEmail(email);

      const user = await this.getUserByEmail(email, isDemo);
      if (!user) {
        throw new Error('Email ou mot de passe incorrect');
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Email ou mot de passe incorrect');
      }

      if (!user.is_active) {
        throw new Error('Compte désactivé');
      }

      const church = await this.getChurch(user.church_id, isDemo);
      if (!church) {
        throw new Error('Église introuvable');
      }

      // Mettre à jour la dernière connexion
      await this.updateUser(user.id, { last_login: new Date().toISOString() }, isDemo);

      return { user, church, isDemo };
    } catch (error) {
      console.error('💥 Erreur authenticateUser:', error);
      throw error;
    }
  }

  static async authenticateByName(
    firstName: string,
    lastName: string,
    role: string,
    churchEmail: string,
    password: string
  ): Promise<{ user: User; church: Church; isDemo: boolean }> {
    try {
      const isDemo = this.isDemoEmail(churchEmail);

      const church = await this.getChurchByEmail(churchEmail, isDemo);
      if (!church) {
        throw new Error('Église introuvable');
      }

      const users = await this.getChurchUsers(church.id, isDemo);

      const user = users.find(u =>
        u.first_name.toLowerCase() === firstName.toLowerCase() &&
        u.last_name.toLowerCase() === lastName.toLowerCase() &&
        u.role === role
      );

      if (!user) {
        throw new Error('Utilisateur introuvable. Vérifiez le prénom, nom et rôle.');
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Mot de passe incorrect');
      }

      if (!user.is_active) {
        throw new Error('Compte désactivé');
      }

      await this.updateUser(user.id, { last_login: new Date().toISOString() }, isDemo);

      return { user, church, isDemo };
    } catch (error) {
      console.error('💥 Erreur authenticateByName:', error);
      throw error;
    }
  }

  static async getChurchByEmail(email: string, isDemo: boolean = false): Promise<Church | null> {
    try {
      const churches = await this.getData<Church>(this.STORAGE_KEYS.CHURCHES, isDemo);
      return churches.find(c => c.email.toLowerCase() === email.toLowerCase()) || null;
    } catch (error) {
      console.error('💥 Erreur getChurchByEmail:', error);
      return null;
    }
  }

  static async setCurrentUser(user: User, isDemo: boolean = false): Promise<void> {
    try {
      const userData = { ...user, isDemo };
      await AsyncStorage.setItem(this.STORAGE_KEYS.CURRENT_USER, JSON.stringify(userData));
    } catch (error) {
      console.error('💥 Erreur setCurrentUser:', error);
      throw error;
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEYS.CURRENT_USER);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('💥 Erreur getCurrentUser:', error);
      return null;
    }
  }

  static async clearCurrentUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEYS.CURRENT_USER);
    } catch (error) {
      console.error('💥 Erreur clearCurrentUser:', error);
    }
  }

  // ==================== GESTION DES MEMBRES ====================
  
  static async createMember(memberData: Partial<Member>, isDemo: boolean = false): Promise<Member> {
    try {
      const members = await this.getData<Member>(this.STORAGE_KEYS.MEMBERS, isDemo);
      
      // Générer un numéro séquentiel pour le QR Code
      const memberNumber = members.filter(m => m.church_id === memberData.church_id).length + 1;
      const qrCode = `MC-${memberData.church_id?.substring(0, 6).toUpperCase()}-${memberNumber.toString().padStart(5, '0')}-${Date.now().toString(36).toUpperCase()}`;

      const member: Member = {
        id: uuidv4(),
        church_id: memberData.church_id || '',
        first_name: memberData.first_name || '',
        last_name: memberData.last_name || '',
        email: memberData.email || '',
        phone: memberData.phone,
        address: memberData.address,
        photo_url: memberData.photo_url,
        member_type: memberData.member_type || 'Membre',
        position: memberData.position,
        departments: memberData.departments || [],
        salary: memberData.salary,
        qr_code: qrCode,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      members.push(member);
      await this.setData(this.STORAGE_KEYS.MEMBERS, members, isDemo);
      
      return member;
    } catch (error) {
      console.error('💥 Erreur createMember:', error);
      throw error;
    }
  }

  static async getMembers(churchId: string, isDemo: boolean = false): Promise<Member[]> {
    try {
      const members = await this.getData<Member>(this.STORAGE_KEYS.MEMBERS, isDemo);
      return members.filter(m => m.church_id === churchId && m.is_active);
    } catch (error) {
      console.error('💥 Erreur getMembers:', error);
      return [];
    }
  }

  static async updateMember(memberId: string, updates: Partial<Member>, isDemo: boolean = false): Promise<Member> {
    try {
      const members = await this.getData<Member>(this.STORAGE_KEYS.MEMBERS, isDemo);
      const index = members.findIndex(m => m.id === memberId);
      
      if (index === -1) {
        throw new Error('Membre introuvable');
      }

      members[index] = {
        ...members[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };

      await this.setData(this.STORAGE_KEYS.MEMBERS, members, isDemo);
      return members[index];
    } catch (error) {
      console.error('💥 Erreur updateMember:', error);
      throw error;
    }
  }

  static async deleteMember(memberId: string, isDemo: boolean = false): Promise<void> {
    try {
      const members = await this.getData<Member>(this.STORAGE_KEYS.MEMBERS, isDemo);
      const index = members.findIndex(m => m.id === memberId);
      
      if (index !== -1) {
        members[index].is_active = false;
        await this.setData(this.STORAGE_KEYS.MEMBERS, members, isDemo);
      }
    } catch (error) {
      console.error('💥 Erreur deleteMember:', error);
      throw error;
    }
  }

  static async regenerateMemberQR(memberId: string, isDemo: boolean = false): Promise<string> {
    try {
      const members = await this.getData<Member>(this.STORAGE_KEYS.MEMBERS, isDemo);
      const member = members.find(m => m.id === memberId);
      
      if (!member) {
        throw new Error('Membre introuvable');
      }

      const newQRCode = `MC-${member.church_id.substring(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}-REGEN`;
      
      await this.updateMember(memberId, { qr_code: newQRCode }, isDemo);
      return newQRCode;
    } catch (error) {
      console.error('💥 Erreur regenerateMemberQR:', error);
      throw error;
    }
  }

  // ==================== GESTION FINANCIÈRE ====================
  
  static async createDailyReport(reportData: Partial<DailyReport>, isDemo: boolean = false): Promise<DailyReport> {
    try {
      const reports = await this.getData<DailyReport>(this.STORAGE_KEYS.DAILY_REPORTS, isDemo);
      
      const report: DailyReport = {
        id: uuidv4(),
        church_id: reportData.church_id || '',
        amount: reportData.amount || 0,
        description: reportData.description || '',
        category: reportData.category || 'Offrandes',
        recorded_by: reportData.recorded_by || '',
        payment_method: reportData.payment_method || 'cash',
        date: reportData.date || new Date().toISOString().split('T')[0],
        bills_breakdown: reportData.bills_breakdown,
        total_calculated: reportData.total_calculated,
        created_at: new Date().toISOString(),
      };

      reports.push(report);
      await this.setData(this.STORAGE_KEYS.DAILY_REPORTS, reports, isDemo);

      // Mettre à jour le solde de l'église
      await this.updateChurchBalance(
        report.church_id,
        Number(report.amount),
        report.payment_method,
        'income',
        isDemo
      );
      
      return report;
    } catch (error) {
      console.error('💥 Erreur createDailyReport:', error);
      throw error;
    }
  }

  static async getDailyReports(churchId: string, startDate?: string, endDate?: string, isDemo: boolean = false): Promise<DailyReport[]> {
    try {
      const reports = await this.getData<DailyReport>(this.STORAGE_KEYS.DAILY_REPORTS, isDemo);
      let filtered = reports.filter(r => r.church_id === churchId);

      if (startDate) {
        filtered = filtered.filter(r => r.date >= startDate);
      }
      if (endDate) {
        filtered = filtered.filter(r => r.date <= endDate);
      }

      return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('💥 Erreur getDailyReports:', error);
      return [];
    }
  }

  static async createExpense(expenseData: Partial<Expense>, isDemo: boolean = false): Promise<{ expense: Expense; message: string }> {
    try {
      const expenses = await this.getData<Expense>(this.STORAGE_KEYS.EXPENSES, isDemo);
      const expenseAmount = Number(expenseData.amount);
      const church = await this.getChurch(expenseData.church_id!, isDemo);

      if (!church) {
        throw new Error('Église introuvable');
      }

      // Vérifier le solde disponible selon la source
      const availableBalance = expenseData.payment_method === 'bank' ? church.bank_balance : church.current_balance;
      if (expenseAmount > availableBalance) {
        throw new Error(`Solde insuffisant. Disponible: ${availableBalance} ${church.currency}`);
      }

      const requiresApproval = expenseAmount > (church.expense_limit || 1000) || expenseData.requires_approval;

      const expense: Expense = {
        id: uuidv4(),
        church_id: expenseData.church_id || '',
        amount: expenseAmount,
        description: expenseData.description || '',
        category: expenseData.category || 'Général',
        recorded_by: expenseData.recorded_by || '',
        payment_method: expenseData.payment_method || 'cash',
        requires_approval: requiresApproval,
        is_approved: !requiresApproval,
        approved_by: !requiresApproval ? 'Auto-approuvé' : undefined,
        date: expenseData.date || new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
      };

      expenses.push(expense);
      await this.setData(this.STORAGE_KEYS.EXPENSES, expenses, isDemo);

      // Si approuvée automatiquement, déduire du solde
      if (expense.is_approved) {
        await this.updateChurchBalance(
          expense.church_id,
          expenseAmount,
          expense.payment_method,
          'expense',
          isDemo
        );
      }

      const message = requiresApproval 
        ? `Dépense de ${expenseAmount} ${church.currency} enregistrée et en attente d'approbation (dépasse la limite de ${church.expense_limit} ${church.currency})`
        : `Dépense de ${expenseAmount} ${church.currency} approuvée et déduite du solde ${expense.payment_method === 'bank' ? 'banque' : 'caisse'}`;

      return { expense, message };
    } catch (error) {
      console.error('💥 Erreur createExpense:', error);
      throw error;
    }
  }

  static async getExpenses(churchId: string, startDate?: string, endDate?: string, isDemo: boolean = false): Promise<Expense[]> {
    try {
      const expenses = await this.getData<Expense>(this.STORAGE_KEYS.EXPENSES, isDemo);
      let filtered = expenses.filter(e => e.church_id === churchId);

      if (startDate) {
        filtered = filtered.filter(e => e.date >= startDate);
      }
      if (endDate) {
        filtered = filtered.filter(e => e.date <= endDate);
      }

      return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('💥 Erreur getExpenses:', error);
      return [];
    }
  }

  static async approveExpense(expenseId: string, approvedBy: string, isDemo: boolean = false): Promise<{ expense: Expense; message: string }> {
    try {
      const expenses = await this.getData<Expense>(this.STORAGE_KEYS.EXPENSES, isDemo);
      const index = expenses.findIndex(e => e.id === expenseId);
      
      if (index === -1) {
        throw new Error('Dépense introuvable');
      }

      const expense = expenses[index];
      if (expense.is_approved) {
        throw new Error('Dépense déjà approuvée');
      }

      // Vérifier le solde avant approbation
      const church = await this.getChurch(expense.church_id, isDemo);
      if (!church) {
        throw new Error('Église introuvable');
      }

      const availableBalance = expense.payment_method === 'bank' ? church.bank_balance : church.current_balance;
      if (Number(expense.amount) > availableBalance) {
        throw new Error(`Solde insuffisant pour approuver cette dépense. Disponible: ${availableBalance} ${church.currency}`);
      }

      expenses[index] = {
        ...expense,
        is_approved: true,
        approved_by,
        approval_message: `Approuvé par ${approvedBy} le ${new Date().toLocaleDateString('fr-FR')}`,
        updated_at: new Date().toISOString(),
      };

      await this.setData(this.STORAGE_KEYS.EXPENSES, expenses, isDemo);

      // Déduire du solde
      await this.updateChurchBalance(
        expense.church_id,
        Number(expense.amount),
        expense.payment_method,
        'expense',
        isDemo
      );

      const message = `Dépense de ${expense.amount} ${church.currency} approuvée et déduite du solde ${expense.payment_method === 'bank' ? 'banque' : 'caisse'}`;
      return { expense: expenses[index], message };
    } catch (error) {
      console.error('💥 Erreur approveExpense:', error);
      throw error;
    }
  }

  static async updateChurchBalance(
    churchId: string, 
    amount: number, 
    paymentMethod: PaymentMethod, 
    type: 'income' | 'expense',
    isDemo: boolean = false
  ): Promise<void> {
    try {
      const church = await this.getChurch(churchId, isDemo);
      if (!church) {
        throw new Error('Église introuvable');
      }

      const multiplier = type === 'income' ? 1 : -1;
      const adjustedAmount = amount * multiplier;

      const updates: Partial<Church> = {};

      if (paymentMethod === 'bank') {
        updates.bank_balance = church.bank_balance + adjustedAmount;
      } else {
        updates.current_balance = church.current_balance + adjustedAmount;
      }

      await this.updateChurch(churchId, updates, isDemo);
    } catch (error) {
      console.error('💥 Erreur updateChurchBalance:', error);
      throw error;
    }
  }

  static async getFinancialSummary(churchId: string, isDemo: boolean = false): Promise<FinancialSummary> {
    try {
      const [reports, expenses] = await Promise.all([
        this.getDailyReports(churchId, undefined, undefined, isDemo),
        this.getExpenses(churchId, undefined, undefined, isDemo)
      ]);

      const approvedExpenses = expenses.filter(e => e.is_approved);
      const pendingExpenses = expenses.filter(e => !e.is_approved);

      const totalIncome = reports.reduce((sum, r) => sum + Number(r.amount), 0);
      const totalExpenses = approvedExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const pendingExpensesAmount = pendingExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

      const church = await this.getChurch(churchId, isDemo);

      return {
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
        bankBalance: church?.bank_balance || 0,
        cashBalance: church?.current_balance || 0,
        pendingExpenses: pendingExpensesAmount,
        transactionCount: reports.length + expenses.length,
      };
    } catch (error) {
      console.error('💥 Erreur getFinancialSummary:', error);
      return {
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        bankBalance: 0,
        cashBalance: 0,
        pendingExpenses: 0,
        transactionCount: 0,
      };
    }
  }

  // ==================== GESTION DES ÉVÉNEMENTS ====================

  static async createEvent(eventData: Partial<Event>, isDemo: boolean = false): Promise<Event> {
    try {
      const events = await this.getData<Event>(this.STORAGE_KEYS.EVENTS, isDemo);
      
      const event: Event = {
        id: uuidv4(),
        church_id: eventData.church_id || '',
        title: eventData.title || '',
        description: eventData.description,
        event_type: eventData.event_type || 'Autre',
        start_date: eventData.start_date || new Date().toISOString(),
        end_date: eventData.end_date,
        location: eventData.location,
        created_by: eventData.created_by || '',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      events.push(event);
      await this.setData(this.STORAGE_KEYS.EVENTS, events, isDemo);
      
      return event;
    } catch (error) {
      console.error('💥 Erreur createEvent:', error);
      throw error;
    }
  }

  static async getEvents(churchId: string, isDemo: boolean = false): Promise<Event[]> {
    try {
      const events = await this.getData<Event>(this.STORAGE_KEYS.EVENTS, isDemo);
      return events.filter(e => e.church_id === churchId && e.is_active)
        .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
    } catch (error) {
      console.error('💥 Erreur getEvents:', error);
      return [];
    }
  }

  static async updateEvent(eventId: string, updates: Partial<Event>, isDemo: boolean = false): Promise<Event> {
    try {
      const events = await this.getData<Event>(this.STORAGE_KEYS.EVENTS, isDemo);
      const index = events.findIndex(e => e.id === eventId);
      
      if (index === -1) {
        throw new Error('Événement introuvable');
      }

      events[index] = {
        ...events[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };

      await this.setData(this.STORAGE_KEYS.EVENTS, events, isDemo);
      return events[index];
    } catch (error) {
      console.error('💥 Erreur updateEvent:', error);
      throw error;
    }
  }

  static async deleteEvent(eventId: string, isDemo: boolean = false): Promise<void> {
    try {
      const events = await this.getData<Event>(this.STORAGE_KEYS.EVENTS, isDemo);
      const index = events.findIndex(e => e.id === eventId);
      
      if (index !== -1) {
        events[index].is_active = false;
        await this.setData(this.STORAGE_KEYS.EVENTS, events, isDemo);
      }
    } catch (error) {
      console.error('💥 Erreur deleteEvent:', error);
      throw error;
    }
  }

  static async createAttendance(attendanceData: Partial<Attendance>, isDemo: boolean = false): Promise<Attendance> {
    try {
      const attendances = await this.getData<Attendance>(this.STORAGE_KEYS.ATTENDANCES, isDemo);
      
      const attendance: Attendance = {
        id: uuidv4(),
        event_id: attendanceData.event_id || '',
        member_id: attendanceData.member_id || '',
        attended: attendanceData.attended || false,
        notes: attendanceData.notes,
        recorded_by: attendanceData.recorded_by || '',
        created_at: new Date().toISOString(),
      };

      attendances.push(attendance);
      await this.setData(this.STORAGE_KEYS.ATTENDANCES, attendances, isDemo);
      
      return attendance;
    } catch (error) {
      console.error('💥 Erreur createAttendance:', error);
      throw error;
    }
  }

  static async getEventAttendances(eventId: string, isDemo: boolean = false): Promise<Attendance[]> {
    try {
      const attendances = await this.getData<Attendance>(this.STORAGE_KEYS.ATTENDANCES, isDemo);
      return attendances.filter(a => a.event_id === eventId);
    } catch (error) {
      console.error('💥 Erreur getEventAttendances:', error);
      return [];
    }
  }

  static async updateAttendance(attendanceId: string, updates: Partial<Attendance>, isDemo: boolean = false): Promise<Attendance> {
    try {
      const attendances = await this.getData<Attendance>(this.STORAGE_KEYS.ATTENDANCES, isDemo);
      const index = attendances.findIndex(a => a.id === attendanceId);
      
      if (index === -1) {
        throw new Error('Présence introuvable');
      }

      attendances[index] = {
        ...attendances[index],
        ...updates,
      };

      await this.setData(this.STORAGE_KEYS.ATTENDANCES, attendances, isDemo);
      return attendances[index];
    } catch (error) {
      console.error('💥 Erreur updateAttendance:', error);
      throw error;
    }
  }

  // ==================== AUDIT LOG ====================

  static async createAuditLogEntry(entryData: Partial<AuditLogEntry>, isDemo: boolean = false): Promise<AuditLogEntry> {
    try {
      const logs = await this.getData<AuditLogEntry>(this.STORAGE_KEYS.AUDIT_LOGS, isDemo);
      
      const entry: AuditLogEntry = {
        id: uuidv4(),
        church_id: entryData.church_id || '',
        user_id: entryData.user_id || '',
        action: entryData.action || '',
        resource_type: entryData.resource_type || 'Church',
        resource_id: entryData.resource_id,
        details: entryData.details,
        ip_address: entryData.ip_address,
        user_agent: entryData.user_agent,
        created_at: new Date().toISOString(),
      };

      logs.push(entry);
      await this.setData(this.STORAGE_KEYS.AUDIT_LOGS, logs, isDemo);
      
      return entry;
    } catch (error) {
      console.error('💥 Erreur createAuditLogEntry:', error);
      throw error;
    }
  }

  static async getAuditLogs(churchId: string, isDemo: boolean = false): Promise<AuditLogEntry[]> {
    try {
      const logs = await this.getData<AuditLogEntry>(this.STORAGE_KEYS.AUDIT_LOGS, isDemo);
      return logs.filter(l => l.church_id === churchId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
      console.error('💥 Erreur getAuditLogs:', error);
      return [];
    }
  }

  // ==================== LIENS PUBLICS ====================
  
  static async createPublicLink(linkData: Partial<PublicLink>, isDemo: boolean = false): Promise<PublicLink> {
    try {
      const links = await this.getData<PublicLink>(this.STORAGE_KEYS.PUBLIC_LINKS, isDemo);
      
      const link: PublicLink = {
        id: uuidv4(),
        church_id: linkData.church_id || '',
        title: linkData.title || '',
        url: linkData.url || '',
        description: linkData.description,
        platform: linkData.platform,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      links.push(link);
      await this.setData(this.STORAGE_KEYS.PUBLIC_LINKS, links, isDemo);
      
      return link;
    } catch (error) {
      console.error('💥 Erreur createPublicLink:', error);
      throw error;
    }
  }

  static async getChurchPublicLinks(churchId: string, isDemo: boolean = false): Promise<PublicLink[]> {
    try {
      const links = await this.getData<PublicLink>(this.STORAGE_KEYS.PUBLIC_LINKS, isDemo);
      return links.filter(l => l.church_id === churchId && l.is_active);
    } catch (error) {
      console.error('💥 Erreur getChurchPublicLinks:', error);
      return [];
    }
  }

  static async getPublicLinksByChurchName(churchName: string): Promise<PublicLink[]> {
    try {
      // Chercher dans les deux bases (démo et réelle)
      const [demoChurches, realChurches] = await Promise.all([
        this.getData<Church>(this.STORAGE_KEYS.CHURCHES, true),
        this.getData<Church>(this.STORAGE_KEYS.CHURCHES, false)
      ]);

      const allChurches = [...demoChurches, ...realChurches];
      const church = allChurches.find(c => 
        c.name.toLowerCase().includes(churchName.toLowerCase().trim())
      );

      if (!church) {
        return [];
      }

      const isDemo = this.isDemoEmail(church.email);
      return await this.getChurchPublicLinks(church.id, isDemo);
    } catch (error) {
      console.error('💥 Erreur getPublicLinksByChurchName:', error);
      return [];
    }
  }

  static async deletePublicLink(linkId: string, isDemo: boolean = false): Promise<void> {
    try {
      const links = await this.getData<PublicLink>(this.STORAGE_KEYS.PUBLIC_LINKS, isDemo);
      const filteredLinks = links.filter(l => l.id !== linkId);
      await this.setData(this.STORAGE_KEYS.PUBLIC_LINKS, filteredLinks, isDemo);
    } catch (error) {
      console.error('💥 Erreur deletePublicLink:', error);
      throw error;
    }
  }

  // ==================== ARCHIVES ====================
  
  static async createArchive(archiveData: Partial<Archive>, isDemo: boolean = false): Promise<Archive> {
    try {
      const archives = await this.getData<Archive>(this.STORAGE_KEYS.ARCHIVES, isDemo);
      
      const archive: Archive = {
        id: uuidv4(),
        church_id: archiveData.church_id || '',
        archive_type: archiveData.archive_type || 'monthly',
        period: archiveData.period || '',
        total_income: archiveData.total_income,
        total_expenses: archiveData.total_expenses,
        balance: archiveData.balance,
        data: archiveData.data,
        created_at: new Date().toISOString(),
      };

      archives.push(archive);
      await this.setData(this.STORAGE_KEYS.ARCHIVES, archives, isDemo);
      
      return archive;
    } catch (error) {
      console.error('💥 Erreur createArchive:', error);
      throw error;
    }
  }

  static async getArchives(churchId: string, type?: 'monthly' | 'yearly', isDemo: boolean = false): Promise<Archive[]> {
    try {
      const archives = await this.getData<Archive>(this.STORAGE_KEYS.ARCHIVES, isDemo);
      let filtered = archives.filter(a => a.church_id === churchId);

      if (type) {
        filtered = filtered.filter(a => a.archive_type === type);
      }

      return filtered.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
    } catch (error) {
      console.error('💥 Erreur getArchives:', error);
      return [];
    }
  }

  // ==================== NOTIFICATIONS ====================
  
  static async createNotification(notificationData: Partial<Notification>, isDemo: boolean = false): Promise<Notification> {
    try {
      const notifications = await this.getData<Notification>(this.STORAGE_KEYS.NOTIFICATIONS, isDemo);
      
      const notification: Notification = {
        id: uuidv4(),
        church_id: notificationData.church_id || '',
        user_id: notificationData.user_id,
        title: notificationData.title || '',
        message: notificationData.message || '',
        type: notificationData.type || 'info',
        is_read: false,
        created_at: new Date().toISOString(),
      };

      notifications.push(notification);
      await this.setData(this.STORAGE_KEYS.NOTIFICATIONS, notifications, isDemo);
      
      return notification;
    } catch (error) {
      console.error('💥 Erreur createNotification:', error);
      throw error;
    }
  }

  static async getNotifications(churchId: string, isDemo: boolean = false): Promise<Notification[]> {
    try {
      const notifications = await this.getData<Notification>(this.STORAGE_KEYS.NOTIFICATIONS, isDemo);
      return notifications.filter(n => n.church_id === churchId)
        .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
    } catch (error) {
      console.error('💥 Erreur getNotifications:', error);
      return [];
    }
  }

  // ==================== TRANSACTIONS DE PAIEMENT ====================
  
  static async createPaymentTransaction(transactionData: Partial<PaymentTransaction>, isDemo: boolean = false): Promise<PaymentTransaction> {
    try {
      const transactions = await this.getData<PaymentTransaction>(this.STORAGE_KEYS.PAYMENT_TRANSACTIONS, isDemo);
      
      const transaction: PaymentTransaction = {
        id: uuidv4(),
        church_id: transactionData.church_id || '',
        amount: transactionData.amount || 0,
        payment_method: transactionData.payment_method || 'card',
        phone_number: transactionData.phone_number,
        transaction_id: transactionData.transaction_id,
        status: transactionData.status || 'pending',
        subscription_type: transactionData.subscription_type || 'monthly',
        created_at: new Date().toISOString(),
      };

      transactions.push(transaction);
      await this.setData(this.STORAGE_KEYS.PAYMENT_TRANSACTIONS, transactions, isDemo);
      
      return transaction;
    } catch (error) {
      console.error('💥 Erreur createPaymentTransaction:', error);
      throw error;
    }
  }

  static async updatePaymentTransaction(transactionId: string, updates: Partial<PaymentTransaction>, isDemo: boolean = false): Promise<PaymentTransaction> {
    try {
      const transactions = await this.getData<PaymentTransaction>(this.STORAGE_KEYS.PAYMENT_TRANSACTIONS, isDemo);
      const index = transactions.findIndex(t => t.id === transactionId);
      
      if (index === -1) {
        throw new Error('Transaction introuvable');
      }

      transactions[index] = {
        ...transactions[index],
        ...updates,
      };

      await this.setData(this.STORAGE_KEYS.PAYMENT_TRANSACTIONS, transactions, isDemo);
      return transactions[index];
    } catch (error) {
      console.error('💥 Erreur updatePaymentTransaction:', error);
      throw error;
    }
  }

  static async getPaymentTransactions(churchId: string, isDemo: boolean = false): Promise<PaymentTransaction[]> {
    try {
      const transactions = await this.getData<PaymentTransaction>(this.STORAGE_KEYS.PAYMENT_TRANSACTIONS, isDemo);
      return transactions.filter(t => t.church_id === churchId)
        .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
    } catch (error) {
      console.error('💥 Erreur getPaymentTransactions:', error);
      return [];
    }
  }

  // ==================== STATISTIQUES ====================
  
  static async getChurchStats(churchId: string, isDemo: boolean = false): Promise<ChurchStats> {
    try {
      const [members, reports, expenses, events] = await Promise.all([
        this.getMembers(churchId, isDemo),
        this.getDailyReports(churchId, undefined, undefined, isDemo),
        this.getExpenses(churchId, undefined, undefined, isDemo),
        this.getEvents(churchId, isDemo)
      ]);

      const financial = await this.getFinancialSummary(churchId, isDemo);

      const memberStats = {
        totalMembers: members.length,
        personnel: members.filter(m => m.member_type === 'Personnel').length,
        regularMembers: members.filter(m => m.member_type === 'Membre').length,
        activeDepartments: [...new Set(members.flatMap(m => m.departments || []))],
        byDepartment: members.reduce((acc, m) => {
          m.departments?.forEach(dept => {
            acc[dept] = (acc[dept] || 0) + 1;
          });
          return acc;
        }, {} as Record<string, number>),
        byPosition: members.reduce((acc, m) => {
          if (m.position) {
            acc[m.position] = (acc[m.position] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>),
      };

      const eventStats = {
        totalEvents: events.length,
        upcomingEvents: events.filter(e => new Date(e.start_date) > new Date()).length,
        pastEvents: events.filter(e => new Date(e.start_date) <= new Date()).length,
        averageAttendance: 0,
        byType: events.reduce((acc, e) => {
          acc[e.event_type] = (acc[e.event_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };

      return {
        financial,
        members: memberStats,
        events: eventStats,
        recentActivity: {
          reports: reports.slice(0, 5),
          expenses: expenses.slice(0, 5),
          events: events.slice(0, 5),
        },
      };
    } catch (error) {
      console.error('💥 Erreur getChurchStats:', error);
      throw error;
    }
  }

  // ==================== ABONNEMENT ====================
  
  static async checkSubscriptionStatus(churchId: string, isDemo: boolean = false): Promise<boolean> {
    try {
      const church = await this.getChurch(churchId, isDemo);
      if (!church) return false;

      if (church.subscription_type === 'trial' && church.trial_end) {
        return new Date(church.trial_end) > new Date();
      }

      if (church.subscription_end) {
        return new Date(church.subscription_end) > new Date() && church.is_active;
      }

      return false;
    } catch (error) {
      console.error('💥 Erreur checkSubscriptionStatus:', error);
      return false;
    }
  }

  // ==================== MESSAGERIE ====================

  static async createMessage(messageData: Partial<Message>, isDemo: boolean = false): Promise<Message> {
    try {
      const messages = await this.getData<Message>(this.STORAGE_KEYS.MESSAGES, isDemo);
      
      const message: Message = {
        id: uuidv4(),
        church_id: messageData.church_id || '',
        sender_id: messageData.sender_id || '',
        receiver_id: messageData.receiver_id || '',
        subject: messageData.subject || '',
        content: messageData.content || '',
        is_read: false,
        created_at: new Date().toISOString(),
      };

      messages.push(message);
      await this.setData(this.STORAGE_KEYS.MESSAGES, messages, isDemo);
      
      return message;
    } catch (error) {
      console.error('💥 Erreur createMessage:', error);
      throw error;
    }
  }

  static async getMessages(churchId: string, userId: string, isDemo: boolean = false): Promise<Message[]> {
    try {
      const messages = await this.getData<Message>(this.STORAGE_KEYS.MESSAGES, isDemo);
      return messages.filter(m => 
        m.church_id === churchId && 
        (m.sender_id === userId || m.receiver_id === userId)
      ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
      console.error('💥 Erreur getMessages:', error);
      return [];
    }
  }

  static async markMessageAsRead(messageId: string, isDemo: boolean = false): Promise<void> {
    try {
      const messages = await this.getData<Message>(this.STORAGE_KEYS.MESSAGES, isDemo);
      const index = messages.findIndex(m => m.id === messageId);
      
      if (index !== -1) {
        messages[index].is_read = true;
        await this.setData(this.STORAGE_KEYS.MESSAGES, messages, isDemo);
      }
    } catch (error) {
      console.error('💥 Erreur markMessageAsRead:', error);
    }
  }
}