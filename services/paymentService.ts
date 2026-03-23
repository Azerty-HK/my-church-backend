import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { PostgreSQLService } from '../lib/postgresql';
import type { PaymentMethod } from '../types/database';

// Types pour le service de paiement
export interface PaymentRequest {
  amount: number;
  currency: string;
  phoneNumber?: string;
  paymentMethod: string;
  reference: string;
  description: string;
  cardDetails?: {
    cardNumber: string;
    cardHolderName: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    cardType: string;
  };
}

export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  message: string;
  amount: number;
  currency: string;
  reference: string;
  timestamp: string;
}

export interface BankTransferInfo {
  bankName: string;
  accountNumber: string;
  accountName: string;
  swiftCode: string;
  iban: string;
  currency: string;
}

export interface PaymentMethodInfo {
  name: string;
  fees: string;
  processingTime: string;
  description: string;
}

// Codes de sécurité et clés de cryptage
export const PAYMENT_SECURITY_CODES = {
  VALIDATION_CODE: 'MC2024HA', // Code de validation standard
  SECURITY_TOKEN: 'TOKEN_MC_HA_2024', // Token de sécurité
  API_KEY_PREFIX: 'API_',
  ENCRYPTION_KEY: 'MC_ENCRYPT_2024_HENOCK_ADUMA',
};

export const PAYMENT_ENCRYPTION_KEYS = {
  AES_256: 'AES-256-GCM-MC-2024-HA',
  RSA_PUBLIC: 'MC_RSA_PUB_2024',
  RSA_PRIVATE: 'MC_RSA_PRIV_2024',
};

export class PaymentService {
  // Informations sur les banques pour virement
  private static readonly BANK_INFO = {
    USD: {
      bankName: 'Standard Chartered Bank RDC',
      accountNumber: '123456789012',
      accountName: 'MY CHURCH MINISTRY LTD',
      swiftCode: 'SCBLRDCK',
      iban: 'CD1234567890123456789012',
      currency: 'USD',
    },
    FC: {
      bankName: 'Rawbank RDC',
      accountNumber: '987654321098',
      accountName: 'MY CHURCH MINISTRY CONGOLAISE',
      swiftCode: 'RAWBCDKI',
      iban: 'CD9876543210987654321098',
      currency: 'FC',
    },
    EUR: {
      bankName: 'Equity Bank Congo',
      accountNumber: '543210987654',
      accountName: 'MY CHURCH EUROPE SARL',
      swiftCode: 'EQTYCDCK',
      iban: 'CD5432109876543210987654',
      currency: 'EUR',
    },
  };

  // Informations sur les méthodes de paiement
  private static readonly METHOD_INFO: Record<string, PaymentMethodInfo> = {
    mobile: {
      name: 'Mobile Money',
      fees: '1% (max 500 FC)',
      processingTime: 'Immédiat',
      description: 'Paiement via M-Pesa, Airtel Money, Orange Money',
    },
    visa: {
      name: 'Carte VISA',
      fees: '2.5%',
      processingTime: '2-3 jours',
      description: 'Carte de crédit/débit VISA',
    },
    mastercard: {
      name: 'Carte MasterCard',
      fees: '2.5%',
      processingTime: '2-3 jours',
      description: 'Carte de crédit/débit MasterCard',
    },
    google_pay: {
      name: 'Google Pay',
      fees: '1.5%',
      processingTime: 'Immédiat',
      description: 'Paiement via Google Pay',
    },
    transfer: {
      name: 'Virement Bancaire',
      fees: '0.5%',
      processingTime: '3-5 jours',
      description: 'Virement bancaire local ou international',
    },
  };

  // Validation des cartes
  static isValidVisaCard(cardNumber: string): boolean {
    const cleaned = cardNumber.replace(/\s/g, '');
    return /^4[0-9]{12}(?:[0-9]{3})?$/.test(cleaned);
  }

  static isValidMasterCard(cardNumber: string): boolean {
    const cleaned = cardNumber.replace(/\s/g, '');
    return /^5[1-5][0-9]{14}$/.test(cleaned);
  }

  // Générer une référence de virement
  static generateBankTransferReference(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `MC_REF_${timestamp}_${random}`;
  }

  // Obtenir les informations bancaires
  static getBankTransferInfo(currency: 'USD' | 'FC' | 'EUR' = 'USD'): BankTransferInfo {
    return this.BANK_INFO[currency];
  }

