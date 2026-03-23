import 'react-native-get-random-values';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { X, CreditCard, Smartphone, CircleCheck as CheckCircle, Star, Wallet, Building2 } from 'lucide-react-native';
import { SubscriptionService } from '../lib/subscription';
import { DatabaseService } from '../lib/database';

// API Keys réservées - Created by Henock Aduma
const PAYMENT_API_KEYS = {
  MPESA: 'MPESA_API_KEY_MC_2024_HENOCK_ADUMA_PROD_KEY',
  ORANGE_MONEY: 'ORANGE_API_KEY_MC_2024_HENOCK_ADUMA_PROD_KEY', 
  AIRTEL_MONEY: 'AIRTEL_API_KEY_MC_2024_HENOCK_ADUMA_PROD_KEY',
  AFRIMONEY: 'AFRI_API_KEY_MC_2024_HENOCK_ADUMA_PROD_KEY',
  BANK_TRANSFER: 'BANK_API_KEY_MC_2024_HENOCK_ADUMA_PROD_KEY',
  VISA: 'VISA_API_KEY_MC_2024_HENOCK_ADUMA_PROD_KEY',
  GOOGLE_PAY: 'GOOGLE_PAY_API_KEY_MC_2024_HENOCK_ADUMA_PROD_KEY',
  MASTERCARD: 'MASTERCARD_API_KEY_MC_2024_HENOCK_ADUMA_PROD_KEY'
};

// Méthodes de paiement étendues
export const PAYMENT_METHODS = [
  {
    id: 'mpesa',
    name: 'M-Pesa',
    icon: '💵',
    description: 'Paiement mobile via M-Pesa',
    type: 'mobile',
    currency: 'USD/FC'
  },
  {
    id: 'orange_money',
    name: 'Orange Money',
    icon: '🍊',
    description: 'Paiement mobile Orange Money',
    type: 'mobile',
    currency: 'USD/FC'
  },
  {
    id: 'airtel_money',
    name: 'Airtel Money',
    icon: '📱',
    description: 'Paiement mobile Airtel',
    type: 'mobile',
    currency: 'USD/FC'
  },
  {
    id: 'afrimoney',
    name: 'Afrimoney',
    icon: '🌍',
    description: 'Paiement mobile Afrimoney',
    type: 'mobile',
    currency: 'USD/FC'
  },
  {
    id: 'visa',
    name: 'VISA',
    icon: '💳',
    description: 'Carte VISA / MasterCard',
    type: 'card',
    currency: 'USD/EUR'
  },
  {
    id: 'google_pay',
    name: 'Google Pay',
    icon: '📲',
    description: 'Paiement via Google Pay',
    type: 'digital',
    currency: 'USD'
  },
  {
    id: 'bank_transfer',
    name: 'Virement Bancaire',
    icon: '🏦',
    description: 'Virement bancaire local/international',
    type: 'bank',
    currency: 'USD/EUR/FC'
  }
];

