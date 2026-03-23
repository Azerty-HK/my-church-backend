import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import type {
  Church,
  User,
  Member,
  DailyReport,
  Expense,
  PaymentTransaction,
  AuditLogEntry,
  Message,
  UserRole,
  MemberPosition,
  PaymentMethod,
  Department,
  EventType,
  MemberType
} from '../../types/database';
import { MYSQL_CONFIG } from '../../utils/constants';

/**
 * Service MySQL complet pour MyChurch
 * Gestion d'églises, utilisateurs, membres, rapports, dépenses, transactions, audits et messages
 * Fallback en mémoire si MySQL indisponible
 */
export class MyChurchMySQLService {
  private static pool: mysql.Pool | null = null;
  private static useFallback = false;
  private static fallbackStore: Map<string, any[]> = new Map();

  // -----------------------------
  // Initialisation du pool
  // -----------------------------
  private static async ensurePool() {
    if (this.pool || this.useFallback) return;
    try {
      this.pool = mysql.createPool(MYSQL_CONFIG as mysql.PoolOptions);
      const conn = await this.pool.getConnection();
      conn.release();
    } catch (err) {
      console.warn(
        'MySQL indisponible, fallback mémoire activé :',
        err instanceof Error ? err.message : err
      );
      this.pool = null;
      this.useFallback = true;
    }
  }

  static async initialize(): Promise<void> {
    await this.ensurePool();
    if (!this.useFallback) await this.runMigrations();
  }

