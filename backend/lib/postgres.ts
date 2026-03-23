import 'dotenv/config';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// ============================================================
// Pool de connexion PostgreSQL
// ============================================================
const pool = new Pool(
  process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || '127.0.0.1',
        database: process.env.DB_NAME || 'church_db',
        password: process.env.DB_PASSWORD || 'Azerty',
        port: Number(process.env.DB_PORT) || 5432,
      }
);

pool.on('connect', () => console.log('✅ Connecté à PostgreSQL (church_db)'));
pool.on('error', (err) => console.error('❌ Erreur pool PostgreSQL:', err.message));

async function q(text: string, params: any[] = []) {
  const res = await pool.query(text, params);
  return res.rows;
}

// ============================================================
// Initialisation – Création des tables
// ============================================================
// ============================================================
// Initialisation – Création des tables
// ============================================================
export async function initDB() {
  let retries = 5;
  while (retries > 0) {
    try {
      await pool.query('SELECT 1'); // Test de connexion simple
      break;
    } catch (err: any) {
      retries--;
      console.log(`⏳ Attente de PostgreSQL (${retries} tentatives restantes)...`);
      if (retries === 0) throw err;
      await new Promise(res => setTimeout(res, 5000)); // Attendre 5 secondes
    }
  }

  const tables = [
    {
      name: 'churches',
      sql: `CREATE TABLE IF NOT EXISTS churches (
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
        api_key VARCHAR(255),
        update_code VARCHAR(255),
        dossier_auto_create BOOLEAN DEFAULT FALSE,
        dossier_required_for_personnel BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );`
    },
    {
      name: 'users',
      sql: `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        church_id VARCHAR(36) NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(64) DEFAULT 'Lecteur',
        first_name VARCHAR(128),
        last_name VARCHAR(128),
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );`
    },
    {
      name: 'members',
      sql: `CREATE TABLE IF NOT EXISTS members (
        id VARCHAR(36) PRIMARY KEY,
        church_id VARCHAR(36) NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
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
        qr_code VARCHAR(255),
        has_dossier BOOLEAN DEFAULT FALSE,
        dossier_status VARCHAR(20),
        joining_date VARCHAR(64),
        status VARCHAR(64),
        payment_method VARCHAR(64),
        card_number VARCHAR(64),
        has_paid BOOLEAN,
        payment_date VARCHAR(64),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );`
    },
    {
      name: 'daily_reports',
      sql: `CREATE TABLE IF NOT EXISTS daily_reports (
        id VARCHAR(36) PRIMARY KEY,
        church_id VARCHAR(36) NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
        amount DOUBLE PRECISION,
        description TEXT,
        category VARCHAR(128),
        recorded_by VARCHAR(255),
        payment_method VARCHAR(64),
        currency VARCHAR(10) DEFAULT 'FC',
        date DATE,
        bills_breakdown TEXT,
        total_calculated DOUBLE PRECISION,
        created_at TIMESTAMP DEFAULT NOW()
      );`
    },
    {
      name: 'expenses',
      sql: `CREATE TABLE IF NOT EXISTS expenses (
        id VARCHAR(36) PRIMARY KEY,
        church_id VARCHAR(36) NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
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
        date DATE,
        created_at TIMESTAMP DEFAULT NOW()
      );`
    },
    {
      name: 'events',
      sql: `CREATE TABLE IF NOT EXISTS events (
        id VARCHAR(36) PRIMARY KEY,
        church_id VARCHAR(36) NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        event_type VARCHAR(64),
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        location VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );`
    },
    {
      name: 'attendances',
      sql: `CREATE TABLE IF NOT EXISTS attendances (
        id VARCHAR(36) PRIMARY KEY,
        event_id VARCHAR(36) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        member_id VARCHAR(36) REFERENCES members(id) ON DELETE SET NULL,
        church_id VARCHAR(36) REFERENCES churches(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'present',
        checked_in_at TIMESTAMP,
        qr_code VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );`
    },
    {
      name: 'public_links',
      sql: `CREATE TABLE IF NOT EXISTS public_links (
        id VARCHAR(36) PRIMARY KEY,
        church_id VARCHAR(36) NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
        title VARCHAR(255),
        url TEXT NOT NULL,
        description TEXT,
        platform VARCHAR(64),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );`
    },
    {
      name: 'archives',
      sql: `CREATE TABLE IF NOT EXISTS archives (
        id VARCHAR(36) PRIMARY KEY,
        church_id VARCHAR(36) NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
        archive_type VARCHAR(20),
        period_label VARCHAR(64),
        year INT,
        month INT,
        data TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );`
    },
    {
      name: 'notifications',
      sql: `CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(36) PRIMARY KEY,
        church_id VARCHAR(36) REFERENCES churches(id) ON DELETE CASCADE,
        title VARCHAR(255),
        message TEXT,
        type VARCHAR(20) DEFAULT 'info',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );`
    },
    {
      name: 'payment_transactions',
      sql: `CREATE TABLE IF NOT EXISTS payment_transactions (
        id VARCHAR(36) PRIMARY KEY,
        church_id VARCHAR(36) NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
        amount DOUBLE PRECISION NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        phone_number VARCHAR(20),
        transaction_id VARCHAR(255),
        status VARCHAR(20) DEFAULT 'pending',
        subscription_type VARCHAR(20) DEFAULT 'monthly',
        created_at TIMESTAMP DEFAULT NOW()
      );`
    },
    {
      name: 'audit_logs',
      sql: `CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(36) PRIMARY KEY,
        church_id VARCHAR(36) REFERENCES churches(id) ON DELETE CASCADE,
        user_id VARCHAR(36),
        action VARCHAR(255) NOT NULL,
        resource_type VARCHAR(50),
        resource_id VARCHAR(36),
        details TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );`
    },
    {
      name: 'messages',
      sql: `CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(36) PRIMARY KEY,
        church_id VARCHAR(36) REFERENCES churches(id) ON DELETE CASCADE,
        sender_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
        receiver_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
        subject VARCHAR(255),
        content TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );`
    }
  ];

  for (const table of tables) {
    try {
      await pool.query(table.sql);
      // console.log(`✅ Table ${table.name} ok`);
    } catch (err: any) {
      console.error(`❌ Erreur création table ${table.name} : ${err.message}`);
      throw err; // On arrête tout si une table échoue
    }
  }

  console.log('✅ Toutes le tables PostgreSQL ont été vérifiées/créées.');
}

