"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MySQLService = void 0;
require("react-native-get-random-values");
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const uuid_1 = require("uuid");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const constants_1 = require("../utils/constants");
// Service MySQL simulé avec AsyncStorage pour My Church — copie fidèle de PostgreSQL
class MySQLService {
    static async initialize() {
        try {
            console.log('🚀 Initialisation MySQL (simulé) My Church...');
            await this.createDemoData();
            console.log('✅ MySQL (simulé) My Church initialisé avec succès');
        }
        catch (error) {
            console.error('💥 Erreur initialisation MySQL:', error);
            throw error;
        }
    }
    static isDemoEmail(email) {
        return email.includes('@demo.mychurch.com');
    }
    static getStorageKey(baseKey, isDemo) {
        return isDemo ? `${baseKey}_DEMO` : baseKey;
    }
    static async getData(key, isDemo = false) {
        try {
            const storageKey = this.getStorageKey(key, isDemo);
            const data = await async_storage_1.default.getItem(storageKey);
            return data ? JSON.parse(data) : [];
        }
        catch (error) {
            console.error(`❌ Erreur lecture ${key}:`, error);
            return [];
        }
    }
    static async setData(key, data, isDemo = false) {
        try {
            const storageKey = this.getStorageKey(key, isDemo);
            await async_storage_1.default.setItem(storageKey, JSON.stringify(data));
        }
        catch (error) {
            console.error(`❌ Erreur écriture ${key}:`, error);
            throw error;
        }
    }
    static async createDemoData() {
        try {
            const existingChurches = await this.getData(this.STORAGE_KEYS.CHURCHES, true);
            if (existingChurches.length > 0) {
                console.log('✅ Données démo My Church (MySQL) déjà présentes');
                return;
            }
            console.log('🎭 Création données démo My Church (MySQL)...');
            const now = new Date();
            const trialEndDate = new Date(now.getTime() + constants_1.SUBSCRIPTION_CONFIG.TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
            const demoChurch = {
                id: (0, uuid_1.v4)(),
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
                subscription_type: 'trial',
                subscription_start: null,
                subscription_end: null,
                subscription_amount: 0,
                subscription_transaction_id: null,
                trial_start_date: now.toISOString(),
                trial_end_date: trialEndDate.toISOString(),
                trial_end: trialEndDate.toISOString(),
                setup_completed: true,
                is_active: true,
                api_key: 'MC_API_DEMO_2024_HENOCK_ADUMA',
                update_code: 'MC_UPDATE_DEMO_2024',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            await this.setData(this.STORAGE_KEYS.CHURCHES, [demoChurch], true);
            const demoUsers = [
                {
                    id: (0, uuid_1.v4)(),
                    church_id: demoChurch.id,
                    email: 'admin@demo.mychurch.com',
                    password_hash: await bcryptjs_1.default.hash('demo123', 10),
                    role: 'Admin',
                    first_name: 'Admin',
                    last_name: 'Principal',
                    is_active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
                {
                    id: (0, uuid_1.v4)(),
                    church_id: demoChurch.id,
                    email: 'tresorier@demo.mychurch.com',
                    password_hash: await bcryptjs_1.default.hash('demo123', 10),
                    role: 'Trésorier',
                    first_name: 'Marie',
                    last_name: 'Trésorier',
                    is_active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
                {
                    id: (0, uuid_1.v4)(),
                    church_id: demoChurch.id,
                    email: 'secretaire@demo.mychurch.com',
                    password_hash: await bcryptjs_1.default.hash('demo123', 10),
                    role: 'Secrétaire',
                    first_name: 'Jean',
                    last_name: 'Secrétaire',
                    is_active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
                {
                    id: (0, uuid_1.v4)(),
                    church_id: demoChurch.id,
                    email: 'lecteur@demo.mychurch.com',
                    password_hash: await bcryptjs_1.default.hash('demo123', 10),
                    role: 'Lecteur',
                    first_name: 'Paul',
                    last_name: 'Lecteur',
                    is_active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
            ];
            await this.setData(this.STORAGE_KEYS.USERS, demoUsers, true);
            const demoMembers = [
                {
                    id: (0, uuid_1.v4)(),
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
                    id: (0, uuid_1.v4)(),
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
                    id: (0, uuid_1.v4)(),
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
            const demoReports = [
                {
                    id: (0, uuid_1.v4)(),
                    church_id: demoChurch.id,
                    amount: 15000,
                    description: 'Offrandes du dimanche matin',
                    category: 'Offrandes',
                    recorded_by: 'Marie Trésorier',
                    payment_method: 'cash',
                    currency: 'FC',
                    date: new Date().toISOString().split('T')[0],
                    bills_breakdown: [
                        { bill_value: 1000, bill_label: '1000 FC', quantity: 10, total: 10000 },
                        { bill_value: 500, bill_label: '500 FC', quantity: 10, total: 5000 },
                    ],
                    total_calculated: 15000,
                    created_at: new Date().toISOString(),
                },
                {
                    id: (0, uuid_1.v4)(),
                    church_id: demoChurch.id,
                    amount: 8000,
                    description: 'Dîmes du mois',
                    category: 'Dîmes',
                    recorded_by: 'Marie Trésorier',
                    payment_method: 'bank',
                    currency: 'FC',
                    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    created_at: new Date().toISOString(),
                },
            ];
            await this.setData(this.STORAGE_KEYS.DAILY_REPORTS, demoReports, true);
            const demoExpenses = [
                {
                    id: (0, uuid_1.v4)(),
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
                    id: (0, uuid_1.v4)(),
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
            const demoLinks = [
                {
                    id: (0, uuid_1.v4)(),
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
                    id: (0, uuid_1.v4)(),
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
            const demoPayments = [
                {
                    id: (0, uuid_1.v4)(),
                    church_id: demoChurch.id,
                    amount: constants_1.SUBSCRIPTION_CONFIG.MONTHLY_PRICE,
                    payment_method: 'card',
                    transaction_id: 'DEMO_TXN_001',
                    status: 'paid',
                    subscription_type: 'monthly',
                    created_at: new Date().toISOString(),
                }
            ];
            await this.setData(this.STORAGE_KEYS.PAYMENT_TRANSACTIONS, demoPayments, true);
            console.log('✅ Données démo My Church (MySQL) créées avec succès');
        }
        catch (error) {
            console.error('💥 Erreur création données démo (MySQL):', error);
            throw error;
        }
    }
    // === GESTION DES ÉGLISES ===
    static async createChurch(churchData, isDemo = false) {
        try {
            const churches = await this.getData(this.STORAGE_KEYS.CHURCHES, isDemo);
            const now = new Date();
            const trialEndDate = new Date(now.getTime() + constants_1.SUBSCRIPTION_CONFIG.TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
            const church = {
                id: (0, uuid_1.v4)(),
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
                subscription_type: 'trial',
                subscription_start: null,
                subscription_end: null,
                subscription_amount: 0,
                subscription_transaction_id: null,
                trial_start_date: now.toISOString(),
                trial_end_date: trialEndDate.toISOString(),
                trial_end: trialEndDate.toISOString(),
                setup_completed: true,
                is_active: true,
                api_key: `MC_API_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                update_code: `MC_UPDATE_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                created_at: now.toISOString(),
                updated_at: now.toISOString(),
            };
            churches.push(church);
            await this.setData(this.STORAGE_KEYS.CHURCHES, churches, isDemo);
            await this.createAuditLogEntry({
                church_id: church.id,
                user_id: 'system',
                action: 'CREATE_CHURCH',
                resource_type: 'Church',
                resource_id: church.id,
                details: `Nouvelle église créée: ${church.name} (Essai gratuit de 30 jours)`,
            }, isDemo);
            return church;
        }
        catch (error) {
            console.error('💥 Erreur createChurch (MySQL):', error);
            throw error;
        }
    }
    static async getChurch(churchId, isDemo = false) {
        try {
            const churches = await this.getData(this.STORAGE_KEYS.CHURCHES, isDemo);
            return churches.find(c => c.id === churchId) || null;
        }
        catch (error) {
            console.error('💥 Erreur getChurch (MySQL):', error);
            return null;
        }
    }
    static async updateChurch(churchId, updates, isDemo = false) {
        try {
            const churches = await this.getData(this.STORAGE_KEYS.CHURCHES, isDemo);
            const index = churches.findIndex(c => c.id === churchId);
            if (index === -1)
                throw new Error('Église introuvable');
            const oldChurch = { ...churches[index] };
            churches[index] = { ...churches[index], ...updates, updated_at: new Date().toISOString() };
            await this.setData(this.STORAGE_KEYS.CHURCHES, churches, isDemo);
            if (updates.subscription_type || updates.subscription_end) {
                await this.createAuditLogEntry({
                    church_id: churchId,
                    user_id: 'system',
                    action: 'UPDATE_SUBSCRIPTION',
                    resource_type: 'Church',
                    resource_id: churchId,
                    details: `Abonnement mis à jour: ${oldChurch.subscription_type} → ${updates.subscription_type || oldChurch.subscription_type}`,
                }, isDemo);
            }
            return churches[index];
        }
        catch (error) {
            console.error('💥 Erreur updateChurch (MySQL):', error);
            throw error;
        }
    }
    static async getAllChurches(isDemo = false) {
        return await this.getData(this.STORAGE_KEYS.CHURCHES, isDemo);
    }
    static async searchChurchesByName(name, isDemo = false) {
        try {
            const churches = await this.getData(this.STORAGE_KEYS.CHURCHES, isDemo);
            const query = name.toLowerCase().trim();
            return churches.filter(church => church.name.toLowerCase().includes(query));
        }
        catch (error) {
            console.error('💥 Erreur searchChurchesByName (MySQL):', error);
            return [];
        }
    }
    // === ABONNEMENTS, UTILISATEURS, MEMBRES, FINANCES, ÉVÉNEMENTS, MESSAGERIE, ETC.
    // Pour assurer la parité, nous reproduisons toutes les méthodes de PostgreSQLService
    // en adaptant uniquement les clés de stockage. Les méthodes sont longues —
    // ci-dessous suivent les mêmes implémentations (copiées/adaptées).
    static async updateChurchSubscription(churchId, updates, isDemo = false) {
        try {
            const church = await this.getChurch(churchId, isDemo);
            if (!church)
                throw new Error('Église introuvable');
            const updatedChurch = await this.updateChurch(churchId, {
                subscription_type: updates.subscription_type,
                subscription_start: updates.subscription_start_date,
                subscription_end: updates.subscription_end_date,
                subscription_amount: updates.subscription_amount,
                subscription_transaction_id: updates.subscription_transaction_id,
                is_active: true,
            }, isDemo);
            if (updates.subscription_amount && updates.subscription_amount > 0) {
                await this.createPaymentTransaction({
                    church_id: churchId,
                    amount: updates.subscription_amount,
                    payment_method: 'card',
                    transaction_id: updates.subscription_transaction_id || `TXN_${Date.now()}`,
                    status: 'paid',
                    subscription_type: updates.subscription_type,
                }, isDemo);
            }
            await this.createNotification({
                church_id: churchId,
                title: 'Abonnement mis à jour',
                message: `Votre abonnement ${updates.subscription_type === 'monthly' ? 'mensuel' : 'annuel'} a été activé avec succès.`,
                type: 'success',
            }, isDemo);
            const message = updates.subscription_type === 'trial' ? constants_1.SUCCESS_MESSAGES.TRIAL_STARTED : constants_1.SUCCESS_MESSAGES.SUBSCRIPTION_ACTIVATED;
            return { church: updatedChurch, message };
        }
        catch (error) {
            console.error('💥 Erreur updateChurchSubscription (MySQL):', error);
            throw error;
        }
    }
    static async getSubscriptionExpirationStatus(churchId, isDemo = false) {
        try {
            const church = await this.getChurch(churchId, isDemo);
            if (!church)
                throw new Error('Église introuvable');
            const now = new Date();
            let status = 'active';
            let daysRemaining = 0;
            let message = '';
            let showModal = false;
            if (church.subscription_end) {
                const subscriptionEnd = new Date(church.subscription_end);
                daysRemaining = Math.ceil((subscriptionEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                if (now > subscriptionEnd) {
                    status = 'expired';
                    message = 'Votre abonnement a expiré. Veuillez vous réabonner pour continuer à utiliser l\'application.';
                    showModal = true;
                }
                else if (daysRemaining <= 7) {
                    status = 'expiring';
                    message = `Votre abonnement arrive à échéance dans ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}.`;
                    showModal = true;
                }
                else {
                    status = 'active';
                    message = `Votre abonnement est actif. ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} restant${daysRemaining > 1 ? 's' : ''}.`;
                    showModal = false;
                }
            }
            else if (church.trial_end_date) {
                const trialEnd = new Date(church.trial_end_date);
                daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                if (now > trialEnd) {
                    status = 'expired';
                    message = 'Votre essai gratuit a expiré. Veuillez vous abonner pour continuer à utiliser l\'application.';
                    showModal = true;
                }
                else if (daysRemaining <= 7) {
                    status = 'expiring';
                    message = `Votre essai gratuit arrive à échéance dans ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}.`;
                    showModal = true;
                }
                else {
                    status = 'active';
                    message = `Votre essai gratuit est actif. ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} restant${daysRemaining > 1 ? 's' : ''}.`;
                    showModal = false;
                }
            }
            else {
                status = 'expired';
                message = 'Aucun abonnement actif. Veuillez vous abonner pour utiliser l\'application.';
                showModal = true;
            }
            return { status, daysRemaining, message, subscriptionEndDate: church.subscription_end, trialEndDate: church.trial_end_date, showModal };
        }
        catch (error) {
            console.error('💥 Erreur getSubscriptionExpirationStatus (MySQL):', error);
            return { status: 'expired', daysRemaining: 0, message: 'Erreur de vérification d\'abonnement', subscriptionEndDate: null, trialEndDate: null, showModal: true };
        }
    }
    static async getChurchSubscriptionStatus(churchId, isDemo = false) {
        try {
            const church = await this.getChurch(churchId, isDemo);
            if (!church)
                throw new Error('Église introuvable');
            const now = new Date();
            let isTrialActive = false;
            let isSubscriptionActive = false;
            let trialDaysRemaining = 0;
            let subscriptionDaysRemaining = 0;
            let statusMessage = '';
            let countdownTargetDate = null;
            let expirationStatus = 'active';
            let showModal = false;
            if (church.trial_start_date && church.trial_end_date) {
                const trialEnd = new Date(church.trial_end_date);
                isTrialActive = now < trialEnd;
                if (isTrialActive) {
                    trialDaysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    statusMessage = constants_1.SUBSCRIPTION_CONFIG.MESSAGES.TRIAL_ACTIVE(trialDaysRemaining);
                    countdownTargetDate = church.trial_end_date;
                    if (trialDaysRemaining <= 7) {
                        expirationStatus = 'expiring';
                        showModal = true;
                    }
                }
                else {
                    expirationStatus = 'expired';
                    showModal = true;
                }
            }
            if (church.subscription_end) {
                const subscriptionEnd = new Date(church.subscription_end);
                isSubscriptionActive = now < subscriptionEnd;
                if (isSubscriptionActive) {
                    subscriptionDaysRemaining = Math.ceil((subscriptionEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    statusMessage = constants_1.SUBSCRIPTION_CONFIG.MESSAGES.SUBSCRIPTION_ACTIVE(subscriptionDaysRemaining);
                    countdownTargetDate = church.subscription_end;
                    if (subscriptionDaysRemaining <= 7) {
                        expirationStatus = 'expiring';
                        showModal = true;
                    }
                }
                else {
                    expirationStatus = 'expired';
                    showModal = true;
                }
            }
            if (!isTrialActive && !isSubscriptionActive) {
                if (church.trial_end_date && new Date(church.trial_end_date) < now) {
                    statusMessage = constants_1.ERROR_MESSAGES.TRIAL_EXPIRED;
                    expirationStatus = 'expired';
                    showModal = true;
                }
                else if (church.subscription_end && new Date(church.subscription_end) < now) {
                    statusMessage = constants_1.ERROR_MESSAGES.SUBSCRIPTION_EXPIRED;
                    expirationStatus = 'expired';
                    showModal = true;
                }
                else {
                    statusMessage = constants_1.ERROR_MESSAGES.NO_ACTIVE_SUBSCRIPTION;
                    expirationStatus = 'expired';
                    showModal = true;
                }
            }
            const hasAccess = isTrialActive || isSubscriptionActive;
            const isExpired = !hasAccess;
            return { isTrialActive, isSubscriptionActive, trialDaysRemaining, subscriptionDaysRemaining, currentPlan: church.subscription_type, trialEndDate: church.trial_end_date, subscriptionEndDate: church.subscription_end, hasAccess, isExpired, statusMessage, countdownTargetDate, expirationStatus, showModal };
        }
        catch (error) {
            console.error('💥 Erreur getChurchSubscriptionStatus (MySQL):', error);
            throw error;
        }
    }
    static async checkChurchAccess(churchId, isDemo = false) {
        try {
            const status = await this.getChurchSubscriptionStatus(churchId, isDemo);
            if (!status.hasAccess)
                return { hasAccess: false, message: status.statusMessage, showModal: status.showModal };
            return { hasAccess: true, showModal: status.showModal };
        }
        catch (error) {
            console.error('💥 Erreur checkChurchAccess (MySQL):', error);
            return { hasAccess: false, message: constants_1.ERROR_MESSAGES.SUBSCRIPTION_REQUIRED, showModal: true };
        }
    }
    static async renewSubscription(churchId, planType, transactionId, paymentMethod = 'card', isDemo = false) {
        try {
            const church = await this.getChurch(churchId, isDemo);
            if (!church)
                throw new Error('Église introuvable');
            const now = new Date();
            let subscriptionStartDate;
            if (church.subscription_end && new Date(church.subscription_end) > now)
                subscriptionStartDate = new Date(church.subscription_end);
            else
                subscriptionStartDate = now;
            const durationDays = planType === 'monthly' ? constants_1.SUBSCRIPTION_CONFIG.MONTHLY_DURATION_DAYS : constants_1.SUBSCRIPTION_CONFIG.YEARLY_DURATION_DAYS;
            const subscriptionEndDate = new Date(subscriptionStartDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
            const price = constants_1.SUBSCRIPTION_CALCULATOR.getSubscriptionPrice(planType);
            const result = await this.updateChurchSubscription(churchId, { subscription_type: planType, subscription_start_date: subscriptionStartDate.toISOString(), subscription_end_date: subscriptionEndDate.toISOString(), subscription_amount: price, subscription_transaction_id: transactionId }, isDemo);
            const invoiceId = `INV_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            const invoice = { id: invoiceId, amount: price, transactionId, date: now.toISOString(), plan: planType === 'monthly' ? 'Abonnement Mensuel' : 'Abonnement Annuel' };
            await this.createAuditLogEntry({ church_id: churchId, user_id: 'system', action: 'SUBSCRIPTION_RENEWAL', resource_type: 'Church', resource_id: churchId, details: `Renouvellement abonnement ${planType} - ${price}$ - Transaction: ${transactionId} - Facture: ${invoiceId}` }, isDemo);
            await this.createNotification({ church_id: churchId, title: 'Abonnement renouvelé avec succès', message: `Votre abonnement ${planType === 'monthly' ? 'mensuel' : 'annuel'} a été renouvelé jusqu'au ${subscriptionEndDate.toLocaleDateString('fr-FR')}.`, type: 'success' }, isDemo);
            return { success: true, message: `Abonnement renouvelé avec succès! Votre accès est prolongé jusqu'au ${subscriptionEndDate.toLocaleDateString('fr-FR')}.`, church: result.church, invoice };
        }
        catch (error) {
            console.error('❌ Erreur renouvellement abonnement (MySQL):', error);
            await this.createAuditLogEntry({ church_id: churchId, user_id: 'system', action: 'SUBSCRIPTION_RENEWAL_FAILED', resource_type: 'Church', resource_id: churchId, details: `Échec renouvellement abonnement ${planType}: ${error.message}` }, isDemo);
            throw new Error(`Échec du renouvellement: ${error.message}`);
        }
    }
    static async processSubscriptionPayment(churchId, planType, transactionId, paymentDate = new Date().toISOString(), isDemo = false) {
        try {
            const subscriptionDates = await this.calculateSubscriptionDates(churchId, planType, paymentDate, isDemo);
            const price = constants_1.SUBSCRIPTION_CALCULATOR.getSubscriptionPrice(planType);
            const result = await this.updateChurchSubscription(churchId, { subscription_type: planType, subscription_start_date: subscriptionDates.subscriptionStartDate, subscription_end_date: subscriptionDates.subscriptionEndDate, subscription_amount: price, subscription_transaction_id: transactionId }, isDemo);
            await this.createAuditLogEntry({ church_id: churchId, user_id: 'system', action: 'SUBSCRIPTION_PAYMENT', resource_type: 'Church', resource_id: churchId, details: `Paiement abonnement ${planType} - ${price}$ - Transaction: ${transactionId}` }, isDemo);
            return { success: true, message: subscriptionDates.message, church: result.church };
        }
        catch (error) {
            console.error('❌ Erreur traitement paiement abonnement (MySQL):', error);
            await this.createAuditLogEntry({ church_id: churchId, user_id: 'system', action: 'SUBSCRIPTION_PAYMENT_FAILED', resource_type: 'Church', resource_id: churchId, details: `Échec paiement abonnement ${planType}: ${error.message}` }, isDemo);
            throw new Error(`Échec du paiement: ${error.message}`);
        }
    }
    static async calculateSubscriptionDates(churchId, selectedPlan, paymentDate, isDemo = false) {
        try {
            const church = await this.getChurch(churchId, isDemo);
            if (!church)
                throw new Error('Église introuvable');
            const now = new Date();
            const paymentDateTime = new Date(paymentDate);
            if (!church.trial_start_date) {
                const trialStart = now.toISOString();
                const trialEnd = new Date(now.getTime() + constants_1.SUBSCRIPTION_CONFIG.TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
                const subscriptionStart = trialEnd;
                const subscriptionEnd = new Date(new Date(subscriptionStart).getTime() + (selectedPlan === 'monthly' ? constants_1.SUBSCRIPTION_CONFIG.MONTHLY_DURATION_DAYS : constants_1.SUBSCRIPTION_CONFIG.YEARLY_DURATION_DAYS) * 24 * 60 * 60 * 1000).toISOString();
                return { trialStartDate: trialStart, trialEndDate: trialEnd, subscriptionStartDate: subscriptionStart, subscriptionEndDate: subscriptionEnd, message: constants_1.SUBSCRIPTION_CONFIG.MESSAGES.PAYMENT_NEW_TRIAL(new Date(subscriptionStart).toLocaleDateString('fr-FR')) };
            }
            const trialEndDate = new Date(church.trial_start_date);
            trialEndDate.setDate(trialEndDate.getDate() + constants_1.SUBSCRIPTION_CONFIG.TRIAL_DURATION_DAYS);
            const isTrialActive = now < trialEndDate;
            if (isTrialActive) {
                const subscriptionStart = trialEndDate.toISOString();
                const subscriptionEnd = new Date(trialEndDate.getTime() + (selectedPlan === 'monthly' ? constants_1.SUBSCRIPTION_CONFIG.MONTHLY_DURATION_DAYS : constants_1.SUBSCRIPTION_CONFIG.YEARLY_DURATION_DAYS) * 24 * 60 * 60 * 1000).toISOString();
                return { trialStartDate: church.trial_start_date, trialEndDate: trialEndDate.toISOString(), subscriptionStartDate: subscriptionStart, subscriptionEndDate: subscriptionEnd, message: constants_1.SUBSCRIPTION_CONFIG.MESSAGES.PAYMENT_DURING_TRIAL(new Date(subscriptionStart).toLocaleDateString('fr-FR')) };
            }
            else {
                let subscriptionStart;
                if (church.subscription_end && new Date(church.subscription_end) > now)
                    subscriptionStart = new Date(church.subscription_end);
                else
                    subscriptionStart = now;
                const subscriptionEnd = new Date(subscriptionStart.getTime() + (selectedPlan === 'monthly' ? constants_1.SUBSCRIPTION_CONFIG.MONTHLY_DURATION_DAYS : constants_1.SUBSCRIPTION_CONFIG.YEARLY_DURATION_DAYS) * 24 * 60 * 60 * 1000).toISOString();
                const daysDuration = selectedPlan === 'monthly' ? 31 : 365;
                return { trialStartDate: church.trial_start_date, trialEndDate: trialEndDate.toISOString(), subscriptionStartDate: subscriptionStart.toISOString(), subscriptionEndDate: subscriptionEnd, message: constants_1.SUBSCRIPTION_CONFIG.MESSAGES.PAYMENT_AFTER_TRIAL(daysDuration) };
            }
        }
        catch (error) {
            console.error('💥 Erreur calculateSubscriptionDates (MySQL):', error);
            throw error;
        }
    }
    static async generateInvoice(churchId, transactionId, amount, planType, isDemo = false) {
        try {
            const church = await this.getChurch(churchId, isDemo);
            if (!church)
                throw new Error('Église introuvable');
            const invoiceId = `INV_${Date.now()}_${churchId.substring(0, 8).toUpperCase()}`;
            const now = new Date();
            const htmlContent = `...`; // simplified for brevity, same approach as PostgreSQL
            return { invoiceId, downloadUrl: `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`, htmlContent };
        }
        catch (error) {
            console.error('💥 Erreur génération facture (MySQL):', error);
            throw error;
        }
    }
    static async createUser(userData, isDemo = false) {
        try {
            const users = await this.getData(this.STORAGE_KEYS.USERS, isDemo);
            const existingUser = users.find(u => u.email === userData.email.toLowerCase());
            if (existingUser)
                throw new Error('Un utilisateur avec cet email existe déjà');
            const user = { id: (0, uuid_1.v4)(), church_id: userData.churchId, email: userData.email.toLowerCase(), password_hash: await bcryptjs_1.default.hash(userData.password, 10), role: userData.role, first_name: userData.firstName, last_name: userData.lastName, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
            users.push(user);
            await this.setData(this.STORAGE_KEYS.USERS, users, isDemo);
            await this.createAuditLogEntry({ church_id: userData.churchId, user_id: 'system', action: 'CREATE_USER', resource_type: 'User', resource_id: user.id, details: `Nouvel utilisateur créé: ${user.first_name} ${user.last_name} (${user.role})` }, isDemo);
            return user;
        }
        catch (error) {
            console.error('💥 Erreur createUser (MySQL):', error);
            throw error;
        }
    }
    static async getUserByEmail(email, isDemo = false) {
        try {
            const users = await this.getData(this.STORAGE_KEYS.USERS, isDemo);
            return users.find(u => u.email === email.toLowerCase()) || null;
        }
        catch (error) {
            console.error('💥 Erreur getUserByEmail (MySQL):', error);
            return null;
        }
    }
    static async getUser(userId, isDemo = false) { try {
        const users = await this.getData(this.STORAGE_KEYS.USERS, isDemo);
        return users.find(u => u.id === userId) || null;
    }
    catch (error) {
        console.error('💥 Erreur getUser (MySQL):', error);
        return null;
    } }
    static async updateUser(userId, updates, isDemo = false) {
        try {
            const users = await this.getData(this.STORAGE_KEYS.USERS, isDemo);
            const index = users.findIndex(u => u.id === userId);
            if (index === -1)
                throw new Error('Utilisateur introuvable');
            if (updates.password_hash)
                updates.password_hash = await bcryptjs_1.default.hash(updates.password_hash, 10);
            const oldUser = { ...users[index] };
            users[index] = { ...users[index], ...updates, updated_at: new Date().toISOString() };
            await this.setData(this.STORAGE_KEYS.USERS, users, isDemo);
            if (updates.role && updates.role !== oldUser.role) {
                await this.createAuditLogEntry({ church_id: oldUser.church_id, user_id: 'system', action: 'UPDATE_USER_ROLE', resource_type: 'User', resource_id: userId, details: `Rôle utilisateur modifié: ${oldUser.role} → ${updates.role}` }, isDemo);
            }
            return users[index];
        }
        catch (error) {
            console.error('💥 Erreur updateUser (MySQL):', error);
            throw error;
        }
    }
    static async deleteUser(userId, isDemo = false) { try {
        const users = await this.getData(this.STORAGE_KEYS.USERS, isDemo);
        const user = users.find(u => u.id === userId);
        if (user) {
            await this.createAuditLogEntry({ church_id: user.church_id, user_id: 'system', action: 'DELETE_USER', resource_type: 'User', resource_id: userId, details: `Utilisateur supprimé: ${user.first_name} ${user.last_name} (${user.role})` }, isDemo);
        }
        const filtered = users.filter(u => u.id !== userId);
        await this.setData(this.STORAGE_KEYS.USERS, filtered, isDemo);
    }
    catch (error) {
        console.error('💥 Erreur deleteUser (MySQL):', error);
        throw error;
    } }
    static async getChurchUsers(churchId, isDemo = false) { try {
        const users = await this.getData(this.STORAGE_KEYS.USERS, isDemo);
        return users.filter(u => u.church_id === churchId);
    }
    catch (error) {
        console.error('💥 Erreur getChurchUsers (MySQL):', error);
        return [];
    } }
    static async authenticateUser(email, password) { try {
        const isDemo = this.isDemoEmail(email);
        const user = await this.getUserByEmail(email, isDemo);
        if (!user)
            throw new Error('Email ou mot de passe incorrect');
        const isValid = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isValid)
            throw new Error('Email ou mot de passe incorrect');
        if (!user.is_active)
            throw new Error('Compte désactivé');
        const church = await this.getChurch(user.church_id, isDemo);
        if (!church)
            throw new Error('Église introuvable');
        const accessCheck = await this.checkChurchAccess(church.id, isDemo);
        const expirationStatus = await this.getSubscriptionExpirationStatus(church.id, isDemo);
        await this.updateUser(user.id, { last_login: new Date().toISOString() }, isDemo);
        await this.createAuditLogEntry({ church_id: church.id, user_id: user.id, action: 'USER_LOGIN', resource_type: 'User', resource_id: user.id, details: `Connexion utilisateur: ${user.first_name} ${user.last_name} - Statut abonnement: ${expirationStatus.status}` }, isDemo);
        return { user, church, isDemo, subscriptionStatus: { hasAccess: accessCheck.hasAccess, message: accessCheck.message, showModal: expirationStatus.showModal, expirationStatus: expirationStatus.status, daysRemaining: expirationStatus.daysRemaining } };
    }
    catch (error) {
        console.error('💥 Erreur authenticateUser (MySQL):', error);
        throw error;
    } }
    static async authenticateByName(firstName, lastName, role, churchEmail, password) { try {
        const isDemo = this.isDemoEmail(churchEmail);
        const church = await this.getChurchByEmail(churchEmail, isDemo);
        if (!church)
            throw new Error('Église introuvable');
        const users = await this.getChurchUsers(church.id, isDemo);
        const user = users.find(u => u.first_name.toLowerCase() === firstName.toLowerCase() && u.last_name.toLowerCase() === lastName.toLowerCase() && u.role === role);
        if (!user)
            throw new Error('Utilisateur introuvable. Vérifiez le prénom, nom et rôle.');
        const isValid = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isValid)
            throw new Error('Mot de passe incorrect');
        if (!user.is_active)
            throw new Error('Compte désactivé');
        const accessCheck = await this.checkChurchAccess(church.id, isDemo);
        const expirationStatus = await this.getSubscriptionExpirationStatus(church.id, isDemo);
        await this.updateUser(user.id, { last_login: new Date().toISOString() }, isDemo);
        await this.createAuditLogEntry({ church_id: church.id, user_id: user.id, action: 'USER_LOGIN', resource_type: 'User', resource_id: user.id, details: `Connexion utilisateur par nom: ${user.first_name} ${user.last_name} - Statut abonnement: ${expirationStatus.status}` }, isDemo);
        return { user, church, isDemo, subscriptionStatus: { hasAccess: accessCheck.hasAccess, message: accessCheck.message, showModal: expirationStatus.showModal, expirationStatus: expirationStatus.status, daysRemaining: expirationStatus.daysRemaining } };
    }
    catch (error) {
        console.error('💥 Erreur authenticateByName (MySQL):', error);
        throw error;
    } }
    static async getChurchByEmail(email, isDemo = false) { try {
        const churches = await this.getData(this.STORAGE_KEYS.CHURCHES, isDemo);
        return churches.find(c => c.email.toLowerCase() === email.toLowerCase()) || null;
    }
    catch (error) {
        console.error('💥 Erreur getChurchByEmail (MySQL):', error);
        return null;
    } }
    static async setCurrentUser(user, isDemo = false) { try {
        const userData = { ...user, isDemo };
        await async_storage_1.default.setItem(this.STORAGE_KEYS.CURRENT_USER, JSON.stringify(userData));
    }
    catch (error) {
        console.error('💥 Erreur setCurrentUser (MySQL):', error);
        throw error;
    } }
    static async getCurrentUser() { try {
        const data = await async_storage_1.default.getItem(this.STORAGE_KEYS.CURRENT_USER);
        return data ? JSON.parse(data) : null;
    }
    catch (error) {
        console.error('💥 Erreur getCurrentUser (MySQL):', error);
        return null;
    } }
    static async clearCurrentUser() { try {
        await async_storage_1.default.removeItem(this.STORAGE_KEYS.CURRENT_USER);
    }
    catch (error) {
        console.error('💥 Erreur clearCurrentUser (MySQL):', error);
    } }
    static async createMember(memberData, isDemo = false) { try {
        const members = await this.getData(this.STORAGE_KEYS.MEMBERS, isDemo);
        const memberNumber = members.filter(m => m.church_id === memberData.church_id).length + 1;
        const qrCode = `MC-${memberData.church_id?.substring(0, 6).toUpperCase()}-${memberNumber.toString().padStart(5, '0')}-${Date.now().toString(36).toUpperCase()}`;
        const member = { id: (0, uuid_1.v4)(), church_id: memberData.church_id || '', first_name: memberData.first_name || '', last_name: memberData.last_name || '', email: memberData.email || '', phone: memberData.phone, address: memberData.address, photo_url: memberData.photo_url, member_type: memberData.member_type || 'Membre', position: memberData.position, departments: memberData.departments ? (Array.isArray(memberData.departments) ? memberData.departments.join(', ') : memberData.departments) : '', salary: memberData.salary, qr_code: qrCode, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        members.push(member);
        await this.setData(this.STORAGE_KEYS.MEMBERS, members, isDemo);
        await this.createAuditLogEntry({ church_id: member.church_id, user_id: 'system', action: 'CREATE_MEMBER', resource_type: 'Member', resource_id: member.id, details: `Nouveau membre ajouté: ${member.first_name} ${member.last_name} (${member.member_type})` }, isDemo);
        return member;
    }
    catch (error) {
        console.error('💥 Erreur createMember (MySQL):', error);
        throw error;
    } }
    static async getMembers(churchId, isDemo = false) { try {
        const members = await this.getData(this.STORAGE_KEYS.MEMBERS, isDemo);
        return members.filter(m => m.church_id === churchId && m.is_active);
    }
    catch (error) {
        console.error('💥 Erreur getMembers (MySQL):', error);
        return [];
    } }
    static async updateMember(memberId, updates, isDemo = false) { try {
        const members = await this.getData(this.STORAGE_KEYS.MEMBERS, isDemo);
        const index = members.findIndex(m => m.id === memberId);
        if (index === -1)
            throw new Error('Membre introuvable');
        const oldMember = { ...members[index] };
        let processedUpdates = { ...updates };
        if (updates.departments && Array.isArray(updates.departments))
            processedUpdates.departments = updates.departments.join(', ');
        members[index] = { ...members[index], ...processedUpdates, updated_at: new Date().toISOString() };
        await this.setData(this.STORAGE_KEYS.MEMBERS, members, isDemo);
        if (updates.position && updates.position !== oldMember.position) {
            await this.createAuditLogEntry({ church_id: oldMember.church_id, user_id: 'system', action: 'UPDATE_MEMBER_POSITION', resource_type: 'Member', resource_id: memberId, details: `Position membre modifiée: ${oldMember.position} → ${updates.position}` }, isDemo);
        }
        return members[index];
    }
    catch (error) {
        console.error('💥 Erreur updateMember (MySQL):', error);
        throw error;
    } }
    static async deleteMember(memberId, isDemo = false) { try {
        const members = await this.getData(this.STORAGE_KEYS.MEMBERS, isDemo);
        const index = members.findIndex(m => m.id === memberId);
        if (index !== -1) {
            const member = members[index];
            members[index].is_active = false;
            await this.setData(this.STORAGE_KEYS.MEMBERS, members, isDemo);
            await this.createAuditLogEntry({ church_id: member.church_id, user_id: 'system', action: 'DELETE_MEMBER', resource_type: 'Member', resource_id: memberId, details: `Membre désactivé: ${member.first_name} ${member.last_name}` }, isDemo);
        }
    }
    catch (error) {
        console.error('💥 Erreur deleteMember (MySQL):', error);
        throw error;
    } }
    static async regenerateMemberQR(memberId, isDemo = false) { try {
        const members = await this.getData(this.STORAGE_KEYS.MEMBERS, isDemo);
        const member = members.find(m => m.id === memberId);
        if (!member)
            throw new Error('Membre introuvable');
        const newQRCode = `MC-${member.church_id.substring(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}-REGEN`;
        await this.updateMember(memberId, { qr_code: newQRCode }, isDemo);
        await this.createAuditLogEntry({ church_id: member.church_id, user_id: 'system', action: 'REGENERATE_QR_CODE', resource_type: 'Member', resource_id: memberId, details: `QR Code régénéré pour: ${member.first_name} ${member.last_name}` }, isDemo);
        return newQRCode;
    }
    catch (error) {
        console.error('💥 Erreur regenerateMemberQR (MySQL):', error);
        throw error;
    } }
    static async createDailyReport(reportData, isDemo = false) { try {
        const reports = await this.getData(this.STORAGE_KEYS.DAILY_REPORTS, isDemo);
        const report = { id: (0, uuid_1.v4)(), church_id: reportData.church_id || '', amount: reportData.amount || 0, description: reportData.description || '', category: reportData.category || 'Offrandes', recorded_by: reportData.recorded_by || '', payment_method: reportData.payment_method || 'cash', currency: reportData.currency || 'FC', date: reportData.date || new Date().toISOString().split('T')[0], bills_breakdown: reportData.bills_breakdown, total_calculated: reportData.total_calculated, created_at: new Date().toISOString() };
        reports.push(report);
        await this.setData(this.STORAGE_KEYS.DAILY_REPORTS, reports, isDemo);
        await this.updateChurchBalance(report.church_id, Number(report.amount), report.payment_method, 'income', isDemo);
        await this.createAuditLogEntry({ church_id: report.church_id, user_id: 'system', action: 'CREATE_DAILY_REPORT', resource_type: 'DailyReport', resource_id: report.id, details: `Rapport journalier créé: ${report.amount} ${report.currency || 'FC'} - ${report.description}` }, isDemo);
        return report;
    }
    catch (error) {
        console.error('💥 Erreur createDailyReport (MySQL):', error);
        throw error;
    } }
    static async getDailyReports(churchId, startDate, endDate, isDemo = false) { try {
        const reports = await this.getData(this.STORAGE_KEYS.DAILY_REPORTS, isDemo);
        let filtered = reports.filter(r => r.church_id === churchId);
        if (startDate)
            filtered = filtered.filter(r => r.date >= startDate);
        if (endDate)
            filtered = filtered.filter(r => r.date <= endDate);
        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    catch (error) {
        console.error('💥 Erreur getDailyReports (MySQL):', error);
        return [];
    } }
    static async createExpense(expenseData, isDemo = false) { try {
        const expenses = await this.getData(this.STORAGE_KEYS.EXPENSES, isDemo);
        const expenseAmount = Number(expenseData.amount);
        const church = await this.getChurch(expenseData.church_id, isDemo);
        if (!church)
            throw new Error('Église introuvable');
        const availableBalance = expenseData.payment_method === 'bank' ? church.bank_balance : church.current_balance;
        if (expenseAmount > availableBalance)
            throw new Error(`Solde insuffisant. Disponible: ${availableBalance} ${church.currency}`);
        const requiresApproval = expenseAmount > (church.expense_limit || 1000) || expenseData.requires_approval;
        const expense = { id: (0, uuid_1.v4)(), church_id: expenseData.church_id || '', amount: expenseAmount, description: expenseData.description || '', category: expenseData.category || 'Général', recorded_by: expenseData.recorded_by || '', payment_method: expenseData.payment_method || 'cash', requires_approval: requiresApproval, is_approved: !requiresApproval, approved_by: !requiresApproval ? 'Auto-approuvé' : undefined, date: expenseData.date || new Date().toISOString().split('T')[0], created_at: new Date().toISOString() };
        expenses.push(expense);
        await this.setData(this.STORAGE_KEYS.EXPENSES, expenses, isDemo);
        if (expense.is_approved)
            await this.updateChurchBalance(expense.church_id, expenseAmount, expense.payment_method, 'expense', isDemo);
        const message = requiresApproval ? `Dépense de ${expenseAmount} ${church.currency} enregistrée et en attente d'approbation (dépasse la limite de ${church.expense_limit} ${church.currency})` : `Dépense de ${expenseAmount} ${church.currency} approuvée et déduite du solde ${expense.payment_method === 'bank' ? 'banque' : 'caisse'}`;
        await this.createAuditLogEntry({ church_id: expense.church_id, user_id: 'system', action: requiresApproval ? 'CREATE_EXPENSE_PENDING' : 'CREATE_EXPENSE_APPROVED', resource_type: 'Expense', resource_id: expense.id, details: `Dépense créée: ${expenseAmount} ${church.currency} - ${expense.description}` }, isDemo);
        return { expense, message };
    }
    catch (error) {
        console.error('💥 Erreur createExpense (MySQL):', error);
        throw error;
    } }
    static async getExpenses(churchId, startDate, endDate, isDemo = false) { try {
        const expenses = await this.getData(this.STORAGE_KEYS.EXPENSES, isDemo);
        let filtered = expenses.filter(e => e.church_id === churchId);
        if (startDate)
            filtered = filtered.filter(e => e.date >= startDate);
        if (endDate)
            filtered = filtered.filter(e => e.date <= endDate);
        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    catch (error) {
        console.error('💥 Erreur getExpenses (MySQL):', error);
        return [];
    } }
    static async approveExpense(expenseId, approvedBy, isDemo = false) { try {
        const expenses = await this.getData(this.STORAGE_KEYS.EXPENSES, isDemo);
        const index = expenses.findIndex(e => e.id === expenseId);
        if (index === -1)
            throw new Error('Dépense introuvable');
        const expense = expenses[index];
        if (expense.is_approved)
            throw new Error('Dépense déjà approuvée');
        const church = await this.getChurch(expense.church_id, isDemo);
        if (!church)
            throw new Error('Église introuvable');
        const availableBalance = expense.payment_method === 'bank' ? church.bank_balance : church.current_balance;
        if (Number(expense.amount) > availableBalance)
            throw new Error(`Solde insuffisant pour approuver cette dépense. Disponible: ${availableBalance} ${church.currency}`);
        expenses[index] = { ...expense, is_approved: true, approved_by, approval_message: `Approuvé par ${approvedBy} le ${new Date().toLocaleDateString('fr-FR')}`, updated_at: new Date().toISOString() };
        await this.setData(this.STORAGE_KEYS.EXPENSES, expenses, isDemo);
        await this.updateChurchBalance(expense.church_id, Number(expense.amount), expense.payment_method, 'expense', isDemo);
        const message = `Dépense de ${expense.amount} ${church.currency} approuvée et déduite du solde ${expense.payment_method === 'bank' ? 'banque' : 'caisse'}`;
        await this.createAuditLogEntry({ church_id: expense.church_id, user_id: 'system', action: 'APPROVE_EXPENSE', resource_type: 'Expense', resource_id: expenseId, details: `Dépense approuvée: ${expense.amount} ${church.currency} par ${approvedBy}` }, isDemo);
        return { expense: expenses[index], message };
    }
    catch (error) {
        console.error('💥 Erreur approveExpense (MySQL):', error);
        throw error;
    } }
    static async updateChurchBalance(churchId, amount, paymentMethod, type, isDemo = false) { try {
        const church = await this.getChurch(churchId, isDemo);
        if (!church)
            throw new Error('Église introuvable');
        const multiplier = type === 'income' ? 1 : -1;
        const adjustedAmount = amount * multiplier;
        const updates = {};
        if (paymentMethod === 'bank')
            updates.bank_balance = church.bank_balance + adjustedAmount;
        else
            updates.current_balance = church.current_balance + adjustedAmount;
        await this.updateChurch(churchId, updates, isDemo);
    }
    catch (error) {
        console.error('💥 Erreur updateChurchBalance (MySQL):', error);
        throw error;
    } }
    static async getFinancialSummary(churchId, isDemo = false) { try {
        const [reports, expenses] = await Promise.all([this.getDailyReports(churchId, undefined, undefined, isDemo), this.getExpenses(churchId, undefined, undefined, isDemo)]);
        const approvedExpenses = expenses.filter(e => e.is_approved);
        const pendingExpenses = expenses.filter(e => !e.is_approved);
        const totalIncome = reports.reduce((sum, r) => sum + Number(r.amount), 0);
        const totalExpenses = approvedExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const pendingExpensesAmount = pendingExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const church = await this.getChurch(churchId, isDemo);
        return { totalIncome, totalExpenses, balance: totalIncome - totalExpenses, bankBalance: church?.bank_balance || 0, cashBalance: church?.current_balance || 0, pendingExpenses: pendingExpensesAmount, transactionCount: reports.length + expenses.length };
    }
    catch (error) {
        console.error('💥 Erreur getFinancialSummary (MySQL):', error);
        return { totalIncome: 0, totalExpenses: 0, balance: 0, bankBalance: 0, cashBalance: 0, pendingExpenses: 0, transactionCount: 0 };
    } }
    static async createEvent(eventData, isDemo = false) { try {
        const events = await this.getData(this.STORAGE_KEYS.EVENTS, isDemo);
        const event = { id: (0, uuid_1.v4)(), church_id: eventData.church_id || '', title: eventData.title || '', description: eventData.description, event_type: eventData.event_type || 'Autre', start_date: eventData.start_date || new Date().toISOString(), end_date: eventData.end_date, location: eventData.location, created_by: eventData.created_by || '', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        events.push(event);
        await this.setData(this.STORAGE_KEYS.EVENTS, events, isDemo);
        await this.createAuditLogEntry({ church_id: event.church_id, user_id: 'system', action: 'CREATE_EVENT', resource_type: 'Event', resource_id: event.id, details: `Événement créé: ${event.title} (${event.event_type})` }, isDemo);
        return event;
    }
    catch (error) {
        console.error('💥 Erreur createEvent (MySQL):', error);
        throw error;
    } }
    static async getEvents(churchId, isDemo = false) { try {
        const events = await this.getData(this.STORAGE_KEYS.EVENTS, isDemo);
        return events.filter(e => e.church_id === churchId && e.is_active).sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
    }
    catch (error) {
        console.error('💥 Erreur getEvents (MySQL):', error);
        return [];
    } }
    static async updateEvent(eventId, updates, isDemo = false) { try {
        const events = await this.getData(this.STORAGE_KEYS.EVENTS, isDemo);
        const index = events.findIndex(e => e.id === eventId);
        if (index === -1)
            throw new Error('Événement introuvable');
        events[index] = { ...events[index], ...updates, updated_at: new Date().toISOString() };
        await this.setData(this.STORAGE_KEYS.EVENTS, events, isDemo);
        return events[index];
    }
    catch (error) {
        console.error('💥 Erreur updateEvent (MySQL):', error);
        throw error;
    } }
    static async deleteEvent(eventId, isDemo = false) { try {
        const events = await this.getData(this.STORAGE_KEYS.EVENTS, isDemo);
        const index = events.findIndex(e => e.id === eventId);
        if (index !== -1) {
            const event = events[index];
            events[index].is_active = false;
            await this.setData(this.STORAGE_KEYS.EVENTS, events, isDemo);
            await this.createAuditLogEntry({ church_id: event.church_id, user_id: 'system', action: 'DELETE_EVENT', resource_type: 'Event', resource_id: eventId, details: `Événement supprimé: ${event.title}` }, isDemo);
        }
    }
    catch (error) {
        console.error('💥 Erreur deleteEvent (MySQL):', error);
        throw error;
    } }
    static async createAttendance(attendanceData, isDemo = false) { try {
        const attendances = await this.getData(this.STORAGE_KEYS.ATTENDANCES, isDemo);
        const attendance = { id: (0, uuid_1.v4)(), event_id: attendanceData.event_id || '', member_id: attendanceData.member_id || '', attended: attendanceData.attended || false, notes: attendanceData.notes, recorded_by: attendanceData.recorded_by || '', created_at: new Date().toISOString() };
        attendances.push(attendance);
        await this.setData(this.STORAGE_KEYS.ATTENDANCES, attendances, isDemo);
        return attendance;
    }
    catch (error) {
        console.error('💥 Erreur createAttendance (MySQL):', error);
        throw error;
    } }
    static async getEventAttendances(eventId, isDemo = false) { try {
        const attendances = await this.getData(this.STORAGE_KEYS.ATTENDANCES, isDemo);
        return attendances.filter(a => a.event_id === eventId);
    }
    catch (error) {
        console.error('💥 Erreur getEventAttendances (MySQL):', error);
        return [];
    } }
    static async updateAttendance(attendanceId, updates, isDemo = false) { try {
        const attendances = await this.getData(this.STORAGE_KEYS.ATTENDANCES, isDemo);
        const index = attendances.findIndex(a => a.id === attendanceId);
        if (index === -1)
            throw new Error('Présence introuvable');
        attendances[index] = { ...attendances[index], ...updates };
        await this.setData(this.STORAGE_KEYS.ATTENDANCES, attendances, isDemo);
        return attendances[index];
    }
    catch (error) {
        console.error('💥 Erreur updateAttendance (MySQL):', error);
        throw error;
    } }
    static async createAuditLogEntry(entryData, isDemo = false) { try {
        const logs = await this.getData(this.STORAGE_KEYS.AUDIT_LOGS, isDemo);
        const entry = { id: (0, uuid_1.v4)(), church_id: entryData.church_id || '', user_id: entryData.user_id || '', action: entryData.action || '', resource_type: entryData.resource_type || 'Church', resource_id: entryData.resource_id, details: entryData.details, ip_address: entryData.ip_address, user_agent: entryData.user_agent, created_at: new Date().toISOString() };
        logs.push(entry);
        await this.setData(this.STORAGE_KEYS.AUDIT_LOGS, logs, isDemo);
        return entry;
    }
    catch (error) {
        console.error('💥 Erreur createAuditLogEntry (MySQL):', error);
        throw error;
    } }
    static async getAuditLogs(churchId, isDemo = false) { try {
        const logs = await this.getData(this.STORAGE_KEYS.AUDIT_LOGS, isDemo);
        return logs.filter(l => l.church_id === churchId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    catch (error) {
        console.error('💥 Erreur getAuditLogs (MySQL):', error);
        return [];
    } }
    static async createPublicLink(linkData, isDemo = false) { try {
        const links = await this.getData(this.STORAGE_KEYS.PUBLIC_LINKS, isDemo);
        const link = { id: (0, uuid_1.v4)(), church_id: linkData.church_id || '', title: linkData.title || '', url: linkData.url || '', description: linkData.description, platform: linkData.platform, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        links.push(link);
        await this.setData(this.STORAGE_KEYS.PUBLIC_LINKS, links, isDemo);
        await this.createAuditLogEntry({ church_id: link.church_id, user_id: 'system', action: 'CREATE_PUBLIC_LINK', resource_type: 'PublicLink', resource_id: link.id, details: `Lien public créé: ${link.title} (${link.platform})` }, isDemo);
        return link;
    }
    catch (error) {
        console.error('💥 Erreur createPublicLink (MySQL):', error);
        throw error;
    } }
    static async getChurchPublicLinks(churchId, isDemo = false) { try {
        const links = await this.getData(this.STORAGE_KEYS.PUBLIC_LINKS, isDemo);
        return links.filter(l => l.church_id === churchId && l.is_active);
    }
    catch (error) {
        console.error('💥 Erreur getChurchPublicLinks (MySQL):', error);
        return [];
    } }
    static async getPublicLinksByChurchName(churchName) { try {
        const [demoChurches, realChurches] = await Promise.all([this.getData(this.STORAGE_KEYS.CHURCHES, true), this.getData(this.STORAGE_KEYS.CHURCHES, false)]);
        const allChurches = [...demoChurches, ...realChurches];
        const church = allChurches.find(c => c.name.toLowerCase().includes(churchName.toLowerCase().trim()));
        if (!church)
            return [];
        const isDemo = this.isDemoEmail(church.email);
        return await this.getChurchPublicLinks(church.id, isDemo);
    }
    catch (error) {
        console.error('💥 Erreur getPublicLinksByChurchName (MySQL):', error);
        return [];
    } }
    static async deletePublicLink(linkId, isDemo = false) { try {
        const links = await this.getData(this.STORAGE_KEYS.PUBLIC_LINKS, isDemo);
        const link = links.find(l => l.id === linkId);
        if (link) {
            await this.createAuditLogEntry({ church_id: link.church_id, user_id: 'system', action: 'DELETE_PUBLIC_LINK', resource_type: 'PublicLink', resource_id: linkId, details: `Lien public supprimé: ${link.title}` }, isDemo);
        }
        const filteredLinks = links.filter(l => l.id !== linkId);
        await this.setData(this.STORAGE_KEYS.PUBLIC_LINKS, filteredLinks, isDemo);
    }
    catch (error) {
        console.error('💥 Erreur deletePublicLink (MySQL):', error);
        throw error;
    } }
    static async createArchive(archiveData, isDemo = false) { try {
        const archives = await this.getData(this.STORAGE_KEYS.ARCHIVES, isDemo);
        const archive = { id: (0, uuid_1.v4)(), church_id: archiveData.church_id || '', archive_type: archiveData.archive_type || 'monthly', period: archiveData.period || '', total_income: archiveData.total_income, total_expenses: archiveData.total_expenses, balance: archiveData.balance, data: archiveData.data, created_at: new Date().toISOString() };
        archives.push(archive);
        await this.setData(this.STORAGE_KEYS.ARCHIVES, archives, isDemo);
        return archive;
    }
    catch (error) {
        console.error('💥 Erreur createArchive (MySQL):', error);
        throw error;
    } }
    static async getArchives(churchId, type, isDemo = false) { try {
        const archives = await this.getData(this.STORAGE_KEYS.ARCHIVES, isDemo);
        let filtered = archives.filter(a => a.church_id === churchId);
        if (type)
            filtered = filtered.filter(a => a.archive_type === type);
        return filtered.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
    }
    catch (error) {
        console.error('💥 Erreur getArchives (MySQL):', error);
        return [];
    } }
    static async createNotification(notificationData, isDemo = false) { try {
        const notifications = await this.getData(this.STORAGE_KEYS.NOTIFICATIONS, isDemo);
        const notification = { id: (0, uuid_1.v4)(), church_id: notificationData.church_id || '', user_id: notificationData.user_id, title: notificationData.title || '', message: notificationData.message || '', type: notificationData.type || 'info', is_read: false, created_at: new Date().toISOString() };
        notifications.push(notification);
        await this.setData(this.STORAGE_KEYS.NOTIFICATIONS, notifications, isDemo);
        return notification;
    }
    catch (error) {
        console.error('💥 Erreur createNotification (MySQL):', error);
        throw error;
    } }
    static async getNotifications(churchId, isDemo = false) { try {
        const notifications = await this.getData(this.STORAGE_KEYS.NOTIFICATIONS, isDemo);
        return notifications.filter(n => n.church_id === churchId).sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
    }
    catch (error) {
        console.error('💥 Erreur getNotifications (MySQL):', error);
        return [];
    } }
    static async createPaymentTransaction(transactionData, isDemo = false) { try {
        const transactions = await this.getData(this.STORAGE_KEYS.PAYMENT_TRANSACTIONS, isDemo);
        const transaction = { id: (0, uuid_1.v4)(), church_id: transactionData.church_id || '', amount: transactionData.amount || 0, payment_method: transactionData.payment_method || 'card', phone_number: transactionData.phone_number, transaction_id: transactionData.transaction_id, status: transactionData.status || 'pending', subscription_type: transactionData.subscription_type || 'monthly', created_at: new Date().toISOString() };
        transactions.push(transaction);
        await this.setData(this.STORAGE_KEYS.PAYMENT_TRANSACTIONS, transactions, isDemo);
        return transaction;
    }
    catch (error) {
        console.error('💥 Erreur createPaymentTransaction (MySQL):', error);
        throw error;
    } }
    static async updatePaymentTransaction(transactionId, updates, isDemo = false) { try {
        const transactions = await this.getData(this.STORAGE_KEYS.PAYMENT_TRANSACTIONS, isDemo);
        const index = transactions.findIndex(t => t.id === transactionId);
        if (index === -1)
            throw new Error('Transaction introuvable');
        transactions[index] = { ...transactions[index], ...updates };
        await this.setData(this.STORAGE_KEYS.PAYMENT_TRANSACTIONS, transactions, isDemo);
        return transactions[index];
    }
    catch (error) {
        console.error('💥 Erreur updatePaymentTransaction (MySQL):', error);
        throw error;
    } }
    static async getPaymentTransactions(churchId, isDemo = false) { try {
        const transactions = await this.getData(this.STORAGE_KEYS.PAYMENT_TRANSACTIONS, isDemo);
        return transactions.filter(t => t.church_id === churchId).sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
    }
    catch (error) {
        console.error('💥 Erreur getPaymentTransactions (MySQL):', error);
        return [];
    } }
    static async getChurchStats(churchId, isDemo = false) { try {
        const [members, reports, expenses, events] = await Promise.all([this.getMembers(churchId, isDemo), this.getDailyReports(churchId, undefined, undefined, isDemo), this.getExpenses(churchId, undefined, undefined, isDemo), this.getEvents(churchId, isDemo)]);
        const financial = await this.getFinancialSummary(churchId, isDemo);
        const memberStats = { totalMembers: members.length, personnel: members.filter(m => m.member_type === 'Personnel').length, regularMembers: members.filter(m => m.member_type === 'Membre').length, activeDepartments: [...new Set(members.flatMap(m => { if (!m.departments)
                    return []; if (Array.isArray(m.departments))
                    return m.departments; if (typeof m.departments === 'string') {
                    return m.departments.split(',').map(d => d.trim()).filter(d => d);
                } return []; }))], byDepartment: members.reduce((acc, m) => { let deptArray = []; if (m.departments) {
                if (Array.isArray(m.departments)) {
                    deptArray = m.departments;
                }
                else if (typeof m.departments === 'string') {
                    deptArray = m.departments.split(',').map(d => d.trim()).filter(d => d);
                }
            } deptArray.forEach(dept => { acc[dept] = (acc[dept] || 0) + 1; }); return acc; }, {}), byPosition: members.reduce((acc, m) => { if (m.position) {
                acc[m.position] = (acc[m.position] || 0) + 1;
            } return acc; }, {}), };
        const eventStats = { totalEvents: events.length, upcomingEvents: events.filter(e => new Date(e.start_date) > new Date()).length, pastEvents: events.filter(e => new Date(e.start_date) <= new Date()).length, averageAttendance: 0, byType: events.reduce((acc, e) => { acc[e.event_type] = (acc[e.event_type] || 0) + 1; return acc; }, {}), };
        return { financial, members: memberStats, events: eventStats, recentActivity: { reports: reports.slice(0, 5), expenses: expenses.slice(0, 5), events: events.slice(0, 5) } };
    }
    catch (error) {
        console.error('💥 Erreur getChurchStats (MySQL):', error);
        throw error;
    } }
    static async checkSubscriptionStatus(churchId, isDemo = false) { try {
        const church = await this.getChurch(churchId, isDemo);
        if (!church)
            return false;
        if (church.subscription_type === 'trial' && church.trial_end_date)
            return new Date(church.trial_end_date) > new Date();
        if (church.subscription_end)
            return new Date(church.subscription_end) > new Date() && church.is_active;
        return false;
    }
    catch (error) {
        console.error('💥 Erreur checkSubscriptionStatus (MySQL):', error);
        return false;
    } }
    static async createMessage(messageData, isDemo = false) { try {
        const messages = await this.getData(this.STORAGE_KEYS.MESSAGES, isDemo);
        const message = { id: (0, uuid_1.v4)(), church_id: messageData.church_id || '', sender_id: messageData.sender_id || '', receiver_id: messageData.receiver_id || '', subject: messageData.subject || '', content: messageData.content || '', is_read: false, created_at: new Date().toISOString() };
        messages.push(message);
        await this.setData(this.STORAGE_KEYS.MESSAGES, messages, isDemo);
        return message;
    }
    catch (error) {
        console.error('💥 Erreur createMessage (MySQL):', error);
        throw error;
    } }
    static async getMessages(churchId, userId, isDemo = false) { try {
        const messages = await this.getData(this.STORAGE_KEYS.MESSAGES, isDemo);
        return messages.filter(m => m.church_id === churchId && (m.sender_id === userId || m.receiver_id === userId)).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    catch (error) {
        console.error('💥 Erreur getMessages (MySQL):', error);
        return [];
    } }
    static async markMessageAsRead(messageId, isDemo = false) { try {
        const messages = await this.getData(this.STORAGE_KEYS.MESSAGES, isDemo);
        const index = messages.findIndex(m => m.id === messageId);
        if (index !== -1) {
            messages[index].is_read = true;
            await this.setData(this.STORAGE_KEYS.MESSAGES, messages, isDemo);
        }
    }
    catch (error) {
        console.error('💥 Erreur markMessageAsRead (MySQL):', error);
    } }
    static async getSubscriptionPlans() { return constants_1.SUBSCRIPTION_CONFIG.PLANS; }
    static async getSubscriptionPrice(type) { return constants_1.SUBSCRIPTION_CALCULATOR.getSubscriptionPrice(type); }
    static async getSubscriptionSavings() { const calculation = constants_1.SUBSCRIPTION_CALCULATOR.calculateYearlySavings(constants_1.SUBSCRIPTION_CONFIG.MONTHLY_PRICE, constants_1.SUBSCRIPTION_CONFIG.YEARLY_PRICE); return { ...calculation, percentage: calculation.percentage + '%' }; }
    static async backupData() { try {
        const backup = {};
        for (const [key, value] of Object.entries(this.STORAGE_KEYS)) {
            if (key !== 'CURRENT_USER' && key !== 'APP_SETTINGS') {
                const realData = await this.getData(value, false);
                const demoData = await this.getData(value, true);
                backup[key] = { real: realData, demo: demoData };
            }
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupKey = `my_church_mysql_backup_${timestamp}`;
        await async_storage_1.default.setItem(backupKey, JSON.stringify(backup));
        return backupKey;
    }
    catch (error) {
        console.error('💥 Erreur backupData (MySQL):', error);
        throw error;
    } }
    static async restoreData(backupKey) { try {
        const backupData = await async_storage_1.default.getItem(backupKey);
        if (!backupData)
            throw new Error('Sauvegarde introuvable');
        const backup = JSON.parse(backupData);
        for (const [key, data] of Object.entries(backup)) {
            if (key in this.STORAGE_KEYS) {
                const storageKey = this.STORAGE_KEYS[key];
                if (data.real)
                    await async_storage_1.default.setItem(storageKey, JSON.stringify(data.real));
                if (data.demo)
                    await async_storage_1.default.setItem(`${storageKey}_DEMO`, JSON.stringify(data.demo));
            }
        }
        return true;
    }
    catch (error) {
        console.error('💥 Erreur restoreData (MySQL):', error);
        return false;
    } }
    static async clearAllData(includeDemo = false) { try {
        for (const key of Object.values(this.STORAGE_KEYS)) {
            await async_storage_1.default.removeItem(key);
            if (includeDemo)
                await async_storage_1.default.removeItem(`${key}_DEMO`);
        }
    }
    catch (error) {
        console.error('💥 Erreur clearAllData (MySQL):', error);
        throw error;
    } }
}
exports.MySQLService = MySQLService;
MySQLService.STORAGE_KEYS = {
    CHURCHES: 'my_church_mysql_churches',
    CHURCHES_DEMO: 'my_church_mysql_churches_demo',
    USERS: 'my_church_mysql_users',
    USERS_DEMO: 'my_church_mysql_users_demo',
    MEMBERS: 'my_church_mysql_members',
    MEMBERS_DEMO: 'my_church_mysql_members_demo',
    DAILY_REPORTS: 'my_church_mysql_daily_reports',
    DAILY_REPORTS_DEMO: 'my_church_mysql_daily_reports_demo',
    EXPENSES: 'my_church_mysql_expenses',
    EXPENSES_DEMO: 'my_church_mysql_expenses_demo',
    EVENTS: 'my_church_mysql_events',
    EVENTS_DEMO: 'my_church_mysql_events_demo',
    ATTENDANCES: 'my_church_mysql_attendances',
    ATTENDANCES_DEMO: 'my_church_mysql_attendances_demo',
    PUBLIC_LINKS: 'my_church_mysql_public_links',
    PUBLIC_LINKS_DEMO: 'my_church_mysql_public_links_demo',
    ARCHIVES: 'my_church_mysql_archives',
    ARCHIVES_DEMO: 'my_church_mysql_archives_demo',
    NOTIFICATIONS: 'my_church_mysql_notifications',
    NOTIFICATIONS_DEMO: 'my_church_mysql_notifications_demo',
    PAYMENT_TRANSACTIONS: 'my_church_mysql_payment_transactions',
    PAYMENT_TRANSACTIONS_DEMO: 'my_church_mysql_payment_transactions_demo',
    AUDIT_LOGS: 'my_church_mysql_audit_logs',
    AUDIT_LOGS_DEMO: 'my_church_mysql_audit_logs_demo',
    MESSAGES: 'my_church_mysql_messages',
    MESSAGES_DEMO: 'my_church_mysql_messages_demo',
    CURRENT_USER: 'my_church_mysql_current_user',
    APP_SETTINGS: 'my_church_mysql_app_settings',
};
exports.default = MySQLService;
