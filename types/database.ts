// ==================== INTERFACES PRINCIPALES ====================

export interface Church {
  id: string;
  name: string;
  address?: string;
  email: string;
  phone?: string;
  logo_url?: string;
  currency: 'FC' | 'USD' | 'EURO';
  initial_amount: number;
  current_balance: number;
  bank_balance: number;
  // Balances multi-devises
  current_balance_fc: number;
  current_balance_usd: number;
  current_balance_euro: number;
  bank_balance_fc: number;
  bank_balance_usd: number;
  bank_balance_euro: number;
  theme: 'blue' | 'white' | 'black';
  expense_limit?: number;
  archive_frequency?: 'monthly' | 'yearly';
  subscription_type?: 'trial' | 'monthly' | 'yearly';
  subscription_start?: string;
  subscription_end?: string;
  trial_end?: string;
  setup_completed?: boolean;
  is_active?: boolean;
  api_key?: string;
  update_code?: string;
  dossier_auto_create?: boolean;
  dossier_required_for_personnel?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type UserRole = 'Admin' | 'Trésorier' | 'Secrétaire' | 'Lecteur';

export interface User {
  id: string;
  church_id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}


export type MemberType = 'Membre' | 'Personnel';

export type MemberPosition = 
  | 'Pasteur' 
  | 'Ouvrier' 
  | 'Intercesseur(seuse)' 
  | 'Choriste' 
  | 'Moniteur(trice)' 
  | 'Sécurité' 
  | 'Protocole' 
  | 'Gardien' 
  | 'Lecteur' 
  | 'Secrétaire' 
  | 'Trésorier';

export type Department = 
  | 'Chorale' 
  | 'Musique'
  | 'Technique'
  | 'Presse'
  | 'Protocole'
  | 'Sécurité'
  | 'Ecodim'
  | 'Jeunesse' 
  | 'Femmes' 
  | 'Hommes' 
  | 'Intercession' 
  | 'Évangélisation' 
  | 'Nettoyage'
  | 'Accueil'
  | 'Autres'; 

export type PaymentMethod = 'cash' | 'bank' | 'mpesa' | 'orange_money' | 'airtel_money' | 'afrimoney';

export interface Member {
  id: string;
  church_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: string;
  photo_url?: string;
  member_type: MemberType;
  position?: MemberPosition;
  departments?: Department[];
  salary?: number;
  qr_code?: string;
  dossier_id?: string;
  has_dossier?: boolean;
  dossier_status?: 'incomplet' | 'en_revision' | 'complet' | 'archive';
  joining_date?: string;
  status: string;
  payment_method?: string;
  card_number?: string;
  has_paid?: boolean;
  payment_date?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DailyReport {
  id: string;
  church_id: string;
  amount: number;
  description: string;
  category: 'Offrandes' | 'Dîmes' | 'Dons' | 'Contributions' | 'Divers';
  recorded_by: string;
  payment_method: PaymentMethod;
  currency: 'FC' | 'USD' | 'EURO'; // ✅ CHAMP AJOUTÉ
  date: string;
  bills_breakdown?: BillBreakdown[];
  total_calculated?: number;
  created_at?: string;
}

export interface BillBreakdown {
  bill_value: number;
  bill_label: string;
  quantity: number;
  total: number;
}

export interface CurrencyBill {
  value: number;
  label: string;
}

export interface Expense {
  id: string;
  church_id: string;
  amount: number;
  description: string;
  category?: string;
  recorded_by: string;
  payment_method: PaymentMethod;
  currency: 'FC' | 'USD' | 'EURO'; // ✅ CHAMP AJOUTÉ
  requires_approval?: boolean;
  is_approved?: boolean;
  approved_by?: string;
  approval_message?: string;
  date: string;
  created_at?: string;
  updated_at?: string;
}

export type EventType = 'Culte' | 'Réunion' | 'Séminaire' | 'Conférence' | 'Autre';

export interface Event {
  id: string;
  church_id: string;
  title: string;
  description?: string;
  event_type: EventType;
  start_date: string;
  end_date?: string;
  location?: string;
  reminder_enabled: boolean;
  reminder_time?: number;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  event_id: string;
  member_id: string;
  attended: boolean;
  notes?: string;
  recorded_by: string;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  church_id: string;
  user_id: string;
  action: string;
  resource_type: 'Church' | 'User' | 'Member' | 'DailyReport' | 'Expense' | 'Event' | 'Attendance' | 'Message' | 'Dossier' | 'Document';
  resource_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface PublicLink {
  id: string;
  church_id: string;
  title: string;
  url: string;
  description?: string;
  platform?: 'YouTube' | 'Facebook' | 'Autre';
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Archive {
  id: string;
  church_id: string;
  archive_type: 'monthly' | 'yearly';
  period: string;
  period_type: string;
  total_income?: number;
  total_expenses?: number;
  balance?: number;
  data?: any;
  created_at?: string;
}

export interface Notification {
  id: string;
  church_id: string;
  user_id?: string;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  is_read?: boolean;
  created_at?: string;
}

export interface PaymentTransaction {
  id: string;
  church_id: string;
  amount: number;
  payment_method: 'card' | 'mpesa' | 'orange_money' | 'airtel_money' | 'afrimoney';
  phone_number?: string;
  transaction_id?: string;
  status: 'pending' | 'completed' | 'failed';
  subscription_type: 'monthly' | 'yearly';
  created_at?: string;
}

export interface Message {
  id: string;
  church_id: string;
  sender_id: string;
  receiver_id: string;
  subject: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

// ==================== INTERFACES POUR DOSSIER ====================

export interface MemberDossier {
  id: string;
  member_id: string;
  church_id: string;
  dossier_type: 'member' | 'personnel';
  dossier_number: string;
  documents: DossierDocument[];
  notes?: string;
  metadata?: {
    created_by?: string;
    last_modified_by?: string;
    qr_scans?: number;
    document_count?: number;
    last_access?: string;
  };
  status: 'incomplet' | 'en_revision' | 'complet' | 'archive';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DossierDocument {
  id: string;
  dossier_id: string;
  document_type: 'carte' | 'photo' | 'identite' | 'contrat' | 'certificat' | 'bulletin' | 'diplome' | 'recommandation' | 'medical' | 'autre';
  title: string;
  description?: string;
  file_url: string;
  file_size?: number;
  file_type?: string;
  uploaded_by: string;
  is_verified?: boolean;
  verified_by?: string;
  verification_date?: string;
  created_at: string;
  updated_at: string;
}

export interface DossierTransaction {
  id: string;
  dossier_id: string;
  member_id: string;
  transaction_type: 'payment' | 'document_upload' | 'status_change' | 'note_added' | 'verification';
  amount?: number;
  currency?: string;
  description: string;
  metadata?: any;
  created_by: string;
  created_at: string;
}

// ==================== INTERFACES UTILITAIRES ====================

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  bankBalance: number;
  cashBalance: number;
  pendingExpenses: number;
  transactionCount: number;
}

export interface MemberStats {
  totalMembers: number;
  personnel: number;
  regularMembers: number;
  activeDepartments: Department[];
  byDepartment: Record<string, number>;
  byPosition: Record<string, number>;
  withDossier: number;
  dossierStats: {
    complet: number;
    en_revision: number;
    incomplet: number;
    archive: number;
  };
}

export interface EventStats {
  totalEvents: number;
  upcomingEvents: number;
  pastEvents: number;
  averageAttendance: number;
  byType: Record<string, number>;
}

export interface ChurchStats {
  financial: FinancialSummary;
  members: MemberStats;
  events: EventStats;
  dossiers: {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    documentCount: number;
    averageDocumentsPerDossier: number;
  };
  recentActivity: {
    reports: DailyReport[];
    expenses: Expense[];
    events: Event[];
    dossiers: MemberDossier[];
  };
}

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  churchName: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
  currency: 'FC' | 'USD' | 'EURO';
  initialAmount: number;
  dossier_auto_create?: boolean;
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  churchId: string;
}

export interface CreateMemberData {
  church_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: string;
  member_type: 'Membre' | 'Personnel';
  position?: MemberPosition;
  departments?: Department[];
  salary?: number;
  create_dossier?: boolean;
  dossier_type?: 'member' | 'personnel';
}

export interface CreateEventData {
  church_id: string;
  title: string;
  description?: string;
  event_type: EventType;
  start_date: string;
  end_date?: string;
  location?: string;
  reminder_enabled: boolean;
  reminder_time?: number;
  created_by: string;
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  event_type?: EventType;
  start_date?: string;
  end_date?: string;
  location?: string;
  reminder_enabled?: boolean;
  reminder_time?: number;
  is_active?: boolean;
}

export interface AdvancedEventStats {
  totalEvents: number;
  upcomingEvents: number;
  pastEvents: number;
  todayEvents: number;
  tomorrowEvents: number;
  thisWeekEvents: number;
  nextWeekEvents: number;
  thisMonthEvents: number;
  byType: Record<EventType, number>;
  byMonth: Record<string, number>;
  averageEventsPerMonth: number;
  attendanceRate: number;
  reminderEnabledRate: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string;
    borderWidth?: number;
  }[];
}

export interface ReportExportData {
  church: Church;
  period: string;
  data: any;
  format: 'pdf' | 'docx' | 'csv';
  generatedBy: string;
  generatedAt: string;
}

export interface DossierOperations {
  createDossier: (memberId: string, dossierType: 'member' | 'personnel') => Promise<MemberDossier>;
  addDocument: (dossierId: string, document: Omit<DossierDocument, 'id' | 'created_at' | 'updated_at'>) => Promise<DossierDocument>;
  updateDossierStatus: (dossierId: string, status: MemberDossier['status']) => Promise<MemberDossier>;
  getMemberDossier: (memberId: string) => Promise<MemberDossier | null>;
  exportDossier: (dossierId: string, format: 'pdf' | 'zip') => Promise<string>;
}

export interface DossierMetrics {
  totalDossiers: number;
  dossiersByType: Record<string, number>;
  dossiersByStatus: Record<string, number>;
  totalDocuments: number;
  documentsByType: Record<string, number>;
  averageDocumentsPerDossier: number;
  dossierCompletionRate: number;
  recentActivity: DossierTransaction[];
}

export interface EventFilters {
  event_type?: EventType | 'all';
  date_range?: 'today' | 'tomorrow' | 'this_week' | 'next_week' | 'this_month' | 'all';
  search?: string;
  reminder_enabled?: boolean;
  is_active?: boolean;
}

export interface EventSearchResult {
  events: Event[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface EventNotification {
  event_id: string;
  event_title: string;
  event_type: EventType;
  start_date: string;
  reminder_time: number;
  notification_type: 'reminder' | 'today' | 'starting_soon';
  message: string;
  send_at: string;
}

export interface EventExportData {
  events: Event[];
  total_events: number;
  period: string;
  generated_by: string;
  generated_at: string;
  summary: {
    by_type: Record<EventType, number>;
    upcoming: number;
    past: number;
    with_reminder: number;
    average_reminder_time: number;
  };
}

// ==================== CONSTANTES ET UTILITAIRES ====================

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  'Culte': '#3498db',
  'Réunion': '#f39c12',
  'Séminaire': '#9b59b6',
  'Conférence': '#e74c3c',
  'Autre': '#7f8c8d'
};

export const EVENT_TYPE_ICONS: Record<EventType, string> = {
  'Culte': 'church',
  'Réunion': 'users',
  'Séminaire': 'graduation-cap',
  'Conférence': 'microphone',
  'Autre': 'calendar'
};

export const REMINDER_OPTIONS = [
  { value: 15, label: '15 minutes avant' },
  { value: 30, label: '30 minutes avant' },
  { value: 60, label: '1 heure avant' },
  { value: 120, label: '2 heures avant' },
  { value: 1440, label: '1 jour avant' },
  { value: 2880, label: '2 jours avant' },
  { value: 10080, label: '1 semaine avant' }
];

export function formatEventDate(startDate: string, endDate?: string): string {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  
  if (end && start.toDateString() === end.toDateString()) {
    return `${start.toLocaleDateString('fr-FR')} • ${start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (end) {
    return `${start.toLocaleDateString('fr-FR')} → ${end.toLocaleDateString('fr-FR')}`;
  } else {
    return `${start.toLocaleDateString('fr-FR')} • ${start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }
}

export function getTimeRemaining(startDate: string): {
  text: string;
  color: string;
  isPast: boolean;
  isToday: boolean;
  isTomorrow: boolean;
  days: number;
} {
  const now = new Date();
  const event = new Date(startDate);
  const diffTime = event.getTime() - now.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffTime / (1000 * 60));
  
  const isToday = event.toDateString() === now.toDateString();
  const isTomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString() === event.toDateString();
  const isPast = diffTime < 0;
  
  let text = '';
  let color = '#95a5a6';
  
  if (isPast) {
    text = 'Passé';
    color = '#95a5a6';
  } else if (isToday) {
    if (diffHours <= 0) {
      if (diffMinutes <= 0) {
        text = 'En cours';
        color = '#e74c3c';
      } else {
        text = `Dans ${diffMinutes}min`;
        color = '#e74c3c';
      }
    } else {
      text = "Aujourd'hui";
      color = '#e74c3c';
    }
  } else if (isTomorrow) {
    text = 'Demain';
    color = '#e67e22';
  } else if (diffDays <= 7) {
    text = `Dans ${diffDays} jours`;
    color = '#f39c12';
  } else if (diffDays <= 30) {
    const weeks = Math.floor(diffDays / 7);
    text = weeks === 1 ? 'Dans 1 semaine' : `Dans ${weeks} semaines`;
    color = '#27ae60';
  } else {
    const months = Math.floor(diffDays / 30);
    text = months === 1 ? 'Dans 1 mois' : `Dans ${months} mois`;
    color = '#3498db';
  }
  
  return {
    text,
    color,
    isPast,
    isToday,
    isTomorrow,
    days: diffDays
  };
} 