// ============================================================
// Helpers
// ============================================================
function jsonS(val: any) { return val !== undefined && val !== null ? JSON.stringify(val) : null; }

// ============================================================
// CHURCHES
// ============================================================
export async function createChurch(data: any) {
  const id = uuidv4();
  const cur = data.currency || 'FC';
  const amt = Number(data.initial_amount) || 0;
  await pool.query(
    `INSERT INTO churches (id,name,email,address,phone,logo_url,currency,initial_amount,current_balance,bank_balance,
     current_balance_fc,current_balance_usd,current_balance_euro,bank_balance_fc,bank_balance_usd,bank_balance_euro,
     theme,expense_limit,subscription_type,trial_end,is_active,api_key,update_code,created_at,updated_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,0,$10,$11,$12,0,0,0,$13,$14,$15,$16,TRUE,$17,$18,NOW(),NOW())`,
    [id, data.name||'', data.email||'', data.address||null, data.phone||null, data.logo_url||null,
     cur, amt, amt,
     cur==='FC'?amt:0, cur==='USD'?amt:0, cur==='EURO'?amt:0,
     data.theme||'blue', Number(data.expense_limit)||0,
     data.subscription_type||'trial',
     data.trial_end || new Date(Date.now()+30*86400*1000).toISOString(),
     `MC_API_${Date.now()}_${Math.random().toString(36).slice(2,8).toUpperCase()}`,
     `MC_UPDATE_${Date.now()}_${Math.random().toString(36).slice(2,8).toUpperCase()}`]
  );
  const rows = await q(`SELECT * FROM churches WHERE id=$1`,[id]);
  return rows[0];
}