  // -----------------------------
  // Création des tables
  // -----------------------------
  private static async runMigrations() {
    if (!this.pool) return;
    const create = async (sql: string) => await this.pool!.query(sql);

    // Églises
    await create(`
      CREATE TABLE IF NOT EXISTS churches (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        address TEXT,
        phone VARCHAR(64),
        currency VARCHAR(10) DEFAULT 'FC',
        initial_amount DOUBLE DEFAULT 0,
        current_balance DOUBLE DEFAULT 0,
        bank_balance DOUBLE DEFAULT 0,
        current_balance_fc DOUBLE DEFAULT 0,
        current_balance_usd DOUBLE DEFAULT 0,
        current_balance_euro DOUBLE DEFAULT 0,
        bank_balance_fc DOUBLE DEFAULT 0,
        bank_balance_usd DOUBLE DEFAULT 0,
        bank_balance_euro DOUBLE DEFAULT 0,
        theme VARCHAR(20) DEFAULT 'blue',
        expense_limit DOUBLE DEFAULT 0,
        archive_frequency VARCHAR(20),
        subscription_type VARCHAR(20),
        subscription_start DATETIME NULL,
        subscription_end DATETIME NULL,
        trial_start_date DATETIME NULL,
        trial_end_date DATETIME NULL,
        trial_end VARCHAR(255),
        setup_completed TINYINT(1) DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        api_key VARCHAR(255),
        update_code VARCHAR(255),
        dossier_auto_create TINYINT(1) DEFAULT 0,
        dossier_required_for_personnel TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Utilisateurs staff/admin
    await create(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        church_id VARCHAR(36) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(64) DEFAULT 'Lecteur',
        first_name VARCHAR(128),
        last_name VARCHAR(128),
        is_active TINYINT(1) DEFAULT 1,
        last_login DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Membres
    await create(`
      CREATE TABLE IF NOT EXISTS members (
        id VARCHAR(36) PRIMARY KEY,
        church_id VARCHAR(36) NOT NULL,
        first_name VARCHAR(128),
        last_name VARCHAR(128),
        email VARCHAR(255),
        phone VARCHAR(64),
        address TEXT,
        photo_url TEXT,
        member_type VARCHAR(20) DEFAULT 'Membre',
        position VARCHAR(128),
        departments TEXT,
        salary DOUBLE DEFAULT 0,
        qr_code VARCHAR(255),
        dossier_id VARCHAR(255),
        has_dossier TINYINT(1) DEFAULT 0,
        dossier_status VARCHAR(20),
        is_active TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Rapports quotidiens
    await create(`
      CREATE TABLE IF NOT EXISTS daily_reports (
        id VARCHAR(36) PRIMARY KEY,
        church_id VARCHAR(36) NOT NULL,
        amount DOUBLE,
        description TEXT,
        category VARCHAR(128),
        recorded_by VARCHAR(255) NOT NULL,
        payment_method VARCHAR(64),
        currency VARCHAR(10) DEFAULT 'FC',
        date DATE,
        bills_breakdown TEXT,
        total_calculated DOUBLE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Dépenses
    await create(`
      CREATE TABLE IF NOT EXISTS expenses (
        id VARCHAR(36) PRIMARY KEY,
        church_id VARCHAR(36) NOT NULL,
        amount DOUBLE,
        description TEXT,
        category VARCHAR(128),
        recorded_by VARCHAR(255) NOT NULL,
        payment_method VARCHAR(64),
        currency VARCHAR(10) DEFAULT 'FC',
        requires_approval TINYINT(1) DEFAULT 0,
        is_approved TINYINT(1) DEFAULT 0,
        approved_by VARCHAR(255),
        approval_message TEXT,
        date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Transactions de paiement
    await create(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id VARCHAR(36) PRIMARY KEY,
        church_id VARCHAR(36) NOT NULL,
        amount DOUBLE NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        phone_number VARCHAR(20),
        transaction_id VARCHAR(255),
        status VARCHAR(20) DEFAULT 'pending',
        subscription_type VARCHAR(20) DEFAULT 'monthly',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // Audit logs
    await create(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(36) PRIMARY KEY,
        church_id VARCHAR(36),
        user_id VARCHAR(36),
        action VARCHAR(255) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id VARCHAR(36),
        details TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    // Messages
    await create(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(36) PRIMARY KEY,
        church_id VARCHAR(36),
        sender_id VARCHAR(36) NOT NULL,
        receiver_id VARCHAR(36) NOT NULL,
        subject VARCHAR(255),
        content TEXT,
        is_read TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    console.log('✅ Migrations MyChurch terminées');
  }

  // -----------------------------
  // UTILITAIRES
  // -----------------------------
  
  private static safeString(value: any): string {
    return value !== null && value !== undefined ? String(value) : '';
  }

  private static safeNumber(value: any): number {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  private static safeBoolean(value: any): boolean {
    return Boolean(value);
  }

  private static safeDate(value: any): string {
    if (!value) return new Date().toISOString().split('T')[0];
    try {
      const date = new Date(value);
      return date.toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }

  private static safeArray<T>(value: any): T[] {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  private static safeObject(value: any): Record<string, any> {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      } catch {
        return {};
      }
    }
    return {};
  }

  private static jsonStringify(value: any): string | null {
    if (value === null || value === undefined) return null;
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }

  // -----------------------------
  // CHURCH
  // -----------------------------
  
  static async createChurch(data: Partial<Church>): Promise<{ success: boolean; data?: Church; error?: string }> {
    try {
      await this.ensurePool();
      const id = uuidv4();
      const currency = data.currency || 'FC';
      const initialAmount = this.safeNumber(data.initial_amount);
      
      if (this.useFallback) {
        const church: Church = { 
          id, 
          name: this.safeString(data.name), 
          email: this.safeString(data.email), 
          address: data.address, 
          phone: data.phone, 
          currency, 
          initial_amount: initialAmount, 
          current_balance: initialAmount, 
          bank_balance: 0, 
          current_balance_fc: currency === 'FC' ? initialAmount : 0,
          current_balance_usd: currency === 'USD' ? initialAmount : 0,
          current_balance_euro: currency === 'EURO' ? initialAmount : 0,
          bank_balance_fc: 0,
          bank_balance_usd: 0,
          bank_balance_euro: 0,
          theme: 'blue',
          expense_limit: this.safeNumber(data.expense_limit), 
          archive_frequency: data.archive_frequency,
          subscription_type: 'trial', 
          subscription_start: undefined, 
          subscription_end: undefined, 
          trial_end: undefined, 
          setup_completed: false, 
          is_active: true, 
          api_key: '', 
          update_code: '', 
          dossier_auto_create: this.safeBoolean(data.dossier_auto_create),
          dossier_required_for_personnel: false,
          created_at: new Date().toISOString(), 
          updated_at: new Date().toISOString() 
        };
        if (!this.fallbackStore.has('churches')) this.fallbackStore.set('churches', []);
        this.fallbackStore.get('churches')!.push(church);
        return { success: true, data: church };
      }
      
      const sql = `INSERT INTO churches (
        id, name, email, address, phone, currency, initial_amount, current_balance, 
        bank_balance, current_balance_fc, current_balance_usd, current_balance_euro,
        bank_balance_fc, bank_balance_usd, bank_balance_euro, theme, expense_limit,
        subscription_type, dossier_auto_create, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;
      
      await this.pool!.execute(sql, [
        id, 
        this.safeString(data.name), 
        this.safeString(data.email), 
        data.address || null, 
        data.phone || null, 
        currency, 
        initialAmount, 
        initialAmount, 
        0,
        currency === 'FC' ? initialAmount : 0,
        currency === 'USD' ? initialAmount : 0,
        currency === 'EURO' ? initialAmount : 0,
        0, 0, 0,
        'blue', 
        this.safeNumber(data.expense_limit), 
        'trial', 
        data.dossier_auto_create ? 1 : 0
      ]);
      
      const church: Church = { 
        ...data, 
        id, 
        current_balance: initialAmount, 
        bank_balance: 0,
        current_balance_fc: currency === 'FC' ? initialAmount : 0,
        current_balance_usd: currency === 'USD' ? initialAmount : 0,
        current_balance_euro: currency === 'EURO' ? initialAmount : 0,
        bank_balance_fc: 0,
        bank_balance_usd: 0,
        bank_balance_euro: 0,
        theme: 'blue',
        subscription_type: 'trial',
        subscription_start: undefined,
        subscription_end: undefined,
        trial_end: undefined,
        setup_completed: false,
        is_active: true,
        api_key: '',
        update_code: '',
        dossier_required_for_personnel: false,
        created_at: new Date().toISOString(), 
        updated_at: new Date().toISOString(),
        currency
      } as Church;
      
      return { success: true, data: church };
    } catch (error) {
      console.error('💥 Erreur createChurch:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur création église' };
    }
  }

  static async getChurch(id: string | null): Promise<{ success: boolean; data?: Church | null; error?: string }> {
    try {
      await this.ensurePool();
      
      if (!id) {
        return { success: false, error: 'ID église requis', data: null };
      }
      
      if (this.useFallback) {
        const rows = this.fallbackStore.get('churches') || [];
        const church = rows.find(c => c.id === id) || null;
        return { success: true, data: church };
      }
      
      const [rows] = await this.pool!.execute('SELECT * FROM churches WHERE id = ? LIMIT 1', [id]);
      const result = (rows as any[])[0] || null;
      return { success: true, data: result };
    } catch (error) {
      console.error('💥 Erreur getChurch:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur récupération église', data: null };
    }
  }

  static async updateChurch(churchId: string, updates: Partial<Church>): Promise<{ success: boolean; data?: Church; error?: string }> {
    try {
      await this.ensurePool();
      
      if (!churchId) {
        return { success: false, error: 'ID église requis' };
      }
      
      if (this.useFallback) {
        const churches = this.fallbackStore.get('churches') || [];
        const index = churches.findIndex(c => c.id === churchId);
        
        if (index === -1) {
          return { success: false, error: 'Église introuvable' };
        }

        churches[index] = {
          ...churches[index],
          ...updates,
          updated_at: new Date().toISOString(),
        };

        return { success: true, data: churches[index] };
      }
      
      // Construire la requête dynamiquement
      const fields: string[] = [];
      const values: any[] = [];
      
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id' && key !== 'created_at') {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      });
      
      if (fields.length === 0) {
        const church = await this.getChurch(churchId);
        return { success: true, data: church.data || undefined };
      }
      
      fields.push('updated_at = NOW()');
      values.push(churchId);
      
      const sql = `UPDATE churches SET ${fields.join(', ')} WHERE id = ?`;
      await this.pool!.execute(sql, values);
      
      const result = await this.getChurch(churchId);
      return { success: true, data: result.data || undefined };
    } catch (error) {
      console.error('💥 Erreur updateChurch:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur mise à jour église' };
    }
  }

  static async getAllChurches(): Promise<{ success: boolean; data?: Church[]; error?: string }> {
    try {
      await this.ensurePool();
      
      if (this.useFallback) {
        const churches = this.fallbackStore.get('churches') || [];
        return { success: true, data: churches };
      }
      
      const [rows] = await this.pool!.execute('SELECT * FROM churches WHERE is_active = 1 ORDER BY name');
      return { success: true, data: rows as Church[] };
    } catch (error) {
      console.error('💥 Erreur getAllChurches:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur récupération églises' };
    }
  }

  static async searchChurchesByName(name: string): Promise<{ success: boolean; data?: Church[]; error?: string }> {
    try {
      await this.ensurePool();
      
      if (!name) {
        return { success: true, data: [] };
      }
      
      if (this.useFallback) {
        const churches = this.fallbackStore.get('churches') || [];
        const query = name.toLowerCase().trim();
        const filtered = churches.filter(church => 
          church.name.toLowerCase().includes(query)
        );
        return { success: true, data: filtered };
      }
      
      const [rows] = await this.pool!.execute(
        'SELECT * FROM churches WHERE is_active = 1 AND LOWER(name) LIKE ? ORDER BY name',
        [`%${name.toLowerCase()}%`]
      );
      return { success: true, data: rows as Church[] };
    } catch (error) {
      console.error('💥 Erreur searchChurchesByName:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur recherche églises' };
    }
  }

  static async getChurchByEmail(email: string): Promise<{ success: boolean; data?: Church | null; error?: string }> {
    try {
      await this.ensurePool();
      
      if (!email) {
        return { success: true, data: null };
      }
      
      if (this.useFallback) {
        const churches = this.fallbackStore.get('churches') || [];
        const church = churches.find(c => c.email?.toLowerCase() === email.toLowerCase()) || null;
        return { success: true, data: church };
      }
      
      const [rows] = await this.pool!.execute(
        'SELECT * FROM churches WHERE LOWER(email) = ? LIMIT 1',
        [email.toLowerCase()]
      );
      const result = (rows as any[])[0] || null;
      return { success: true, data: result };
    } catch (error) {
      console.error('💥 Erreur getChurchByEmail:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur récupération église' };
    }
  }

  // -----------------------------
  // USER
  // -----------------------------
  
  static async createUser(data: { 
    churchId: string, 
    email: string, 
    password: string, 
    role?: UserRole, 
    firstName?: string, 
    lastName?: string 
  }): Promise<{ success: boolean; data?: User; error?: string }> {
    try {
      await this.ensurePool();
      const id = uuidv4();
      const pwHash = await bcrypt.hash(data.password, 10);
      const validRoles: UserRole[] = ['Admin', 'Trésorier', 'Secrétaire', 'Lecteur'];
      const role: UserRole = data.role && validRoles.includes(data.role) ? data.role : 'Lecteur';
      
      if (!data.churchId || !data.email) {
        return { success: false, error: 'churchId et email sont requis pour créer un utilisateur' };
      }
      
      if (this.useFallback) {
        const user: User = { 
          id, 
          church_id: data.churchId, 
          email: data.email.toLowerCase(), 
          password_hash: pwHash, 
          role, 
          first_name: data.firstName || '', 
          last_name: data.lastName || '', 
          is_active: true, 
          last_login: undefined,
          created_at: new Date().toISOString(), 
          updated_at: new Date().toISOString() 
        };
        if (!this.fallbackStore.has('users')) this.fallbackStore.set('users', []);
        this.fallbackStore.get('users')!.push(user);
        return { success: true, data: user };
      }
      
      // Vérifier si l'email existe déjà
      const existing = await this.getUserByEmail(data.email);
      if (existing.data) {
        return { success: false, error: 'Un utilisateur avec cet email existe déjà' };
      }
      
      await this.pool!.execute(
        'INSERT INTO users (id, church_id, email, password_hash, role, first_name, last_name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())', 
        [
          id, 
          data.churchId, 
          data.email.toLowerCase(), 
          pwHash, 
          role, 
          data.firstName || null, 
          data.lastName || null
        ]
      );
      
      const user: User = { 
        id, 
        church_id: data.churchId, 
        email: data.email.toLowerCase(), 
        password_hash: pwHash, 
        role, 
        first_name: data.firstName || '', 
        last_name: data.lastName || '', 
        is_active: true, 
        last_login: undefined,
        created_at: new Date().toISOString(), 
        updated_at: new Date().toISOString() 
      };
      
      return { success: true, data: user };
    } catch (error) {
      console.error('💥 Erreur createUser:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur création utilisateur' };
    }
  }

  static async getUserByEmail(email: string | null): Promise<{ success: boolean; data?: User | null; error?: string }> {
    try {
      await this.ensurePool();
      
      if (!email) {
        return { success: true, data: null };
      }
      
      if (this.useFallback) {
        const rows = this.fallbackStore.get('users') || [];
        const user = rows.find(u => u.email === email.toLowerCase()) || null;
        return { success: true, data: user };
      }
      
      const [rows] = await this.pool!.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email.toLowerCase()]);
      const result = (rows as any[])[0] || null;
      return { success: true, data: result };
    } catch (error) {
      console.error('💥 Erreur getUserByEmail:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur récupération utilisateur' };
    }
  }

  static async getUser(userId: string): Promise<{ success: boolean; data?: User | null; error?: string }> {
    try {
      await this.ensurePool();
      
      if (!userId) {
        return { success: true, data: null };
      }
      
      if (this.useFallback) {
        const rows = this.fallbackStore.get('users') || [];
        const user = rows.find(u => u.id === userId) || null;
        return { success: true, data: user };
      }
      
      const [rows] = await this.pool!.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
      const result = (rows as any[])[0] || null;
      return { success: true, data: result };
    } catch (error) {
      console.error('💥 Erreur getUser:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur récupération utilisateur' };
    }
  }

  static async updateUser(userId: string, updates: Partial<User>): Promise<{ success: boolean; data?: User; error?: string }> {
    try {
      await this.ensurePool();
      
      if (!userId) {
        return { success: false, error: 'ID utilisateur requis' };
      }
      
      if (this.useFallback) {
        const users = this.fallbackStore.get('users') || [];
        const index = users.findIndex(u => u.id === userId);
        
        if (index === -1) {
          return { success: false, error: 'Utilisateur introuvable' };
        }

        if (updates.password_hash) {
          updates.password_hash = await bcrypt.hash(updates.password_hash, 10);
        }

        users[index] = {
          ...users[index],
          ...updates,
          updated_at: new Date().toISOString(),
        };

        return { success: true, data: users[index] };
      }
      
      // Construire la requête dynamiquement
      const fields: string[] = [];
      const values: any[] = [];
      
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && key !== 'id' && key !== 'created_at') {
          if (key === 'password_hash') {
            fields.push(`${key} = ?`);
            values.push(await bcrypt.hash(value as string, 10));
          } else {
            fields.push(`${key} = ?`);
            values.push(value);
          }
        }
      }
      
      if (fields.length === 0) {
        const user = await this.getUser(userId);
        return { success: true, data: user.data || undefined };
      }
      
      fields.push('updated_at = NOW()');
      values.push(userId);
      
      const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
      await this.pool!.execute(sql, values);
      
      const result = await this.getUser(userId);
      return { success: true, data: result.data || undefined };
    } catch (error) {
      console.error('💥 Erreur updateUser:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur mise à jour utilisateur' };
    }
  }

  static async deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.ensurePool();
      
      if (!userId) {
        return { success: false, error: 'ID utilisateur requis' };
      }
      
      if (this.useFallback) {
        const users = this.fallbackStore.get('users') || [];
        const filteredUsers = users.filter(u => u.id !== userId);
        this.fallbackStore.set('users', filteredUsers);
        return { success: true };
      }
      
      await this.pool!.execute('DELETE FROM users WHERE id = ?', [userId]);
      return { success: true };
    } catch (error) {
      console.error('💥 Erreur deleteUser:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur suppression utilisateur' };
    }
  }

  static async getChurchUsers(churchId: string): Promise<{ success: boolean; data?: User[]; error?: string }> {
    try {
      await this.ensurePool();
      
      if (!churchId) {
        return { success: true, data: [] };
      }
      
      if (this.useFallback) {
        const users = this.fallbackStore.get('users') || [];
        const filtered = users.filter(u => u.church_id === churchId);
        return { success: true, data: filtered };
      }
      
      const [rows] = await this.pool!.execute(
        'SELECT * FROM users WHERE church_id = ? AND is_active = 1 ORDER BY first_name, last_name',
        [churchId]
      );
      return { success: true, data: rows as User[] };
    } catch (error) {
      console.error('💥 Erreur getChurchUsers:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur récupération utilisateurs' };
    }
  }

  static async authenticateUser(email: string, password: string): Promise<{ success: boolean; data?: { user: User; church: Church }; error?: string }> {
    try {
      const userResult = await this.getUserByEmail(email);
      if (!userResult.success || !userResult.data) {
        return { success: false, error: 'Email ou mot de passe incorrect' };
      }
      
      const user = userResult.data;
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return { success: false, error: 'Email ou mot de passe incorrect' };
      }
      
      const churchResult = await this.getChurch(user.church_id);
      if (!churchResult.success || !churchResult.data) {
        return { success: false, error: 'Église introuvable' };
      }
      
      // Mettre à jour la dernière connexion
      await this.updateUser(user.id, { last_login: new Date().toISOString() });
      
      return { success: true, data: { user, church: churchResult.data } };
    } catch (error) {
      console.error('💥 Erreur authenticateUser:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur authentification' };
    }
  }

  static async authenticateByName(
    firstName: string,
    lastName: string,
    role: string,
    churchEmail: string,
    password: string
  ): Promise<{ success: boolean; data?: { user: User; church: Church }; error?: string }> {
    try {
      if (!firstName || !lastName || !role || !churchEmail || !password) {
        return { success: false, error: 'Tous les champs sont requis' };
      }
      
      const churchResult = await this.getChurchByEmail(churchEmail);
      if (!churchResult.success || !churchResult.data) {
        return { success: false, error: 'Église introuvable' };
      }
      
      const church = churchResult.data;
      const usersResult = await this.getChurchUsers(church.id);
      
      if (!usersResult.success || !usersResult.data) {
        return { success: false, error: 'Utilisateurs introuvables' };
      }

      const user = usersResult.data.find(u =>
        u.first_name?.toLowerCase() === firstName.toLowerCase() &&
        u.last_name?.toLowerCase() === lastName.toLowerCase() &&
        u.role === role
      );

      if (!user) {
        return { success: false, error: 'Utilisateur introuvable. Vérifiez le prénom, nom et rôle.' };
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return { success: false, error: 'Mot de passe incorrect' };
      }

      if (!user.is_active) {
        return { success: false, error: 'Compte désactivé' };
      }

      await this.updateUser(user.id, { last_login: new Date().toISOString() });

      return { success: true, data: { user, church } };
    } catch (error) {
      console.error('💥 Erreur authenticateByName:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur authentification' };
    }
  }

  // -----------------------------
  // MEMBER
  // -----------------------------
  
  static async createMember(data: Partial<Member>): Promise<{ success: boolean; data?: Member; error?: string }> {
    try {
      await this.ensurePool();
      const id = uuidv4();
      const departments = Array.isArray(data.departments) ? data.departments.join(',') : '';
      const memberType: MemberType = data.member_type || 'Membre';
      
      if (!data.church_id) {
        return { success: false, error: 'church_id est requis pour créer un membre' };
      }
      
      if (this.useFallback) {
        const member: Member = { 
          id, 
          church_id: data.church_id, 
          first_name: this.safeString(data.first_name), 
          last_name: this.safeString(data.last_name), 
          email: this.safeString(data.email), 
          phone: data.phone, 
          address: data.address,
          photo_url: data.photo_url,
          member_type: memberType, 
          position: data.position, 
          departments: data.departments, 
          salary: this.safeNumber(data.salary),
          qr_code: data.qr_code,
          dossier_id: data.dossier_id,
          has_dossier: data.has_dossier,
          dossier_status: data.dossier_status,
          joining_date: data.joining_date,
          status: data.status || 'Actif',
          payment_method: data.payment_method,
          card_number: data.card_number,
          has_paid: data.has_paid,
          payment_date: data.payment_date,
          is_active: true, 
          created_at: new Date().toISOString(), 
          updated_at: new Date().toISOString() 
        };
        if (!this.fallbackStore.has('members')) this.fallbackStore.set('members', []);
        this.fallbackStore.get('members')!.push(member);
        return { success: true, data: member };
      }
      
      await this.pool!.execute(
        'INSERT INTO members (id, church_id, first_name, last_name, email, phone, address, member_type, position, departments, salary, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())', 
        [
          id, 
          data.church_id, 
          data.first_name || null, 
          data.last_name || null, 
          data.email || null, 
          data.phone || null, 
          data.address || null, 
          memberType,
          data.position || null, 
          departments, 
          this.safeNumber(data.salary)
        ]
      );
      
      const member: Member = { 
        ...data, 
        id, 
        member_type: memberType,
        is_active: true, 
        created_at: new Date().toISOString(), 
        updated_at: new Date().toISOString() 
      } as Member;
      
      return { success: true, data: member };
    } catch (error) {
      console.error('💥 Erreur createMember:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur création membre' };
    }
  }

  static async getMembers(churchId: string | null): Promise<{ success: boolean; data?: Member[]; error?: string }> {
    try {
      await this.ensurePool();
      
      if (!churchId) {
        return { success: true, data: [] };
      }
      
      if (this.useFallback) {
        const members = this.fallbackStore.get('members') || [];
        const filtered = members.filter(m => m.church_id === churchId && m.is_active);
        return { success: true, data: filtered };
      }
      
      const [rows] = await this.pool!.execute(
        'SELECT * FROM members WHERE church_id = ? AND is_active = 1 ORDER BY first_name, last_name', 
        [churchId]
      );
      
      // Convertir les départements de string à array
      const members = (rows as any[]).map(member => ({
        ...member,
        departments: member.departments ? member.departments.split(',').filter(Boolean) : []
      }));
      
      return { success: true, data: members as Member[] };
    } catch (error) {
      console.error('💥 Erreur getMembers:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur récupération membres' };
    }
  }

  static async updateMember(memberId: string, updates: Partial<Member>): Promise<{ success: boolean; data?: Member; error?: string }> {
    try {
      await this.ensurePool();
      
      if (!memberId) {
        return { success: false, error: 'ID membre requis' };
      }
      
      if (this.useFallback) {
        const members = this.fallbackStore.get('members') || [];
        const index = members.findIndex(m => m.id === memberId);
        
        if (index === -1) {
          return { success: false, error: 'Membre introuvable' };
        }

        members[index] = {
          ...members[index],
          ...updates,
          updated_at: new Date().toISOString(),
        };

        return { success: true, data: members[index] };
      }
      
      // Construire la requête dynamiquement
      const fields: string[] = [];
      const values: any[] = [];
      
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id' && key !== 'created_at') {
          if (key === 'departments' && Array.isArray(value)) {
            fields.push(`${key} = ?`);
            values.push(value.join(','));
          } else {
            fields.push(`${key} = ?`);
            values.push(value);
          }
        }
      });
      
      if (fields.length === 0) {
        return { success: true, data: undefined };
      }
      
      fields.push('updated_at = NOW()');
      values.push(memberId);
      
      const sql = `UPDATE members SET ${fields.join(', ')} WHERE id = ?`;
      await this.pool!.execute(sql, values);
      
      const [rows] = await this.pool!.execute('SELECT * FROM members WHERE id = ?', [memberId]);
      const member = (rows as any[])[0];
      
      if (member && member.departments) {
        member.departments = member.departments.split(',').filter(Boolean);
      }
      
      return { success: true, data: member as Member };
    } catch (error) {
      console.error('💥 Erreur updateMember:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur mise à jour membre' };
    }
  }

  static async deleteMember(memberId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.ensurePool();
      
      if (!memberId) {
        return { success: false, error: 'ID membre requis' };
      }
      
      if (this.useFallback) {
        const members = this.fallbackStore.get('members') || [];
        const index = members.findIndex(m => m.id === memberId);
        
        if (index !== -1) {
          members[index].is_active = false;
        }
        return { success: true };
      }
      
      await this.pool!.execute('UPDATE members SET is_active = 0, updated_at = NOW() WHERE id = ?', [memberId]);
      return { success: true };
    } catch (error) {
      console.error('💥 Erreur deleteMember:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur suppression membre' };
    }
  }

  static async regenerateMemberQR(memberId: string): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      if (!memberId) {
        return { success: false, error: 'ID membre requis' };
      }
      
      const memberResult = await this.getMember(memberId);
      if (!memberResult.success || !memberResult.data) {
        return { success: false, error: 'Membre introuvable' };
      }
      
      const member = memberResult.data;
      const newQRCode = `MC-${member.church_id.substring(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}-REGEN`;
      
      const updateResult = await this.updateMember(memberId, { qr_code: newQRCode });
      if (!updateResult.success) {
        return { success: false, error: updateResult.error };
      }
      
      return { success: true, data: newQRCode };
    } catch (error) {
      console.error('💥 Erreur regenerateMemberQR:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur régénération QR code' };
    }
  }

  static async getMember(memberId: string): Promise<{ success: boolean; data?: Member; error?: string }> {
    try {
      await this.ensurePool();
      
      if (!memberId) {
        return { success: false, error: 'ID membre requis' };
      }
      
      if (this.useFallback) {
        const members = this.fallbackStore.get('members') || [];
        const member = members.find(m => m.id === memberId);
        return { success: true, data: member };
      }
      
      const [rows] = await this.pool!.execute('SELECT * FROM members WHERE id = ?', [memberId]);
      const member = (rows as any[])[0];
      
      if (member && member.departments) {
        member.departments = member.departments.split(',').filter(Boolean);
      }
      
      return { success: true, data: member as Member };
    } catch (error) {
      console.error('💥 Erreur getMember:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur récupération membre' };
    }
  }

  // -----------------------------
  // DAILY REPORT
  // -----------------------------
  
  static async createDailyReport(data: Partial<DailyReport>): Promise<{ success: boolean; data?: DailyReport; error?: string }> {
    try {
      await this.ensurePool();
      const id = uuidv4();
      const categories: Array<DailyReport['category']> = ['Offrandes', 'Dîmes', 'Dons', 'Contributions', 'Divers'];
      const category = data.category && categories.includes(data.category) ? data.category : 'Divers';
      
      const paymentMethods: PaymentMethod[] = ['cash', 'bank', 'mpesa', 'orange_money', 'airtel_money', 'afrimoney'];
      const paymentMethod: PaymentMethod = data.payment_method && paymentMethods.includes(data.payment_method) ? data.payment_method : 'cash';
      
      const currency: 'FC' | 'USD' | 'EURO' = data.currency || 'FC';
      
      if (!data.church_id || !data.recorded_by) {
        return { success: false, error: 'church_id et recorded_by sont requis pour créer un rapport' };
      }
      
      const billsBreakdownJson = data.bills_breakdown ? this.jsonStringify(data.bills_breakdown) : null;
      
      if (this.useFallback) {
        const report: DailyReport = { 
          id, 
          church_id: data.church_id, 
          amount: this.safeNumber(data.amount), 
          description: this.safeString(data.description), 
          category, 
          recorded_by: data.recorded_by, 
          payment_method: paymentMethod, 
          currency, 
          date: data.date || new Date().toISOString().split('T')[0], 
          bills_breakdown: data.bills_breakdown,
          total_calculated: this.safeNumber(data.total_calculated),
          created_at: new Date().toISOString() 
        };
        if (!this.fallbackStore.has('daily_reports')) this.fallbackStore.set('daily_reports', []);
        this.fallbackStore.get('daily_reports')!.push(report);
        return { success: true, data: report };
      }
      
      await this.pool!.execute(
        'INSERT INTO daily_reports (id, church_id, amount, description, category, recorded_by, payment_method, currency, date, bills_breakdown, total_calculated, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())', 
        [
          id, 
          data.church_id, 
          this.safeNumber(data.amount), 
          data.description || null, 
          category, 
          data.recorded_by, 
          paymentMethod, 
          currency, 
          data.date || new Date().toISOString().split('T')[0],
          billsBreakdownJson,
          this.safeNumber(data.total_calculated)
        ]
      );
      
      const report: DailyReport = { 
        ...data, 
        id, 
        category,
        payment_method: paymentMethod,
        currency,
        recorded_by: data.recorded_by,
        amount: this.safeNumber(data.amount),
        created_at: new Date().toISOString() 
      } as DailyReport;
      
      return { success: true, data: report };
    } catch (error) {
      console.error('💥 Erreur createDailyReport:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur création rapport' };
    }
  }

  static async getDailyReports(churchId: string, startDate?: string, endDate?: string): Promise<{ success: boolean; data?: DailyReport[]; error?: string }> {
    try {
      await this.ensurePool();
      
      if (!churchId) {
        return { success: true, data: [] };
      }
      
      if (this.useFallback) {
        const reports = this.fallbackStore.get('daily_reports') || [];
        let filtered = reports.filter(r => r.church_id === churchId);

        if (startDate) {
          filtered = filtered.filter(r => r.date && r.date >= startDate);
        }
        if (endDate) {
          filtered = filtered.filter(r => r.date && r.date <= endDate);
        }

        filtered.sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateB - dateA;
        });
        
        return { success: true, data: filtered };
      }
      
      let sql = 'SELECT * FROM daily_reports WHERE church_id = ?';
      const params: any[] = [churchId];
      
      if (startDate) {
        sql += ' AND date >= ?';
        params.push(startDate);
      }
      if (endDate) {
        sql += ' AND date <= ?';
        params.push(endDate);
      }
      
      sql += ' ORDER BY date DESC';
      
      const [rows] = await this.pool!.execute(sql, params);
      
      // Traiter bills_breakdown
      const reports = (rows as any[]).map(report => {
        if (report.bills_breakdown) {
          try {
            report.bills_breakdown = JSON.parse(report.bills_breakdown);
          } catch {
            report.bills_breakdown = [];
          }
        }
        return report;
      });
      
      return { success: true, data: reports as DailyReport[] };
    } catch (error) {
      console.error('💥 Erreur getDailyReports:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur récupération rapports' };
    }
  }

  // -----------------------------
  // EXPENSE
  // -----------------------------
  
  static async createExpense(data: Partial<Expense>): Promise<{ success: boolean; data?: Expense; error?: string }> {
    try {
      await this.ensurePool();
      const id = uuidv4();
      
      const paymentMethods: PaymentMethod[] = ['cash', 'bank', 'mpesa', 'orange_money', 'airtel_money', 'afrimoney'];
      const paymentMethod: PaymentMethod = data.payment_method && paymentMethods.includes(data.payment_method) ? data.payment_method : 'cash';
      
      const currency: 'FC' | 'USD' | 'EURO' = data.currency || 'FC';
      const requiresApproval = data.requires_approval || false;
      const isApproved = requiresApproval ? false : true;
      
      if (!data.church_id || !data.recorded_by) {
        return { success: false, error: 'church_id et recorded_by sont requis pour créer une dépense' };
      }
      
      if (this.useFallback) {
        const expense: Expense = { 
          id, 
          church_id: data.church_id, 
          amount: this.safeNumber(data.amount), 
          description: this.safeString(data.description), 
          category: data.category, 
          recorded_by: data.recorded_by, 
          payment_method: paymentMethod, 
          currency,
          requires_approval: requiresApproval, 
          is_approved: isApproved, 
          approved_by: data.approved_by, 
          approval_message: data.approval_message,
          date: data.date || new Date().toISOString().split('T')[0], 
          created_at: new Date().toISOString() 
        };
        if (!this.fallbackStore.has('expenses')) this.fallbackStore.set('expenses', []);
        this.fallbackStore.get('expenses')!.push(expense);
        return { success: true, data: expense };
      }
      
      await this.pool!.execute(
        'INSERT INTO expenses (id, church_id, amount, description, category, recorded_by, payment_method, currency, requires_approval, is_approved, approved_by, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())', 
        [
          id, 
          data.church_id, 
          this.safeNumber(data.amount), 
          data.description || null, 
          data.category || null, 
          data.recorded_by, 
          paymentMethod, 
          currency, 
          requiresApproval ? 1 : 0, 
          isApproved ? 1 : 0, 
          data.approved_by || null, 
          data.date || new Date().toISOString().split('T')[0]
        ]
      );
      
      const expense: Expense = { 
        ...data, 
        id, 
        payment_method: paymentMethod,
        currency,
        requires_approval: requiresApproval,
        is_approved: isApproved,
        recorded_by: data.recorded_by,
        amount: this.safeNumber(data.amount),
        created_at: new Date().toISOString() 
      } as Expense;
      
      return { success: true, data: expense };
    } catch (error) {
      console.error('💥 Erreur createExpense:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur création dépense' };
    }
  }

  static async getExpenses(churchId: string, startDate?: string, endDate?: string): Promise<{ success: boolean; data?: Expense[]; error?: string }> {
    try {
      await this.ensurePool();
      
      if (!churchId) {
        return { success: true, data: [] };
      }
      
      if (this.useFallback) {
        const expenses = this.fallbackStore.get('expenses') || [];
        let filtered = expenses.filter(e => e.church_id === churchId);

        if (startDate) {
          filtered = filtered.filter(e => e.date && e.date >= startDate);
        }
        if (endDate) {
          filtered = filtered.filter(e => e.date && e.date <= endDate);
        }

        filtered.sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateB - dateA;
        });
        
        return { success: true, data: filtered };
      }
      
      let sql = 'SELECT * FROM expenses WHERE church_id = ?';
      const params: any[] = [churchId];
      
      if (startDate) {
        sql += ' AND date >= ?';
        params.push(startDate);
      }
      if (endDate) {
        sql += ' AND date <= ?';
        params.push(endDate);
      }
      
      sql += ' ORDER BY date DESC';
      
      const [rows] = await this.pool!.execute(sql, params);
      return { success: true, data: rows as Expense[] };
    } catch (error) {
      console.error('💥 Erreur getExpenses:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur récupération dépenses' };
    }
  }

  static async approveExpense(expenseId: string, approvedBy: string): Promise<{ success: boolean; data?: Expense; error?: string }> {
    try {
      await this.ensurePool();
      
      if (!expenseId || !approvedBy) {
        return { success: false, error: 'ID dépense et approbateur requis' };
      }
      
      if (this.useFallback) {
        const expenses = this.fallbackStore.get('expenses') || [];
        const index = expenses.findIndex(e => e.id === expenseId);
        
        if (index === -1) {
          return { success: false, error: 'Dépense introuvable' };
        }

        const expense = expenses[index];
        if (expense.is_approved) {
          return { success: false, error: 'Dépense déjà approuvée' };
        }

        expenses[index] = {
          ...expense,
          is_approved: true,
          approved_by: approvedBy,
          approval_message: `Approuvé par ${approvedBy} le ${new Date().toLocaleDateString('fr-FR')}`,
          updated_at: new Date().toISOString(),
        };

        return { success: true, data: expenses[index] };
      }
      
      await this.pool!.execute(
        'UPDATE expenses SET is_approved = 1, approved_by = ?, approval_message = ?, updated_at = NOW() WHERE id = ?',
        [approvedBy, `Approuvé par ${approvedBy} le ${new Date().toLocaleDateString('fr-FR')}`, expenseId]
      );
      
      const [rows] = await this.pool!.execute('SELECT * FROM expenses WHERE id = ?', [expenseId]);
      const expense = (rows as any[])[0];
      
      return { success: true, data: expense as Expense };
    } catch (error) {
      console.error('💥 Erreur approveExpense:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur approbation dépense' };
    }
  }

  // -----------------------------
  // PAYMENT TRANSACTION
  // -----------------------------
  
  static async createPaymentTransaction(data: Partial<PaymentTransaction>): Promise<{ success: boolean; data?: PaymentTransaction; error?: string }> {
    try {
      await this.ensurePool();
      const id = uuidv4();
      
      const validPaymentMethods: PaymentTransaction['payment_method'][] = ['card', 'mpesa', 'orange_money', 'airtel_money', 'afrimoney'];
      const paymentMethod: PaymentTransaction['payment_method'] = data.payment_method && validPaymentMethods.includes(data.payment_method) ? data.payment_method : 'card';
      
      const validStatuses: PaymentTransaction['status'][] = ['pending', 'completed', 'failed'];
      const status: PaymentTransaction['status'] = data.status && validStatuses.includes(data.status) ? data.status : 'pending';
      
      const validSubscriptionTypes: PaymentTransaction['subscription_type'][] = ['monthly', 'yearly'];
      const subscriptionType: PaymentTransaction['subscription_type'] = data.subscription_type && validSubscriptionTypes.includes(data.subscription_type) ? data.subscription_type : 'monthly';
      
      if (!data.church_id) {
        return { success: false, error: 'church_id est requis pour créer une transaction de paiement' };
      }
      
      if (this.useFallback) {
        const tx: PaymentTransaction = { 
          id, 
          church_id: data.church_id, 
          amount: this.safeNumber(data.amount), 
          payment_method: paymentMethod, 
          phone_number: data.phone_number,
          transaction_id: data.transaction_id, 
          status, 
          subscription_type: subscriptionType, 
          created_at: new Date().toISOString() 
        };
        if (!this.fallbackStore.has('payment_transactions')) this.fallbackStore.set('payment_transactions', []);
        this.fallbackStore.get('payment_transactions')!.push(tx);
        return { success: true, data: tx };
      }
      
      await this.pool!.execute(
        'INSERT INTO payment_transactions (id, church_id, amount, payment_method, phone_number, transaction_id, status, subscription_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())', 
        [
          id, 
          data.church_id, 
          this.safeNumber(data.amount), 
          paymentMethod, 
          data.phone_number || null, 
          data.transaction_id || null, 
          status, 
          subscriptionType
        ]
      );
      
      const tx: PaymentTransaction = { 
        ...data, 
        id, 
        payment_method: paymentMethod,
        status,
        subscription_type: subscriptionType,
        amount: this.safeNumber(data.amount),
        created_at: new Date().toISOString() 
      } as PaymentTransaction;
      
      return { success: true, data: tx };
    } catch (error) {
      console.error('💥 Erreur createPaymentTransaction:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur création transaction' };
    }
  }

  static async updatePaymentTransaction(transactionId: string, updates: Partial<PaymentTransaction>): Promise<{ success: boolean; data?: PaymentTransaction; error?: string }> {
    try {
      await this.ensurePool();
      
      if (!transactionId) {
        return { success: false, error: 'ID transaction requis' };
      }
      
      if (this.useFallback) {
        const transactions = this.fallbackStore.get('payment_transactions') || [];
        const index = transactions.findIndex(t => t.id === transactionId);
        
        if (index === -1) {
          return { success: false, error: 'Transaction introuvable' };
        }

        transactions[index] = {
          ...transactions[index],
          ...updates,
        };

        return { success: true, data: transactions[index] };
      }
      
      // Construire la requête dynamiquement
      const fields: string[] = [];
      const values: any[] = [];
      
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id' && key !== 'created_at') {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      });
      
      if (fields.length === 0) {
        const [rows] = await this.pool!.execute('SELECT * FROM payment_transactions WHERE id = ?', [transactionId]);
        const tx = (rows as any[])[0];
        return { success: true, data: tx };
      }
      
      values.push(transactionId);
      
      const sql = `UPDATE payment_transactions SET ${fields.join(', ')} WHERE id = ?`;
      await this.pool!.execute(sql, values);
      
      const [rows] = await this.pool!.execute('SELECT * FROM payment_transactions WHERE id = ?', [transactionId]);
      const tx = (rows as any[])[0];
      
      return { success: true, data: tx as PaymentTransaction };
    } catch (error) {
      console.error('💥 Erreur updatePaymentTransaction:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur mise à jour transaction' };
    }
  }

  static async getPaymentTransactions(churchId: string): Promise<{ success: boolean; data?: PaymentTransaction[]; error?: string }> {
    try {
      await this.ensurePool();
      
      if (!churchId) {
        return { success: true, data: [] };
      }
      
      if (this.useFallback) {
        const transactions = this.fallbackStore.get('payment_transactions') || [];
        const filtered = transactions.filter(t => t.church_id === churchId);
        filtered.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        });
        return { success: true, data: filtered };
      }
      
      const [rows] = await this.pool!.execute(
        'SELECT * FROM payment_transactions WHERE church_id = ? ORDER BY created_at DESC',
        [churchId]
      );
      return { success: true, data: rows as PaymentTransaction[] };
    } catch (error) {
      console.error('💥 Erreur getPaymentTransactions:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur récupération transactions' };
    }
  }

  // -----------------------------
  // AUDIT LOG
  // -----------------------------
  
  static async createAuditLog(data: Partial<AuditLogEntry>): Promise<{ success: boolean; data?: AuditLogEntry; error?: string }> {
    try {
      await this.ensurePool();
      const id = uuidv4();
      
      const validResourceTypes: AuditLogEntry['resource_type'][] = ['Church', 'User', 'Member', 'DailyReport', 'Expense', 'Event', 'Attendance', 'Message', 'Dossier', 'Document'];
      const resourceType: AuditLogEntry['resource_type'] = data.resource_type && validResourceTypes.includes(data.resource_type) ? data.resource_type : 'Church';
      
      const detailsJson = data.details ? this.jsonStringify(data.details) : null;
      
      if (this.useFallback) {
        const log: AuditLogEntry = { 
          id, 
          church_id: data.church_id || '', 
          user_id: data.user_id || '', 
          action: this.safeString(data.action), 
          resource_type: resourceType, 
          resource_id: data.resource_id, 
          details: data.details, 
          ip_address: data.ip_address,
          user_agent: data.user_agent,
          created_at: new Date().toISOString() 
        };
        if (!this.fallbackStore.has('audit_logs')) this.fallbackStore.set('audit_logs', []);
        this.fallbackStore.get('audit_logs')!.push(log);
        return { success: true, data: log };
      }
      
      await this.pool!.execute(
        'INSERT INTO audit_logs (id, church_id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())', 
        [
          id, 
          data.church_id || null, 
          data.user_id || null, 
          data.action || null, 
          resourceType, 
          data.resource_id || null, 
          detailsJson, 
          data.ip_address || null, 
          data.user_agent || null
        ]
      );
      
      const log: AuditLogEntry = { 
        ...data, 
        id, 
        resource_type: resourceType,
        action: this.safeString(data.action),
        created_at: new Date().toISOString() 
      } as AuditLogEntry;
      
      return { success: true, data: log };
    } catch (error) {
      console.error('💥 Erreur createAuditLog:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur création log' };
    }
  }

  static async getAuditLogs(churchId: string): Promise<{ success: boolean; data?: AuditLogEntry[]; error?: string }> {
    try {
      await this.ensurePool();
      
      if (!churchId) {
        return { success: true, data: [] };
      }
      
      if (this.useFallback) {
        const logs = this.fallbackStore.get('audit_logs') || [];
        const filtered = logs.filter(l => l.church_id === churchId);
        filtered.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        });
        
        // Traiter les détails JSON
        filtered.forEach(log => {
          if (log.details && typeof log.details === 'string') {
            try {
              log.details = JSON.parse(log.details);
            } catch {
              // Garder tel quel
            }
          }
        });
        
        return { success: true, data: filtered };
      }
      
      const [rows] = await this.pool!.execute(
        'SELECT * FROM audit_logs WHERE church_id = ? ORDER BY created_at DESC',
        [churchId]
      );
      
      // Traiter les détails JSON
      const logs = (rows as any[]).map(log => {
        if (log.details) {
          try {
            log.details = JSON.parse(log.details);
          } catch {
            // Garder tel quel
          }
        }
        return log;
      });
      
      return { success: true, data: logs as AuditLogEntry[] };
    } catch (error) {
      console.error('💥 Erreur getAuditLogs:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur récupération logs' };
    }
  }

  // -----------------------------
  // MESSAGE
  // -----------------------------
  
  static async createMessage(data: Partial<Message>): Promise<{ success: boolean; data?: Message; error?: string }> {
    try {
      await this.ensurePool();
      const id = uuidv4();
      
      if (!data.sender_id || !data.receiver_id) {
        return { success: false, error: 'sender_id et receiver_id sont requis pour créer un message' };
      }
      
      if (this.useFallback) {
        const msg: Message = { 
          id, 
          church_id: data.church_id || '', 
          sender_id: data.sender_id, 
          receiver_id: data.receiver_id, 
          subject: this.safeString(data.subject), 
          content: this.safeString(data.content), 
          is_read: false, 
          created_at: new Date().toISOString() 
        };
        if (!this.fallbackStore.has('messages')) this.fallbackStore.set('messages', []);
        this.fallbackStore.get('messages')!.push(msg);
        return { success: true, data: msg };
      }
      
      await this.pool!.execute(
        'INSERT INTO messages (id, church_id, sender_id, receiver_id, subject, content, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, NOW())', 
        [
          id, 
          data.church_id || null, 
          data.sender_id, 
          data.receiver_id, 
          data.subject || null, 
          data.content || null
        ]
      );
      
      const msg: Message = { 
        ...data, 
        id, 
        is_read: false, 
        created_at: new Date().toISOString() 
      } as Message;
      
      return { success: true, data: msg };
    } catch (error) {
      console.error('💥 Erreur createMessage:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur création message' };
    }
  }

  static async getMessages(churchId: string, userId: string): Promise<{ success: boolean; data?: Message[]; error?: string }> {
    try {
      await this.ensurePool();
      
      if (!churchId || !userId) {
        return { success: true, data: [] };
      }
      
      if (this.useFallback) {
        const messages = this.fallbackStore.get('messages') || [];
        const filtered = messages.filter(m => 
          m.church_id === churchId && 
          (m.sender_id === userId || m.receiver_id === userId)
        );
        filtered.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        });
        return { success: true, data: filtered };
      }
      
      const [rows] = await this.pool!.execute(
        'SELECT * FROM messages WHERE church_id = ? AND (sender_id = ? OR receiver_id = ?) ORDER BY created_at DESC',
        [churchId, userId, userId]
      );
      return { success: true, data: rows as Message[] };
    } catch (error) {
      console.error('💥 Erreur getMessages:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur récupération messages' };
    }
  }

  static async markMessageAsRead(messageId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.ensurePool();
      
      if (!messageId) {
        return { success: false, error: 'ID message requis' };
      }
      
      if (this.useFallback) {
        const messages = this.fallbackStore.get('messages') || [];
        const index = messages.findIndex(m => m.id === messageId);
        
        if (index !== -1) {
          messages[index].is_read = true;
        }
        return { success: true };
      }
      
      await this.pool!.execute('UPDATE messages SET is_read = 1 WHERE id = ?', [messageId]);
      return { success: true };
    } catch (error) {
      console.error('💥 Erreur markMessageAsRead:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur marquage message' };
    }
  }

  // -----------------------------
  // FINANCIAL SUMMARY
  // -----------------------------
  
  static async getFinancialSummary(churchId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      await this.ensurePool();
      
      if (!churchId) {
        return { 
          success: true, 
          data: {
            totalIncome: 0,
            totalExpenses: 0,
            balance: 0,
            bankBalance: 0,
            cashBalance: 0,
            pendingExpenses: 0,
            transactionCount: 0,
          } 
        };
      }
      
      if (this.useFallback) {
        const reports = this.fallbackStore.get('daily_reports') || [];
        const expenses = this.fallbackStore.get('expenses') || [];
        
        const churchReports = reports.filter(r => r.church_id === churchId);
        const churchExpenses = expenses.filter(e => e.church_id === churchId);
        
        const approvedExpenses = churchExpenses.filter(e => e.is_approved);
        const pendingExpenses = churchExpenses.filter(e => !e.is_approved);
        
        const totalIncome = churchReports.reduce((sum, r) => sum + this.safeNumber(r.amount), 0);
        const totalExpenses = approvedExpenses.reduce((sum, e) => sum + this.safeNumber(e.amount), 0);
        const pendingExpensesAmount = pendingExpenses.reduce((sum, e) => sum + this.safeNumber(e.amount), 0);
        
        const churches = this.fallbackStore.get('churches') || [];
        const church = churches.find(c => c.id === churchId);
        
        return {
          success: true,
          data: {
            totalIncome,
            totalExpenses,
            balance: totalIncome - totalExpenses,
            bankBalance: church?.bank_balance || 0,
            cashBalance: church?.current_balance || 0,
            pendingExpenses: pendingExpensesAmount,
            transactionCount: churchReports.length + churchExpenses.length,
          }
        };
      }
      
      // Récupérer l'église
      const churchResult = await this.getChurch(churchId);
      if (!churchResult.success) {
        return { success: false, error: churchResult.error };
      }
      
      const church = churchResult.data;
      
      // Récupérer les rapports
      const reportsResult = await this.getDailyReports(churchId);
      if (!reportsResult.success) {
        return { success: false, error: reportsResult.error };
      }
      
      const reports = reportsResult.data || [];
      
      // Récupérer les dépenses
      const expensesResult = await this.getExpenses(churchId);
      if (!expensesResult.success) {
        return { success: false, error: expensesResult.error };
      }
      
      const expenses = expensesResult.data || [];
      
      const approvedExpenses = expenses.filter(e => e.is_approved);
      const pendingExpenses = expenses.filter(e => !e.is_approved);
      
      const totalIncome = reports.reduce((sum, r) => sum + this.safeNumber(r.amount), 0);
      const totalExpenses = approvedExpenses.reduce((sum, e) => sum + this.safeNumber(e.amount), 0);
      const pendingExpensesAmount = pendingExpenses.reduce((sum, e) => sum + this.safeNumber(e.amount), 0);
      
      return {
        success: true,
        data: {
          totalIncome,
          totalExpenses,
          balance: totalIncome - totalExpenses,
          bankBalance: church?.bank_balance || 0,
          cashBalance: church?.current_balance || 0,
          pendingExpenses: pendingExpensesAmount,
          transactionCount: reports.length + expenses.length,
        }
      };
    } catch (error) {
      console.error('💥 Erreur getFinancialSummary:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur récupération résumé financier' 
      };
    }
  }

  // -----------------------------
  // CHURCH STATS
  // -----------------------------
  
  static async getChurchStats(churchId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      if (!churchId) {
        return {
          success: true,
          data: {
            financial: {
              totalIncome: 0,
              totalExpenses: 0,
              balance: 0,
              bankBalance: 0,
              cashBalance: 0,
              pendingExpenses: 0,
              transactionCount: 0,
            },
            members: {
              totalMembers: 0,
              personnel: 0,
              regularMembers: 0,
              activeDepartments: [],
              byDepartment: {},
              byPosition: {},
            },
            events: {
              totalEvents: 0,
              upcomingEvents: 0,
              pastEvents: 0,
              averageAttendance: 0,
              byType: {},
            },
            recentActivity: {
              reports: [],
              expenses: [],
              events: [],
            },
          }
        };
      }
      
      // Récupérer les membres
      const membersResult = await this.getMembers(churchId);
      const members = membersResult.success && membersResult.data ? membersResult.data : [];
      
      // Récupérer les rapports
      const reportsResult = await this.getDailyReports(churchId);
      const reports = reportsResult.success && reportsResult.data ? reportsResult.data : [];
      
      // Récupérer les dépenses
      const expensesResult = await this.getExpenses(churchId);
      const expenses = expensesResult.success && expensesResult.data ? expensesResult.data : [];
      
      // Récupérer le résumé financier
      const financialResult = await this.getFinancialSummary(churchId);
      const financial = financialResult.success && financialResult.data ? financialResult.data : {
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        bankBalance: 0,
        cashBalance: 0,
        pendingExpenses: 0,
        transactionCount: 0,
      };
      
      // Calcul des stats membres
      const safeMembers = Array.isArray(members) ? members : [];
      
      // Fonction utilitaire pour normaliser les départements
      const normalizeDepartments = (depts: any): string[] => {
        if (Array.isArray(depts)) {
          return depts.filter(d => d && typeof d === 'string');
        }
        if (typeof depts === 'string') {
          try {
            const parsed = JSON.parse(depts);
            return Array.isArray(parsed) ? parsed.filter(d => d && typeof d === 'string') : [];
          } catch {
            return depts.split(',').map((d: string) => d.trim()).filter(Boolean);
          }
        }
        return [];
      };
      
      const memberStats = {
        totalMembers: safeMembers.length,
        personnel: safeMembers.filter(m => m && m.member_type === 'Personnel').length,
        regularMembers: safeMembers.filter(m => m && m.member_type === 'Membre').length,
        activeDepartments: [...new Set(
          safeMembers.flatMap(m => {
            if (!m) return [];
            return normalizeDepartments(m.departments);
          })
        )],
        byDepartment: safeMembers.reduce((acc, m) => {
          if (!m) return acc;
          const departments = normalizeDepartments(m.departments);
          departments.forEach(dep => {
            if (dep) {
              acc[dep] = (acc[dep] || 0) + 1;
            }
          });
          return acc;
        }, {} as Record<string, number>),
        byPosition: safeMembers.reduce((acc, m) => {
          if (!m) return acc;
          if (m.position && typeof m.position === 'string') {
            acc[m.position] = (acc[m.position] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>),
      };
      
      // Activités récentes
      const safeReports = Array.isArray(reports) ? reports : [];
      const safeExpenses = Array.isArray(expenses) ? expenses : [];
      
      return {
        success: true,
        data: {
          financial,
          members: memberStats,
          events: {
            totalEvents: 0,
            upcomingEvents: 0,
            pastEvents: 0,
            averageAttendance: 0,
            byType: {},
          },
          recentActivity: {
            reports: safeReports.slice(0, 5),
            expenses: safeExpenses.slice(0, 5),
            events: [],
          },
        }
      };
    } catch (error) {
      console.error('💥 Erreur getChurchStats:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur récupération statistiques' 
      };
    }
  }

  // Expose une méthode pour exécuter des requêtes SQL brutes avec sécurité
  static async rawQuery(sql: string, params?: any[]): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      await this.ensurePool();
      if (this.useFallback) {
        return { success: true, data: [] };
      }
      
      // S'assurer que tous les paramètres sont définis ou null
      const safeParams = params ? params.map(p => p ?? null) : [];
      
      const [rows] = await this.pool!.query(sql, safeParams);
      return { success: true, data: rows };
    } catch (error) {
      console.error(' Erreur rawQuery:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur requête SQL' };
    }
  }
}

export default MyChurchMySQLService; 