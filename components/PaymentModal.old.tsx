import 'react-native-get-random-values';
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
import { X, CreditCard, Smartphone, CircleCheck as CheckCircle, Star } from 'lucide-react-native';
import { SubscriptionService } from '../lib/subscription';
import { DatabaseService } from '../lib/database';

// API Keys simulées pour les paiements
const PAYMENT_API_KEYS = {
  MPESA: 'MPESA_API_KEY_MC_2024_HENOCK_ADUMA',
  ORANGE_MONEY: 'ORANGE_API_KEY_MC_2024_HENOCK_ADUMA', 
  AIRTEL_MONEY: 'AIRTEL_API_KEY_MC_2024_HENOCK_ADUMA',
  AFRIMONEY: 'AFRI_API_KEY_MC_2024_HENOCK_ADUMA',
  BANK_TRANSFER: 'BANK_API_KEY_MC_2024_HENOCK_ADUMA',
};

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
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'select' | 'details' | 'processing' | 'success'>('select');
  const [processingStep, setProcessingStep] = useState(0);

  const paymentMethods = SubscriptionService.PAYMENT_METHODS;

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId);
    const method = paymentMethods.find(m => m.id === methodId);
    
    if (method?.type === 'mobile') {
      setStep('details');
    } else {
      processPayment();
    }
  };

  const processPayment = async () => {
    setStep('processing');
    setProcessing(true);
    setProcessingStep(0);

    try {
      console.log('💳 Traitement paiement My Church:', { selectedMethod, amount, phoneNumber });
      
      // Simulation réaliste avec étapes
      const steps = [
        'Validation des informations...',
        'Connexion au fournisseur...',
        'Traitement sécurisé...',
        'Confirmation du paiement...',
        'Activation de l\'abonnement...'
      ];

      for (let i = 0; i < steps.length; i++) {
        setProcessingStep(i);
        await new Promise(resolve => setTimeout(resolve, 1200));
      }

      const transaction = await SubscriptionService.processPayment(
        churchId,
        amount,
        selectedMethod,
        phoneNumber || undefined
      );

      // Vérifier le statut final
      const transactions = await DatabaseService.getPaymentTransactions(churchId);
      const finalTransaction = transactions.find(t => t.id === transaction.id);

      if (finalTransaction?.status === 'completed') {
        // Renouveler l'abonnement
        await SubscriptionService.renewSubscription(churchId, subscriptionType);
        
        setStep('success');
        setTimeout(() => {
          onSuccess();
          onClose();
          resetModal();
        }, 3000);
      } else {
        throw new Error('Le paiement a échoué');
      }
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
      <Text style={styles.sectionSubtitle}>Paiement 100% sécurisé et simulé</Text>
      
      {paymentMethods.map((method) => (
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
        Méthode: {paymentMethods.find(m => m.id === selectedMethod)?.name}
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

  const renderProcessing = () => {
    const steps = [
      'Validation des informations...',
      'Connexion au fournisseur...',
      'Traitement sécurisé...',
      'Confirmation du paiement...',
      'Activation de l\'abonnement...'
    ];

    return (
      <View style={styles.processing}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.processingTitle}>🔄 Traitement du paiement...</Text>
        <Text style={styles.processingSubtitle}>
          {paymentMethods.find(m => m.id === selectedMethod)?.name}
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
        
        <Text style={styles.processingNote}>
          ⚡ Simulation 100% réaliste - My Church by Henock Aduma
        </Text>
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
      
      <View style={styles.successFeatures}>
        <Text style={styles.successFeaturesTitle}>✨ Vous avez maintenant accès à:</Text>
        {SubscriptionService.PLANS.find(p => p.type === subscriptionType)?.features.map((feature, index) => (
          <View key={index} style={styles.successFeature}>
            <CheckCircle size={14} color="#27ae60" />
            <Text style={styles.successFeatureText}>{feature}</Text>
          </View>
        ))}
      </View>
      
      <View style={styles.successSignature}>
        <Star size={16} color="#f39c12" />
        <Text style={styles.successSignatureText}>Created by Henock Aduma</Text>
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
            {step === 'processing' && renderProcessing()}
            {step === 'success' && renderSuccess()}
          </ScrollView>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              🔒 Paiement 100% sécurisé et simulé • ⚡ Activation instantanée
            </Text>
            <Text style={styles.footerSignature}>
              ✨ My Church - Created by Henock Aduma
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
    marginBottom: 24,
    backgroundColor: '#f8f9fa',
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 18,
    color: '#2c3e50',
    fontWeight: '500',
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