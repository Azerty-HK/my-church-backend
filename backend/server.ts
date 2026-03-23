import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import * as db from './lib/postgres';
import { initDB } from './lib/postgres';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    app: 'MyChurch Backend', 
    timestamp: new Date().toISOString() 
  });
});

// RPC Endpoint
const allowedMethods: Record<string, Function> = {
  // Churches
  createChurch: db.createChurch,
  getChurchById: db.getChurchById,
  updateChurch: db.updateChurch,
  getChurchStats: db.getChurchStats,
  
  // Auth & Users
  createUser: db.createUser,
  getUserByEmail: db.getUserByEmail,
  getUserById: db.getUserById,
  updateUser: db.updateUser,
  authenticateUser: db.authenticateUser,
  
  // Members
  createMember: db.createMember,
  getMembers: db.getMembers,
  getMemberById: db.getMemberById,
  updateMember: db.updateMember,
  deleteMember: db.deleteMember,
  
  // Financials
  createTransaction: db.createTransaction,
  getTransactions: db.getTransactions,
  getTransactionById: db.getTransactionById,
  updateTransaction: db.updateTransaction,
  deleteTransaction: db.deleteTransaction,
  
  // Events & Attendance
  createEvent: db.createEvent,
  getEvents: db.getEvents,
  updateEvent: db.updateEvent,
  deleteEvent: db.deleteEvent,
  checkInMember: db.checkInMember,
  getAttendance: db.getAttendance,
  
  // Public Links & Archives
  createPublicLink: db.createPublicLink,
  getPublicLinks: db.getPublicLinks,
  deletePublicLink: db.deletePublicLink,
  createArchive: db.createArchive,
  getArchives: db.getArchives,
  
  // Notifications
  getNotifications: db.getNotifications,
  markNotificationAsRead: db.markNotificationAsRead,
  
  // Search
  searchMembers: db.searchMembers
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
  console.log('🏁 Démarrage du backend MyChurch...');
  try {
    await initDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Backend MyChurch en ligne sur le port ${PORT}`);
      console.log(`📡 URL Locale accessible : http://0.0.0.0:${PORT}`);
    });
  } catch (err: any) {
    console.error('💥 ERREUR FATALE AU DÉMARRAGE:', err.message);
    process.exit(1);
  }
}

start();
