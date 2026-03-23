"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DB_PROVIDER = exports.YEARLY_SAVINGS_CALCULATION = exports.SUBSCRIPTION_CALCULATOR = exports.VERSION_INFO = exports.DEVELOPER_INFO = exports.SECURE_PAYMENT_CONFIG = exports.SUBSCRIPTION_CONFIG = exports.FILTER_STATUS = exports.INTERFACE_TABS = exports.UI_CONSTANTS = exports.CODE_GENERATORS = exports.BUSINESS_RULES = exports.PHOTO_CONFIG = exports.PAYMENT_CONFIG = exports.CARD_CONFIG = exports.REPORT_CONFIG = exports.DOSSIER_CONFIG = exports.DEMO_ACCOUNTS = exports.SUCCESS_MESSAGES = exports.ERROR_MESSAGES = exports.USER_ROLES = exports.ARCHIVE_TYPES = exports.NOTIFICATION_TYPES = exports.SUBSCRIPTION_TYPES = exports.CURRENCIES = exports.THEMES = exports.PLATFORMS = exports.DOSSIER_STATUS = exports.DOCUMENT_TYPES = exports.DOSSIER_TYPES = exports.EXPENSE_CATEGORIES = exports.PAYMENT_METHODS = exports.CARD_STATUS = exports.PAYMENT_STATUS = exports.MEMBER_STATUS = exports.MEMBER_TYPES = exports.DEPARTMENTS = exports.RESTRICTED_POSITIONS = exports.MEMBER_POSITIONS = exports.APP_CONFIG = exports.APP_VERSION_CODE = exports.APP_VERSION = exports.APP_NAME = void 0;
exports.setDbProvider = setDbProvider;
exports.APP_NAME = 'My Church Management System';
exports.APP_VERSION = '4.3.0'; // Version avec gestion cartes et paiement
exports.APP_VERSION_CODE = 430;
// ==================== CONFIGURATION DE BASE ====================
exports.APP_CONFIG = {
    CARD_PRICE: 5, // Prix fixe de la carte en USD
    CARD_SIZE: { width: 100, height: 63 }, // Format PVC professionnel en mm
    REQUIRED_PAYMENT_FOR_CARD: true, // Règle métier fondamentale
    AUTO_GENERATE_CARD_AFTER_PAYMENT: true,
    INVOICE_TEMPLATE: 'FACTURE_CARTE_MEMBRE',
    MAX_MEMBERS_PER_CHURCH: 5000,
    MAX_PHOTO_SIZE_MB: 5,
    SUPPORTED_PHOTO_FORMATS: ['image/jpeg', 'image/png'],
};
// ==================== POSTES DE MEMBRES ====================
exports.MEMBER_POSITIONS = [
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
// Postes restreints (nécessitant des permissions spéciales)
exports.RESTRICTED_POSITIONS = [
    'Pasteur',
    'Trésorier',
    'Secrétaire',
    'Lecteur'
];
// ==================== DÉPARTEMENTS OFFICIELS ====================
exports.DEPARTMENTS = [
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
    'Intercession',
    'Évangélisation',
    'Nettoyage',
    'Autres'
];
// ==================== TYPES DE MEMBRES ====================
exports.MEMBER_TYPES = [
    'Membre',
    'Personnel'
];
// ==================== STATUTS ====================
exports.MEMBER_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING: 'pending',
    SUSPENDED: 'suspended'
};
exports.PAYMENT_STATUS = {
    PENDING: 'pending',
    PAID: 'paid',
    FAILED: 'failed',
    REFUNDED: 'refunded'
};
exports.CARD_STATUS = {
    NOT_GENERATED: 'not_generated',
    GENERATED: 'generated',
    PRINTED: 'printed',
    DELIVERED: 'delivered',
    EXPIRED: 'expired'
};
// ==================== MÉTHODES DE PAIEMENT ====================
exports.PAYMENT_METHODS = {
    CASH: 'cash',
    MOBILE_MONEY: 'mobile_money',
    CARD: 'card',
    BANK_TRANSFER: 'bank_transfer'
};
// ==================== CATÉGORIES ====================
exports.EXPENSE_CATEGORIES = [
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
exports.DOSSIER_TYPES = [
    'member',
    'personnel'
];
exports.DOCUMENT_TYPES = [
    'carte_membre',
    'photo_identite',
    'piece_identite',
    'contrat',
    'certificat',
    'bulletin',
    'diplome',
    'recommandation',
    'medical',
    'fiche_inscription',
    'autre'
];
exports.DOSSIER_STATUS = [
    'incomplet',
    'en_revision',
    'complet',
    'archive'
];
// ==================== PLATEFORMES ====================
exports.PLATFORMS = [
    'YouTube',
    'Facebook',
    'Autre'
];
// ==================== THÈMES ====================
exports.THEMES = [
    'blue',
    'white',
    'black'
];
// ==================== DEVISES ====================
exports.CURRENCIES = [
    'FC',
    'USD',
    'EURO'
];
// ==================== ABONNEMENTS ====================
exports.SUBSCRIPTION_TYPES = [
    'trial',
    'monthly',
    'yearly'
];
// ==================== NOTIFICATIONS ====================
exports.NOTIFICATION_TYPES = [
    'info',
    'warning',
    'error',
    'success'
];
// ==================== ARCHIVAGE ====================
exports.ARCHIVE_TYPES = [
    'monthly',
    'yearly'
];
// ==================== RÔLES UTILISATEURS ====================
exports.USER_ROLES = {
    ADMIN: 'Admin',
    TREASURER: 'Trésorier',
    SECRETARY: 'Secrétaire',
    READER: 'Lecteur',
    PASTOR: 'Pasteur',
    MEMBER: 'Membre'
};
// ==================== MESSAGES D'ERREUR ====================
exports.ERROR_MESSAGES = {
    // Abonnement
    SUBSCRIPTION_EXPIRED: 'Votre abonnement a expiré. Veuillez renouveler pour continuer à utiliser My Church.',
    TRIAL_EXPIRED: 'Votre essai gratuit de 30 jours est terminé. Veuillez vous abonner pour continuer.',
    PAYMENT_FAILED: 'Le paiement a échoué. Veuillez réessayer.',
    // Paiements et finances
    INSUFFICIENT_BALANCE: 'Solde insuffisant.',
    EXPENSE_LIMIT_EXCEEDED: 'Dépense supérieure à la limite autorisée.',
    PAYMENT_REQUIRED_FOR_CARD: 'Le paiement de 5 $ est requis pour générer une carte de membre.',
    // Permissions
    UNAUTHORIZED_ACTION: 'Vous n\'avez pas les permissions pour effectuer cette action.',
    RESTRICTED_POSITION: 'Ce poste est restreint. Seuls les administrateurs peuvent l\'assigner.',
    // Membres et cartes
    CHURCH_NOT_FOUND: 'Église introuvable.',
    CARD_NOT_GENERATED: 'La carte n\'a pas encore été générée. Le paiement est requis.',
    CARD_ALREADY_EXISTS: 'Une carte existe déjà pour ce membre.',
    // Dossiers et documents
    DOSSIER_NOT_FOUND: 'Dossier introuvable.',
    DOSSIER_ALREADY_EXISTS: 'Un dossier existe déjà pour ce membre.',
    DOCUMENT_UPLOAD_ERROR: 'Erreur lors du téléchargement du document.',
    // Réseau
    NETWORK_ERROR: 'Erreur de connexion. Vérifiez votre connexion internet.',
    // Validation
    VALIDATION_ERROR: 'Veuillez corriger les erreurs dans le formulaire.',
    // Général
    NO_LINKS_AVAILABLE: 'Pas de liens disponibles pour le moment.',
    OPERATION_FAILED: 'L\'opération a échoué. Veuillez réessayer.',
    // Abonnement spécifique
    SUBSCRIPTION_REQUIRED: 'Un abonnement actif est requis pour utiliser cette fonctionnalité.',
    NO_ACTIVE_SUBSCRIPTION: 'Aucun abonnement actif trouvé.',
    TRIAL_ENDED: 'Votre période d\'essai est terminée. Veuillez vous abonner.',
};
// ==================== MESSAGES DE SUCCÈS ====================
exports.SUCCESS_MESSAGES = {
    // Église et configuration
    CHURCH_CREATED: 'Église créée avec succès !',
    SETTINGS_UPDATED: 'Paramètres mis à jour avec succès.',
    // Membres
    MEMBER_ADDED: 'Membre ajouté avec succès !',
    MEMBER_UPDATED: 'Membre mis à jour avec succès.',
    MEMBER_DELETED: 'Membre supprimé avec succès.',
    MEMBER_REGISTERED: 'Membre enregistré avec succès.',
    // Cartes
    CARD_GENERATED: 'Carte générée avec succès !',
    CARD_PRINTED: 'Carte marquée comme imprimée.',
    PAYMENT_COMPLETED: 'Paiement effectué avec succès.',
    // Paiements
    PAYMENT_RECEIVED: 'Paiement reçu et enregistré.',
    INVOICE_GENERATED: 'Facture générée avec succès.',
    // Dossiers
    DOSSIER_CREATED: 'Dossier créé avec succès.',
    DOSSIER_UPDATED: 'Dossier mis à jour avec succès.',
    DOSSIER_EXPORTED: 'Dossier exporté avec succès.',
    DOCUMENT_ADDED: 'Document ajouté au dossier.',
    // Finances
    EXPENSE_APPROVED: 'Dépense approuvée.',
    REPORT_GENERATED: 'Rapport généré avec succès.',
    // Streaming
    LINK_ADDED: 'Lien de streaming ajouté avec succès.',
    // Abonnements
    SUBSCRIPTION_RENEWED: 'Abonnement renouvelé avec succès.',
    SUBSCRIPTION_ACTIVATED: 'Abonnement activé avec succès !',
    TRIAL_STARTED: 'Essai gratuit de 30 jours activé !',
    // Communication
    MESSAGE_SENT: 'Message envoyé avec succès.',
    // Général
    OPERATION_SUCCESSFUL: 'Opération effectuée avec succès.',
    DATA_SAVED: 'Données sauvegardées avec succès.',
    // Paiement abonnement
    PAYMENT_SUCCESS: 'Paiement effectué avec succès !',
    SUBSCRIPTION_PAYMENT_COMPLETE: 'Paiement d\'abonnement validé avec succès.',
};
// ==================== COMPTES DÉMO ====================
exports.DEMO_ACCOUNTS = [
    { email: 'admin@demo.mychurch.com', password: 'demo123', role: 'Admin' },
    { email: 'tresorier@demo.mychurch.com', password: 'demo123', role: 'Trésorier' },
    { email: 'secretaire@demo.mychurch.com', password: 'demo123', role: 'Secrétaire' },
    { email: 'lecteur@demo.mychurch.com', password: 'demo123', role: 'Lecteur' },
];
// ==================== CONFIGURATION DES DOSSIERS ====================
exports.DOSSIER_CONFIG = {
    MAX_DOCUMENTS_PER_DOSSIER: 20,
    MAX_DOCUMENT_SIZE_MB: 10,
    ALLOWED_DOCUMENT_TYPES: [
        'image/jpeg',
        'image/png',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    AUTO_CREATE_DOSSIER_FOR_PERSONNEL: true,
    REQUIRED_DOCUMENTS: {
        personnel: ['photo_identite', 'piece_identite', 'contrat'],
        member: ['photo_identite', 'fiche_inscription']
    },
    DOSSIER_NUMBER_PREFIX: 'DOS'
};
// ==================== CONFIGURATION DES RAPPORTS ====================
exports.REPORT_CONFIG = {
    DEFAULT_DATE_FORMAT: 'fr-FR',
    MAX_ROWS_PER_REPORT: 1000,
    AUTO_GENERATE_REPORTS: ['monthly', 'yearly'],
    INCLUDE_DOSSIER_STATS: true
};
// ==================== CONFIGURATION DES CARTES ====================
exports.CARD_CONFIG = {
    CARD_NUMBER_PREFIX: 'MC',
    CARD_VALIDITY_YEARS: 2,
    CARD_PRICE: 5, // USD
    CARD_SIZE_MM: { width: 100, height: 63 }, // Format carte bancaire
    CARD_BACKGROUND_COLORS: {
        MEMBER: ['#3498db', '#2980b9'],
        PERSONNEL: ['#9b59b6', '#8e44ad']
    },
    CARD_REQUIRED_FIELDS: [
        'first_name',
        'last_name',
        'member_type',
        'photo_url',
        'card_number'
    ],
    CARD_EXCLUDED_FIELDS: [
        'salary', // Ne JAMAIS afficher le salaire sur la carte
    ]
};
// ==================== CONFIGURATION DES PAIEMENTS ====================
exports.PAYMENT_CONFIG = {
    DEFAULT_CURRENCY: 'USD',
    CARD_PRICE: 5,
    PAYMENT_METHODS: ['cash', 'mobile_money', 'card'],
    INVOICE_NUMBER_PREFIX: 'INV',
    AUTO_GENERATE_INVOICE: true,
    PAYMENT_DEADLINE_DAYS: 30
};
// ==================== CONFIGURATION DES PHOTOS ====================
exports.PHOTO_CONFIG = {
    MAX_SIZE_MB: 5,
    ASPECT_RATIO: 3 / 4, // Format photo d'identité
    ALLOWED_FORMATS: ['image/jpeg', 'image/png'],
    COMPRESSION_QUALITY: 0.8,
    STORAGE_PATH: 'members/photos/',
    CROP_ENABLED: true
};
// ==================== RÈGLES MÉTIERS PRINCIPALES ====================
exports.BUSINESS_RULES = {
    // Règle fondamentale : Pas de carte sans paiement
    NO_CARD_WITHOUT_PAYMENT: true,
    // Règles d'enregistrement
    CAN_REGISTER_WITHOUT_PAYMENT: true,
    CAN_REGISTER_WITHOUT_PHOTO: false,
    // Règles de paiement
    CARD_PRICE: 5, // USD
    PAYMENT_REQUIRED_FOR_CARD: true,
    PAYMENT_REQUIRED_FOR_BOTH_TYPES: true, // Membres et Personnel
    // Règles de confidentialité
    HIDE_SALARY_ON_CARD: true,
    // Règles temporelles
    CARD_VALIDITY_MONTHS: 24,
    PAYMENT_DEADLINE_DAYS: 30,
    RENEWAL_REMINDER_DAYS: 7
};
// ==================== CODES DE GÉNÉRATION ====================
exports.CODE_GENERATORS = {
    CARD_NUMBER: () => `MC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
    DOSSIER_NUMBER: () => `DOS-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
    INVOICE_NUMBER: () => `INV-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
    QR_CODE: (memberId) => `QR-MEM-${memberId}-${Date.now().toString(36).toUpperCase()}`
};
// ==================== CONSTANTES INTERFACE UTILISATEUR ====================
exports.UI_CONSTANTS = {
    // Tailles de boutons
    BUTTON_HEIGHT: 50,
    BUTTON_BORDER_RADIUS: 12,
    INPUT_HEIGHT: 56,
    INPUT_BORDER_RADIUS: 8,
    // Espacements
    PADDING_SMALL: 8,
    PADDING_MEDIUM: 16,
    PADDING_LARGE: 24,
    MARGIN_SMALL: 8,
    MARGIN_MEDIUM: 16,
    MARGIN_LARGE: 24,
    // Tailles de police
    FONT_SIZE_XS: 10,
    FONT_SIZE_SM: 12,
    FONT_SIZE_MD: 14,
    FONT_SIZE_LG: 16,
    FONT_SIZE_XL: 18,
    FONT_SIZE_XXL: 24,
    // Animations
    ANIMATION_DURATION_SHORT: 200,
    ANIMATION_DURATION_MEDIUM: 300,
    // Ombre
    SHADOW_SMALL: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    SHADOW_MEDIUM: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    SHADOW_LARGE: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    }
};
// ==================== INTERFACES SÉPARÉES ====================
exports.INTERFACE_TABS = {
    MEMBERS: 'members',
    PERSONNEL: 'personnel',
    CARDS: 'cards'
};
exports.FILTER_STATUS = {
    ALL: 'all',
    PAID: 'paid',
    UNPAID: 'unpaid'
};
// ==================== CONFIGURATION ABONNEMENTS ====================
exports.SUBSCRIPTION_CONFIG = {
    // Durées en jours
    TRIAL_DURATION_DAYS: 30,
    MONTHLY_DURATION_DAYS: 31,
    YEARLY_DURATION_DAYS: 365,
    // Prix (CORRIGÉ : 100$ par mois et 1000$ par an)
    MONTHLY_PRICE: 100, // USD - Prix corrigé
    YEARLY_PRICE: 1000, // USD - Prix corrigé
    // Plans disponibles
    PLANS: [
        {
            type: 'trial',
            name: 'Essai Gratuit',
            price: 0,
            duration: '30 jours',
            durationDays: 30,
            features: [
                'Gestion complète des membres',
                'Suivi financier basique',
                'Jusqu\'à 50 membres',
                'Support email',
                'Accès mobile',
                'Sauvegarde des données',
                'Génération de cartes membres',
                'Rapports quotidiens'
            ]
        },
        {
            type: 'monthly',
            name: 'Abonnement Mensuel',
            price: 100, // CORRIGÉ : 100$ au lieu de 50$
            duration: '1 mois',
            durationDays: 31,
            features: [
                'Toutes fonctionnalités essai',
                'Membres illimités',
                'Rapports avancés',
                'Support prioritaire',
                'Synchronisation cloud',
                'Intégrations bancaires',
                'QR Codes membres',
                'Analytics détaillées',
                'Gestion des événements',
                'Liens de streaming',
                'Archivage automatique',
                'Sauvegarde sécurisée'
            ]
        },
        {
            type: 'yearly',
            name: 'Abonnement Annuel',
            price: 1000, // CORRIGÉ : 1000$ au lieu de 500$
            duration: '1 an',
            durationDays: 365,
            features: [
                'Toutes fonctionnalités mensuel',
                '-17% économisé vs mensuel', // 100$ × 12 = 1200$, payez 1000$ = économisez 200$
                'Formation personnalisée',
                'Dédicace prioritaire',
                'API complète',
                'White-label disponible',
                'Audit de sécurité',
                'Migration assistance',
                'Statistiques premium',
                'Export de données avancé',
                'Support 24/7',
                'Mises à jour prioritaires'
            ]
        }
    ],
    // Messages spécifiques
    MESSAGES: {
        TRIAL_ACTIVE: (days) => `Essai gratuit - ${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''}`,
        SUBSCRIPTION_ACTIVE: (days) => `Abonnement actif - ${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''}`,
        PAYMENT_DURING_TRIAL: (date) => `Paiement validé ✅. Votre abonnement commencera à la fin de votre essai gratuit le ${date}.`,
        PAYMENT_AFTER_TRIAL: (duration) => `Votre abonnement commence maintenant pour ${duration} jours.`,
        PAYMENT_NEW_TRIAL: (date) => `Paiement validé ✅. Votre essai gratuit de 30 jours commence maintenant. Votre abonnement débutera le ${date}.`,
    },
    // Règles d'abonnement
    RULES: {
        // Essai gratuit obligatoire pour les nouveaux
        TRIAL_REQUIRED_FOR_NEW_USERS: true,
        // Paiement pendant l'essai → abonnement commence après les 30 jours
        PAYMENT_DURING_TRIAL_DEFERS: true,
        // Paiement après l'essai → abonnement commence immédiatement
        PAYMENT_AFTER_TRIAL_IMMEDIATE: true,
        // Renouvellement prolonge la durée existante
        RENEWAL_EXTENDS_EXISTING: true,
        // Afficher le compte à rebours
        SHOW_COUNTDOWN: true,
        // Calcul de l'économie annuelle
        YEARLY_SAVINGS: {
            monthlyCost: 100 * 12, // 1200$ par an en mensuel
            yearlyCost: 1000, // 1000$ par an en annuel
            savings: 200, // Économie de 200$ par an
            percentage: 16.67 // 16.67% d'économie
        }
    }
};
// ==================== PAIEMENTS SÉCURISÉS ====================
exports.SECURE_PAYMENT_CONFIG = {
    // Support des méthodes de paiement
    SUPPORTED_METHODS: [
        'mpesa',
        'orange_money',
        'airtel_money',
        'afrimoney',
        'bank',
        'visa',
        'google_pay',
        'mastercard',
        'international_bank'
    ],
    // Taux de frais par méthode
    FEES_PERCENTAGES: {
        mpesa: 2.0,
        orange_money: 1.5,
        airtel_money: 2.0,
        afrimoney: 1.8,
        bank: 0,
        visa: 2.9,
        google_pay: 1.9,
        mastercard: 2.9,
        international_bank: 1.0
    },
    // Frais fixes par méthode (en USD)
    FIXED_FEES: {
        mpesa: 0.50,
        orange_money: 0,
        airtel_money: 0.25,
        afrimoney: 0,
        bank: 5.00,
        visa: 0.30,
        google_pay: 0.15,
        mastercard: 0.30,
        international_bank: 25.00 // Minimum 25 USD
    },
    // Temps de traitement
    PROCESSING_TIMES: {
        mpesa: 'Instantané',
        orange_money: 'Instantané',
        airtel_money: 'Instantané',
        afrimoney: 'Instantané',
        bank: '1-3 jours ouvrables',
        visa: 'Instantané',
        google_pay: 'Instantané',
        mastercard: 'Instantané',
        international_bank: '3-5 jours ouvrables'
    }
};
// ==================== DEVELOPER INFO ====================
exports.DEVELOPER_INFO = {
    NAME: 'Henock Aduma',
    COMPANY: 'My Church',
    YEAR: '2024',
    CONTACT: {
        EMAIL: 'support@mychurch.com',
        PHONE: '+243 000 000 000',
        WEBSITE: 'https://mychurch.com'
    },
    SIGNATURE: 'My Church - Created by Henock Aduma'
};
// ==================== VERSIONS ====================
exports.VERSION_INFO = {
    APP: '4.3.0',
    PAYMENT_API: '2025.5.0',
    DATABASE: '2.1.0',
    SECURITY: '1.0.0'
};
// ==================== CALCULATEUR ABONNEMENT ====================
exports.SUBSCRIPTION_CALCULATOR = {
    // Calculer l'économie avec l'abonnement annuel
    calculateYearlySavings: (monthlyPrice, yearlyPrice) => {
        const monthlyYearlyCost = monthlyPrice * 12;
        const savings = monthlyYearlyCost - yearlyPrice;
        const percentage = ((savings / monthlyYearlyCost) * 100).toFixed(2);
        return {
            monthlyYearlyCost,
            savings,
            percentage,
            message: `Économisez $${savings} par an (${percentage}%) avec l'abonnement annuel`
        };
    },
    // Obtenir le prix de l'abonnement
    getSubscriptionPrice: (type) => {
        const plan = exports.SUBSCRIPTION_CONFIG.PLANS.find(p => p.type === type);
        return plan?.price || 0;
    },
    // Obtenir les détails du plan
    getPlanDetails: (type) => {
        return exports.SUBSCRIPTION_CONFIG.PLANS.find(p => p.type === type);
    }
};
// Exécuter le calcul d'économie
exports.YEARLY_SAVINGS_CALCULATION = exports.SUBSCRIPTION_CALCULATOR.calculateYearlySavings(exports.SUBSCRIPTION_CONFIG.MONTHLY_PRICE, exports.SUBSCRIPTION_CONFIG.YEARLY_PRICE);
// Par défaut on bascule vers MySQL (simulé) — PostgreSQL reste présent.
exports.DB_PROVIDER = 'mysql';
function setDbProvider(provider) {
    exports.DB_PROVIDER = provider;
}
exports.default = {
    APP_NAME: exports.APP_NAME,
    APP_VERSION: exports.APP_VERSION,
    APP_VERSION_CODE: exports.APP_VERSION_CODE,
    APP_CONFIG: exports.APP_CONFIG,
    MEMBER_POSITIONS: exports.MEMBER_POSITIONS,
    RESTRICTED_POSITIONS: exports.RESTRICTED_POSITIONS,
    DEPARTMENTS: exports.DEPARTMENTS,
    MEMBER_TYPES: exports.MEMBER_TYPES,
    MEMBER_STATUS: exports.MEMBER_STATUS,
    PAYMENT_STATUS: exports.PAYMENT_STATUS,
    CARD_STATUS: exports.CARD_STATUS,
    PAYMENT_METHODS: exports.PAYMENT_METHODS,
    EXPENSE_CATEGORIES: exports.EXPENSE_CATEGORIES,
    DOSSIER_TYPES: exports.DOSSIER_TYPES,
    DOCUMENT_TYPES: exports.DOCUMENT_TYPES,
    DOSSIER_STATUS: exports.DOSSIER_STATUS,
    PLATFORMS: exports.PLATFORMS,
    THEMES: exports.THEMES,
    CURRENCIES: exports.CURRENCIES,
    SUBSCRIPTION_TYPES: exports.SUBSCRIPTION_TYPES,
    NOTIFICATION_TYPES: exports.NOTIFICATION_TYPES,
    ARCHIVE_TYPES: exports.ARCHIVE_TYPES,
    USER_ROLES: exports.USER_ROLES,
    ERROR_MESSAGES: exports.ERROR_MESSAGES,
    SUCCESS_MESSAGES: exports.SUCCESS_MESSAGES,
    DEMO_ACCOUNTS: exports.DEMO_ACCOUNTS,
    DOSSIER_CONFIG: exports.DOSSIER_CONFIG,
    REPORT_CONFIG: exports.REPORT_CONFIG,
    CARD_CONFIG: exports.CARD_CONFIG,
    PAYMENT_CONFIG: exports.PAYMENT_CONFIG,
    PHOTO_CONFIG: exports.PHOTO_CONFIG,
    BUSINESS_RULES: exports.BUSINESS_RULES,
    CODE_GENERATORS: exports.CODE_GENERATORS,
    UI_CONSTANTS: exports.UI_CONSTANTS,
    INTERFACE_TABS: exports.INTERFACE_TABS,
    FILTER_STATUS: exports.FILTER_STATUS,
    SUBSCRIPTION_CONFIG: exports.SUBSCRIPTION_CONFIG,
    SECURE_PAYMENT_CONFIG: exports.SECURE_PAYMENT_CONFIG,
    DEVELOPER_INFO: exports.DEVELOPER_INFO,
    VERSION_INFO: exports.VERSION_INFO,
    SUBSCRIPTION_CALCULATOR: exports.SUBSCRIPTION_CALCULATOR,
    YEARLY_SAVINGS_CALCULATION: exports.YEARLY_SAVINGS_CALCULATION
};
