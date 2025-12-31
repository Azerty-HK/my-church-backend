import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { DollarSign, CreditCard, X, Check, Smartphone, QrCode, Shield, Lock } from 'lucide-react-native';

interface PaymentData {
  method: 'mobile' | 'card' | 'digital_wallet';
  reference: string;
  timestamp: string;
  note: string;
  provider?: string;
  phoneNumber?: string;
  cardNumber?: string;
  cardHolder?: string;
  expiryDate?: string;
  cvv?: string;
}

interface MemberRegistrationPaymentProps {
  visible: boolean;
  onClose: () => void;
  onPaymentSuccess: (paymentData: PaymentData) => void;
  currency: 'FC' | 'USD' | 'EURO';
  memberName: string;
  amount: number;
  description: string;
}

// Simulation d'API de paiement
const PaymentAPI = {
  checkServiceAvailability: async (method: 'mobile' | 'card' | 'digital_wallet', provider?: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    return Math.random() > 0.1; // 90% de succès
  },

  checkUserBalance: async (amount: number, currency: string): Promise<{ success: boolean; balance?: number; message?: string }> => {
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    const balances: Record<string, number> = {
      'FC': 50000,
      'USD': 50,
      'EURO': 45
    };

    const userBalance = balances[currency] || 0;
    const hasSufficientFunds = userBalance >= amount;

    return {
      success: hasSufficientFunds,
      balance: userBalance,
      message: hasSufficientFunds 
        ? undefined 
        : `Solde insuffisant. Votre solde: ${userBalance.toLocaleString()} ${currency}, Montant requis: ${amount.toLocaleString()} ${currency}`
    };
  },

  processPayment: async (paymentDetails: {
    amount: number;
    currency: string;
    method: 'mobile' | 'card' | 'digital_wallet';
    provider?: string;
    phoneNumber?: string;
    cardNumber?: string;
    cardHolder?: string;
    expiryDate?: string;
    cvv?: string;
  }): Promise<{ success: boolean; reference: string; message?: string; transactionId?: string }> => {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const success = Math.random() > 0.15; // 85% de succès
    
    if (success) {
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9).toUpperCase();
      
      return {
        success: true,
        reference: `PAY-${timestamp}-${randomId}`,
        transactionId: `TX${timestamp}${randomId}`,
      };
    } else {
      const errors = [
        'Échec du paiement. Veuillez réessayer.',
        'Service temporairement indisponible.',
        'Transaction refusée par la banque.',
        'Délai d\'attente dépassé.',
        'Problème de connexion au serveur de paiement.'
      ];
      
      return {
        success: false,
        reference: '',
        message: errors[Math.floor(Math.random() * errors.length)]
      };
    }
  }
};

