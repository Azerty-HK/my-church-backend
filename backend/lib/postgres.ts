import 'dotenv/config';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
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
  FinancialSummary, 
  ChurchStats,
  CreateUserData,
  PaymentMethod,
  Message
} from '../../types/database';

const poolConfig = process.env.DATABASE_URL 
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || '127.0.0.1',
      database: process.env.DB_NAME || 'church_db',
      password: process.env.DB_PASSWORD || 'Azerty',
      port: Number(process.env.DB_PORT) || 5432,
    };

const pool = new Pool(poolConfig);

// Service PostgreSQL réel pour My Church
export class PostgreSQLService {
  private static pool = pool;

  static async initialize(): Promise<void> {
    try {
      console.log('🚀 Initialisation PostgreSQL My Church (Production)...');
      await this.initDB();
      console.log('✅ PostgreSQL My Church initialisé avec succès');
    } catch (error) {
      console.error('💥 Erreur initialisation PostgreSQL:', error);
      throw error;
    }
  }

  static async initDB() {
    let retries = 5;
    while (retries > 0) {
      try {
        await this.pool.query('SELECT 1');
        break;
      } catch (err: any) {
        retries--;
        console.log(`⏳ Attente de PostgreSQL (${retries} tentatives restantes)...`);
        if (retries === 0) throw err;
        await new Promise(res => setTimeout(res, 5000));
      }
    }

    const tables = [
      `CREATE TABLE IF NOT EXISTS churches (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        address TEXT,
        phone VARCHAR(64),
        logo_url TEXT,
        currency VARCHAR(10) DEFAULT 'FC',
        initial_amount DOUBLE PRECISION DEFAULT 0,
        current_balance DOUBLE PRECISION DEFAULT 0,
        bank_balance DOUBLE PRECISION DEFAULT 0,
        current_balance_fc DOUBLE PRECISION DEFAULT 0,
        current_balance_usd DOUBLE PRECISION DEFAULT 0,
        current_balance_euro DOUBLE PRECISION DEFAULT 0,
        bank_balance_fc DOUBLE PRECISION DEFAULT 0,
        bank_balance_usd DOUBLE PRECISION DEFAULT 0,
        bank_balance_euro DOUBLE PRECISION DEFAULT 0,
        theme VARCHAR(20) DEFAULT 'blue',
        expense_limit DOUBLE PRECISION DEFAULT 0,
        archive_frequency VARCHAR(20),
        subscription_type VARCHAR(20),
        subscription_start TIMESTAMP NULL,
        subscription_end TIMESTAMP NULL,
        trial_end VARCHAR(255),
        setup_completed BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        api_key TEXT,
        update_code TEXT,
        dossier_auto_create BOOLEAN DEFAULT FALSE,
        dossier_required_for_personnel BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );`,
      `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        church_id VARCHAR(36) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role VARCHAR(64),
        first_name VARCHAR(128),
        last_name VARCHAR(128),
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );`,
      `CREATE TABLE IF NOT EXISTS members (
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
        salary DOUBLE PRECISION DEFAULT 0,
        qr_code TEXT,
        has_dossier BOOLEAN DEFAULT FALSE,
        dossier_status VARCHAR(20),
        joining_date TEXT,
        status VARCHAR(64) DEFAULT 'Actif',
        payment_method VARCHAR(64),
        card_number VARCHAR(64),
        has_paid BOOLEAN DEFAULT FALSE,
        payment_date TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );`,
      `CREATE TABLE IF NOT EXISTS daily_reports (
        id VARCHAR(36) PRIMARY KEY,
        church_id VARCHAR(36) NOT NULL,
        amount DOUBLE PRECISION,
        description TEXT,
        category VARCHAR(128),
        recorded_by VARCHAR(255),
        payment_method VARCHAR(64),
        currency VARCHAR(10) DEFAULT 'FC',
        date TEXT,
        bills_breakdown TEXT,
        total_calculated DOUBLE PRECISION,
        created_at TIMESTAMP DEFAULT NOW()
      );`,
      `CREATE TABLE IF NOT EXISTS expenses (
        id VARCHAR(36) PRIMARY KEY,
        church_id VARCHAR(36) NOT NULL,
        amount DOUBLE PRECISION,
        description TEXT,
        category VARCHAR(128),
        recorded_by VARCHAR(255),
        payment_method VARCHAR(64),
        currency VARCHAR(10) DEFAULT 'FC',
        requires_approval BOOLEAN DEFAULT FALSE,
        is_approved BOOLEAN DEFAULT FALSE,
        approved_by VARCHAR(255),
        approval_message TEXT,
        date TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );`,
      `CREATE TABLE IF NOT EXISTS events (
        id VARCHAR(36) PRIMARY KEY,
        church_id VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        event_type VARCHAR(64),
        start_date TEXT,
        end_date TEXT,
        location VARCHAR(255),
        reminder_enabled BOOLEAN DEFAULT FALSE,
        created_by VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );`,
      `CREATE TABLE IF NOT EXISTS archives (
        id VARCHAR(36) PRIMARY KEY,
        church_id VARCHAR(36) NOT NULL,
        archive_type VARCHAR(20),
        period TEXT,
        period_type VARCHAR(20),
        total_income DOUBLE PRECISION,
        total_expenses DOUBLE PRECISION,
        balance DOUBLE PRECISION,
        data TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );`,
      `CREATE TABLE IF NOT EXISTS public_links (
        id VARCHAR(36) PRIMARY KEY,
        church_id VARCHAR(36) NOT NULL,
        title VARCHAR(255),
        url TEXT NOT NULL,
        description TEXT,
        platform VARCHAR(64),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );`,
      `CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(36) PRIMARY KEY,
        church_id VARCHAR(36),
        user_id VARCHAR(36),
        title VARCHAR(255),
        message TEXT,
        type VARCHAR(20) DEFAULT 'info',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );`,
      `CREATE TABLE IF NOT EXISTS payment_transactions (
        id VARCHAR(36) PRIMARY KEY,
        church_id VARCHAR(36) NOT NULL,
        amount DOUBLE PRECISION,
        payment_method VARCHAR(64),
        phone_number VARCHAR(64),
        transaction_id TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        subscription_type VARCHAR(20) DEFAULT 'monthly',
        created_at TIMESTAMP DEFAULT NOW()
      );`,
      `CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(36) PRIMARY KEY,
        church_id VARCHAR(36) NOT NULL,
        sender_id VARCHAR(36),
        receiver_id VARCHAR(36),
        subject TEXT,
        content TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );`
    ];

    for (const sql of tables) {
      await this.pool.query(sql);
    }
  }

