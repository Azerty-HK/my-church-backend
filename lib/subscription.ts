import 'react-native-get-random-values';
import { DatabaseService } from './database';
import type { Church, PaymentTransaction } from '../types/database';

export interface SubscriptionPlan {
  type: 'trial' | 'monthly' | 'yearly';
  name: string;
  price: number;
  duration: string;
  features: string[];
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'mobile' | 'bank';
  icon: string;
  description: string;
  currency: string;
}

export class SubscriptionService {
  static readonly PLANS: SubscriptionPlan[] = [
    {
      type: 'trial',
      name: 'Essai gratuit',
      price: 0,
      duration: '30 jours',
      features: [
        'Gestion complète des membres',
        'Suivi financier caisse + banque',
        'Rapports automatiques',
        'QR Codes pour membres',
        'Support par email'
      ]
    },
    {
      type: 'monthly',
      name: 'Abonnement mensuel',
      price: 100,
      duration: '1 mois',
      features: [
        'Toutes les fonctionnalités',
        'Rapports avancés illimités',
        'Archives automatiques',
        'Support prioritaire 24/7',
        'Liens publics illimités',
        'API Key personnalisée'
      ]
    },
    {
      type: 'yearly',
      name: 'Abonnement annuel',
      price: 1000,
      duration: '1 an',
      features: [
        'Toutes les fonctionnalités',
        'Rapports avancés illimités',
        'Archives automatiques',
        'Support prioritaire 24/7',
        'Liens publics illimités',
        'API Key personnalisée',
        '💰 Économie de 200$ par an'
      ]
    }
  ];

  static readonly PAYMENT_METHODS: PaymentMethod[] = [
    {
      id: 'mpesa',
      name: 'M-Pesa',
      type: 'mobile',
      icon: '📱',
      description: 'Paiement mobile M-Pesa sécurisé',
      currency: 'USD'
    },
    {
      id: 'orange_money',
      name: 'Orange Money',
      type: 'mobile',
      icon: '🟠',
      description: 'Paiement mobile Orange Money',
      currency: 'FC'
    },
    {
      id: 'airtel_money',
      name: 'Airtel Money',
      type: 'mobile',
      icon: '🔴',
      description: 'Paiement mobile Airtel Money',
      currency: 'USD'
    },
    {
      id: 'afrimoney',
      name: 'Afrimoney',
      type: 'mobile',
      icon: '💚',
      description: 'Paiement mobile Afrimoney',
      currency: 'FC'
    },
    {
      id: 'bank',
      name: 'Virement bancaire',
      type: 'bank',
      icon: '🏦',
      description: 'Virement bancaire sécurisé',
      currency: 'USD'
    }
  ];

  static async checkAccess(churchId: string): Promise<boolean> {
    try {
      return await DatabaseService.checkSubscriptionStatus(churchId);
    } catch (error) {
      return false;
    }
  }

  static async processPayment(
    churchId: string, 
    amount: number, 
    paymentMethod: string, 
    phoneNumber?: string
  ): Promise<PaymentTransaction> {
    try {
      console.log('💳 Début paiement My Church:', { amount, paymentMethod, phoneNumber });
      
      // Créer la transaction
      const transaction = await DatabaseService.createPaymentTransaction({
        church_id: churchId,
        amount,
        payment_method: paymentMethod as any,
        phone_number: phoneNumber,
        subscription_type: amount === 30 ? 'monthly' : 'yearly',
        status: 'pending'
      });

      // Simuler le processus de paiement à 100%
      await this.simulateRealisticPayment(transaction);

      console.log('✅ Paiement My Church traité avec succès');
      return transaction;
    } catch (error: any) {
      console.error('💥 Erreur processPayment:', error);
      throw error;
    }
  }

  private static async simulateRealisticPayment(transaction: PaymentTransaction): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('🔄 Simulation paiement réaliste My Church...');
        
        const steps = [
          { message: 'Validation des informations...', delay: 1000 },
          { message: 'Connexion au fournisseur de paiement...', delay: 1500 },
          { message: 'Traitement de la transaction...', delay: 2000 },
          { message: 'Confirmation du paiement...', delay: 1000 },
        ];

        for (const step of steps) {
          console.log('📱', step.message);
          await new Promise(resolve => setTimeout(resolve, step.delay));
        }
        
        await DatabaseService.updatePaymentTransaction(transaction.id, {
          status: 'completed',
          transaction_id: `${transaction.payment_method.toUpperCase()}_${Date.now()}_SUCCESS`
        });
        
        console.log('✅ Paiement simulé avec succès - My Church by Henock Aduma');
        resolve();
      } catch (error) {
        console.error('💥 Erreur simulation:', error);
        reject(error);
      }
    });
  }

  static async renewSubscription(churchId: string, type: 'monthly' | 'yearly'): Promise<Church> {
    try {
      console.log('🔄 Renouvellement abonnement My Church:', type);
      
      const now = new Date();
      const endDate = new Date();
      
      if (type === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      const updates = {
        subscription_type: type,
        subscription_start: now.toISOString(),
        subscription_end: endDate.toISOString(),
        is_active: true
      };

      const updatedChurch = await DatabaseService.updateChurch(churchId, updates);
      
      // Créer notification de succès
      await DatabaseService.createNotification({
        church_id: churchId,
        title: '🎉 Abonnement activé!',
        message: `Votre abonnement ${type === 'monthly' ? 'mensuel' : 'annuel'} My Church a été activé avec succès. Merci de votre confiance!`,
        type: 'success'
      });
      
      console.log('✅ Abonnement My Church renouvelé - Created by Henock Aduma');
      return updatedChurch;
    } catch (error: any) {
      console.error('💥 Erreur renewSubscription:', error);
      throw error;
    }
  }

  static getSubscriptionPrice(type: 'monthly' | 'yearly'): number {
    const plan = this.PLANS.find(p => p.type === type);
    return plan?.price || 0;
  }

  static getRemainingDays(endDate: string): number {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  static getSubscriptionStatus(church: Church): {
    isActive: boolean;
    type: string;
    daysRemaining: number;
    message: string;
    isExpired: boolean;
  } {
    if (!church) {
      return {
        isActive: false,
        type: 'none',
        daysRemaining: 0,
        message: 'Aucune église',
        isExpired: true
      };
    }

    if (church.subscription_type === 'trial' && church.trial_end) {
      const daysRemaining = this.getRemainingDays(church.trial_end);
      const isActive = daysRemaining > 0;
      return {
        isActive,
        type: 'trial',
        daysRemaining: Math.max(0, daysRemaining),
        message: isActive 
          ? `🎁 Essai gratuit (${daysRemaining} jours restants)`
          : '⚠️ Essai gratuit expiré',
        isExpired: !isActive
      };
    }

    if (church.subscription_end) {
      const daysRemaining = this.getRemainingDays(church.subscription_end);
      const typeName = church.subscription_type === 'monthly' ? 'Mensuel' : 'Annuel';
      const isActive = daysRemaining > 0 && church.is_active;
      return {
        isActive,
        type: church.subscription_type || 'none',
        daysRemaining: Math.max(0, daysRemaining),
        message: isActive 
          ? `✅ ${typeName} (${daysRemaining} jours restants)`
          : `❌ ${typeName} expiré`,
        isExpired: !isActive
      };
    }

    return {
      isActive: false,
      type: 'none',
      daysRemaining: 0,
      message: '❌ Aucun abonnement actif',
      isExpired: true
    };
  }
}