export async function getChurch(id: string) {
  const rows = await q(`SELECT * FROM churches WHERE id=$1`,[id]);
  return rows[0] || null;
}

export async function getChurchByEmail(email: string) {
  const rows = await q(`SELECT * FROM churches WHERE LOWER(email)=$1`,[email.toLowerCase()]);
  return rows[0] || null;
}

export async function getAllChurches() {
  return await q(`SELECT * FROM churches WHERE is_active=TRUE ORDER BY name`);
}

export async function searchChurchesByName(name: string) {
  return await q(`SELECT * FROM churches WHERE is_active=TRUE AND LOWER(name) LIKE $1 ORDER BY name`,[`%${name.toLowerCase()}%`]);
}

export async function updateChurch(id: string, updates: any) {
  const skip = new Set(['id','created_at']);
  const fields: string[] = [];
  const vals: any[] = [];
  let i = 1;
  for (const [k,v] of Object.entries(updates)) {
    if (!skip.has(k) && v !== undefined) { fields.push(`${k}=$${i++}`); vals.push(v); }
  }
  if (fields.length) {
    fields.push(`updated_at=NOW()`);
    vals.push(id);
    await pool.query(`UPDATE churches SET ${fields.join(',')} WHERE id=$${i}`, vals);
  }
  return await getChurch(id);
}

export async function checkSubscriptionStatus(churchId: string) {
  const church = await getChurch(churchId);
  if (!church) return false;
  if (church.subscription_type === 'trial') {
    return !church.trial_end || new Date(church.trial_end) > new Date();
  }
  return !church.subscription_end || new Date(church.subscription_end) > new Date();
}

export async function processSubscriptionPayment(churchId: string, type: string, transactionId: string, paidAt: string) {
  const now = new Date();
  const end = new Date(now);
  if (type === 'monthly') end.setMonth(end.getMonth()+1);
  else end.setFullYear(end.getFullYear()+1);
  await updateChurch(churchId, {subscription_type: type, subscription_start: now.toISOString(), subscription_end: end.toISOString()});
  return { success: true, message: 'Abonnement activé' };
}

export async function getChurchById(id: string) { return getChurch(id); }

// ============================================================
// USERS
// ============================================================
export async function createUser(data: any) {
  const id = uuidv4();
  const hash = await bcrypt.hash(data.password, 10);
  await pool.query(
    `INSERT INTO users(id,church_id,email,password_hash,role,first_name,last_name,is_active,created_at,updated_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,TRUE,NOW(),NOW())`,
    [id, data.churchId||data.church_id, (data.email||'').toLowerCase(), hash,
     data.role||'Lecteur', data.firstName||data.first_name||'', data.lastName||data.last_name||'']
  );
  const rows = await q(`SELECT * FROM users WHERE id=$1`,[id]);
  return rows[0];
}

export async function getUserByEmail(email: string) {
  const rows = await q(`SELECT * FROM users WHERE email=$1`,[email.toLowerCase()]);
  return rows[0] || null;
}

export async function getUser(id: string) {
  const rows = await q(`SELECT * FROM users WHERE id=$1`,[id]);
  return rows[0] || null;
}

export async function getChurchUsers(churchId: string) {
  return await q(`SELECT * FROM users WHERE church_id=$1 AND is_active=TRUE ORDER BY first_name`,[churchId]);
}

export async function updateUser(id: string, updates: any) {
  const skip = new Set(['id','created_at']);
  const fields: string[] = [];
  const vals: any[] = [];
  let i = 1;
  for (const [k,v] of Object.entries(updates)) {
    if (!skip.has(k) && v !== undefined) {
      if (k==='password_hash') {
        fields.push(`${k}=$${i++}`);
        vals.push(await bcrypt.hash(v as string,10));
      } else { fields.push(`${k}=$${i++}`); vals.push(v); }
    }
  }
  if (fields.length) {
    fields.push(`updated_at=NOW()`);
    vals.push(id);
    await pool.query(`UPDATE users SET ${fields.join(',')} WHERE id=$${i}`, vals);
  }
  return await getUser(id);
}