  private static async q(text: string, params: any[] = []) {
    const res = await this.pool.query(text, params);
    return res.rows;
  }

  static isDemoEmail(email: string): boolean {
    return (email || '').toLowerCase().includes('@demo.mychurch.com');
  }

  // ==================== CHURCHES ====================
  static async createChurch(data: Partial<Church>): Promise<Church> {
    const id = uuidv4();
    const cur = data.currency || 'FC';
    const amt = Number(data.initial_amount) || 0;
    await this.pool.query(
      `INSERT INTO churches (id, name, email, address, phone, logo_url, currency, initial_amount, current_balance, 
        current_balance_fc, current_balance_usd, current_balance_euro, bank_balance, theme, expense_limit, 
        subscription_type, trial_end, setup_completed, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0, $13, $14, $15, $16, TRUE, TRUE, NOW(), NOW())`,
      [id, data.name, data.email, data.address, data.phone, data.logo_url, cur, amt, amt,
       cur==='FC'?amt:0, cur==='USD'?amt:0, cur==='EURO'?amt:0,
       data.theme||'blue', data.expense_limit||1000, data.subscription_type||'trial', 
       data.trial_end || '']
    );
    return (await this.getChurch(id))!;
  }

  static async getChurch(id: string): Promise<Church | null> {
    const rows = await this.q(`SELECT * FROM churches WHERE id=$1`, [id]);
    if (!rows[0]) return null;
    const c = rows[0];
    return { ...c, initial_amount: Number(c.initial_amount), current_balance: Number(c.current_balance), bank_balance: Number(c.bank_balance) };
  }

  static async getChurchById(id: string): Promise<Church | null> { return this.getChurch(id); }

