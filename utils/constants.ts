import type { MemberPosition, Department } from '../types/database';

export const APP_NAME = 'My Church';
export const APP_VERSION = '4.2.0'; // Version augmentée
export const APP_VERSION_CODE = 420; 

export const MEMBER_POSITIONS: MemberPosition[] = [
  'Pasteur',
  'Ouvrier', 
  'Intercesseur(seuse)',
  'Choriste',
  'Moniteur(trice)',
  'Sécurité',
  'Protocole',
  'Gardien',
  'Lecteur',
  'Secrétaire',
  'Trésorier'
];

export const DEPARTMENTS: Department[] = [
  'Chorale',
  'Musique',
  'Technique',
  'Presse',
  'Protocole',
  'Sécurité',
  'Ecodim',
  'Jeunesse', 
  'Femmes',
  'Hommes',
  'Enfants',
  'Intercession',
  'Évangélisation',
  'Accueil',
  'Décoration',
  'Cuisine',
  'Nettoyage',
  'Autres'
];

export const EXPENSE_CATEGORIES = [
  'Général',
  'Salaires',
  'Électricité',
  'Eau',
  'Internet',
  'Maintenance',
  'Équipement',
  'Événements',
  'Transport',
  'Nourriture',
  'Matériel',
  'Réparations',
  'Assurance'
];

export const DOSSIER_TYPES = [
  'member',
  'personnel'
] as const;

export const DOCUMENT_TYPES = [
  'carte',
  'photo',
  'identite',
  'contrat',
  'certificat',
  'bulletin',
  'diplome',
  'recommandation',
  'medical',
  'autre'
] as const;

export const DOSSIER_STATUS = [
  'incomplet',
  'en_revision',
  'complet',
  'archive'
] as const;

export const PLATFORMS = [
  'YouTube',
  'Facebook', 
  'Autre'
] as const;

export const THEMES = [
  'blue',
  'white',
  'black'
] as const;

export const CURRENCIES = [
  'FC',
  'USD',
  'EURO'
] as const;

export const SUBSCRIPTION_TYPES = [
  'trial',
  'monthly',
  'yearly'
] as const;

export const NOTIFICATION_TYPES = [
  'info',
  'warning',
  'error',
  'success'
] as const;

export const ARCHIVE_TYPES = [
  'monthly',
  'yearly'
] as const;

export const MEMBER_TYPES = [
  'Membre',
  'Personnel'
] as const;

// Messages d'erreur standardisés
export const ERROR_MESSAGES = {
  SUBSCRIPTION_EXPIRED: 'Votre abonnement a expiré. Veuillez renouveler pour continuer à utiliser My Church.',
  INSUFFICIENT_BALANCE: 'Solde insuffisant.',
  EXPENSE_LIMIT_EXCEEDED: 'Dépense supérieure à la limite autorisée.',
  UNAUTHORIZED_ACTION: 'Vous n\'avez pas les permissions pour effectuer cette action.',
  CHURCH_NOT_FOUND: 'Église introuvable.',
  NO_LINKS_AVAILABLE: 'Pas de liens disponibles pour le moment.',
  NETWORK_ERROR: 'Erreur de connexion. Vérifiez votre connexion internet.',
  VALIDATION_ERROR: 'Veuillez corriger les erreurs dans le formulaire.',
  DOSSIER_NOT_FOUND: 'Dossier introuvable.',
  DOCUMENT_UPLOAD_ERROR: 'Erreur lors du téléchargement du document.',
  DOSSIER_ALREADY_EXISTS: 'Un dossier existe déjà pour ce membre.',
};

// Messages de succès standardisés
export const SUCCESS_MESSAGES = {
  CHURCH_CREATED: 'Église créée avec succès !',
  MEMBER_ADDED: 'Membre ajouté avec succès',
  EXPENSE_APPROVED: 'Dépense approuvée',
  REPORT_GENERATED: 'Rapport généré avec succès',
  SETTINGS_UPDATED: 'Paramètres mis à jour avec succès',
  LINK_ADDED: 'Lien ajouté avec succès',
  SUBSCRIPTION_RENEWED: 'Abonnement renouvelé avec succès',
  MESSAGE_SENT: 'Message envoyé avec succès',
  DOSSIER_CREATED: 'Dossier créé avec succès',
  DOCUMENT_ADDED: 'Document ajouté au dossier',
  DOSSIER_UPDATED: 'Dossier mis à jour avec succès',
  DOSSIER_EXPORTED: 'Dossier exporté avec succès',
};

// Comptes de démo disponibles
export const DEMO_ACCOUNTS = [
  { email: 'admin@demo.mychurch.com', password: 'demo123', role: 'Admin' },
  { email: 'tresorier@demo.mychurch.com', password: 'demo123', role: 'Trésorier' },
  { email: 'secretaire@demo.mychurch.com', password: 'demo123', role: 'Secrétaire' },
  { email: 'lecteur@demo.mychurch.com', password: 'demo123', role: 'Lecteur' },
];

// Options de configuration des dossiers
export const DOSSIER_CONFIG = {
  MAX_DOCUMENTS_PER_DOSSIER: 20,
  MAX_DOCUMENT_SIZE_MB: 10,
  ALLOWED_DOCUMENT_TYPES: ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  AUTO_CREATE_DOSSIER_FOR_PERSONNEL: true,
  REQUIRED_DOCUMENTS: {
    personnel: ['identite', 'photo', 'contrat'],
    member: ['photo', 'identite']
  }
};

// Configurations de rapport
export const REPORT_CONFIG = {
  DEFAULT_DATE_FORMAT: 'fr-FR',
  MAX_ROWS_PER_REPORT: 1000,
  AUTO_GENERATE_REPORTS: ['monthly', 'yearly'],
  INCLUDE_DOSSIER_STATS: true
};