export async function deleteUser(id: string) {
  await pool.query(`DELETE FROM users WHERE id=$1`,[id]);
}

export async function authenticateUser(email: string, password: string) {
  const user = await getUserByEmail(email);
  if (!user) throw new Error('Email ou mot de passe incorrect');
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new Error('Email ou mot de passe incorrect');
  if (!user.is_active) throw new Error('Compte désactivé');
  const church = await getChurch(user.church_id);
  if (!church) throw new Error('Église introuvable');
  await updateUser(user.id, { last_login: new Date().toISOString() });
  return { user, church, isDemo: (email||'').includes('@demo.mychurch.com') };
}

export async function authenticateByName(firstName: string, lastName: string, role: string, churchEmail: string, password: string) {
  const church = await getChurchByEmail(churchEmail);
  if (!church) throw new Error('Église introuvable');
  const users = await getChurchUsers(church.id);
  const user = users.find((u: any) =>
    (u.first_name||'').toLowerCase()===firstName.toLowerCase() &&
    (u.last_name||'').toLowerCase()===lastName.toLowerCase() &&
    u.role===role
  );
  if (!user) throw new Error('Utilisateur introuvable');
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new Error('Mot de passe incorrect');
  if (!user.is_active) throw new Error('Compte désactivé');
  await updateUser(user.id, { last_login: new Date().toISOString() });
  return { user, church, isDemo: (churchEmail||'').includes('@demo.mychurch.com') };
}

// ============================================================
// MEMBERS
// ============================================================
export async function createMember(data: any) {
  const id = uuidv4();
  const existingCount = (await q(`SELECT COUNT(*) as c FROM members WHERE church_id=$1`, [data.church_id]));
  const num = Number(existingCount[0]?.c || 0) + 1;
  const qrCode = data.qr_code || `MC-${(data.church_id||'').substring(0,6).toUpperCase()}-${String(num).padStart(5,'0')}-${Date.now().toString(36).toUpperCase()}`;
  await pool.query(
    `INSERT INTO members(id,church_id,first_name,last_name,email,phone,address,photo_url,member_type,
     position,departments,salary,qr_code,has_dossier,dossier_status,joining_date,status,payment_method,
     card_number,has_paid,payment_date,is_active,created_at,updated_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,TRUE,NOW(),NOW())`,
    [id,data.church_id||'',data.first_name||'',data.last_name||'',data.email||'',
     data.phone||null,data.address||null,data.photo_url||null,data.member_type||'Membre',
     data.position||null,jsonS(data.departments),Number(data.salary)||0,qrCode,
     data.has_dossier||false,data.dossier_status||null,data.joining_date||null,
     data.status||'',data.payment_method||null,data.card_number||null,
     data.has_paid||null,data.payment_date||'']
  );
  const rows = await q(`SELECT * FROM members WHERE id=$1`,[id]);
  const m = rows[0];
  if (m) m.departments = m.departments ? JSON.parse(m.departments) : [];
  return m;
}

export async function getMembers(churchId: string) {
  const rows = await q(`SELECT * FROM members WHERE church_id=$1 AND is_active=TRUE ORDER BY last_name,first_name`,[churchId]);
  return rows.map((m: any) => { m.departments = m.departments ? JSON.parse(m.departments) : []; return m; });
}

export async function getMember(id: string) {
  const rows = await q(`SELECT * FROM members WHERE id=$1`,[id]);
  const m = rows[0];
  if (m) m.departments = m.departments ? JSON.parse(m.departments) : [];
  return m || null;
}

export async function updateMember(id: string, updates: any) {
  const skip = new Set(['id','created_at']);
  const fields: string[] = [];
  const vals: any[] = [];
  let i = 1;
  for (const [k,v] of Object.entries(updates)) {
    if (!skip.has(k) && v !== undefined) {
      fields.push(`${k}=$${i++}`);
      vals.push(k==='departments' ? jsonS(v) : v);
    }
  }
  if (fields.length) {
    fields.push(`updated_at=NOW()`);
    vals.push(id);
    await pool.query(`UPDATE members SET ${fields.join(',')} WHERE id=$${i}`, vals);
  }
  return await getMember(id);
}

