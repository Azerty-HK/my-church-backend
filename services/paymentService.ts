import 'react-native-get-random-values';

// API Keys réservées pour My Church - Created by Henock Aduma
export const PAYMENT_API_KEYS = {
  // Mobile Money APIs
  MPESA: {
    apiKey: 'MPESA_MC_2024_HENOCK_ADUMA_PROD_KEY',
    secretKey: 'MPESA_MC_SECRET_2024_HENOCK_ADUMA',
    shortCode: '174379',
    passKey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
    endpoint: 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
  },
  
  ORANGE_MONEY: {
    apiKey: 'ORANGE_MC_2024_HENOCK_ADUMA_PROD_KEY',
    secretKey: 'ORANGE_MC_SECRET_2024_HENOCK_ADUMA',
    merchantCode: 'MC_ORANGE_2024',
    endpoint: 'https://api.orange.com/orange-money-webpay/dev/v1/webpayment'
  },
  
  AIRTEL_MONEY: {
    apiKey: 'AIRTEL_MC_2024_HENOCK_ADUMA_PROD_KEY',
    secretKey: 'AIRTEL_MC_SECRET_2024_HENOCK_ADUMA',
    merchantId: 'MC_AIRTEL_2024',
    endpoint: 'https://openapiuat.airtel.africa/merchant/v1/payments/'
  },
  
  AFRIMONEY: {
    apiKey: 'AFRI_MC_2024_HENOCK_ADUMA_PROD_KEY',
    secretKey: 'AFRI_MC_SECRET_2024_HENOCK_ADUMA',
    merchantCode: 'MC_AFRI_2024',
    endpoint: 'https://api.afrimoney.com/v1/payments'
  },
  
  // Banking APIs
  BANK_TRANSFER: {
    apiKey: 'BANK_MC_2024_HENOCK_ADUMA_PROD_KEY',
    secretKey: 'BANK_MC_SECRET_2024_HENOCK_ADUMA',
    bankCode: 'MC_BANK_2024',
    endpoint: 'https://api.banking.cd/v1/transfers'
  }
};

export interface PaymentRequest {
  amount: number;
  currency: string;
  phoneNumber?: string;
  paymentMethod: string;
  reference: string;
  description: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  message: string;
  reference: string;
  amount: number;
  fees?: number;
}

export class PaymentService {
  static async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      console.log('💳 Traitement paiement My Church:', request);
      
      // Validation des données
      if (request.amount <= 0) {
        throw new Error('Montant invalide');
      }
      
      if (!request.paymentMethod) {
        throw new Error('Méthode de paiement requise');
      }

      // Sélectionner l'API appropriée
      const apiConfig = this.getPaymentApiConfig(request.paymentMethod);
      
      // Simulation du processus de paiement
      const response = await this.simulatePaymentProcess(request, apiConfig);
      
      console.log('✅ Paiement My Church traité avec succès:', response);
      return response;
    } catch (error: any) {
      console.error('❌ Erreur paiement My Church:', error);
      throw error;
    }
  }

  private static getPaymentApiConfig(paymentMethod: string): any {
    switch (paymentMethod.toLowerCase()) {
      case 'mpesa':
        return PAYMENT_API_KEYS.MPESA;
      case 'orange_money':
        return PAYMENT_API_KEYS.ORANGE_MONEY;
      case 'airtel_money':
        return PAYMENT_API_KEYS.AIRTEL_MONEY;
      case 'afrimoney':
        return PAYMENT_API_KEYS.AFRIMONEY;
      case 'bank':
        return PAYMENT_API_KEYS.BANK_TRANSFER;
      default:
        throw new Error('Méthode de paiement non supportée');
    }
  }

  private static async simulatePaymentProcess(
    request: PaymentRequest, 
    apiConfig: any
  ): Promise<PaymentResponse> {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('🔄 Simulation paiement avec API:', apiConfig.apiKey);
        
        // Étapes de simulation réaliste
        const steps = [
          { message: 'Connexion à l\'API de paiement...', delay: 800 },
          { message: 'Validation des informations...', delay: 1200 },
          { message: 'Traitement sécurisé...', delay: 1500 },
          { message: 'Confirmation du paiement...', delay: 1000 },
          { message: 'Finalisation...', delay: 600 },
        ];

        for (const step of steps) {
          console.log('📱', step.message);
          await new Promise(resolve => setTimeout(resolve, step.delay));
        }
        
        // Générer un ID de transaction réaliste
        const transactionId = `${request.paymentMethod.toUpperCase()}_${Date.now()}_MC_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        // Calculer les frais (simulation)
        const fees = Math.round(request.amount * 0.02); // 2% de frais
        
        const response: PaymentResponse = {
          success: true,
          transactionId,
          message: `Paiement de ${request.amount} ${request.currency} effectué avec succès via ${request.paymentMethod}`,
          reference: request.reference,
          amount: request.amount,
          fees,
        };
        
        console.log('✅ Paiement simulé avec succès - My Church by Henock Aduma');
        resolve(response);
      } catch (error) {
        console.error('💥 Erreur simulation paiement:', error);
        reject(new Error('Échec du paiement simulé'));
      }
    });
  }

  static async validatePaymentMethod(method: string, phoneNumber?: string): Promise<boolean> {
    try {
      const mobilePayments = ['mpesa', 'orange_money', 'airtel_money', 'afrimoney'];
      
      if (mobilePayments.includes(method.toLowerCase())) {
        if (!phoneNumber || phoneNumber.length < 8) {
          throw new Error('Numéro de téléphone requis pour le paiement mobile');
        }
        
        // Validation du format de numéro selon l'opérateur
        if (method === 'mpesa' && !phoneNumber.startsWith('+254')) {
          console.log('⚠️ Numéro M-Pesa non standard, mais accepté pour la démo');
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Validation méthode de paiement:', error);
      return false;
    }
  }

  static getPaymentMethodInfo(method: string): { name: string; fees: string; processingTime: string } {
    const methodsInfo: Record<string, any> = {
      mpesa: {
        name: 'M-Pesa',
        fees: '2% + 0.50 USD',
        processingTime: 'Instantané'
      },
      orange_money: {
        name: 'Orange Money',
        fees: '1.5% + 100 FC',
        processingTime: 'Instantané'
      },
      airtel_money: {
        name: 'Airtel Money',
        fees: '2% + 0.25 USD',
        processingTime: 'Instantané'
      },
      afrimoney: {
        name: 'Afrimoney',
        fees: '1.8% + 50 FC',
        processingTime: 'Instantané'
      },
      bank: {
        name: 'Virement bancaire',
        fees: '5 USD fixe',
        processingTime: '1-3 jours ouvrables'
      }
    };

    return methodsInfo[method.toLowerCase()] || {
      name: method,
      fees: 'Variable',
      processingTime: 'Variable'
    };
  }
}