import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity, Modal as RNModal, Switch } from 'react-native';
import { CreditCard, Smartphone, Building2, X, CheckCircle, Wallet, Shield } from 'lucide-react-native';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { colors, spacing, borderRadius, typography, shadows } from '../lib/designSystem';
import { PaymentService, PAYMENT_SECURITY_CODES } from '../services/paymentService';
import { PostgreSQLService } from '../lib/postgresql'; // Import PostgreSQL 

type PaymentMethod = 'card' | 'mobile' | 'transfer' | 'google_pay' | 'visa' | 'mastercard';

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onPaymentSuccess?: (paymentData: PaymentData) => void;
  onSuccess?: () => void;
  amount: number;
  currency?: string;
  recipientName?: string;
  description?: string;
  subscriptionType?: 'monthly' | 'yearly';
  churchId?: string;
}

export interface PaymentData {
  method: PaymentMethod;
  reference: string;
  timestamp: Date;
  note?: string;
  securityToken?: string;
  apiKey?: string;
}

export function PaymentModal({
  visible,
  onClose,
  onPaymentSuccess,
  onSuccess,
  amount,
  currency = 'USD',
  recipientName = 'My Church',
  description,
  subscriptionType,
  churchId,
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('mobile');
  const [processing, setProcessing] = useState(false);
  const [securityCode, setSecurityCode] = useState('');

  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardType, setCardType] = useState<'visa' | 'mastercard'>('visa');

  const [mobileNumber, setMobileNumber] = useState('');
  const [mobileProvider, setMobileProvider] = useState<'mpesa' | 'airtel' | 'orange' | 'afrimoney'>('mpesa');
  const [mobileAccountName, setMobileAccountName] = useState('');

  const [transferReference, setTransferReference] = useState('');
  const [transferBank, setTransferBank] = useState('');
  const [transferAccountNumber, setTransferAccountNumber] = useState('');
  const [transferAccountName, setTransferAccountName] = useState('');
  const [transferSwiftCode, setTransferSwiftCode] = useState('');

  const [googlePayEmail, setGooglePayEmail] = useState('');
  const [googlePayTransactionId, setGooglePayTransactionId] = useState('');

  const [note, setNote] = useState('');

  // Choix du montant
  const [selectedCurrency, setSelectedCurrency] = useState<'USD'>('USD');
  const [customAmount, setCustomAmount] = useState(false);
  const [enteredAmount, setEnteredAmount] = useState('');

  const getDisplayAmount = () => {
    if (subscriptionType) {
      // Prix fixes en USD uniquement
      if (subscriptionType === 'monthly') return 100;
      if (subscriptionType === 'yearly') return 1000;
    } else {
      if (customAmount && enteredAmount) {
        return parseFloat(enteredAmount) || 0;
      }
      return amount;
    }

    return amount;
  };

  const getDisplayCurrency = () => {
    // Toujours USD pour l'abonnement
    return 'USD';
  };

  const getBankTransferInfo = () => {
    const bankInfo = PaymentService.getBankTransferInfo('USD');
    return bankInfo;
  };

  const resetForm = () => {
    setCardNumber('');
    setCardExpiry('');
    setCardCVV('');
    setCardName('');
    setMobileNumber('');
    setMobileAccountName('');
    setTransferReference('');
    setTransferBank('');
    setTransferAccountNumber('');
    setTransferAccountName('');
    setTransferSwiftCode('');
    setGooglePayEmail('');
    setGooglePayTransactionId('');
    setNote('');
    setEnteredAmount('');
    setSecurityCode('');
  };

  const validateCardNumber = () => {
    if (selectedMethod === 'visa') {
      return PaymentService.isValidVisaCard(cardNumber);
    } else if (selectedMethod === 'mastercard') {
      return PaymentService.isValidMasterCard(cardNumber);
    }
    return cardNumber.replace(/\s/g, '').length >= 16;
  };

  const validateAndPay = async () => {
    try {
      // Validation du code de sécurité pour les paiements bancaires
      if (selectedMethod === 'transfer' && !securityCode) {
        Alert.alert('Erreur', 'Le code de sécurité est requis pour les virements bancaires');
        return;
      }

      // Validation spécifique selon la méthode
      if (selectedMethod === 'card' || selectedMethod === 'visa' || selectedMethod === 'mastercard') {
        if (!cardNumber || !cardExpiry || !cardCVV || !cardName) {
          Alert.alert('Erreur', 'Veuillez remplir tous les champs de la carte');
          return;
        }
        
        // Validation du format d'expiration
        const expiryRegex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
        if (!expiryRegex.test(cardExpiry)) {
          Alert.alert('Erreur', 'Format d\'expiration invalide. Utilisez MM/AA (ex: 12/25)');
          return;
        }
        
        if (!validateCardNumber()) {
          Alert.alert('Erreur', 'Numéro de carte invalide');
          return;
        }
      } else if (selectedMethod === 'mobile') {
        if (!mobileNumber || !mobileAccountName) {
          Alert.alert('Erreur', 'Veuillez remplir tous les champs Mobile Money');
          return;
        }
      } else if (selectedMethod === 'transfer') {
        if (!transferAccountNumber || !transferAccountName) {
          Alert.alert('Erreur', 'Veuillez remplir tous les champs du virement');
          return;
        }
        
        if (securityCode !== PAYMENT_SECURITY_CODES.VALIDATION_CODE) {
          Alert.alert('Erreur', 'Code de sécurité invalide');
          return;
        }
      } else if (selectedMethod === 'google_pay') {
        if (!googlePayEmail) {
          Alert.alert('Erreur', 'Email Google Pay requis');
          return;
        }
      }

      if (!subscriptionType && customAmount && (!enteredAmount || parseFloat(enteredAmount) <= 0)) {
        Alert.alert('Erreur', 'Veuillez entrer un montant valide');
        return;
      }

      setProcessing(true);

      // Utiliser le PaymentService pour traiter le paiement
      const finalAmount = getDisplayAmount();
      const finalCurrency = getDisplayCurrency();
      
      const paymentMethod = selectedMethod === 'card' ? 'visa' : selectedMethod;
      
      const paymentRequest = {
        amount: finalAmount,
        currency: finalCurrency,
        phoneNumber: mobileNumber || undefined,
        paymentMethod: paymentMethod,
        reference: PaymentService.generateBankTransferReference(),
        description: description || (subscriptionType ? `Abonnement My Church ${subscriptionType}` : 'Don My Church'),
        cardDetails: (selectedMethod === 'card' || selectedMethod === 'visa' || selectedMethod === 'mastercard') ? {
          cardNumber,
          cardHolderName: cardName,
          expiryMonth: cardExpiry.split('/')[0] || '',
          expiryYear: cardExpiry.split('/')[1] || '',
          cvv: cardCVV,
          cardType: selectedMethod === 'mastercard' ? 'mastercard' : 'visa'
        } : undefined
      };

      // Valider la méthode de paiement
      const validation = await PaymentService.validatePaymentMethod(
        paymentMethod,
        mobileNumber || undefined,
        paymentRequest.cardDetails
      );

      if (!validation.valid) {
        throw new Error(validation.message);
      }

      // Traiter le paiement avec PostgreSQL
      const response = await PaymentService.processPayment(
        paymentRequest,
        churchId,
        subscriptionType
      );

      if (!response.success) {
        throw new Error(response.message || 'Le paiement a échoué');
      }

      // Générer les données de paiement
      const paymentData: PaymentData = {
        method: selectedMethod,
        reference: response.transactionId,
        timestamp: new Date(),
        note: note || undefined,
        securityToken: PAYMENT_SECURITY_CODES.SECURITY_TOKEN,
        apiKey: PaymentService.generateApiToken(selectedMethod)
      };

      // Gérer l'abonnement si applicable
      if (subscriptionType && churchId) {
        console.log('🔐 Abonnement activé pour église:', churchId);
        
        if (onSuccess) {
          onSuccess();
        }
      }

      // Appeler le callback de succès
      if (onPaymentSuccess) {
        onPaymentSuccess(paymentData);
      }

      resetForm();
      
      // Afficher le reçu
      const receipt = PaymentService.generateReceipt({
        id: response.transactionId,
        amount: finalAmount,
        currency: finalCurrency,
        method: selectedMethod,
        date: response.timestamp,
        description: paymentRequest.description
      });
      
      Alert.alert(
        '✅ Paiement réussi!',
        `${receipt}\n\nMontant: ${finalAmount} ${finalCurrency}\nTransaction: ${response.transactionId}`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error: any) {
      console.error('❌ Erreur dans validateAndPay:', error);
      Alert.alert(
        '❌ Erreur de paiement',
        error.message || 'Le paiement a échoué. Veuillez réessayer.'
      );
    } finally {
      setProcessing(false);
    }
  };

  const renderMethodSelector = () => (
    <View style={styles.methodSelector}>
      <Button
        label="Mobile Money"
        onPress={() => setSelectedMethod('mobile')}
        variant={selectedMethod === 'mobile' ? 'primary' : 'outline'}
        size="medium"
        icon={<Smartphone size={20} color={selectedMethod === 'mobile' ? '#fff' : colors.textSecondary} />}
        fullWidth
      />
      <Button
        label="VISA"
        onPress={() => setSelectedMethod('visa')}
        variant={selectedMethod === 'visa' ? 'primary' : 'outline'}
        size="medium"
        icon={<CreditCard size={20} color={selectedMethod === 'visa' ? '#fff' : colors.textSecondary} />}
        fullWidth
      />
      <Button
        label="MasterCard"
        onPress={() => setSelectedMethod('mastercard')}
        variant={selectedMethod === 'mastercard' ? 'primary' : 'outline'}
        size="medium"
        icon={<CreditCard size={20} color={selectedMethod === 'mastercard' ? '#fff' : colors.textSecondary} />}
        fullWidth
      />
      <Button
        label="Google Pay"
        onPress={() => setSelectedMethod('google_pay')}
        variant={selectedMethod === 'google_pay' ? 'primary' : 'outline'}
        size="medium"
        icon={<Wallet size={20} color={selectedMethod === 'google_pay' ? '#fff' : colors.textSecondary} />}
        fullWidth
      />
      <Button
        label="Virement Bancaire"
        onPress={() => setSelectedMethod('transfer')}
        variant={selectedMethod === 'transfer' ? 'primary' : 'outline'}
        size="medium"
        icon={<Building2 size={20} color={selectedMethod === 'transfer' ? '#fff' : colors.textSecondary} />}
        fullWidth
      />
    </View>
  );

  const renderCardForm = () => (
    <View style={styles.form}>
      <Text style={styles.label}>Type de carte</Text>
      <View style={styles.cardTypeButtons}>
        <TouchableOpacity
          style={[
            styles.cardTypeButton,
            cardType === 'visa' && styles.cardTypeButtonActive
          ]}
          onPress={() => setCardType('visa')}
        >
          <Text style={[
            styles.cardTypeButtonText,
            cardType === 'visa' && styles.cardTypeButtonTextActive
          ]}>VISA</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.cardTypeButton,
            cardType === 'mastercard' && styles.cardTypeButtonActive
          ]}
          onPress={() => setCardType('mastercard')}
        >
          <Text style={[
            styles.cardTypeButtonText,
            cardType === 'mastercard' && styles.cardTypeButtonTextActive
          ]}>MasterCard</Text>
        </TouchableOpacity>
      </View>
      
      <Input
        label="Numéro de carte"
        value={cardNumber}
        onChangeText={setCardNumber}
        placeholder="1234 5678 9012 3456"
        keyboardType="numeric"
        maxLength={19}
        icon={<CreditCard size={20} color={colors.textSecondary} />}
        required
      />
      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Input
            label="Expiration (MM/AA)"
            value={cardExpiry}
            onChangeText={setCardExpiry}
            placeholder="MM/AA"
            keyboardType="numeric"
            maxLength={5}
            required
            format={(text) => {
              const cleaned = text.replace(/\D/g, '');
              if (cleaned.length >= 3) {
                return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
              }
              return cleaned;
            }}
          />
        </View>
        <View style={styles.halfInput}>
          <Input
            label="CVV"
            value={cardCVV}
            onChangeText={setCardCVV}
            placeholder="123"
            keyboardType="numeric"
            maxLength={3}
            secureTextEntry
            required
          />
        </View>
      </View>
      <Input
        label="Nom sur la carte"
        value={cardName}
        onChangeText={setCardName}
        placeholder="JEAN DUPONT"
        required
      />
      
      <View style={styles.securityInfo}>
        <Shield size={16} color="#27ae60" />
        <Text style={styles.securityInfoText}>
          Transaction sécurisée avec cryptage AES-256
        </Text>
      </View>
    </View>
  );

  const renderMobileForm = () => (
    <View style={styles.form}>
      <Text style={styles.label}>Fournisseur Mobile Money</Text>
      <View style={styles.providerButtons}>
        {(['mpesa', 'airtel', 'orange', 'afrimoney'] as const).map((provider) => (
          <TouchableOpacity
            key={provider}
            style={[
              styles.providerButton,
              mobileProvider === provider && styles.providerButtonActive
            ]}
            onPress={() => setMobileProvider(provider)}
          >
            <Text style={[
              styles.providerButtonText,
              mobileProvider === provider && styles.providerButtonTextActive
            ]}>
              {provider === 'mpesa' ? 'M-Pesa' :
               provider === 'airtel' ? 'Airtel Money' :
               provider === 'orange' ? 'Orange Money' :
               'Afrimoney'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Input
        label="Numéro de téléphone *"
        value={mobileNumber}
        onChangeText={setMobileNumber}
        placeholder="+243 XX XXX XXXX"
        keyboardType="phone-pad"
        icon={<Smartphone size={20} color={colors.textSecondary} />}
        required
      />
      <Input
        label="Nom du compte *"
        value={mobileAccountName}
        onChangeText={setMobileAccountName}
        placeholder="Jean Dupont"
        required
      />
    </View>
  );

  const renderTransferForm = () => {
    const bankInfo = getBankTransferInfo();
    
    return (
      <View style={styles.form}>
        <View style={styles.bankInfoCard}>
          <Text style={styles.bankInfoTitle}>Informations bancaires My Church</Text>
          <View style={styles.bankInfoRow}>
            <Text style={styles.bankInfoLabel}>Banque:</Text>
            <Text style={styles.bankInfoValue}>{bankInfo.bankName}</Text>
          </View>
          <View style={styles.bankInfoRow}>
            <Text style={styles.bankInfoLabel}>Compte:</Text>
            <Text style={styles.bankInfoValue}>{bankInfo.accountNumber}</Text>
          </View>
          <View style={styles.bankInfoRow}>
            <Text style={styles.bankInfoLabel}>Titulaire:</Text>
            <Text style={styles.bankInfoValue}>{bankInfo.accountName}</Text>
          </View>
          <View style={styles.bankInfoRow}>
            <Text style={styles.bankInfoLabel}>SWIFT:</Text>
            <Text style={styles.bankInfoValue}>{bankInfo.swiftCode}</Text>
          </View>
          <View style={styles.bankInfoRow}>
            <Text style={styles.bankInfoLabel}>IBAN:</Text>
            <Text style={styles.bankInfoValue}>{bankInfo.iban}</Text>
          </View>
        </View>
        
        <Input
          label="Nom de votre banque *"
          value={transferBank}
          onChangeText={setTransferBank}
          placeholder="Ex: Rawbank, Equity, BCDC..."
          icon={<Building2 size={20} color={colors.textSecondary} />}
          required
        />
        <Input
          label="Numéro de compte *"
          value={transferAccountNumber}
          onChangeText={setTransferAccountNumber}
          placeholder="Ex: 123456789"
          keyboardType="numeric"
          required
        />
        <Input
          label="Nom du titulaire *"
          value={transferAccountName}
          onChangeText={setTransferAccountName}
          placeholder="Jean Dupont"
          required
        />
        <Input
          label="Code SWIFT (optionnel)"
          value={transferSwiftCode}
          onChangeText={setTransferSwiftCode}
          placeholder="SWIFT de votre banque"
        />
        
        <Input
          label="Code de sécurité *"
          value={securityCode}
          onChangeText={setSecurityCode}
          placeholder="Entrez le code de validation"
          secureTextEntry
          icon={<Shield size={20} color={colors.textSecondary} />}
          required
        />
        <Text style={styles.helpText}>
          🔐 Code de sécurité requis pour valider le virement
        </Text>
      </View>
    );
  };

  const renderGooglePayForm = () => (
    <View style={styles.form}>
      <Input
        label="Email Google Pay *"
        value={googlePayEmail}
        onChangeText={setGooglePayEmail}
        placeholder="example@gmail.com"
        keyboardType="email-address"
        icon={<Wallet size={20} color={colors.textSecondary} />}
        required
      />
      
      <View style={styles.googlePayInfo}>
        <Wallet size={40} color="#4285F4" />
        <Text style={styles.googlePayText}>
          Ouvrez l'application Google Pay pour compléter le paiement
        </Text>
        <Text style={styles.googlePaySubtext}>
          Sécurité garantie par Google et My Church
        </Text>
      </View>
    </View>
  );

  const renderAmountSelector = () => {
    const fees = PaymentService.calculateFees(
      getDisplayAmount(),
      selectedMethod,
      getDisplayCurrency()
    );

    return (
      <View style={styles.amountSection}>
        <Text style={styles.sectionTitleText}>💰 Choisissez votre montant</Text>

        {subscriptionType ? (
          <View style={styles.subscriptionAmounts}>
            <View style={styles.subscriptionCard}>
              <Text style={styles.subscriptionType}>
                Abonnement {subscriptionType === 'monthly' ? 'Mensuel' : 'Annuel'}
              </Text>
              <Text style={styles.subscriptionPrice}>
                {subscriptionType === 'monthly' ? '$100 USD/mois' : '$1000 USD/an'}
              </Text>
              <Text style={styles.subscriptionCurrency}>
                USD uniquement
              </Text>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.amountOptions}>
              <TouchableOpacity
                style={[
                  styles.amountCard,
                  !customAmount && styles.amountCardActive
                ]}
                onPress={() => setCustomAmount(false)}
              >
                <Text style={styles.amountValue}>$5</Text>
                <Text style={styles.amountLabel}>Dollars US</Text>
                {!customAmount && <CheckCircle size={20} color="#27ae60" />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.amountCard,
                  !customAmount && styles.amountCardActive
                ]}
                onPress={() => setCustomAmount(false)}
              >
                <Text style={styles.amountValue}>$10</Text>
                <Text style={styles.amountLabel}>Dollars US</Text>
                {!customAmount && <CheckCircle size={20} color="#27ae60" />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.amountCard,
                  !customAmount && styles.amountCardActive
                ]}
                onPress={() => setCustomAmount(false)}
              >
                <Text style={styles.amountValue}>$20</Text>
                <Text style={styles.amountLabel}>Dollars US</Text>
                {!customAmount && <CheckCircle size={20} color="#27ae60" />}
              </TouchableOpacity>
            </View>

            <View style={styles.customAmountRow}>
              <Text style={styles.customAmountLabel}>Montant personnalisé</Text>
              <Switch
                value={customAmount}
                onValueChange={setCustomAmount}
                trackColor={{ false: '#bdc3c7', true: '#3498db' }}
                thumbColor={customAmount ? '#fff' : '#f4f3f4'}
              />
            </View>

            {customAmount && (
              <View style={styles.customAmountInputs}>
                <Text style={styles.currencyLabel}>USD uniquement</Text>
                <Input
                  label={`Montant en USD`}
                  value={enteredAmount}
                  onChangeText={setEnteredAmount}
                  placeholder="Entrez le montant"
                  keyboardType="numeric"
                  required
                />
              </View>
            )}

            {/* Affichage des frais */}
            <View style={styles.feesInfo}>
              <View style={styles.feesRow}>
                <Text style={styles.feesLabel}>Frais de transaction:</Text>
                <Text style={styles.feesValue}>{fees.feePercentage}</Text>
              </View>
              <View style={styles.feesRow}>
                <Text style={styles.feesLabel}>Montant des frais:</Text>
                <Text style={styles.feesValue}>{fees.fees} {getDisplayCurrency()}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total à payer:</Text>
                <Text style={styles.totalValue}>{fees.total} {getDisplayCurrency()}</Text>
              </View>
            </View>
          </>
        )}
      </View>
    );
  };

  const renderPaymentInfo = () => {
    const methodInfo = PaymentService.getPaymentMethodInfo(selectedMethod);
    const fees = PaymentService.calculateFees(
      getDisplayAmount(),
      selectedMethod,
      getDisplayCurrency()
    );
    
    return (
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Récapitulatif du paiement</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Destinataire:</Text>
          <Text style={styles.infoValue}>{recipientName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Montant:</Text>
          <Text style={styles.infoValue}>{getDisplayAmount().toLocaleString()} {getDisplayCurrency()}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Frais ({methodInfo.fees}):</Text>
          <Text style={styles.infoValue}>{fees.fees} {getDisplayCurrency()}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Total à payer:</Text>
          <Text style={styles.infoAmount}>{fees.total.toLocaleString()} {getDisplayCurrency()}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Méthode:</Text>
          <Text style={styles.infoValue}>{methodInfo.name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Traitement:</Text>
          <Text style={styles.infoValue}>{methodInfo.processingTime}</Text>
        </View>
        {subscriptionType && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Type d'abonnement:</Text>
            <Text style={styles.infoValue}>
              {subscriptionType === 'monthly' ? 'Mensuel ($100 USD)' : 'Annuel ($1000 USD)'}
            </Text>
          </View>
        )}
        {description && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Description:</Text>
            <Text style={styles.infoValue}>{description}</Text>
          </View>
        )}
        <View style={styles.securityBadge}>
          <Shield size={14} color="#27ae60" />
          <Text style={styles.securityBadgeText}>
            🔐 Transaction sécurisée - My Church by Henock Aduma
          </Text>
        </View>
      </View>
    );
  };

  if (subscriptionType) {
    return (
      <RNModal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={verticalStyles.container}>
          <View style={verticalStyles.header}>
            <Text style={verticalStyles.title}>💳 Paiement Abonnement My Church</Text>
            <TouchableOpacity onPress={onClose} style={verticalStyles.closeButton}>
              <X size={24} color="#7f8c8d" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={verticalStyles.content}
            showsVerticalScrollIndicator={true}
            persistentScrollbar={true}
            contentContainerStyle={verticalStyles.contentContainer}
          >
            {renderAmountSelector()}

            {renderPaymentInfo()}

            <Text style={verticalStyles.sectionTitle}>Méthode de paiement</Text>
            <View style={verticalStyles.methodSelectorVertical}>
              <TouchableOpacity
                style={[
                  verticalStyles.methodCard,
                  selectedMethod === 'mobile' && verticalStyles.methodCardActive
                ]}
                onPress={() => setSelectedMethod('mobile')}
              >
                <Smartphone size={24} color={selectedMethod === 'mobile' ? '#3498db' : '#7f8c8d'} />
                <Text style={[
                  verticalStyles.methodText,
                  selectedMethod === 'mobile' && verticalStyles.methodTextActive
                ]}>Mobile Money</Text>
                {selectedMethod === 'mobile' && <CheckCircle size={20} color="#3498db" />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  verticalStyles.methodCard,
                  selectedMethod === 'visa' && verticalStyles.methodCardActive
                ]}
                onPress={() => setSelectedMethod('visa')}
              >
                <CreditCard size={24} color={selectedMethod === 'visa' ? '#3498db' : '#7f8c8d'} />
                <Text style={[
                  verticalStyles.methodText,
                  selectedMethod === 'visa' && verticalStyles.methodTextActive
                ]}>VISA</Text>
                {selectedMethod === 'visa' && <CheckCircle size={20} color="#3498db" />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  verticalStyles.methodCard,
                  selectedMethod === 'mastercard' && verticalStyles.methodCardActive
                ]}
                onPress={() => setSelectedMethod('mastercard')}
              >
                <CreditCard size={24} color={selectedMethod === 'mastercard' ? '#3498db' : '#7f8c8d'} />
                <Text style={[
                  verticalStyles.methodText,
                  selectedMethod === 'mastercard' && verticalStyles.methodTextActive
                ]}>MasterCard</Text>
                {selectedMethod === 'mastercard' && <CheckCircle size={20} color="#3498db" />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  verticalStyles.methodCard,
                  selectedMethod === 'transfer' && verticalStyles.methodCardActive
                ]}
                onPress={() => setSelectedMethod('transfer')}
              >
                <Building2 size={24} color={selectedMethod === 'transfer' ? '#3498db' : '#7f8c8d'} />
                <Text style={[
                  verticalStyles.methodText,
                  selectedMethod === 'transfer' && verticalStyles.methodTextActive
                ]}>Virement Bancaire</Text>
                {selectedMethod === 'transfer' && <CheckCircle size={20} color="#3498db" />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  verticalStyles.methodCard,
                  selectedMethod === 'google_pay' && verticalStyles.methodCardActive
                ]}
                onPress={() => setSelectedMethod('google_pay')}
              >
                <Wallet size={24} color={selectedMethod === 'google_pay' ? '#3498db' : '#7f8c8d'} />
                <Text style={[
                  verticalStyles.methodText,
                  selectedMethod === 'google_pay' && verticalStyles.methodTextActive
                ]}>Google Pay</Text>
                {selectedMethod === 'google_pay' && <CheckCircle size={20} color="#3498db" />}
              </TouchableOpacity>
            </View>

            {selectedMethod === 'visa' && renderCardForm()}
            {selectedMethod === 'mastercard' && renderCardForm()}
            {selectedMethod === 'mobile' && renderMobileForm()}
            {selectedMethod === 'transfer' && renderTransferForm()}
            {selectedMethod === 'google_pay' && renderGooglePayForm()}

            <Input
              label="Note (optionnel)"
              value={note}
              onChangeText={setNote}
              placeholder="Ajoutez une note..."
              multiline
              numberOfLines={3}
            />
          </ScrollView>

          <View style={verticalStyles.footer}>
            <Button
              label={`💳 Valider le paiement - ${getDisplayAmount().toLocaleString()} ${getDisplayCurrency()}`}
              onPress={validateAndPay}
              variant="primary"
              size="large"
              loading={processing}
              fullWidth
            />
            <Text style={verticalStyles.footerNote}>
              🔐 Paiement sécurisé avec clés API réservées - Created by Henock Aduma
            </Text>
          </View>
        </View>
      </RNModal>
    );
  }

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Effectuer un paiement"
      size="large"
      footer={
        <View style={styles.footer}>
          <Button
            label="Annuler"
            onPress={onClose}
            variant="outline"
            size="large"
            fullWidth
          />
          <Button
            label={`Payer ${getDisplayAmount().toLocaleString()} ${getDisplayCurrency()}`}
            onPress={validateAndPay}
            variant="primary"
            size="large"
            loading={processing}
            fullWidth
          />
        </View>
      }
    >
      {renderMethodSelector()}
      {renderPaymentInfo()}

      {selectedMethod === 'visa' && renderCardForm()}
      {selectedMethod === 'mastercard' && renderCardForm()}
      {selectedMethod === 'mobile' && renderMobileForm()}
      {selectedMethod === 'transfer' && renderTransferForm()}
      {selectedMethod === 'google_pay' && renderGooglePayForm()}

      <Input
        label="Note (optionnel)"
        value={note}
        onChangeText={setNote}
        placeholder="Ajoutez une note..."
        multiline
        numberOfLines={3}
      />
    </Modal>
  );
}

const verticalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 24,
    marginBottom: 12,
  },
  methodSelectorVertical: {
    marginBottom: 24,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 18,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ecf0f1',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  methodCardActive: {
    borderColor: '#3498db',
    backgroundColor: '#f0f8ff',
  },
  methodText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
    marginLeft: 12,
  },
  methodTextActive: {
    color: '#3498db',
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  footerNote: {
    fontSize: 12,
    color: '#f39c12',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
    fontWeight: '600',
  },
});

const styles = StyleSheet.create({
  methodSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  form: {
    marginTop: spacing.lg,
  },
  row: {
    flexDirection: 'row',
  },
  halfInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  cardTypeButtons: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  cardTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ecf0f1',
    backgroundColor: 'white',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  cardTypeButtonActive: {
    borderColor: '#3498db',
    backgroundColor: '#f0f8ff',
  },
  cardTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  cardTypeButtonTextActive: {
    color: '#3498db',
  },
  providerButtons: {
    marginBottom: spacing.md,
  },
  providerButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ecf0f1',
    backgroundColor: 'white',
    marginBottom: 8,
    alignItems: 'center',
  },
  providerButtonActive: {
    borderColor: '#3498db',
    backgroundColor: '#f0f8ff',
  },
  providerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  providerButtonTextActive: {
    color: '#3498db',
  },
  bankInfoCard: {
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#3498db',
  },
  bankInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  bankInfoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bankInfoLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    width: 80,
  },
  bankInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  googlePayInfo: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    marginTop: 20,
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
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  securityInfoText: {
    fontSize: 14,
    color: '#27ae60',
    fontWeight: '500',
  },
  helpText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  amountSection: {
    marginBottom: 24,
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  subscriptionAmounts: {
    marginBottom: 16,
  },
  subscriptionCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3498db',
    alignItems: 'center',
  },
  subscriptionType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subscriptionPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 8,
  },
  subscriptionCurrency: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  amountOptions: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  amountCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ecf0f1',
    marginHorizontal: 6,
    alignItems: 'center',
  },
  amountCardActive: {
    borderColor: '#27ae60',
    backgroundColor: '#f0fdf4',
  },
  amountValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  amountLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  customAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  customAmountLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
  },
  customAmountInputs: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3498db',
  },
  currencyLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
    textAlign: 'center',
  },
  feesInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  feesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  feesLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  feesValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3498db',
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#3498db',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  infoAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3498db',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  securityBadgeText: {
    fontSize: 12,
    color: '#f39c12',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});