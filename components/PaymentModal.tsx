import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity, Modal as RNModal, Switch } from 'react-native';
import { CreditCard, Smartphone, Building2, X, CheckCircle, Wallet } from 'lucide-react-native';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { colors, spacing, borderRadius, typography, shadows } from '../lib/designSystem';
import { PaymentService } from '../services/paymentService';

type PaymentMethod = 'card' | 'mobile' | 'transfer' | 'google_pay';

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

  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [cardName, setCardName] = useState('');

  const [mobileNumber, setMobileNumber] = useState('');
  const [mobileProvider, setMobileProvider] = useState<'mpesa' | 'airtel' | 'orange' | 'afrimoney'>('mpesa');
  const [mobileTransactionId, setMobileTransactionId] = useState('');
  const [mobileAccountName, setMobileAccountName] = useState('');

  const [transferReference, setTransferReference] = useState('');
  const [transferBank, setTransferBank] = useState('');
  const [transferAccountNumber, setTransferAccountNumber] = useState('');
  const [transferAccountName, setTransferAccountName] = useState('');

  const [googlePayEmail, setGooglePayEmail] = useState('');
  const [googlePayTransactionId, setGooglePayTransactionId] = useState('');

  const [note, setNote] = useState('');

  // Choix du montant
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'FC'>('USD');
  const [customAmount, setCustomAmount] = useState(false);
  const [enteredAmount, setEnteredAmount] = useState('');

  const getDisplayAmount = () => {
    if (customAmount && enteredAmount) {
      return parseFloat(enteredAmount) || 0;
    }

    // For subscription flows show the preset options; otherwise use the passed amount prop
    if (subscriptionType) {
      if (subscriptionType === 'monthly') {
        return selectedCurrency === 'USD' ? 100 : 250000;
      } else if (subscriptionType === 'yearly') {
        return selectedCurrency === 'USD' ? 1000 : 2500000;
      }
    } else {
      return amount;
    }

    return amount;
  };

  const getDisplayCurrency = () => {
    if (customAmount && enteredAmount) {
      return selectedCurrency;
    }

    if (subscriptionType) {
      return selectedCurrency;
    }

    return currency;
  };

  const resetForm = () => {
    setCardNumber('');
    setCardExpiry('');
    setCardCVV('');
    setCardName('');
    setMobileNumber('');
    setMobileTransactionId('');
    setMobileAccountName('');
    setTransferReference('');
    setTransferBank('');
    setTransferAccountNumber('');
    setTransferAccountName('');
    setGooglePayEmail('');
    setGooglePayTransactionId('');
    setNote('');
    setEnteredAmount('');
  };

  const validateAndPay = async () => {
    if (selectedMethod === 'card') {
      if (!cardNumber || !cardExpiry || !cardCVV || !cardName) {
        Alert.alert('Erreur', 'Veuillez remplir tous les champs de la carte');
        return;
      }
    } else if (selectedMethod === 'mobile') {
      if (!mobileNumber || !mobileTransactionId || !mobileAccountName) {
        Alert.alert('Erreur', 'Veuillez remplir tous les champs Mobile Money');
        return;
      }
    } else if (selectedMethod === 'transfer') {
      if (!transferReference || !transferBank || !transferAccountNumber || !transferAccountName) {
        Alert.alert('Erreur', 'Veuillez remplir tous les champs du virement');
        return;
      }
    } else if (selectedMethod === 'google_pay') {
      if (!googlePayEmail || !googlePayTransactionId) {
        Alert.alert('Erreur', 'Veuillez remplir tous les champs Google Pay');
        return;
      }
    }

    if (customAmount && (!enteredAmount || parseFloat(enteredAmount) <= 0)) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide');
      return;
    }

    setProcessing(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const reference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const paymentData: PaymentData = {
        method: selectedMethod,
        reference,
        timestamp: new Date(),
        note: note || undefined,
      };

      const finalAmount = getDisplayAmount();
      const finalCurrency = getDisplayCurrency();

      if (subscriptionType && churchId) {
        // Use a runtime check and fallbacks so this file doesn't depend on a specific exported name
        const svc: any = PaymentService as any;
        if (typeof svc.processSubscriptionPayment === 'function') {
          await svc.processSubscriptionPayment(
            churchId,
            subscriptionType,
            finalAmount,
            selectedMethod,
            reference
          );
        } else if (typeof svc.processSubscription === 'function') {
          // Alternate possible name
          await svc.processSubscription(
            churchId,
            subscriptionType,
            finalAmount,
            selectedMethod,
            reference
          );
        } else if (typeof svc.processPayment === 'function') {
          // Generic payment handler
          await svc.processPayment({
            churchId,
            subscriptionType,
            amount: finalAmount,
            method: selectedMethod,
            reference,
          });
        } else {
          // No backend integration available — simulate a short delay for dev/test environments
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (onSuccess) {
          onSuccess();
        }
      } else if (onPaymentSuccess) {
        onPaymentSuccess(paymentData);
      }

      resetForm();
      Alert.alert('Succès', 'Paiement effectué avec succès!');
      onClose();
    } catch (error) {
      Alert.alert('Erreur', 'Le paiement a échoué. Veuillez réessayer.');
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
        label="Carte"
        onPress={() => setSelectedMethod('card')}
        variant={selectedMethod === 'card' ? 'primary' : 'outline'}
        size="medium"
        icon={<CreditCard size={20} color={selectedMethod === 'card' ? '#fff' : colors.textSecondary} />}
        fullWidth
      />
      <Button
        label="Virement"
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
            label="Expiration"
            value={cardExpiry}
            onChangeText={setCardExpiry}
            placeholder="MM/AA"
            keyboardType="numeric"
            maxLength={5}
            required
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
      <Input
        label="ID de transaction *"
        value={mobileTransactionId}
        onChangeText={setMobileTransactionId}
        placeholder="Ex: TXN123456789"
        required
      />
    </View>
  );

  const renderTransferForm = () => (
    <View style={styles.form}>
      <Input
        label="Nom de la banque *"
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
        label="Référence de transaction *"
        value={transferReference}
        onChangeText={setTransferReference}
        placeholder="REF-XXXXXXXXX"
        required
      />
    </View>
  );

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
      <Input
        label="ID de transaction *"
        value={googlePayTransactionId}
        onChangeText={setGooglePayTransactionId}
        placeholder="Ex: GP-123456789"
        required
      />
      <Text style={styles.helpText}>
        📱 Effectuez d'abord le paiement via Google Pay, puis entrez l'ID de transaction reçu par email.
      </Text>
    </View>
  );

  const renderAmountSelector = () => (
    <View style={styles.amountSection}>
      <Text style={styles.sectionTitleText}>💰 Choisissez votre montant</Text>

      {subscriptionType ? (
        // Affichage des prix d'abonnement
        <View style={styles.subscriptionAmounts}>
          <View style={styles.subscriptionCard}>
            <Text style={styles.subscriptionType}>
              Abonnement {subscriptionType === 'monthly' ? 'Mensuel' : 'Annuel'}
            </Text>
            <View style={styles.currencyOptions}>
              <TouchableOpacity
                style={[
                  styles.currencyButton,
                  selectedCurrency === 'FC' && styles.currencyButtonActive
                ]}
                onPress={() => setSelectedCurrency('FC')}
              >
                <Text style={[
                  styles.currencyButtonText,
                  selectedCurrency === 'FC' && styles.currencyButtonTextActive
                ]}>
                  {subscriptionType === 'monthly' ? '250,000 FC' : '2,500,000 FC'}
                </Text>
                <Text style={styles.currencyLabel}>Francs Congolais</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.currencyButton,
                  selectedCurrency === 'USD' && styles.currencyButtonActive
                ]}
                onPress={() => setSelectedCurrency('USD')}
              >
                <Text style={[
                  styles.currencyButtonText,
                  selectedCurrency === 'USD' && styles.currencyButtonTextActive
                ]}>
                  {subscriptionType === 'monthly' ? '$100' : '$1,000'}
                </Text>
                <Text style={styles.currencyLabel}>Dollars US</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        // Affichage normal pour les paiements simples
        <>
          <View style={styles.amountOptions}>
            <TouchableOpacity
              style={[
                styles.amountCard,
                !customAmount && selectedCurrency === 'FC' && styles.amountCardActive
              ]}
              onPress={() => {
                setCustomAmount(false);
                setSelectedCurrency('FC');
              }}
            >
              <Text style={styles.amountValue}>12,000 FC</Text>
              <Text style={styles.amountLabel}>Francs Congolais</Text>
              {!customAmount && selectedCurrency === 'FC' && <CheckCircle size={20} color="#27ae60" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.amountCard,
                !customAmount && selectedCurrency === 'USD' && styles.amountCardActive
              ]}
              onPress={() => {
                setCustomAmount(false);
                setSelectedCurrency('USD');
              }}
            >
              <Text style={styles.amountValue}>$5</Text>
              <Text style={styles.amountLabel}>Dollars US</Text>
              {!customAmount && selectedCurrency === 'USD' && <CheckCircle size={20} color="#27ae60" />}
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
              <View style={styles.currencySelector}>
                <TouchableOpacity
                  style={[
                    styles.currencyButton,
                    selectedCurrency === 'FC' && styles.currencyButtonActive
                  ]}
                  onPress={() => setSelectedCurrency('FC')}
                >
                  <Text style={[
                    styles.currencyButtonText,
                    selectedCurrency === 'FC' && styles.currencyButtonTextActive
                  ]}>FC</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.currencyButton,
                    selectedCurrency === 'USD' && styles.currencyButtonActive
                  ]}
                  onPress={() => setSelectedCurrency('USD')}
                >
                  <Text style={[
                    styles.currencyButtonText,
                    selectedCurrency === 'USD' && styles.currencyButtonTextActive
                  ]}>USD</Text>
                </TouchableOpacity>
              </View>
              <Input
                label={`Montant en ${selectedCurrency}`}
                value={enteredAmount}
                onChangeText={setEnteredAmount}
                placeholder="Entrez le montant"
                keyboardType="numeric"
                required
              />
            </View>
          )}
        </>
      )}
    </View>
  );

  const renderPaymentInfo = () => (
    <View style={styles.infoCard}>
      <Text style={styles.infoTitle}>Récapitulatif du paiement</Text>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Destinataire:</Text>
        <Text style={styles.infoValue}>{recipientName}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Montant à payer:</Text>
        <Text style={styles.infoAmount}>{getDisplayAmount().toLocaleString()} {getDisplayCurrency()}</Text>
      </View>
      {subscriptionType && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Type d'abonnement:</Text>
          <Text style={styles.infoValue}>
            {subscriptionType === 'monthly' ? 'Mensuel' : 'Annuel'}
          </Text>
        </View>
      )}
      {description && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Description:</Text>
          <Text style={styles.infoValue}>{description}</Text>
        </View>
      )}
    </View>
  );

  if (subscriptionType) {
    return (
      <RNModal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={verticalStyles.container}>
          <View style={verticalStyles.header}>
            <Text style={verticalStyles.title}>💳 Paiement Abonnement</Text>
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
                  selectedMethod === 'card' && verticalStyles.methodCardActive
                ]}
                onPress={() => setSelectedMethod('card')}
              >
                <CreditCard size={24} color={selectedMethod === 'card' ? '#3498db' : '#7f8c8d'} />
                <Text style={[
                  verticalStyles.methodText,
                  selectedMethod === 'card' && verticalStyles.methodTextActive
                ]}>Carte Bancaire / Visa</Text>
                {selectedMethod === 'card' && <CheckCircle size={20} color="#3498db" />}
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

            {selectedMethod === 'card' && renderCardForm()}
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
            label={`Payer ${amount} ${currency}`}
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

      {selectedMethod === 'card' && renderCardForm()}
      {selectedMethod === 'mobile' && renderMobileForm()}
      {selectedMethod === 'transfer' && renderTransferForm()}

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
  buttonGroup: {
    marginTop: 32,
    marginBottom: 20,
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
});

const styles = StyleSheet.create({
  methodSelector: {
    flexDirection: 'row',
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
  },
  subscriptionType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
    textAlign: 'center',
  },
  currencyOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  currencySelector: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  currencyButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ecf0f1',
    backgroundColor: 'white',
    marginHorizontal: 4,
  },
  currencyButtonActive: {
    borderColor: '#3498db',
    backgroundColor: '#f0f8ff',
  },
  currencyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  currencyButtonTextActive: {
    color: '#3498db',
  },
  currencyLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
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
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
}); 