  static async getChurchByEmail(email: string): Promise<Church | null> {
    const rows = await this.q(`SELECT * FROM churches WHERE LOWER(email)=$1`, [email.toLowerCase()]);
    return rows[0] || null;
  }

  static async updateChurch(id: string, updates: Partial<Church>): Promise<Church> {
    const fields: string[] = []; const vals: any[] = []; let i = 1;
    for (const [k,v] of Object.entries(updates)) {
      if (k!=='id' && k!=='created_at' && v !== undefined) { fields.push(`${k}=$${i++}`); vals.push(v); }
    }
    if (fields.length) { fields.push(`updated_at=NOW()`); vals.push(id); await this.pool.query(`UPDATE churches SET ${fields.join(',')} WHERE id=$${i}`, vals); }
    return (await this.getChurch(id))!;
  }

  static async getAllChurches(): Promise<Church[]> {
    return await this.q(`SELECT * FROM churches WHERE is_active=TRUE ORDER BY name`);
  }

  static async searchChurchesByName(name: string): Promise<Church[]> {
    return await this.q(`SELECT * FROM churches WHERE is_active=TRUE AND LOWER(name) LIKE $1`, [`%${name.toLowerCase()}%`]);
  }

  // ==================== USERS ====================
  static async createUser(data: CreateUserData): Promise<User> {
    const id = uuidv4();
    const hash = await bcrypt.hash(data.password, 10);
    await this.pool.query(
      `INSERT INTO users (id, church_id, email, password_hash, role, first_name, last_name, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, NOW(), NOW())`,
      [id, data.churchId, data.email.toLowerCase(), hash, data.role, data.firstName, data.lastName]
    );
    return (await this.getUser(id))!;
  }

  static async getUser(id: string): Promise<User | null> {
    const rows = await this.q(`SELECT * FROM users WHERE id=$1`, [id]);
    return rows[0] || null;
  }

  static async getUserById(id: string): Promise<User | null> { return this.getUser(id); }

  static async getUserByEmail(email: string): Promise<User | null> {
    const rows = await this.q(`SELECT * FROM users WHERE email=$1`, [email.toLowerCase()]);
    return rows[0] || null;
  }