export async function deleteMember(id: string) {
  await pool.query(`UPDATE members SET is_active=FALSE WHERE id=$1`,[id]);
}

export async function regenerateMemberQR(id: string) {
  const m = await getMember(id);
  if (!m) throw new Error('Membre introuvable');
  const newQR = `MC-${m.church_id.substring(0,6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}-REGEN`;
  await updateMember(id, { qr_code: newQR });
  return newQR;
}

// ============================================================
// DAILY REPORTS
// ============================================================
export async function createDailyReport(data: any) {
  const id = uuidv4();
  await pool.query(
    `INSERT INTO daily_reports(id,church_id,amount,description,category,recorded_by,payment_method,currency,date,bills_breakdown,total_calculated,created_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())`,
    [id,data.church_id||'',Number(data.amount)||0,data.description||'',data.category||'Offrandes',
     data.recorded_by||'',data.payment_method||'cash',data.currency||'FC',
     data.date||new Date().toISOString().split('T')[0],
     jsonS(data.bills_breakdown),data.total_calculated||null]
  );
  // Update balance
  await updateBalance(data.church_id, Number(data.amount)||0, data.payment_method, 'income');
  const rows = await q(`SELECT * FROM daily_reports WHERE id=$1`,[id]);
  return rows[0];
}

export async function getDailyReports(churchId: string, startDate?: string, endDate?: string) {
  if (startDate && endDate) {
    return await q(`SELECT * FROM daily_reports WHERE church_id=$1 AND date BETWEEN $2 AND $3 ORDER BY date DESC`,[churchId,startDate,endDate]);
  }
  return await q(`SELECT * FROM daily_reports WHERE church_id=$1 ORDER BY date DESC`,[churchId]);
}

// ============================================================
// EXPENSES
// ============================================================
export async function createExpense(data: any) {
  const id = uuidv4();
  const church = await getChurch(data.church_id);
  const requiresApproval = Number(data.amount) > (Number(church?.expense_limit)||1000);
  await pool.query(
    `INSERT INTO expenses(id,church_id,amount,description,category,recorded_by,payment_method,currency,requires_approval,is_approved,date,created_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())`,
    [id,data.church_id||'',Number(data.amount)||0,data.description||'',data.category||'',
     data.recorded_by||'',data.payment_method||'cash',data.currency||'FC',
     requiresApproval,!requiresApproval,
     data.date||new Date().toISOString().split('T')[0]]
  );
  if (!requiresApproval) {
    await updateBalance(data.church_id, Number(data.amount)||0, data.payment_method, 'expense');
  }
  const rows = await q(`SELECT * FROM expenses WHERE id=$1`,[id]);
  return { expense: rows[0], message: requiresApproval ? 'Dépense en attente d\'approbation' : 'Dépense enregistrée' };
}

export async function getExpenses(churchId: string, startDate?: string, endDate?: string) {
  if (startDate && endDate) {
    return await q(`SELECT * FROM expenses WHERE church_id=$1 AND date BETWEEN $2 AND $3 ORDER BY date DESC`,[churchId,startDate,endDate]);
  }
  return await q(`SELECT * FROM expenses WHERE church_id=$1 ORDER BY date DESC`,[churchId]);
}

export async function approveExpense(expenseId: string, approvedBy: string) {
  const rows = await q(`SELECT * FROM expenses WHERE id=$1`,[expenseId]);
  const exp = rows[0];
  if (!exp) throw new Error('Dépense introuvable');
  await pool.query(`UPDATE expenses SET is_approved=TRUE, approved_by=$1 WHERE id=$2`,[approvedBy,expenseId]);
  await updateBalance(exp.church_id, Number(exp.amount), exp.payment_method, 'expense');
  const updated = await q(`SELECT * FROM expenses WHERE id=$1`,[expenseId]);
  return { expense: updated[0], message: 'Dépense approuvée' };
}