export function MemberRegistrationPayment({
  visible,
  onClose,
  onPaymentSuccess,
  currency,
  memberName,
  amount,
  description,
}: MemberRegistrationPaymentProps) {
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'mobile' | 'card' | 'digital_wallet'>('mobile');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [step, setStep] = useState<'method' | 'details' | 'processing' | 'success'>('method');
  const [transactionDetails, setTransactionDetails] = useState<any>(null);

  const { height: SCREEN_HEIGHT } = useWindowDimensions();

  // Calcul du montant selon la devise
  const calculatedAmount = amount;
  const currencySymbol = currency === 'FC' ? 'FC' : currency === 'USD' ? '$' : '€';
  const formattedAmount = calculatedAmount.toLocaleString();

  const mobileProviders = [
    { id: 'mpesa', name: 'M-Pesa', icon: '📱', color: '#2ecc71' },
    { id: 'orange', name: 'Orange Money', icon: '🟠', color: '#ff6600' },
    { id: 'airtel', name: 'Airtel Money', icon: '🔴', color: '#e30613' },
    { id: 'vodacom', name: 'Vodacom MPesa', icon: '🔵', color: '#0077b5' },
  ];

  const cardProviders = [
    { id: 'visa', name: 'Visa', icon: '💳', color: '#1a1f71' },
    { id: 'mastercard', name: 'Mastercard', icon: '💳', color: '#eb001b' },
    { id: 'amex', name: 'American Express', icon: '💳', color: '#2e77bc' },
  ];

  const digitalWalletProviders = [
    { id: 'google_pay', name: 'Google Pay', icon: '📱', color: '#4285f4' },
    { id: 'apple_pay', name: 'Apple Pay', icon: '🍎', color: '#000000' },
    { id: 'samsung_pay', name: 'Samsung Pay', icon: '📱', color: '#1428a0' },
    { id: 'paypal', name: 'PayPal', icon: '🔵', color: '#003087' },
  ];

  const resetForm = () => {
    setProcessing(false);
    setPaymentMethod('mobile');
    setSelectedProvider('');
    setPhoneNumber('');
    setCardNumber('');
    setCardHolder('');
    setExpiryDate('');
    setCvv('');
    setStep('method');
    setTransactionDetails(null);
  };

  const handleClose = () => {
    if (processing) {
      Alert.alert(
        'Paiement en cours',
        'Un paiement est en cours. Voulez-vous vraiment annuler ?',
        [
          { text: 'Continuer', style: 'cancel' },
          { 
            text: 'Annuler', 
            style: 'destructive',
            onPress: () => {
              resetForm();
              onClose();
            }
          },
        ]
      );
    } else {
      resetForm();
      onClose();
    }
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, '').replace(/\D/g, '');
    const matches = cleaned.match(/\d{1,4}/g);
    return matches ? matches.join(' ') : '';
  };

  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 3) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const validateExpiryDate = (date: string): boolean => {
    if (!/^\d{2}\/\d{2}$/.test(date)) return false;
    
    const [month, year] = date.split('/').map(Number);
    const currentYear = new Date().getFullYear() % 100;
    const currentMonth = new Date().getMonth() + 1;
    
    if (month < 1 || month > 12) return false;
    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;
    
    return true;
  };

  const validatePaymentDetails = (): boolean => {
    if (paymentMethod === 'mobile') {
      if (!selectedProvider) {
        Alert.alert('Sélection requise', 'Veuillez sélectionner un opérateur mobile');
        return false;
      }
      if (!phoneNumber.trim()) {
        Alert.alert('Numéro requis', 'Veuillez entrer un numéro de téléphone');
        return false;
      }
      const cleanPhone = phoneNumber.replace(/\s/g, '');
      if (!/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
        Alert.alert('Numéro invalide', 'Veuillez entrer un numéro de téléphone valide');
        return false;
      }
    } else if (paymentMethod === 'card') {
      if (!selectedProvider) {
        Alert.alert('Sélection requise', 'Veuillez sélectionner un type de carte');
        return false;
      }
      const cleanCardNumber = cardNumber.replace(/\s/g, '');
      if (!cleanCardNumber || cleanCardNumber.length < 16) {
        Alert.alert('Numéro de carte invalide', 'Veuillez entrer un numéro de carte valide (16 chiffres)');
        return false;
      }
      if (!cardHolder.trim()) {
        Alert.alert('Nom requis', 'Veuillez entrer le nom du titulaire de la carte');
        return false;
      }
      if (!validateExpiryDate(expiryDate)) {
        Alert.alert('Date d\'expiration invalide', 'Veuillez entrer une date d\'expiration valide (MM/AA)');
        return false;
      }
      if (!cvv.trim() || !/^\d{3,4}$/.test(cvv)) {
        Alert.alert('CVV invalide', 'Veuillez entrer un code CVV valide (3 ou 4 chiffres)');
        return false;
      }
    } else if (paymentMethod === 'digital_wallet') {
      if (!selectedProvider) {
        Alert.alert('Sélection requise', 'Veuillez sélectionner un portefeuille numérique');
        return false;
      }
    }
    return true;
  };

  const handlePayment = async () => {
    if (!validatePaymentDetails()) {
      return;
    }

    setProcessing(true);
    setStep('processing');

    try {
      // Vérifier la disponibilité du service
      const serviceAvailable = await PaymentAPI.checkServiceAvailability(paymentMethod, selectedProvider);
      
      if (!serviceAvailable) {
        Alert.alert('Service indisponible', 'Le service de paiement est temporairement indisponible. Veuillez réessayer plus tard ou choisir une autre méthode.');
        setProcessing(false);
        setStep('details');
        return;
      }

      // Vérifier le solde
      const balanceCheck = await PaymentAPI.checkUserBalance(calculatedAmount, currency);
      
      if (!balanceCheck.success) {
        Alert.alert('Solde insuffisant', balanceCheck.message || 'Votre solde est insuffisant pour effectuer ce paiement.');
        setProcessing(false);
        setStep('details');
        return;
      }

      // Traiter le paiement
      const paymentResult = await PaymentAPI.processPayment({
        amount: calculatedAmount,
        currency,
        method: paymentMethod,
        provider: selectedProvider,
        phoneNumber: paymentMethod === 'mobile' ? phoneNumber : undefined,
        cardNumber: paymentMethod === 'card' ? cardNumber.replace(/\s/g, '') : undefined,
        cardHolder: paymentMethod === 'card' ? cardHolder : undefined,
        expiryDate: paymentMethod === 'card' ? expiryDate : undefined,
        cvv: paymentMethod === 'card' ? cvv : undefined,
      });

      if (paymentResult.success) {
        setTransactionDetails({
          reference: paymentResult.reference,
          transactionId: paymentResult.transactionId,
          timestamp: new Date().toISOString(),
          method: paymentMethod,
          provider: selectedProvider,
          amount: calculatedAmount,
          currency,
        });

        const paymentData: PaymentData = {
          method: paymentMethod,
          reference: paymentResult.reference,
          timestamp: new Date().toISOString(),
          note: `Paiement ${formattedAmount} ${currencySymbol} - ${description}`,
          provider: selectedProvider,
          phoneNumber: paymentMethod === 'mobile' ? phoneNumber : undefined,
          cardNumber: paymentMethod === 'card' ? cardNumber.replace(/\s/g, '').slice(-4) : undefined,
          cardHolder: paymentMethod === 'card' ? cardHolder : undefined,
          expiryDate: paymentMethod === 'card' ? expiryDate : undefined,
          cvv: paymentMethod === 'card' ? cvv : undefined,
        };

        setStep('success');
        
        setTimeout(() => {
          onPaymentSuccess(paymentData);
          resetForm();
        }, 3000);
        
      } else {
        Alert.alert(
          '❌ Paiement échoué',
          paymentResult.message || 'Une erreur est survenue lors du paiement. Veuillez réessayer.',
          [
            {
              text: 'Réessayer',
              onPress: () => {
                setProcessing(false);
                setStep('details');
              },
            },
            {
              text: 'Changer de méthode',
              onPress: () => {
                setProcessing(false);
                setStep('method');
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Erreur paiement:', error);
      Alert.alert(
        '❌ Erreur système',
        'Une erreur inattendue est survenue. Veuillez réessayer.',
        [
          {
            text: 'OK',
            onPress: () => {
              setProcessing(false);
              setStep('details');
            },
          },
        ]
      );
    }
  };

  const renderMethodSelection = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Choisissez votre méthode de paiement</Text>
      <Text style={styles.stepSubtitle}>Sélectionnez le moyen de paiement que vous souhaitez utiliser</Text>

      <TouchableOpacity
        style={[
          styles.methodButton,
          paymentMethod === 'mobile' && styles.methodButtonActive,
        ]}
        onPress={() => {
          setPaymentMethod('mobile');
          setSelectedProvider('');
        }}
        activeOpacity={0.7}
      >
        <View style={styles.methodContent}>
          <View style={[styles.methodIconContainer, { backgroundColor: paymentMethod === 'mobile' ? '#e8f5e9' : '#e3f2fd' }]}>
            <Smartphone size={24} color={paymentMethod === 'mobile' ? '#27ae60' : '#3498db'} />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodTitle}>Mobile Money</Text>
            <Text style={styles.methodDesc}>
              Paiement rapide et sécurisé via votre mobile
            </Text>
            <View style={styles.providerTags}>
              {mobileProviders.slice(0, 3).map(p => (
                <Text key={p.id} style={styles.providerTag}>{p.icon} {p.name}</Text>
              ))}
            </View>
          </View>
          {paymentMethod === 'mobile' && (
            <View style={styles.selectedIndicator}>
              <Check size={20} color="#27ae60" />
            </View>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.methodButton,
          paymentMethod === 'card' && styles.methodButtonActive,
        ]}
        onPress={() => {
          setPaymentMethod('card');
          setSelectedProvider('');
        }}
        activeOpacity={0.7}
      >
        <View style={styles.methodContent}>
          <View style={[styles.methodIconContainer, { backgroundColor: paymentMethod === 'card' ? '#f3e8f5' : '#f3e5f5' }]}>
            <CreditCard size={24} color="#9b59b6" />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodTitle}>Carte bancaire</Text>
            <Text style={styles.methodDesc}>Paiement sécurisé par carte Visa/Mastercard</Text>
            <View style={styles.providerTags}>
              {cardProviders.map(p => (
                <Text key={p.id} style={styles.providerTag}>{p.icon} {p.name}</Text>
              ))}
            </View>
          </View>
          {paymentMethod === 'card' && (
            <View style={styles.selectedIndicator}>
              <Check size={20} color="#27ae60" />
            </View>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.methodButton,
          paymentMethod === 'digital_wallet' && styles.methodButtonActive,
        ]}
        onPress={() => {
          setPaymentMethod('digital_wallet');
          setSelectedProvider('');
        }}
        activeOpacity={0.7}
      >
        <View style={styles.methodContent}>
          <View style={[styles.methodIconContainer, { backgroundColor: '#fdeaea' }]}>
            <QrCode size={24} color="#e74c3c" />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodTitle}>Portefeuille numérique</Text>
            <Text style={styles.methodDesc}>Google Pay, Apple Pay, PayPal</Text>
            <View style={styles.providerTags}>
              {digitalWalletProviders.slice(0, 2).map(p => (
                <Text key={p.id} style={styles.providerTag}>{p.icon} {p.name}</Text>
              ))}
            </View>
          </View>
          {paymentMethod === 'digital_wallet' && (
            <View style={styles.selectedIndicator}>
              <Check size={20} color="#27ae60" />
            </View>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.nextButton}
        onPress={() => setStep('details')}
        activeOpacity={0.8}
      >
        <Text style={styles.nextButtonText}>Continuer vers les détails</Text>
      </TouchableOpacity>

      <View style={styles.securityInfo}>
        <Lock size={14} color="#27ae60" />
        <Text style={styles.securityText}>
          Toutes les transactions sont cryptées et sécurisées
        </Text>
      </View>
    </View>
  );

  const renderPaymentDetails = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>
        {paymentMethod === 'mobile' 
          ? 'Détails Mobile Money' 
          : paymentMethod === 'card' 
          ? 'Détails Carte Bancaire' 
          : 'Portefeuille Numérique'}
      </Text>

      {paymentMethod === 'mobile' && (
        <>
          <Text style={styles.sectionLabel}>Sélectionnez votre opérateur</Text>
          <View style={styles.providersContainer}>
            {mobileProviders.map((provider) => (
              <TouchableOpacity
                key={provider.id}
                style={[
                  styles.providerButton,
                  selectedProvider === provider.id && styles.providerButtonActive,
                ]}
                onPress={() => setSelectedProvider(provider.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.providerIcon, { fontSize: 24 }]}>{provider.icon}</Text>
                <Text style={[
                  styles.providerText,
                  selectedProvider === provider.id && styles.providerTextActive,
                ]}>
                  {provider.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Votre numéro de téléphone</Text>
          <TextInput
            style={styles.input}
            placeholder="+243 XX XXX XXX"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            autoComplete="tel"
            placeholderTextColor="#95a5a6"
            editable={!processing}
          />
          <Text style={styles.inputHelp}>
            Entrez le numéro associé à votre compte {mobileProviders.find(p => p.id === selectedProvider)?.name || 'mobile money'}
          </Text>
        </>
      )}

      {paymentMethod === 'card' && (
        <>
          <Text style={styles.sectionLabel}>Type de carte acceptée</Text>
          <View style={styles.providersContainer}>
            {cardProviders.map((provider) => (
              <TouchableOpacity
                key={provider.id}
                style={[
                  styles.providerButton,
                  selectedProvider === provider.id && styles.providerButtonActive,
                ]}
                onPress={() => setSelectedProvider(provider.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.providerIcon, { fontSize: 24 }]}>{provider.icon}</Text>
                <Text style={[
                  styles.providerText,
                  selectedProvider === provider.id && styles.providerTextActive,
                ]}>
                  {provider.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Numéro de carte</Text>
          <View style={styles.inputWithIcon}>
            <CreditCard size={18} color="#7f8c8d" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.inputWithIconPadding]}
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChangeText={(text) => setCardNumber(formatCardNumber(text))}
              keyboardType="numeric"
              maxLength={19}
              placeholderTextColor="#95a5a6"
              editable={!processing}
            />
          </View>

          <Text style={styles.sectionLabel}>Nom du titulaire</Text>
          <TextInput
            style={styles.input}
            placeholder="JOHN DOE"
            value={cardHolder}
            onChangeText={setCardHolder}
            autoCapitalize="characters"
            placeholderTextColor="#95a5a6"
            editable={!processing}
          />

          <View style={styles.rowInputs}>
            <View style={styles.halfInput}>
              <Text style={styles.sectionLabel}>Date d'expiration</Text>
              <TextInput
                style={styles.input}
                placeholder="MM/AA"
                value={expiryDate}
                onChangeText={(text) => setExpiryDate(formatExpiryDate(text))}
                keyboardType="numeric"
                maxLength={5}
                placeholderTextColor="#95a5a6"
                editable={!processing}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.sectionLabel}>Code de sécurité (CVV)</Text>
              <View style={styles.inputWithIcon}>
                <Lock size={18} color="#7f8c8d" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputWithIconPadding]}
                  placeholder="123"
                  value={cvv}
                  onChangeText={setCvv}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                  placeholderTextColor="#95a5a6"
                  editable={!processing}
                />
              </View>
            </View>
          </View>
          
          <View style={styles.securityNoticeCard}>
            <Shield size={20} color="#27ae60" />
            <Text style={styles.securityNoticeText}>
              Vos informations de carte sont cryptées et ne sont jamais stockées sur nos serveurs.
            </Text>
          </View>
        </>
      )}

      {paymentMethod === 'digital_wallet' && (
        <>
          <Text style={styles.sectionLabel}>Choisissez votre portefeuille</Text>
          <View style={styles.providersContainer}>
            {digitalWalletProviders.map((provider) => (
              <TouchableOpacity
                key={provider.id}
                style={[
                  styles.providerButton,
                  selectedProvider === provider.id && styles.providerButtonActive,
                ]}
                onPress={() => setSelectedProvider(provider.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.providerIcon, { fontSize: 24 }]}>{provider.icon}</Text>
                <Text style={[
                  styles.providerText,
                  selectedProvider === provider.id && styles.providerTextActive,
                ]}>
                  {provider.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.digitalWalletInfo}>
            <Smartphone size={20} color="#3498db" />
            <Text style={styles.digitalWalletText}>
              Vous serez redirigé vers votre application de portefeuille pour confirmer le paiement.
            </Text>
          </View>
        </>
      )}

      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setStep('method')}
          disabled={processing}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.payButton, processing && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={processing}
          activeOpacity={0.8}
        >
          {processing ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <DollarSign size={20} color="white" />
              <Text style={styles.payButtonText}>
                Payer {formattedAmount} {currencySymbol}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.amountConfirmation}>
        Montant total: <Text style={styles.amountBold}>{formattedAmount} {currencySymbol}</Text>
      </Text>
    </View>
  );

  const renderProcessing = () => (
    <View style={styles.processingContainer}>
      <ActivityIndicator size="large" color="#3498db" />
      <Text style={styles.processingTitle}>Traitement en cours</Text>
      <Text style={styles.processingText}>
        Veuillez patienter pendant que nous traitons votre paiement...
      </Text>
      
      <View style={styles.processingSteps}>
        <View style={styles.processingStep}>
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <Text style={styles.stepText}>Vérification des informations</Text>
        </View>
        <View style={styles.processingStep}>
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <Text style={styles.stepText}>Validation du solde</Text>
        </View>
        <View style={styles.processingStep}>
          <View style={[styles.stepDot, processing && styles.stepDotActive]} />
          <Text style={styles.stepText}>Exécution du paiement</Text>
        </View>
      </View>
      
      <QrCode size={80} color="#bdc3c7" style={styles.qrIcon} />
      <Text style={styles.processingNote}>
        Ne fermez pas cette fenêtre pendant le traitement
      </Text>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIcon}>
        <Check size={60} color="white" />
      </View>
      <Text style={styles.successTitle}>✅ Paiement Réussi !</Text>
      
      {transactionDetails && (
        <View style={styles.transactionDetails}>
          <View style={styles.transactionRow}>
            <Text style={styles.transactionLabel}>Référence:</Text>
            <Text style={styles.transactionValue}>{transactionDetails.reference}</Text>
          </View>
          <View style={styles.transactionRow}>
            <Text style={styles.transactionLabel}>Montant:</Text>
            <Text style={styles.transactionValue}>
              {transactionDetails.amount.toLocaleString()} {transactionDetails.currency}
            </Text>
          </View>
          <View style={styles.transactionRow}>
            <Text style={styles.transactionLabel}>Méthode:</Text>
            <Text style={styles.transactionValue}>
              {transactionDetails.method === 'mobile' ? 'Mobile Money' : 
               transactionDetails.method === 'card' ? 'Carte Bancaire' : 
               'Portefeuille Numérique'}
            </Text>
          </View>
          <View style={styles.transactionRow}>
            <Text style={styles.transactionLabel}>Date:</Text>
            <Text style={styles.transactionValue}>
              {new Date(transactionDetails.timestamp).toLocaleString('fr-FR')}
            </Text>
          </View>
        </View>
      )}
      
      <Text style={styles.successMessage}>
        Le paiement pour {memberName} a été traité avec succès.
        Redirection en cours...
      </Text>
      
      <ActivityIndicator size="small" color="#27ae60" style={styles.successSpinner} />
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { maxHeight: SCREEN_HEIGHT * 0.9 }]}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>Paiement d'inscription</Text>
              <Text style={styles.subtitle}>{description}</Text>
            </View>
            <TouchableOpacity 
              onPress={handleClose} 
              style={styles.closeButton}
              disabled={processing}
              activeOpacity={0.6}
            >
              <X size={24} color="#7f8c8d" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <DollarSign size={32} color="#27ae60" />
                <Text style={styles.memberName}>{memberName}</Text>
              </View>
              <View style={styles.amountContainer}>
                <Text style={styles.amountLabel}>Montant total à payer</Text>
                <Text style={styles.amount}>
                  {formattedAmount} {currencySymbol}
                </Text>
                <Text style={styles.amountNote}>
                  {currency === 'FC' ? 'Frais d\'inscription fixe' : 
                   currency === 'USD' ? 'Registration fee' : 
                   'Frais d\'inscription'}
                </Text>
              </View>
            </View>

            {step === 'method' && renderMethodSelection()}
            {step === 'details' && renderPaymentDetails()}
            {step === 'processing' && renderProcessing()}
            {step === 'success' && renderSuccess()}

            <View style={styles.footer}>
              <View style={styles.securityBadge}>
                <Shield size={14} color="#27ae60" />
                <Text style={styles.securityBadgeText}>
                  🔒 Paiement 100% sécurisé
                </Text>
              </View>
              <Text style={styles.footerText}>
                Aucune donnée bancaire n'est stockée sur nos serveurs
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
    marginLeft: 12,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  infoCard: {
    backgroundColor: '#f0f9f4',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#27ae60',
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  memberName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  amountContainer: {
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  amount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#27ae60',
    marginBottom: 4,
  },
  amountNote: {
    fontSize: 12,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  stepContainer: {
    padding: 20,
    paddingTop: 0,
    flex: 1,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  methodButton: {
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    backgroundColor: 'white',
  },
  methodButtonActive: {
    borderColor: '#27ae60',
    backgroundColor: '#f8f9fa',
  },
  methodContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 4,
  },
  methodDesc: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 8,
    lineHeight: 18,
  },
  providerTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  providerTag: {
    fontSize: 11,
    color: '#7f8c8d',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  selectedIndicator: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#27ae60',
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
    marginTop: 16,
  },
  providersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 8,
  },
  providerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderRadius: 12,
    backgroundColor: 'white',
    margin: 6,
    flex: 1,
    minWidth: '45%',
    justifyContent: 'center',
  },
  providerButtonActive: {
    backgroundColor: '#f8f9fa',
    borderWidth: 3,
    borderColor: '#3498db',
  },
  providerIcon: {
    marginRight: 8,
  },
  providerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  providerTextActive: {
    fontWeight: '700',
    color: '#3498db',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2c3e50',
    minHeight: 56,
  },
  inputWithIcon: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    top: 18,
    zIndex: 1,
  },
  inputWithIconPadding: {
    paddingLeft: 46,
  },
  inputHelp: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 8,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  halfInput: {
    flex: 1,
  },
  securityNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  securityNoticeText: {
    flex: 1,
    fontSize: 13,
    color: '#27ae60',
    lineHeight: 18,
  },
  digitalWalletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#bbdefb',
  },
  digitalWalletText: {
    flex: 1,
    fontSize: 13,
    color: '#1976d2',
    lineHeight: 18,
  },
  buttonGroup: {
    flexDirection: 'row',
    marginTop: 30,
    minHeight: 56,
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#dee2e6',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  payButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#27ae60',
    minHeight: 56,
  },
  payButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  payButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  nextButton: {
    backgroundColor: '#3498db',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    minHeight: 56,
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  securityText: {
    fontSize: 12,
    color: '#27ae60',
    fontWeight: '500',
  },
  amountConfirmation: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
    color: '#7f8c8d',
  },
  amountBold: {
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  processingContainer: {
    alignItems: 'center',
    padding: 40,
    flex: 1,
    justifyContent: 'center',
  },
  processingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  processingText: {
    fontSize: 15,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  processingSteps: {
    width: '100%',
    marginBottom: 40,
  },
  processingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ecf0f1',
    borderWidth: 2,
    borderColor: '#bdc3c7',
  },
  stepDotActive: {
    backgroundColor: '#27ae60',
    borderColor: '#27ae60',
  },
  stepText: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 1,
  },
  qrIcon: {
    marginTop: 20,
    opacity: 0.5,
  },
  processingNote: {
    fontSize: 12,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  successContainer: {
    alignItems: 'center',
    padding: 40,
    flex: 1,
    justifyContent: 'center',
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 24,
    textAlign: 'center',
  },
  transactionDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#ecf0f1',
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  transactionLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  transactionValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
  },
  successMessage: {
    fontSize: 16,
    color: '#2c3e50',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  successSpinner: {
    marginTop: 20,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    marginBottom: 12,
  },
  securityBadgeText: {
    fontSize: 12,
    color: '#27ae60',
    fontWeight: '600',
  },
  footerText: {
    fontSize: 11,
    color: '#95a5a6',
    textAlign: 'center',
  },
}); 