  static async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const fields: string[] = []; const vals: any[] = []; let i = 1;
    for (const [k,v] of Object.entries(updates)) {
      if (k!=='id' && k!=='created_at' && v !== undefined) {
        if (k==='password_hash' || (k as any)==='password') { fields.push(`password_hash=$${i++}`); vals.push(await bcrypt.hash(v as string, 10)); }
        else { fields.push(`${k}=$${i++}`); vals.push(v); }
      }
    }
    if (fields.length) { fields.push(`updated_at=NOW()`); vals.push(id); await this.pool.query(`UPDATE users SET ${fields.join(',')} WHERE id=$${i}`, vals); }
    return (await this.getUser(id))!;
  }

  static async deleteUser(id: string): Promise<void> { await this.pool.query(`DELETE FROM users WHERE id=$1`, [id]); }

  static async getChurchUsers(churchId: string): Promise<User[]> {
    return await this.q(`SELECT * FROM users WHERE church_id=$1`, [churchId]);
  }

  static async authenticateUser(email: string, password: string): Promise<{ user: User; church: Church; isDemo: boolean }> {
    const user = await this.getUserByEmail(email);
    if (!user) throw new Error('Email ou mot de passe incorrect');
    if (!await bcrypt.compare(password, user.password_hash)) throw new Error('Email ou mot de passe incorrect');
    if (!user.is_active) throw new Error('Compte désactivé');
    const church = await this.getChurch(user.church_id);
    if (!church) throw new Error('Église introuvable');
    await this.updateUser(user.id, { last_login: new Date().toISOString() });
    return { user, church, isDemo: this.isDemoEmail(email) };
  }

  static async authenticateByName(firstName: string, lastName: string, role: string, churchEmail: string, password: string): Promise<{ user: User; church: Church; isDemo: boolean }> {
    const church = await this.getChurchByEmail(churchEmail);
    if (!church) throw new Error('Église introuvable');
    const users = await this.getChurchUsers(church.id);
    const user = users.find(u => u.first_name.toLowerCase()===firstName.toLowerCase() && u.last_name.toLowerCase()===lastName.toLowerCase() && u.role===(role as any));
    if (!user) throw new Error('Utilisateur introuvable');
    if (!await bcrypt.compare(password, user.password_hash)) throw new Error('Mot de passe incorrect');
    await this.updateUser(user.id, { last_login: new Date().toISOString() });
    return { user, church, isDemo: this.isDemoEmail(churchEmail) };
  }

  // ==================== MEMBERS ====================
  static async createMember(data: Partial<Member>): Promise<Member> {
    const id = uuidv4();
    const qrCode = data.qr_code || `MC-${data.church_id?.substring(0,6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    await this.pool.query(
      `INSERT INTO members (id, church_id, first_name, last_name, email, phone, address, photo_url, member_type, position, 
        departments, salary, qr_code, is_active, status, joining_date, payment_method, card_number, has_paid, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE, $14, $15, $16, $17, $18, NOW(), NOW())`,
      [id, data.church_id, data.first_name, data.last_name, data.email, data.phone, data.address, data.photo_url, 
       data.member_type||'Membre', data.position, JSON.stringify(data.departments||[]), data.salary||0, qrCode,
       data.status||'Actif', data.joining_date||new Date().toISOString(), data.payment_method||'', data.card_number||'', data.has_paid||false]
    );
    return (await this.getMember(id))!;
  }

  static async getMembers(churchId: string): Promise<Member[]> {
    const rows = await this.q(`SELECT * FROM members WHERE church_id=$1 AND is_active=TRUE`, [churchId]);
    return rows.map(r => ({ ...r, departments: r.departments?JSON.parse(r.departments):[] }));
  }

  static async getMember(id: string): Promise<Member | null> {
    const rows = await this.q(`SELECT * FROM members WHERE id=$1`, [id]);
    if (!rows[0]) return null;
    return { ...rows[0], departments: rows[0].departments?JSON.parse(rows[0].departments):[] };
  }

  static async getMemberById(id: string): Promise<Member | null> { return this.getMember(id); }

  static async updateMember(id: string, updates: Partial<Member>): Promise<Member> {
    const fields: string[] = []; const vals: any[] = []; let i = 1;
    for (const [k,v] of Object.entries(updates)) {
      if (k!=='id' && k!=='created_at' && v !== undefined) {
        fields.push(`${k}=$${i++}`); 
        vals.push(k==='departments'?JSON.stringify(v):v);
      }
    }
    if (fields.length) { fields.push(`updated_at=NOW()`); vals.push(id); await this.pool.query(`UPDATE members SET ${fields.join(',')} WHERE id=$${i}`, vals); }
    return (await this.getMember(id))!;
  }

  static async deleteMember(id: string): Promise<void> { await this.pool.query(`UPDATE members SET is_active=FALSE WHERE id=$1`, [id]); }

  static async searchMembers(churchId: string, term: string): Promise<Member[]> {
    const rows = await this.q(
      `SELECT * FROM members WHERE church_id=$1 AND is_active=TRUE 
       AND (LOWER(first_name) LIKE $2 OR LOWER(last_name) LIKE $2 OR LOWER(email) LIKE $2 OR phone LIKE $2)`,
      [churchId, `%${term.toLowerCase()}%`]
    );
    return rows.map(r => ({ ...r, departments: r.departments?JSON.parse(r.departments):[] }));
  }

  static async regenerateMemberQR(id: string): Promise<string> {
    const m = await this.getMember(id);
    if (!m) throw new Error('Membre introuvable');
    const newQR = `MC-${m.church_id.substring(0,6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}-REGEN`;
    await this.updateMember(id, { qr_code: newQR });
    return newQR;
  }

  // ==================== FINANCIALS ====================
  static async createDailyReport(data: Partial<DailyReport>): Promise<DailyReport> {
    const id = uuidv4();
    const cur = data.currency || 'FC';
    await this.pool.query(
      `INSERT INTO daily_reports (id, church_id, amount, description, category, recorded_by, payment_method, currency, date, bills_breakdown, total_calculated, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
      [id, data.church_id, data.amount, data.description, data.category||'Offrandes', data.recorded_by, 
       data.payment_method||'cash', cur, data.date||new Date().toISOString().split('T')[0], JSON.stringify(data.bills_breakdown||[]), data.total_calculated||0]
    );
    await this.updateChurchBalance(data.church_id!, Number(data.amount), data.payment_method||'cash', 'income', cur);
    const rows = await this.q(`SELECT * FROM daily_reports WHERE id=$1`, [id]);
    return { ...rows[0], bills_breakdown: JSON.parse(rows[0].bills_breakdown||'[]'), amount: Number(rows[0].amount) };
  }

  static async createTransaction(data: any): Promise<any> { return this.createDailyReport(data); }

  static async getDailyReports(churchId: string, startDate?: string, endDate?: string): Promise<DailyReport[]> {
    let sql = `SELECT * FROM daily_reports WHERE church_id=$1`;
    const params: any[] = [churchId];
    if (startDate && endDate) { sql += ` AND date BETWEEN $2 AND $3`; params.push(startDate, endDate); }
    sql += ` ORDER BY date DESC`;
    const rows = await this.q(sql, params);
    return rows.map(r => ({ ...r, bills_breakdown: JSON.parse(r.bills_breakdown||'[]'), amount: Number(r.amount) }));
  }

  static async getTransactions(churchId: string): Promise<any[]> { return this.getDailyReports(churchId); }

  static async getTransactionById(id: string): Promise<any | null> {
    const rows = await this.q(`SELECT * FROM daily_reports WHERE id=$1`, [id]);
    if (!rows[0]) return null;
    return { ...rows[0], bills_breakdown: JSON.parse(rows[0].bills_breakdown||'[]'), amount: Number(rows[0].amount) };
  }

  static async updateTransaction(id: string, updates: any): Promise<any> {
    const fields: string[] = []; const vals: any[] = []; let i = 1;
    for (const [k,v] of Object.entries(updates)) {
      if (k!=='id' && k!=='created_at' && v !== undefined) {
        fields.push(`${k}=$${i++}`); 
        vals.push(k==='bills_breakdown'?JSON.stringify(v):v);
      }
    }
    if (fields.length) { vals.push(id); await this.pool.query(`UPDATE daily_reports SET ${fields.join(',')} WHERE id=$${i}`, vals); }
    return this.getTransactionById(id);
  }

  static async deleteTransaction(id: string): Promise<void> { await this.pool.query(`DELETE FROM daily_reports WHERE id=$1`, [id]); }

  static async createExpense(data: Partial<Expense>): Promise<{ expense: Expense; message: string }> {
    const id = uuidv4();
    const church = await this.getChurch(data.church_id!);
    const cur = data.currency || church?.currency || 'FC';
    const limit = church?.expense_limit || 1000;
    const requiresApproval = Number(data.amount) > limit;
    await this.pool.query(
      `INSERT INTO expenses (id, church_id, amount, description, category, recorded_by, payment_method, currency, requires_approval, is_approved, date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
      [id, data.church_id, data.amount, data.description, data.category||'Divers', data.recorded_by, data.payment_method||'cash', cur, 
       requiresApproval, !requiresApproval, data.date||new Date().toISOString().split('T')[0]]
    );
    if (!requiresApproval) { await this.updateChurchBalance(data.church_id!, Number(data.amount), data.payment_method||'cash', 'expense', cur); }
    const rows = await this.q(`SELECT * FROM expenses WHERE id=$1`, [id]);
    const exp = { ...rows[0], amount: Number(rows[0].amount) };
    return { expense: exp, message: requiresApproval ? 'En attente d\'approbation' : 'Approuvée' };
  }

  static async getExpenses(churchId: string, startDate?: string, endDate?: string): Promise<Expense[]> {
    let sql = `SELECT * FROM expenses WHERE church_id=$1`;
    const params: any[] = [churchId];
    if (startDate && endDate) { sql += ` AND date BETWEEN $2 AND $3`; params.push(startDate, endDate); }
    sql += ` ORDER BY date DESC`;
    const rows = await this.q(sql, params);
    return rows.map(r => ({ ...r, amount: Number(r.amount) }));
  }

  static async approveExpense(expenseId: string, approvedBy: string): Promise<{ expense: Expense; message: string }> {
    const rows = await this.q(`SELECT * FROM expenses WHERE id=$1`, [expenseId]);
    const exp = rows[0];
    if (!exp) throw new Error('Dépense introuvable');
    if (exp.is_approved) throw new Error('Déjà approuvée');
    await this.pool.query(`UPDATE expenses SET is_approved=TRUE, approved_by=$1, updated_at=NOW() WHERE id=$2`, [approvedBy, expenseId]);
    await this.updateChurchBalance(exp.church_id, Number(exp.amount), exp.payment_method, 'expense', exp.currency);
    const updated = await this.q(`SELECT * FROM expenses WHERE id=$1`, [expenseId]);
    return { expense: { ...updated[0], amount: Number(updated[0].amount) }, message: 'Dépense approuvée' };
  }

  static async updateChurchBalance(churchId: string, amount: number, method: string, type: 'income'|'expense', currency: string) {
    const sign = type==='income'?1:-1;
    const base = method==='bank'?'bank_balance':'current_balance';
    const curCol = `${base}_${currency.toLowerCase()}`;
    await this.pool.query(`UPDATE churches SET ${base}=${base}+$1, ${curCol}=${curCol}+$1, updated_at=NOW() WHERE id=$2`, [amount*sign, churchId]);
  }

  static async getFinancialSummary(churchId: string): Promise<FinancialSummary> {
    const [reports, expenses, church] = await Promise.all([
      this.getDailyReports(churchId),
      this.getExpenses(churchId),
      this.getChurch(churchId)
    ]);
    const totalIncome = reports.reduce((s, r) => s + r.amount, 0);
    const totalExpenses = expenses.filter(e => e.is_approved).reduce((s, e) => s + e.amount, 0);
    return {
      totalIncome, totalExpenses, balance: totalIncome - totalExpenses,
      bankBalance: church?.bank_balance || 0, cashBalance: church?.current_balance || 0,
      pendingExpenses: expenses.filter(e => !e.is_approved).reduce((s, e) => s + e.amount, 0),
      transactionCount: reports.length + expenses.length
    };
  }

  // ==================== EVENTS ====================
  static async createEvent(data: Partial<Event>): Promise<Event> {
    const id = uuidv4();
    await this.pool.query(
      `INSERT INTO events (id, church_id, title, description, event_type, start_date, end_date, location, reminder_enabled, created_by, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, NOW(), NOW())`,
      [id, data.church_id, data.title, data.description, data.event_type||'Autre', data.start_date, data.end_date, data.location, data.reminder_enabled||false, data.created_by]
    );
    return (await this.getEvent(id))!;
  }

  static async getEvent(id: string): Promise<Event | null> {
    const rows = await this.q(`SELECT * FROM events WHERE id=$1`, [id]);
    return rows[0] || null;
  }

  static async getEvents(churchId: string): Promise<Event[]> {
    return await this.q(`SELECT * FROM events WHERE church_id=$1 AND is_active=TRUE ORDER BY start_date DESC`, [churchId]);
  }

  static async updateEvent(id: string, updates: Partial<Event>): Promise<Event> {
    const fields: string[] = []; const vals: any[] = []; let i = 1;
    for (const [k,v] of Object.entries(updates)) { if (k!=='id' && k!=='created_at' && v !== undefined) { fields.push(`${k}=$${i++}`); vals.push(v); } }
    if (fields.length) { fields.push(`updated_at=NOW()`); vals.push(id); await this.pool.query(`UPDATE events SET ${fields.join(',')} WHERE id=$${i}`, vals); }
    return (await this.getEvent(id))!;
  }

  static async deleteEvent(id: string): Promise<void> { await this.pool.query(`UPDATE events SET is_active=FALSE WHERE id=$1`, [id]); }

  static async createAttendance(data: Partial<Attendance>): Promise<Attendance> {
    const id = uuidv4();
    await this.pool.query(
      `INSERT INTO attendances (id, event_id, member_id, attended, notes, recorded_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [id, data.event_id, data.member_id, data.attended||false, data.notes, data.recorded_by]
    );
    const rows = await this.q(`SELECT * FROM attendances WHERE id=$1`, [id]);
    return rows[0];
  }

  static async checkInMember(data: any): Promise<any> { return this.createAttendance(data); }

  static async getEventAttendances(eventId: string): Promise<Attendance[]> {
    return await this.q(`SELECT * FROM attendances WHERE event_id=$1`, [eventId]);
  }

  static async getAttendance(eventId: string): Promise<Attendance[]> { return this.getEventAttendances(eventId); }

  // ==================== STATS ====================
  static async getChurchStats(churchId: string): Promise<ChurchStats> {
    const [fin, members, events] = await Promise.all([
      this.getFinancialSummary(churchId),
      this.getMembers(churchId),
      this.getEvents(churchId)
    ]);
    const mStats = {
      totalMembers: members.length,
      personnel: members.filter(m => m.member_type==='Personnel').length,
      regularMembers: members.filter(m => m.member_type==='Membre').length,
      activeDepartments: [], byDepartment: {}, byPosition: {},
      withDossier: members.filter(m => m.has_dossier).length,
      dossierStats: { complet: 0, en_revision: 0, incomplet: 0, archive: 0 }
    };
    return {
      financial: fin, members: mStats,
      events: { totalEvents: events.length, upcomingEvents: 0, pastEvents: 0, averageAttendance: 0, byType: {} },
      dossiers: { total: 0, byType: {}, byStatus: {}, documentCount: 0, averageDocumentsPerDossier: 0 },
      recentActivity: { reports: [], expenses: [], events: [], dossiers: [] }
    };
  }

  // ==================== PUBLIC LINKS ====================
  static async createPublicLink(data: Partial<PublicLink>): Promise<PublicLink> {
    const id = uuidv4();
    await this.pool.query(
      `INSERT INTO public_links (id, church_id, title, url, description, platform, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW(), NOW())`,
      [id, data.church_id, data.title, data.url, data.description, data.platform||'Autre']
    );
    const rows = await this.q(`SELECT * FROM public_links WHERE id=$1`, [id]);
    return rows[0];
  }

  static async getChurchPublicLinks(churchId: string): Promise<PublicLink[]> {
    return await this.q(`SELECT * FROM public_links WHERE church_id=$1 AND is_active=TRUE`, [churchId]);
  }

  static async getPublicLinks(churchId: string): Promise<PublicLink[]> { return this.getChurchPublicLinks(churchId); }

  static async getPublicLinksByChurchName(name: string): Promise<PublicLink[]> {
    const churches = await this.searchChurchesByName(name);
    if (!churches.length) return [];
    return await this.getChurchPublicLinks(churches[0].id);
  }

  static async deletePublicLink(id: string): Promise<void> { await this.pool.query(`DELETE FROM public_links WHERE id=$1`, [id]); }

  // ==================== ARCHIVES ====================
  static async createArchive(data: Partial<Archive>): Promise<Archive> {
    const id = uuidv4();
    await this.pool.query(
      `INSERT INTO archives (id, church_id, archive_type, period, period_type, total_income, total_expenses, balance, data, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [id, data.church_id, data.archive_type, data.period, data.period_type, data.total_income, data.total_expenses, data.balance, JSON.stringify(data.data)]
    );
    const rows = await this.q(`SELECT * FROM archives WHERE id=$1`, [id]);
    return rows[0];
  }

  static async getArchives(churchId: string): Promise<Archive[]> {
    return await this.q(`SELECT * FROM archives WHERE church_id=$1 ORDER BY created_at DESC`, [churchId]);
  }

  // ==================== MESSAGES ====================
  static async createMessage(data: Partial<Message>): Promise<Message> {
    const id = uuidv4();
    await this.pool.query(
      `INSERT INTO messages (id, church_id, sender_id, receiver_id, subject, content, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE, NOW())`,
      [id, data.church_id, data.sender_id, data.receiver_id, data.subject, data.content]
    );
    const rows = await this.q(`SELECT * FROM messages WHERE id=$1`, [id]);
    return rows[0];
  }

  static async getMessages(churchId: string, userId: string): Promise<Message[]> {
    return await this.q(`SELECT * FROM messages WHERE church_id=$1 AND (sender_id=$2 OR receiver_id=$2) ORDER BY created_at DESC`, [churchId, userId]);
  }

  // ==================== NOTIFICATIONS ====================
  static async createNotification(data: Partial<Notification>): Promise<Notification> {
    const id = uuidv4();
    await this.pool.query(
      `INSERT INTO notifications (id, church_id, user_id, title, message, type, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE, NOW())`,
      [id, data.church_id, data.user_id, data.title, data.message, data.type||'info']
    );
    const rows = await this.q(`SELECT * FROM notifications WHERE id=$1`, [id]);
    return rows[0];
  }

  static async getNotifications(churchId: string): Promise<Notification[]> {
    return await this.q(`SELECT * FROM notifications WHERE church_id=$1 ORDER BY created_at DESC`, [churchId]);
  }

  static async markNotificationAsRead(id: string): Promise<void> { await this.pool.query(`UPDATE notifications SET is_read=TRUE WHERE id=$1`, [id]); }

  // ==================== ABONNEMENT ====================
  static async checkSubscriptionStatus(churchId: string): Promise<boolean> {
    const c = await this.getChurch(churchId);
    if (!c) return false;
    if (c.subscription_type==='trial' && c.trial_end) return new Date(c.trial_end) > new Date();
    if (c.subscription_end) return new Date(c.subscription_end) > new Date() && !!c.is_active;
    return false;
  }
}

// Aliases pour server.ts
export const initDB = () => PostgreSQLService.initialize();
export const createChurch = (data: any) => PostgreSQLService.createChurch(data);
export const getChurchById = (id: string) => PostgreSQLService.getChurch(id);
export const getChurchByEmail = (email: string) => PostgreSQLService.getChurchByEmail(email);
export const updateChurch = (id: string, updates: any) => PostgreSQLService.updateChurch(id, updates);
export const createUser = (data: any) => PostgreSQLService.createUser(data);
export const getUserById = (id: string) => PostgreSQLService.getUser(id);
export const getUserByEmail = (email: string) => PostgreSQLService.getUserByEmail(email);
export const updateUser = (id: string, updates: any) => PostgreSQLService.updateUser(id, updates);
export const authenticateUser = (e: string, p: string) => PostgreSQLService.authenticateUser(e, p);
export const createMember = (data: any) => PostgreSQLService.createMember(data);
export const getMembers = (id: string) => PostgreSQLService.getMembers(id);
export const getMemberById = (id: string) => PostgreSQLService.getMember(id);
export const updateMember = (id: string, u: any) => PostgreSQLService.updateMember(id, u);
export const deleteMember = (id: string) => PostgreSQLService.deleteMember(id);
export const searchMembers = (id: string, t: string) => PostgreSQLService.searchMembers(id, t);
export const createTransaction = (data: any) => PostgreSQLService.createTransaction(data);
export const getTransactions = (id: string) => PostgreSQLService.getTransactions(id);
export const getTransactionById = (id: string) => PostgreSQLService.getTransactionById(id);
export const updateTransaction = (id: string, u: any) => PostgreSQLService.updateTransaction(id, u);
export const deleteTransaction = (id: string) => PostgreSQLService.deleteTransaction(id);
export const createExpense = (data: any) => PostgreSQLService.createExpense(data);
export const getExpenses = (id: string) => PostgreSQLService.getExpenses(id);
export const approveExpense = (id: string, b: string) => PostgreSQLService.approveExpense(id, b);
export const getChurchStats = (id: string) => PostgreSQLService.getChurchStats(id);
export const createEvent = (data: any) => PostgreSQLService.createEvent(data);
export const getEvents = (id: string) => PostgreSQLService.getEvents(id);
export const updateEvent = (id: string, u: any) => PostgreSQLService.updateEvent(id, u);
export const deleteEvent = (id: string) => PostgreSQLService.deleteEvent(id);
export const checkInMember = (data: any) => PostgreSQLService.checkInMember(data);
export const getAttendance = (id: string) => PostgreSQLService.getAttendance(id);
export const createPublicLink = (data: any) => PostgreSQLService.createPublicLink(data);
export const getPublicLinks = (id: string) => PostgreSQLService.getPublicLinks(id);
export const deletePublicLink = (id: string) => PostgreSQLService.deletePublicLink(id);
export const createArchive = (data: any) => PostgreSQLService.createArchive(data);
export const getArchives = (id: string) => PostgreSQLService.getArchives(id);
export const getNotifications = (id: string) => PostgreSQLService.getNotifications(id);
export const markNotificationAsRead = (id: string) => PostgreSQLService.markNotificationAsRead(id);