  // Obtenir les informations sur la méthode de paiement
  static getPaymentMethodInfo(method: string): PaymentMethodInfo {
    return this.METHOD_INFO[method] || {
      name: 'Méthode inconnue',
      fees: 'N/A',
      processingTime: 'N/A',
      description: 'Méthode non reconnue',
    };
  }

  // Valider une méthode de paiement
  static async validatePaymentMethod(
    method: string,
    phoneNumber?: string,
    cardDetails?: any
  ): Promise<{ valid: boolean; message: string }> {
    try {
      switch (method) {
        case 'mobile':
          if (!phoneNumber || phoneNumber.length < 9) {
            return {
              valid: false,
              message: 'Numéro de téléphone invalide',
            };
          }
          break;

        case 'visa':
        case 'mastercard':
          if (!cardDetails) {
            return {
              valid: false,
              message: 'Détails de carte manquants',
            };
          }

          const expiryDate = new Date(
            parseInt(`20${cardDetails.expiryYear}`),
            parseInt(cardDetails.expiryMonth) - 1
          );

          if (expiryDate < new Date()) {
            return {
              valid: false,
              message: 'Carte expirée',
            };
          }
          break;

        case 'google_pay':
          // Validation basique pour Google Pay
          return {
            valid: true,
            message: 'Google Pay validé',
          };

        case 'transfer':
          // Toujours valide pour virement
          return {
            valid: true,
            message: 'Virement validé',
          };

        default:
          return {
            valid: false,
            message: 'Méthode de paiement non supportée',
          };
      }

      return {
        valid: true,
        message: 'Méthode validée avec succès',
      };
    } catch (error) {
      console.error('Erreur validation méthode:', error);
      return {
        valid: false,
        message: 'Erreur de validation',
      };
    }
  }