// ============================================================
// BALANCE
// ============================================================
async function updateBalance(churchId: string, amount: number, method: string, type: 'income'|'expense') {
  const ch = await getChurch(churchId);
  if (!ch) return;
  const sign = type === 'income' ? 1 : -1;
  const cur = ch.currency || 'FC';

  let sets: string[] = [];
  if (method === 'bank') {
    sets = ['bank_balance=bank_balance+$1', 'updated_at=NOW()'];
    if (cur==='FC') sets.push('bank_balance_fc=bank_balance_fc+$1');
    if (cur==='USD') sets.push('bank_balance_usd=bank_balance_usd+$1');
    if (cur==='EURO') sets.push('bank_balance_euro=bank_balance_euro+$1');
  } else {
    sets = ['current_balance=current_balance+$1', 'updated_at=NOW()'];
    if (cur==='FC') sets.push('current_balance_fc=current_balance_fc+$1');
    if (cur==='USD') sets.push('current_balance_usd=current_balance_usd+$1');
    if (cur==='EURO') sets.push('current_balance_euro=current_balance_euro+$1');
  }
  await pool.query(`UPDATE churches SET ${sets.join(',')} WHERE id=$2`,[amount*sign, churchId]);
}

export async function updateChurchBalance(churchId: string, amount: number, method: string, type: 'income'|'expense') {
  await updateBalance(churchId, amount, method, type);
}

export async function getFinancialSummary(churchId: string) {
  const [reports, expenses, church] = await Promise.all([
    getDailyReports(churchId),
    getExpenses(churchId),
    getChurch(churchId)
  ]);
  const totalIncome = reports.reduce((s: number, r: any) => s + Number(r.amount||0), 0);
  const totalExpenses = expenses.filter((e: any) => e.is_approved).reduce((s: number, e: any) => s + Number(e.amount||0), 0);
  return {
    totalIncome, totalExpenses,
    netBalance: totalIncome - totalExpenses,
    currentBalance: Number(church?.current_balance||0),
    bankBalance: Number(church?.bank_balance||0),
    reportsCount: reports.length,
    expensesCount: expenses.length
  };
}

// ============================================================
// EVENTS
// ============================================================
export async function createEvent(data: any) {
  const id = uuidv4();
  await pool.query(
    `INSERT INTO events(id,church_id,title,description,event_type,start_date,end_date,location,is_active,created_at,updated_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,TRUE,NOW(),NOW())`,
    [id,data.church_id,data.title||'',data.description||null,data.event_type||null,
     data.start_date||null,data.end_date||null,data.location||null]
  );
  const rows = await q(`SELECT * FROM events WHERE id=$1`,[id]);
  return rows[0];
}

export async function getEvents(churchId: string) {
  return await q(`SELECT * FROM events WHERE church_id=$1 AND is_active=TRUE ORDER BY start_date DESC`,[churchId]);
}

export async function updateEvent(id: string, updates: any) {
  const skip = new Set(['id','created_at','church_id']);
  const fields: string[] = []; const vals: any[] = []; let i = 1;
  for (const [k,v] of Object.entries(updates)) {
    if (!skip.has(k) && v !== undefined) { fields.push(`${k}=$${i++}`); vals.push(v); }
  }
  if (fields.length) { fields.push('updated_at=NOW()'); vals.push(id); await pool.query(`UPDATE events SET ${fields.join(',')} WHERE id=$${i}`,vals); }
  const rows = await q(`SELECT * FROM events WHERE id=$1`,[id]);
  return rows[0];
}

export async function deleteEvent(id: string) {
  await pool.query(`UPDATE events SET is_active=FALSE WHERE id=$1`,[id]);
}

