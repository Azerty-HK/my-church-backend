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
  Platform,
  Image,
} from 'react-native';
import { 
  DollarSign, 
  CreditCard, 
  X, 
  Check, 
  Smartphone, 
  Shield, 
  Lock, 
  Folder,
  User,
  AlertCircle
} from 'lucide-react-native';

interface PaymentData {
  method: 'Mobile Money' | 'Carte Bancaire';
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
  onPaymentSuccess: (paymentData: PaymentData, departmentName?: string) => void;
  currency: string;
  memberName: string;
  amount: number;
  description: string;
  memberId?: string;
  churchId?: string;
  churchName?: string;
  memberPhoto?: string;
  departments?: string[];
  selectedDepartment?: string;
  onDepartmentSelect?: (department: string) => void;
}

export function MemberRegistrationPayment({
  visible,
  onClose,
  onPaymentSuccess,
  currency,
  memberName,
  amount,
  description,
  memberId,
  churchId,
  churchName = 'Église',
  memberPhoto,
  departments = [],
  selectedDepartment = '',
  onDepartmentSelect,
}: MemberRegistrationPaymentProps) {
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Mobile Money' | 'Carte Bancaire'>('Mobile Money');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [step, setStep] = useState<'department' | 'method' | 'details' | 'processing' | 'success'>('department');
  const [transactionDetails, setTransactionDetails] = useState<any>(null);
  const [cardGenerated, setCardGenerated] = useState(false);
  const [generatedCardNumber, setGeneratedCardNumber] = useState('');
  const [tempSelectedDepartment, setTempSelectedDepartment] = useState(selectedDepartment);

  const { height: SCREEN_HEIGHT } = useWindowDimensions();

  // Forcer le montant en 5 USD
  const calculatedAmount = 5;
  const currencySymbol = '$';
  const formattedAmount = calculatedAmount.toLocaleString();

  const resetForm = () => {
    setProcessing(false);
    setPaymentMethod('Mobile Money');
    setPhoneNumber('');
    setCardNumber('');
    setCardHolder('');
    setExpiryDate('');
    setCvv('');
    setStep('department');
    setTransactionDetails(null);
    setCardGenerated(false);
    setGeneratedCardNumber('');
    setTempSelectedDepartment(selectedDepartment);
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
    // Vérification du département
    if (!tempSelectedDepartment) {
      Alert.alert('Département requis', 'Veuillez sélectionner un département pour le membre');
      return false;
    }

    if (paymentMethod === 'Mobile Money') {
      if (!phoneNumber.trim()) {
        Alert.alert('Numéro requis', 'Veuillez entrer un numéro de téléphone');
        return false;
      }
      const cleanPhone = phoneNumber.replace(/\s/g, '');
      if (!/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
        Alert.alert('Numéro invalide', 'Veuillez entrer un numéro de téléphone valide');
        return false;
      }
    } else if (paymentMethod === 'Carte Bancaire') {
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
    }
    return true;
  };

  const generateCardNumber = (): string => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `MC-${timestamp}-${random}`;
  };

  const handlePayment = async () => {
    if (!validatePaymentDetails()) {
      return;
    }

    setProcessing(true);
    setStep('processing');

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9).toUpperCase();
      const cardNumber = generateCardNumber();
      
      const transactionData = {
        reference: `PAY-${timestamp}-${randomId}`,
        transactionId: `TX${timestamp}${randomId}`,
        timestamp: new Date().toISOString(),
        method: paymentMethod,
        amount: calculatedAmount,
        currency: 'USD',
        cardNumber,
        department: tempSelectedDepartment,
        phoneNumber: paymentMethod === 'Mobile Money' ? phoneNumber : undefined,
        cardLastFour: paymentMethod === 'Carte Bancaire' ? cardNumber.replace(/\s/g, '').slice(-4) : undefined,
      };

      setTransactionDetails(transactionData);
      setGeneratedCardNumber(cardNumber);

      const paymentData: PaymentData = {
        method: paymentMethod,
        reference: transactionData.reference,
        timestamp: transactionData.timestamp,
        note: `Paiement carte de membre - 5 USD - Département: ${tempSelectedDepartment}`,
        phoneNumber: paymentMethod === 'Mobile Money' ? phoneNumber : undefined,
        cardNumber: paymentMethod === 'Carte Bancaire' ? cardNumber.replace(/\s/g, '').slice(-4) : undefined,
        cardHolder: paymentMethod === 'Carte Bancaire' ? cardHolder : undefined,
        expiryDate: paymentMethod === 'Carte Bancaire' ? expiryDate : undefined,
        cvv: paymentMethod === 'Carte Bancaire' ? cvv : undefined,
      };

      setCardGenerated(true);
      setStep('success');
      
      // Appeler le callback avec le département
      setTimeout(() => {
        onPaymentSuccess(paymentData, tempSelectedDepartment);
      }, 3000);
      
    } catch (error: any) {
      console.error('Erreur paiement:', error);
      Alert.alert(
        '❌ Erreur',
        'Une erreur est survenue lors de l\'enregistrement du paiement.',
        [
          {
            text: 'Réessayer',
            onPress: () => {
              setProcessing(false);
              setStep('details');
            },
          },
        ]
      );
    }
  };

  const renderDepartmentSelection = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Sélectionnez le département</Text>
      <Text style={styles.stepSubtitle}>Le département déterminera où la carte sera enregistrée</Text>

      <Text style={styles.sectionLabel}>Département du membre *</Text>
      <Text style={styles.fieldHelp}>
        Cette sélection créera automatiquement un dossier de département si c'est le premier paiement
      </Text>

      <ScrollView style={styles.departmentsList} showsVerticalScrollIndicator={false}>
        {departments.map((department) => (
          <TouchableOpacity
            key={department}
            style={[
              styles.departmentButton,
              tempSelectedDepartment === department && styles.departmentButtonActive,
            ]}
            onPress={() => {
              setTempSelectedDepartment(department);
              if (onDepartmentSelect) {
                onDepartmentSelect(department);
              }
            }}
          >
            <View style={styles.departmentButtonContent}>
              <View style={[
                styles.departmentIcon,
                tempSelectedDepartment === department && styles.departmentIconActive
              ]}>
                <Text style={styles.departmentIconText}>
                  {department.charAt(0)}
                </Text>
              </View>
              <View style={styles.departmentInfo}>
                <Text style={[
                  styles.departmentName,
                  tempSelectedDepartment === department && styles.departmentNameActive
                ]}>
                  {department}
                </Text>
                <Text style={styles.departmentDescription}>
                  La carte sera enregistrée dans le dossier "{department}"
                </Text>
              </View>
              {tempSelectedDepartment === department && (
                <Check size={20} color="#27ae60" />
              )}
            </View>
          </TouchableOpacity>
        ))}
        
        {departments.length === 0 && (
          <View style={styles.noDepartments}>
            <Text style={styles.noDepartmentsText}>
              Aucun département disponible
            </Text>
            <Text style={styles.noDepartmentsSubtext}>
              Le département sera créé automatiquement au premier paiement
            </Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.nextButton, !tempSelectedDepartment && styles.nextButtonDisabled]}
        onPress={() => tempSelectedDepartment && setStep('method')}
        disabled={!tempSelectedDepartment}
        activeOpacity={0.8}
      >
        <Text style={styles.nextButtonText}>Continuer</Text>
      </TouchableOpacity>

      <View style={styles.infoBox}>
        <Text style={styles.infoBoxTitle}>💡 Information importante</Text>
        <Text style={styles.infoBoxText}>
          • Le département sera automatiquement créé si c'est le premier paiement{'\n'}
          • La carte sera enregistrée dans le dossier du département{'\n'}
          • Vous pourrez modifier le département plus tard
        </Text>
      </View>
    </View>
  );

  const renderMethodSelection = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Choisissez votre méthode de paiement</Text>
      <Text style={styles.stepSubtitle}>Sélectionnez comment le paiement a été effectué</Text>

      {tempSelectedDepartment && (
        <View style={styles.departmentBadge}>
          <Text style={styles.departmentBadgeText}>
            📂 Département: {tempSelectedDepartment}
          </Text>
        </View>
      )}

      <View style={styles.paymentAmountInfo}>
        <DollarSign size={40} color="#27ae60" />
        <View style={styles.paymentAmountDetails}>
          <Text style={styles.paymentAmountText}>Montant à payer: 5 USD</Text>
          <Text style={styles.paymentDepartmentText}>
            Département: {tempSelectedDepartment}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.methodButton,
          paymentMethod === 'Mobile Money' && styles.methodButtonActive,
        ]}
        onPress={() => setPaymentMethod('Mobile Money')}
        activeOpacity={0.7}
      >
        <View style={styles.methodContent}>
          <View style={[styles.methodIconContainer, { backgroundColor: paymentMethod === 'Mobile Money' ? '#e8f5e9' : '#e3f2fd' }]}>
            <Smartphone size={24} color={paymentMethod === 'Mobile Money' ? '#27ae60' : '#3498db'} />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodTitle}>Mobile Money</Text>
            <Text style={styles.methodDesc}>
              Paiement effectué via mobile money
            </Text>
          </View>
          {paymentMethod === 'Mobile Money' && (
            <View style={styles.selectedIndicator}>
              <Check size={20} color="#27ae60" />
            </View>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.methodButton,
          paymentMethod === 'Carte Bancaire' && styles.methodButtonActive,
        ]}
        onPress={() => setPaymentMethod('Carte Bancaire')}
        activeOpacity={0.7}
      >
        <View style={styles.methodContent}>
          <View style={[styles.methodIconContainer, { backgroundColor: paymentMethod === 'Carte Bancaire' ? '#f3e8f5' : '#f3e5f5' }]}>
            <CreditCard size={24} color="#9b59b6" />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodTitle}>Carte bancaire</Text>
            <Text style={styles.methodDesc}>Paiement par carte Visa/Mastercard</Text>
          </View>
          {paymentMethod === 'Carte Bancaire' && (
            <View style={styles.selectedIndicator}>
              <Check size={20} color="#27ae60" />
            </View>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setStep('department')}
          disabled={processing}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => setStep('details')}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>Continuer</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.securityInfo}>
        <Lock size={14} color="#27ae60" />
        <Text style={styles.securityText}>
          Cette interface enregistre uniquement le paiement effectué en dehors de l'application
        </Text>
      </View>
    </View>
  );

  const renderPaymentDetails = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>
        {paymentMethod === 'Mobile Money' 
          ? 'Détails Mobile Money' 
          : 'Détails Carte Bancaire'}
      </Text>

      {tempSelectedDepartment && (
        <View style={styles.departmentBadge}>
          <Text style={styles.departmentBadgeText}>
            📂 Département: {tempSelectedDepartment}
          </Text>
        </View>
      )}

      <View style={styles.paymentAmountInfo}>
        <DollarSign size={40} color="#27ae60" />
        <View style={styles.paymentAmountDetails}>
          <Text style={styles.paymentAmountText}>Montant: 5 USD</Text>
          <Text style={styles.paymentDepartmentText}>
            Département: {tempSelectedDepartment}
          </Text>
        </View>
      </View>

      {paymentMethod === 'Mobile Money' && (
        <>
          <Text style={styles.sectionLabel}>Numéro de téléphone utilisé *</Text>
          <View style={styles.inputWithIcon}>
            <Smartphone size={18} color="#7f8c8d" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.inputWithIconPadding]}
              placeholder="+243 XX XXX XXX"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoComplete="tel"
              placeholderTextColor="#95a5a6"
              editable={!processing}
            />
          </View>
          <Text style={styles.inputHelp}>
            Entrez le numéro utilisé pour le paiement
          </Text>
        </>
      )}

      {paymentMethod === 'Carte Bancaire' && (
        <>
          <Text style={styles.sectionLabel}>Numéro de carte *</Text>
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

          <Text style={styles.sectionLabel}>Nom du titulaire *</Text>
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
              <Text style={styles.sectionLabel}>Date d'expiration *</Text>
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
              <Text style={styles.sectionLabel}>Code de sécurité (CVV) *</Text>
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
              Ces informations servent uniquement à l'enregistrement. Aucun paiement n'est effectué dans l'application.
            </Text>
          </View>
        </>
      )}

      <View style={styles.paymentWarning}>
        <AlertCircle size={20} color="#e74c3c" />
        <Text style={styles.paymentWarningText}>
          ⚠️ IMPORTANT: Ce système enregistre uniquement le paiement effectué en dehors de l'application.
          Aucun transfert d'argent n'a lieu dans l'application.
        </Text>
      </View>

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
              <Check size={20} color="white" />
              <Text style={styles.payButtonText}>
                Confirmer le paiement
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.amountConfirmation}>
        Montant enregistré: <Text style={styles.amountBold}>5 USD</Text>
      </Text>
    </View>
  );

  const renderProcessing = () => (
    <View style={styles.processingContainer}>
      <ActivityIndicator size="large" color="#3498db" />
      <Text style={styles.processingTitle}>Enregistrement en cours</Text>
      <Text style={styles.processingText}>
        Veuillez patienter pendant que nous enregistrons le paiement et générons la carte...
      </Text>
      
      <View style={styles.processingSteps}>
        <View style={styles.processingStep}>
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <Text style={styles.stepText}>Validation du département</Text>
        </View>
        <View style={styles.processingStep}>
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <Text style={styles.stepText}>Enregistrement du paiement</Text>
        </View>
        <View style={styles.processingStep}>
          <View style={[styles.stepDot, processing && styles.stepDotActive]} />
          <Text style={styles.stepText}>Création de la carte</Text>
        </View>
        <View style={styles.processingStep}>
          <View style={[styles.stepDot, processing && styles.stepDotActive]} />
          <Text style={styles.stepText}>Enregistrement dans le dossier</Text>
        </View>
      </View>
      
      <View style={styles.paymentInfoCard}>
        <Text style={styles.paymentInfoTitle}>⚠️ IMPORTANT</Text>
        <Text style={styles.paymentInfoText}>
          • La carte sera enregistrée dans le département "{tempSelectedDepartment}"{'\n'}
          • Un dossier sera créé automatiquement si c'est le premier paiement{'\n'}
          • Ce système enregistre uniquement le paiement effectué en dehors de l'application
        </Text>
      </View>
      
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
      <Text style={styles.successTitle}>✅ Paiement Enregistré !</Text>
      
      <View style={styles.memberInfoSuccess}>
        <User size={20} color="#27ae60" />
        <Text style={styles.memberNameSuccess}>{memberName}</Text>
      </View>
      
      {transactionDetails && (
        <View style={styles.transactionDetails}>
          <View style={styles.transactionRow}>
            <Text style={styles.transactionLabel}>Département:</Text>
            <Text style={styles.transactionValue}>{transactionDetails.department}</Text>
          </View>
          <View style={styles.transactionRow}>
            <Text style={styles.transactionLabel}>Référence:</Text>
            <Text style={styles.transactionValue}>{transactionDetails.reference}</Text>
          </View>
          <View style={styles.transactionRow}>
            <Text style={styles.transactionLabel}>Numéro de carte:</Text>
            <Text style={styles.transactionValue}>{generatedCardNumber}</Text>
          </View>
          <View style={styles.transactionRow}>
            <Text style={styles.transactionLabel}>Montant:</Text>
            <Text style={styles.transactionValue}>
              5 USD
            </Text>
          </View>
          <View style={styles.transactionRow}>
            <Text style={styles.transactionLabel}>Méthode:</Text>
            <Text style={styles.transactionValue}>
              {transactionDetails.method}
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
      
      <View style={styles.successActions}>
        <Text style={styles.successMessage}>
          Le paiement pour {memberName} a été enregistré avec succès.
          La carte a été enregistrée dans le département "{tempSelectedDepartment}".
        </Text>
        
        <ActivityIndicator size="small" color="#27ae60" style={styles.successSpinner} />
        <Text style={styles.successClosing}>
          Fermeture automatique dans 3 secondes...
        </Text>
      </View>
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
              <Text style={styles.title}>Paiement carte de membre</Text>
              <Text style={styles.subtitle}>Montant: 5 USD</Text>
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
                {memberPhoto ? (
                  <Image 
                    source={{ uri: memberPhoto }}
                    style={styles.memberPhoto}
                  />
                ) : (
                  <User size={32} color="#27ae60" />
                )}
                <Text style={styles.memberName}>{memberName}</Text>
              </View>
              <View style={styles.amountContainer}>
                <Text style={styles.amountLabel}>Montant du paiement</Text>
                <Text style={styles.amount}>
                  5 USD
                </Text>
                <Text style={styles.amountNote}>
                  {tempSelectedDepartment ? `Département: ${tempSelectedDepartment}` : 'Sélectionnez un département'}
                </Text>
              </View>
            </View>

            {step === 'department' && renderDepartmentSelection()}
            {step === 'method' && renderMethodSelection()}
            {step === 'details' && renderPaymentDetails()}
            {step === 'processing' && renderProcessing()}
            {step === 'success' && renderSuccess()}

            <View style={styles.footer}>
              <View style={styles.securityBadge}>
                <Shield size={14} color="#27ae60" />
                <Text style={styles.securityBadgeText}>
                  ⚠️ Paiement externe à l'application
                </Text>
              </View>
              <Text style={styles.footerText}>
                Ce système enregistre uniquement les paiements effectués en dehors de l'application
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
  memberPhoto: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  departmentBadge: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bbdefb',
  },
  departmentBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
    marginTop: 16,
  },
  fieldHelp: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 16,
    lineHeight: 18,
  },
  departmentsList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  departmentButton: {
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    backgroundColor: 'white',
  },
  departmentButtonActive: {
    borderColor: '#3498db',
    backgroundColor: '#f8f9fa',
  },
  departmentButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  departmentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  departmentIconActive: {
    backgroundColor: '#3498db',
  },
  departmentIconText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  departmentInfo: {
    flex: 1,
  },
  departmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  departmentNameActive: {
    color: '#3498db',
  },
  departmentDescription: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  noDepartments: {
    alignItems: 'center',
    padding: 20,
  },
  noDepartmentsText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  noDepartmentsSubtext: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  infoBoxTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  infoBoxText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
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
  paymentAmountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    gap: 16,
    borderWidth: 2,
    borderColor: '#27ae60',
  },
  paymentAmountDetails: {
    flex: 1,
  },
  paymentAmountText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 4,
  },
  paymentDepartmentText: {
    fontSize: 14,
    color: '#27ae60',
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
  paymentWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fdeaea',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  paymentWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#e74c3c',
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
  nextButton: {
    flex: 1,
    backgroundColor: '#3498db',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  nextButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
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
    marginBottom: 30,
  },
  processingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  paymentInfoCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#ffeaa7',
    width: '100%',
  },
  paymentInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  paymentInfoText: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 18,
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
    marginBottom: 16,
    textAlign: 'center',
  },
  memberInfoSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  memberNameSuccess: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
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
  successActions: {
    width: '100%',
    alignItems: 'center',
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
  successClosing: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 8,
    fontStyle: 'italic',
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