  // Traiter un paiement (intégration avec PostgreSQL)
  static async processPayment(
    paymentRequest: PaymentRequest,
    churchId?: string,
    subscriptionType?: 'monthly' | 'yearly'
  ): Promise<PaymentResponse> {
    try {
      console.log('💰 Traitement paiement:', paymentRequest);

      // Générer un ID de transaction
      const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

      // Simuler le traitement
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Vérifications de sécurité
      if (!this.validatePaymentAmount(paymentRequest.amount)) {
        throw new Error('Montant de paiement invalide');
      }

      // Si c'est un abonnement, traiter avec PostgreSQL
      if (churchId && subscriptionType) {
        console.log('🔐 Traitement abonnement pour église:', churchId);

        try {
          // Traiter le paiement d'abonnement via PostgreSQL
          const result = await PostgreSQLService.processSubscriptionPayment(
            churchId,
            subscriptionType,
            transactionId,
            new Date().toISOString()
          );

          if (!result.success) {
            throw new Error(`Échec traitement abonnement: ${result.message}`);
          }

          console.log('✅ Abonnement traité avec succès:', result);
        } catch (error) {
          console.error('❌ Erreur traitement abonnement PostgreSQL:', error);
          throw error;
        }
      }

      // Si c'est un paiement simple, créer une transaction
      if (churchId && !subscriptionType) {
        try {
          await PostgreSQLService.createPaymentTransaction({
            church_id: churchId,
            amount: paymentRequest.amount,
            payment_method: paymentRequest.paymentMethod as PaymentMethod,
            transaction_id: transactionId,
            status: 'paid',
            subscription_type: 'donation',
          });
        } catch (error) {
          console.error('❌ Erreur création transaction:', error);
          // Ne pas bloquer le paiement pour cette erreur
        }
      }

      return {
        success: true,
        transactionId,
        message: 'Paiement traité avec succès',
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        reference: paymentRequest.reference,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('❌ Erreur processPayment:', error);
      return {
        success: false,
        transactionId: '',
        message: error.message || 'Le paiement a échoué',
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        reference: paymentRequest.reference,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Valider le montant du paiement
  private static validatePaymentAmount(amount: number): boolean {
    return amount > 0 && amount <= 1000000; // Limite de 1,000,000
  }

  // Vérifier le statut d'une transaction
  static async checkTransactionStatus(transactionId: string): Promise<{
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    message: string;
    details?: any;
  }> {
    try {
      // Simulation - en production, interroger la passerelle de paiement
      await new Promise(resolve => setTimeout(resolve, 500));

      // Par défaut, on considère que les paiements sont réussis
      return {
        status: 'paid',
        message: 'Transaction confirmée',
        details: {
          transactionId,
          confirmedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Erreur vérification transaction:', error);
      return {
        status: 'failed',
        message: 'Impossible de vérifier le statut',
      };
    }
  }

  // Rembourser un paiement
  static async refundPayment(
    transactionId: string,
    amount?: number
  ): Promise<{ success: boolean; message: string; refundId?: string }> {
    try {
      console.log('🔄 Tentative de remboursement:', transactionId);

      // Simulation de remboursement
      await new Promise(resolve => setTimeout(resolve, 2000));

      const refundId = `REF_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      return {
        success: true,
        message: 'Remboursement initié avec succès',
        refundId,
      };
    } catch (error: any) {
      console.error('❌ Erreur remboursement:', error);
      return {
        success: false,
        message: error.message || 'Le remboursement a échoué',
      };
    }
  }

  // Générer un reçu
  static generateReceipt(transaction: {
    id: string;
    amount: number;
    currency: string;
    method: string;
    date: string;
    description: string;
  }): string {
    return `
      🧾 RECU DE PAIEMENT MY CHURCH
      ================================
      📄 Référence: ${transaction.id}
      💰 Montant: ${transaction.amount.toLocaleString()} ${transaction.currency}
      💳 Méthode: ${transaction.method}
      📅 Date: ${new Date(transaction.date).toLocaleDateString('fr-FR')}
      📝 Description: ${transaction.description}
      ================================
      🔐 Transaction sécurisée
      🤝 Merci pour votre contribution!
      ================================
      My Church - Created by Henock Aduma
    `;
  }

  // Obtenir l'historique des paiements d'une église
  static async getChurchPaymentHistory(
    churchId: string,
    startDate?: string,
    endDate?: string
  ): Promise<any[]> {
    try {
      return await PostgreSQLService.getPaymentTransactions(churchId);
    } catch (error) {
      console.error('❌ Erreur récupération historique:', error);
      return [];
    }
  }

  // Vérifier les frais pour une méthode de paiement
  static calculateFees(
    amount: number,
    method: string,
    currency: string = 'USD'
  ): {
    amount: number;
    fees: number;
    total: number;
    feePercentage: string;
  } {
    const methodInfo = this.METHOD_INFO[method];
    let feePercentage = 0;

    switch (method) {
      case 'mobile':
        feePercentage = 0.01; // 1%
        break;
      case 'visa':
      case 'mastercard':
        feePercentage = 0.025; // 2.5%
        break;
      case 'google_pay':
        feePercentage = 0.015; // 1.5%
        break;
      case 'transfer':
        feePercentage = 0.005; // 0.5%
        break;
      default:
        feePercentage = 0.02; // 2% par défaut
    }

    let fees = amount * feePercentage;

    // Limiter les frais pour Mobile Money
    if (method === 'mobile' && currency === 'FC' && fees > 500) {
      fees = 500;
    }

    const total = amount + fees;

    return {
      amount,
      fees: Math.round(fees * 100) / 100,
      total: Math.round(total * 100) / 100,
      feePercentage: `${(feePercentage * 100).toFixed(1)}%`,
    };
  }

  // Encrypter les données sensibles (simulation)
  static encryptSensitiveData(data: string): string {
    // En production, utiliser une vraie encryption
    const encrypted = btoa(encodeURIComponent(data + PAYMENT_SECURITY_CODES.ENCRYPTION_KEY));
    return `ENC_${encrypted}`;
  }

  // Décrypter les données sensibles (simulation)
  static decryptSensitiveData(encryptedData: string): string {
    try {
      if (!encryptedData.startsWith('ENC_')) {
        return encryptedData;
      }
      const data = encryptedData.substring(4);
      const decrypted = decodeURIComponent(atob(data));
      return decrypted.replace(PAYMENT_SECURITY_CODES.ENCRYPTION_KEY, '');
    } catch (error) {
      console.error('❌ Erreur décryptage:', error);
      return '';
    }
  }

  // Vérifier la validité du code de sécurité
  static validateSecurityCode(code: string): boolean {
    return code === PAYMENT_SECURITY_CODES.VALIDATION_CODE;
  }

  // Générer un token d'API pour le paiement
  static generateApiToken(method: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `${PAYMENT_SECURITY_CODES.API_KEY_PREFIX}${method.toUpperCase()}_${timestamp}_${random}`;
  }
}

// Export des services
export const PaymentServices = {
  PaymentService,
};

console.log('💰 Service de paiement My Church initialisé - Intégration PostgreSQL active');
console.log('🔐 Codes sécurité:', Object.keys(PAYMENT_SECURITY_CODES).length, 'codes configurés');