export async function createAttendance(data: any) {
  const id = uuidv4();
  await pool.query(
    `INSERT INTO attendances(id,event_id,member_id,church_id,status,checked_in_at,qr_code,created_at)
     VALUES($1,$2,$3,$4,$5,NOW(),$6,NOW())`,
    [id,data.event_id,data.member_id||null,data.church_id||null,data.status||'present',data.qr_code||null]
  );
  const rows = await q(`SELECT * FROM attendances WHERE id=$1`,[id]);
  return rows[0];
}

export async function getEventAttendances(eventId: string) {
  return await q(`SELECT * FROM attendances WHERE event_id=$1`,[eventId]);
}

export async function updateAttendance(id: string, updates: any) {
  const skip=new Set(['id','created_at']); const fields: string[]=[]; const vals: any[]=[]; let i=1;
  for(const [k,v] of Object.entries(updates)){if(!skip.has(k)&&v!==undefined){fields.push(`${k}=$${i++}`);vals.push(v);}}
  if(fields.length){vals.push(id);await pool.query(`UPDATE attendances SET ${fields.join(',')} WHERE id=$${i}`,vals);}
  const rows=await q(`SELECT * FROM attendances WHERE id=$1`,[id]);
  return rows[0];
}

// ============================================================
// PUBLIC LINKS
// ============================================================
export async function createPublicLink(data: any) {
  const id = uuidv4();
  await pool.query(
    `INSERT INTO public_links(id,church_id,title,url,description,platform,is_active,created_at,updated_at)
     VALUES($1,$2,$3,$4,$5,$6,TRUE,NOW(),NOW())`,
    [id,data.church_id,data.title||'',data.url||'',data.description||null,data.platform||null]
  );
  const rows = await q(`SELECT * FROM public_links WHERE id=$1`,[id]);
  return rows[0];
}

export async function getChurchPublicLinks(churchId: string) {
  return await q(`SELECT * FROM public_links WHERE church_id=$1 AND is_active=TRUE`,[churchId]);
}

export async function getPublicLinksByChurchName(name: string) {
  const churches = await searchChurchesByName(name);
  if (!churches.length) return [];
  const churchId = churches[0].id;
  return await getChurchPublicLinks(churchId);
}

export async function deletePublicLink(id: string) {
  await pool.query(`UPDATE public_links SET is_active=FALSE WHERE id=$1`,[id]);
}

// ============================================================
// ARCHIVES
// ============================================================
export async function createArchive(data: any) {
  const id = uuidv4();
  await pool.query(
    `INSERT INTO archives(id,church_id,archive_type,period_label,year,month,data,created_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,NOW())`,
    [id,data.church_id,data.archive_type,data.period_label||'',data.year||null,data.month||null,jsonS(data.data)]
  );
  const rows = await q(`SELECT * FROM archives WHERE id=$1`,[id]);
  return rows[0];
}

export async function getArchives(churchId: string, type?: string) {
  if (type) {
    return await q(`SELECT * FROM archives WHERE church_id=$1 AND archive_type=$2 ORDER BY created_at DESC`,[churchId,type]);
  }
  return await q(`SELECT * FROM archives WHERE church_id=$1 ORDER BY created_at DESC`,[churchId]);
}

// ============================================================
// NOTIFICATIONS
// ============================================================
export async function createNotification(data: any) {
  const id = uuidv4();
  await pool.query(
    `INSERT INTO notifications(id,church_id,title,message,type,is_read,created_at)
     VALUES($1,$2,$3,$4,$5,FALSE,NOW())`,
    [id,data.church_id,data.title||'',data.message||'',data.type||'info']
  );
  const rows = await q(`SELECT * FROM notifications WHERE id=$1`,[id]);
  return rows[0];
}

export async function getNotifications(churchId: string) {
  return await q(`SELECT * FROM notifications WHERE church_id=$1 ORDER BY created_at DESC`,[churchId]);
}

export async function markNotificationRead(id: string) {
  await pool.query(`UPDATE notifications SET is_read=TRUE WHERE id=$1`,[id]);
}

