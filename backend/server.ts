console.log('🏁 Tentative de démarrage du serveur MyChurch...');
import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import * as db from './lib/postgres';
import { initDB } from './lib/postgres';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Santé du serveur
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', app: 'MyChurch Backend PostgreSQL', timestamp: new Date().toISOString() });
});

// ============================================================
// RPC : Toute la logique métier via une seule route
// L'app mobile envoie: { method: 'createMember', args: [...] }
// Le serveur exécute la fonction et retourne { result, error }
// ============================================================
const allowedMethods: Record<string, (...args: any[]) => Promise<any>> = {
  // Churches
  createChurch:            (...a) => db.createChurch(a[0]),
  getChurch:               (...a) => db.getChurch(a[0]),
  getChurchByEmail:        (...a) => db.getChurchByEmail(a[0]),
  getAllChurches:           ()     => db.getAllChurches(),
  searchChurchesByName:    (...a) => db.searchChurchesByName(a[0]),
  updateChurch:            (...a) => db.updateChurch(a[0], a[1]),
  checkSubscriptionStatus: (...a) => db.checkSubscriptionStatus(a[0]),
  processSubscriptionPayment: (...a) => db.processSubscriptionPayment(a[0],a[1],a[2],a[3]),
  getChurchById:           (...a) => db.getChurchById(a[0]),

  // Users
  createUser:              (...a) => db.createUser(a[0]),
  getUserByEmail:          (...a) => db.getUserByEmail(a[0]),
  getUser:                 (...a) => db.getUser(a[0]),
  getChurchUsers:          (...a) => db.getChurchUsers(a[0]),
  updateUser:              (...a) => db.updateUser(a[0], a[1]),
  deleteUser:              (...a) => db.deleteUser(a[0]),
  authenticateUser:        (...a) => db.authenticateUser(a[0], a[1]),
  authenticateByName:      (...a) => db.authenticateByName(a[0],a[1],a[2],a[3],a[4]),

  // Members
  createMember:            (...a) => db.createMember(a[0]),
  getMembers:              (...a) => db.getMembers(a[0]),
  getMember:               (...a) => db.getMember(a[0]),
  updateMember:            (...a) => db.updateMember(a[0], a[1]),
  deleteMember:            (...a) => db.deleteMember(a[0]),
  regenerateMemberQR:      (...a) => db.regenerateMemberQR(a[0]),

  // Financial
  createDailyReport:       (...a) => db.createDailyReport(a[0]),
  getDailyReports:         (...a) => db.getDailyReports(a[0], a[1], a[2]),
  createExpense:           (...a) => db.createExpense(a[0]),
  getExpenses:             (...a) => db.getExpenses(a[0], a[1], a[2]),
  approveExpense:          (...a) => db.approveExpense(a[0], a[1]),
  updateChurchBalance:     (...a) => db.updateChurchBalance(a[0],a[1],a[2],a[3]),
  getFinancialSummary:     (...a) => db.getFinancialSummary(a[0]),

  // Events
  createEvent:             (...a) => db.createEvent(a[0]),
  getEvents:               (...a) => db.getEvents(a[0]),
  updateEvent:             (...a) => db.updateEvent(a[0], a[1]),
  deleteEvent:             (...a) => db.deleteEvent(a[0]),
  createAttendance:        (...a) => db.createAttendance(a[0]),
  getEventAttendances:     (...a) => db.getEventAttendances(a[0]),
  updateAttendance:        (...a) => db.updateAttendance(a[0], a[1]),

  // Public links
  createPublicLink:        (...a) => db.createPublicLink(a[0]),
  getChurchPublicLinks:    (...a) => db.getChurchPublicLinks(a[0]),
  getPublicLinksByChurchName: (...a) => db.getPublicLinksByChurchName(a[0]),
  deletePublicLink:        (...a) => db.deletePublicLink(a[0]),

  // Archives
  createArchive:           (...a) => db.createArchive(a[0]),
  getArchives:             (...a) => db.getArchives(a[0], a[1]),

  // Notifications
  createNotification:      (...a) => db.createNotification(a[0]),
  getNotifications:        (...a) => db.getNotifications(a[0]),
  markNotificationRead:    (...a) => db.markNotificationRead(a[0]),

  // Payment
  createPaymentTransaction:  (...a) => db.createPaymentTransaction(a[0]),
  getPaymentTransactions:    (...a) => db.getPaymentTransactions(a[0]),
  updatePaymentTransaction:  (...a) => db.updatePaymentTransaction(a[0], a[1]),

  // Audit
  createAuditLogEntry:     (...a) => db.createAuditLogEntry(a[0]),
  getAuditLogs:            (...a) => db.getAuditLogs(a[0]),

  // Messages
  createMessage:           (...a) => db.createMessage(a[0]),
  getMessages:             (...a) => db.getMessages(a[0], a[1]),
  markMessageAsRead:       (...a) => db.markMessageAsRead(a[0]),

  // Stats
  getChurchStats:          (...a) => db.getChurchStats(a[0]),
};

app.post('/rpc', async (req: Request, res: Response) => {
  const { method, args = [] } = req.body;

  if (!method || !allowedMethods[method]) {
    return res.status(400).json({ error: `Méthode inconnue : ${method}` });
  }

  try {
    const result = await allowedMethods[method](...args);
    return res.json({ result });
  } catch (error: any) {
    console.error(`❌ Erreur RPC [${method}]:`, error.message);
    return res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

const PORT = Number(process.env.PORT) || 3000;

async function start() {
  try {
    await initDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Backend MyChurch démarré sur http://0.0.0.0:${PORT}`);
      console.log(`📡 RPC disponible sur http://0.0.0.0:${PORT}/rpc`);
    });
  } catch (err: any) {
    console.error('💥 Impossible de démarrer le serveur:', err.message);
    process.exit(1);
  }
}

start();