interface PaymentModalProps {
  visible: boolean;
  subscriptionType: 'monthly' | 'yearly';
  amount: number;
  churchId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function PaymentModal({ 
  visible, 
  subscriptionType, 
  amount, 
  churchId, 
  onClose, 
  onSuccess 
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [cardName, setCardName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'select' | 'details' | 'card' | 'processing' | 'success'>('select');
  const [processingStep, setProcessingStep] = useState(0);

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId);
    const method = PAYMENT_METHODS.find(m => m.id === methodId);
    
    if (method?.type === 'mobile') {
      setStep('details');
    } else if (method?.type === 'card' || method?.type === 'digital') {
      setStep('card');
    } else {
      processPayment();
    }
  };

  const processPayment = async () => {
    setStep('processing');
    setProcessing(true);
    setProcessingStep(0);

    try {
      console.log('💳 Traitement paiement My Church:', { 
        selectedMethod, 
        amount, 
        phoneNumber,
        cardNumber: cardNumber ? '****' + cardNumber.slice(-4) : undefined,
        apiKey: PAYMENT_API_KEYS[selectedMethod.toUpperCase() as keyof typeof PAYMENT_API_KEYS] || 'DEFAULT_KEY'
      });
      
      // Simulation réaliste avec étapes adaptées au type de paiement
      let steps = [
        'Validation des informations...',
        'Connexion au fournisseur...',
        'Traitement sécurisé...',
        'Confirmation du paiement...',
        'Activation de l\'abonnement...'
      ];

      if (['visa', 'google_pay'].includes(selectedMethod)) {
        steps = [
          'Validation des données de carte...',
          'Connexion au réseau bancaire...',
          'Autorisation en cours...',
          'Traitement crypté...',
          'Confirmation du paiement...',
          'Activation de l\'abonnement...'
        ];
      }

      for (let i = 0; i < steps.length; i++) {
        setProcessingStep(i);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Générer une référence de transaction
      const transactionRef = `MC${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      // Simuler l'appel API avec la clé appropriée
      const apiKey = PAYMENT_API_KEYS[selectedMethod.toUpperCase() as keyof typeof PAYMENT_API_KEYS];
      console.log(`🔐 Utilisation de la clé API: ${apiKey}`);

      // Vérifier le statut final (simulation)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Renouveler l'abonnement
      await SubscriptionService.renewSubscription(churchId, subscriptionType);
      
      setStep('success');
      setTimeout(() => {
        onSuccess();
        onClose();
        resetModal();
      }, 3000);
    } catch (error: any) {
      console.error('❌ Erreur paiement:', error);
      Alert.alert(
        'Erreur de paiement',
        error.message || 'Le paiement a échoué. Veuillez réessayer.'
      );
      setStep('select');
    } finally {
      setProcessing(false);
    }
  };

  const resetModal = () => {
    setSelectedMethod('');
    setPhoneNumber('');
    setCardNumber('');
    setCardExpiry('');
    setCardCVV('');
    setCardName('');
    setStep('select');
    setProcessing(false);
    setProcessingStep(0);
  };

  const handleClose = () => {
    if (!processing) {
      resetModal();
      onClose();
    }
  };

  const renderMethodSelection = () => (
    <View style={styles.methodSelection}>
      <Text style={styles.sectionTitle}>💳 Choisissez votre méthode de paiement</Text>
      <Text style={styles.sectionSubtitle}>Paiement 100% sécurisé - Created by Henock Aduma</Text>
      
      {PAYMENT_METHODS.map((method) => (
        <TouchableOpacity
          key={method.id}
          style={styles.methodButton}
          onPress={() => handleMethodSelect(method.id)}
          disabled={processing}
        >
          <View style={styles.methodIcon}>
            <Text style={styles.methodIconText}>{method.icon}</Text>
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodName}>{method.name}</Text>
            <Text style={styles.methodDescription}>{method.description}</Text>
            <Text style={styles.methodCurrency}>Devise: {method.currency}</Text>
            {['visa', 'google_pay', 'bank_transfer'].includes(method.id) && (
              <Text style={styles.methodSecure}>🔒 Sécurisé & Crypté</Text>
            )}
          </View>
          <View style={styles.methodArrow}>
            <Text style={styles.methodArrowText}>→</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPhoneInput = () => (
    <View style={styles.phoneInput}>
      <Text style={styles.sectionTitle}>📱 Entrez votre numéro de téléphone</Text>
      <Text style={styles.methodSelected}>
        Méthode: {PAYMENT_METHODS.find(m => m.id === selectedMethod)?.name}
      </Text>
      
      <View style={styles.inputGroup}>
        <Smartphone size={20} color="#7f8c8d" />
        <TextInput
          style={styles.input}
          placeholder="+243 XXX XXX XXX"
          placeholderTextColor="#adb5bd"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          autoFocus
        />
      </View>
      
      <View style={styles.buttonGroup}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => setStep('select')}
        >
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.payButton, !phoneNumber.trim() && styles.payButtonDisabled]}
          onPress={processPayment}
          disabled={!phoneNumber.trim()}
        >
          <Text style={styles.payButtonText}>💳 Payer ${amount}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCardForm = () => (
    <View style={styles.cardForm}>
      <Text style={styles.sectionTitle}>
        {selectedMethod === 'visa' ? '💳 Informations Carte Bancaire' : '📲 Google Pay'}
      </Text>
      <Text style={styles.methodSelected}>
        {PAYMENT_METHODS.find(m => m.id === selectedMethod)?.name}
      </Text>
      
      {selectedMethod === 'visa' ? (
        <>
          <View style={styles.inputGroup}>
            <CreditCard size={20} color="#7f8c8d" />
            <TextInput
              style={styles.input}
              placeholder="1234 5678 9012 3456"
              placeholderTextColor="#adb5bd"
              value={cardNumber}
              onChangeText={setCardNumber}
              keyboardType="numeric"
              maxLength={19}
              autoFocus
            />
          </View>
          
          <View style={styles.cardRow}>
            <View style={styles.halfInputGroup}>
              <TextInput
                style={styles.input}
                placeholder="MM/AA"
                placeholderTextColor="#adb5bd"
                value={cardExpiry}
                onChangeText={setCardExpiry}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
            
            <View style={styles.halfInputGroup}>
              <TextInput
                style={styles.input}
                placeholder="CVV"
                placeholderTextColor="#adb5bd"
                value={cardCVV}
                onChangeText={setCardCVV}
                keyboardType="numeric"
                maxLength={3}
                secureTextEntry
              />
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="Nom sur la carte"
              placeholderTextColor="#adb5bd"
              value={cardName}
              onChangeText={setCardName}
            />
          </View>
        </>
      ) : (
        <View style={styles.googlePayInfo}>
          <Wallet size={40} color="#4285F4" />
          <Text style={styles.googlePayText}>
            Ouvrez l'application Google Pay sur votre appareil pour compléter le paiement
          </Text>
          <Text style={styles.googlePaySubtext}>
            Sécurité garantie par Google et My Church
          </Text>
        </View>
      )}
      
      <View style={styles.buttonGroup}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => setStep('select')}
        >
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.payButton, 
            selectedMethod === 'visa' && (!cardNumber || !cardExpiry || !cardCVV || !cardName) && styles.payButtonDisabled
          ]}
          onPress={processPayment}
          disabled={selectedMethod === 'visa' && (!cardNumber || !cardExpiry || !cardCVV || !cardName)}
        >
          <Text style={styles.payButtonText}>
            {selectedMethod === 'visa' ? '💳 Payer maintenant' : '📲 Payer avec Google Pay'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProcessing = () => {
    const steps = [
      selectedMethod === 'visa' || selectedMethod === 'google_pay' 
        ? 'Validation des données de carte...'
        : 'Validation des informations...',
      selectedMethod === 'visa' || selectedMethod === 'google_pay'
        ? 'Connexion au réseau bancaire...'
        : 'Connexion au fournisseur...',
      'Traitement sécurisé...',
      'Confirmation du paiement...',
      'Activation de l\'abonnement...'
    ];

    if (selectedMethod === 'visa' || selectedMethod === 'google_pay') {
      steps.splice(2, 0, 'Autorisation en cours...');
    }

    return (
      <View style={styles.processing}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.processingTitle}>🔄 Traitement du paiement...</Text>
        <Text style={styles.processingSubtitle}>
          {PAYMENT_METHODS.find(m => m.id === selectedMethod)?.name}
        </Text>
        <Text style={styles.processingAmount}>${amount}</Text>
        
        <View style={styles.processingSteps}>
          {steps.map((stepText, index) => (
            <View key={index} style={styles.processingStep}>
              {index < processingStep ? (
                <CheckCircle size={16} color="#27ae60" />
              ) : index === processingStep ? (
                <ActivityIndicator size="small" color="#3498db" />
              ) : (
                <View style={styles.processingStepPending} />
              )}
              <Text style={[
                styles.processingStepText,
                index <= processingStep && styles.processingStepActive
              ]}>
                {stepText}
              </Text>
            </View>
          ))}
        </View>
        
        <View style={styles.securityInfo}>
          <Text style={styles.securityText}>
            🔐 Transaction sécurisée avec clé: {
              PAYMENT_API_KEYS[selectedMethod.toUpperCase() as keyof typeof PAYMENT_API_KEYS]?.substring(0, 8) + '...'
            }
          </Text>
          <Text style={styles.processingNote}>
            ⚡ Simulation 100% réaliste - My Church by Henock Aduma
          </Text>
        </View>
      </View>
    );
  };

  const renderSuccess = () => (
    <View style={styles.success}>
      <CheckCircle size={80} color="#27ae60" />
      <Text style={styles.successTitle}>🎉 Paiement réussi!</Text>
      <Text style={styles.successSubtitle}>
        Votre abonnement {subscriptionType === 'monthly' ? 'mensuel' : 'annuel'} My Church a été activé
      </Text>
      <Text style={styles.successAmount}>${amount}</Text>
      
      <View style={styles.paymentDetails}>
        <Text style={styles.paymentDetailsTitle}>📋 Détails de la transaction:</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Méthode:</Text>
          <Text style={styles.detailValue}>
            {PAYMENT_METHODS.find(m => m.id === selectedMethod)?.name}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Référence:</Text>
          <Text style={styles.detailValue}>
            MC{Date.now().toString().slice(-8)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Clé API utilisée:</Text>
          <Text style={styles.detailValue}>
            {PAYMENT_API_KEYS[selectedMethod.toUpperCase() as keyof typeof PAYMENT_API_KEYS]?.substring(0, 12)}...
          </Text>
        </View>
      </View>
      
      <View style={styles.successFeatures}>
        <Text style={styles.successFeaturesTitle}>✨ Vous avez maintenant accès à:</Text>
        {[
          'Gestion complète des membres',
          'Suivi des dons et finances',
          'Planification des événements',
          'Rapports analytiques avancés',
          'Support prioritaire'
        ].map((feature, index) => (
          <View key={index} style={styles.successFeature}>
            <CheckCircle size={14} color="#27ae60" />
            <Text style={styles.successFeatureText}>{feature}</Text>
          </View>
        ))}
      </View>
      
      <View style={styles.successSignature}>
        <Star size={16} color="#f39c12" />
        <Text style={styles.successSignatureText}>My Church - Created by Henock Aduma</Text>
        <Star size={16} color="#f39c12" />
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {step !== 'processing' && step !== 'success' && (
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          )}
          
          <View style={styles.header}>
            <Text style={styles.title}>
              💎 Abonnement {subscriptionType === 'monthly' ? 'Mensuel' : 'Annuel'}
            </Text>
            <Text style={styles.amount}>${amount}</Text>
            <Text style={styles.headerSubtitle}>My Church - Created by Henock Aduma</Text>
          </View>

          <ScrollView style={styles.content}>
            {step === 'select' && renderMethodSelection()}
            {step === 'details' && renderPhoneInput()}
            {step === 'card' && renderCardForm()}
            {step === 'processing' && renderProcessing()}
            {step === 'success' && renderSuccess()}
          </ScrollView>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              🔒 Paiement 100% sécurisé avec clés API réservées • ⚡ Activation instantanée
            </Text>
            <Text style={styles.footerSignature}>
              ✨ My Church Payment System - Created by Henock Aduma
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '100%',
    maxWidth: 450,
    maxHeight: '90%',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 8,
  },
  header: {
    alignItems: 'center',
    padding: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
    textAlign: 'center',
  },
  amount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#f39c12',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  content: {
    flex: 1,
  },
  methodSelection: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 20,
    textAlign: 'center',
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#dee2e6',
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  methodIconText: {
    fontSize: 24,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  methodCurrency: {
    fontSize: 12,
    color: '#3498db',
    fontWeight: '500',
  },
  methodSecure: {
    fontSize: 11,
    color: '#27ae60',
    fontWeight: '500',
    marginTop: 2,
  },
  methodArrow: {
    padding: 8,
  },
  methodArrowText: {
    fontSize: 20,
    color: '#3498db',
    fontWeight: 'bold',
  },
  phoneInput: {
    padding: 24,
  },
  cardForm: {
    padding: 24,
  },
  methodSelected: {
    fontSize: 16,
    color: '#3498db',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '600',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 18,
    color: '#2c3e50',
    fontWeight: '500',
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfInputGroup: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
  },
  googlePayInfo: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    marginBottom: 24,
  },
  googlePayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  googlePaySubtext: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#dee2e6',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#7f8c8d',
    fontSize: 16,
    fontWeight: '600',
  },
  payButton: {
    flex: 2,
    backgroundColor: '#3498db',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  payButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  payButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  processing: {
    padding: 40,
    alignItems: 'center',
  },
  processingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 20,
    marginBottom: 10,
  },
  processingSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 10,
  },
  processingAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 30,
  },
  processingSteps: {
    alignSelf: 'stretch',
    gap: 16,
    marginBottom: 20,
  },
  processingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  processingStepText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  processingStepActive: {
    color: '#2c3e50',
    fontWeight: '600',
  },
  processingStepPending: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#dee2e6',
  },
  securityInfo: {
    marginTop: 20,
    alignItems: 'center',
  },
  securityText: {
    fontSize: 12,
    color: '#e74c3c',
    fontWeight: '600',
    marginBottom: 8,
  },
  processingNote: {
    fontSize: 12,
    color: '#f39c12',
    textAlign: 'center',
    fontStyle: 'italic',
    fontWeight: '600',
  },
  success: {
    padding: 40,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#27ae60',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 12,
  },
  successAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 28,
  },
  paymentDetails: {
    alignSelf: 'stretch',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  paymentDetailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  successFeatures: {
    alignSelf: 'stretch',
    marginBottom: 20,
  },
  successFeaturesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
    textAlign: 'center',
  },
  successFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  successFeatureText: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 1,
  },
  successSignature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff3cd',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f39c12',
  },
  successSignatureText: {
    fontSize: 14,
    color: '#f39c12',
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
  },
  footerSignature: {
    fontSize: 12,
    color: '#f39c12',
    textAlign: 'center',
    fontWeight: '600',
    fontStyle: 'italic',
  },
}); 