// ============================================================
// PAYMENT TRANSACTIONS
// ============================================================
export async function createPaymentTransaction(data: any) {
  const id = uuidv4();
  await pool.query(
    `INSERT INTO payment_transactions(id,church_id,amount,payment_method,phone_number,transaction_id,status,subscription_type,created_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
    [id,data.church_id,Number(data.amount)||0,data.payment_method||'cash',data.phone_number||null,
     data.transaction_id||null,data.status||'pending',data.subscription_type||'monthly']
  );
  const rows = await q(`SELECT * FROM payment_transactions WHERE id=$1`,[id]);
  return rows[0];
}

export async function getPaymentTransactions(churchId: string) {
  return await q(`SELECT * FROM payment_transactions WHERE church_id=$1 ORDER BY created_at DESC`,[churchId]);
}

export async function updatePaymentTransaction(id: string, updates: any) {
  const skip=new Set(['id','created_at','church_id']); const fields: string[]=[]; const vals: any[]=[]; let i=1;
  for(const [k,v] of Object.entries(updates)){if(!skip.has(k)&&v!==undefined){fields.push(`${k}=$${i++}`);vals.push(v);}}
  if(fields.length){vals.push(id);await pool.query(`UPDATE payment_transactions SET ${fields.join(',')} WHERE id=$${i}`,vals);}
  const rows=await q(`SELECT * FROM payment_transactions WHERE id=$1`,[id]);
  return rows[0];
}

// ============================================================
// AUDIT LOGS
// ============================================================
export async function createAuditLogEntry(data: any) {
  const id = uuidv4();
  await pool.query(
    `INSERT INTO audit_logs(id,church_id,user_id,action,resource_type,resource_id,details,created_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,NOW())`,
    [id,data.church_id||null,data.user_id||null,data.action||'',data.resource_type||'',data.resource_id||null,jsonS(data.details)]
  );
  const rows = await q(`SELECT * FROM audit_logs WHERE id=$1`,[id]);
  return rows[0];
}

export async function getAuditLogs(churchId: string) {
  return await q(`SELECT * FROM audit_logs WHERE church_id=$1 ORDER BY created_at DESC`,[churchId]);
}

// ============================================================
// MESSAGES
// ============================================================
export async function createMessage(data: any) {
  const id = uuidv4();
  await pool.query(
    `INSERT INTO messages(id,church_id,sender_id,receiver_id,subject,content,is_read,created_at)
     VALUES($1,$2,$3,$4,$5,$6,FALSE,NOW())`,
    [id,data.church_id||null,data.sender_id,data.receiver_id,data.subject||'',data.content||'']
  );
  const rows = await q(`SELECT * FROM messages WHERE id=$1`,[id]);
  return rows[0];
}

export async function getMessages(churchId: string, userId: string) {
  return await q(`SELECT * FROM messages WHERE church_id=$1 AND (sender_id=$2 OR receiver_id=$2) ORDER BY created_at DESC`,[churchId,userId]);
}

export async function markMessageAsRead(id: string) {
  await pool.query(`UPDATE messages SET is_read=TRUE WHERE id=$1`,[id]);
}

// ============================================================
// CHURCH STATS
// ============================================================
export async function getChurchStats(churchId: string) {
  const [members, reports, expenses, events, archives] = await Promise.all([
    getMembers(churchId),
    getDailyReports(churchId),
    getExpenses(churchId),
    getEvents(churchId),
    getArchives(churchId)
  ]);
  const totalIncome = reports.reduce((s: number, r: any) => s + Number(r.amount||0), 0);
  const totalExpenses = expenses.filter((e: any)=>e.is_approved).reduce((s: number, e: any) => s + Number(e.amount||0), 0);
  return {
    totalMembers: members.length,
    activeMembers: members.filter((m: any)=>m.is_active).length,
    totalReports: reports.length,
    totalExpenses: expenses.length,
    pendingExpenses: expenses.filter((e: any)=>!e.is_approved&&e.requires_approval).length,
    totalEvents: events.length,
    totalArchives: archives.length,
    totalIncome,
    totalExpensesAmount: totalExpenses,
    netBalance: totalIncome - totalExpenses
  };
}

export { pool };
