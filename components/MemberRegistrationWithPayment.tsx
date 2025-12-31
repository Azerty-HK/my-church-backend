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
import { 
  DollarSign, 
  CreditCard, 
  X, 
  Check, 
  Smartphone, 
  QrCode, 
  Shield, 
  Lock, 
  Folder,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Users as UsersIcon,
  Camera,
  Image as ImageIcon
} from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';

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

interface MemberData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: string;
  member_type: 'Membre' | 'Personnel';
  position?: string;
  departments: string[];
  salary?: string;
  photo_url?: string;
  qr_code?: string;
  has_dossier?: boolean;
  registration_date: string;
  is_active: boolean;
}

interface MemberRegistrationWithPaymentProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (memberData: MemberData) => void;
  churchId: string;
  defaultCurrency: 'FC' | 'USD' | 'EURO';
}

// Simulation d'API de paiement
const PaymentAPI = {
  checkServiceAvailability: async (method: 'mobile' | 'card' | 'digital_wallet', provider?: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    return Math.random() > 0.1;
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

    const success = Math.random() > 0.15;
    
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

export function MemberRegistrationWithPayment({
  visible,
  onClose,
  onComplete,
  churchId,
  defaultCurrency,
}: MemberRegistrationWithPaymentProps) {
  const [step, setStep] = useState<'form' | 'payment' | 'processing' | 'success'>('form');
  const [processing, setProcessing] = useState(false);
  
  // Informations du membre
  const [memberInfo, setMemberInfo] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    member_type: 'Membre' as 'Membre' | 'Personnel',
    position: '',
    departments: [] as string[],
    salary: '',
    photoUri: null as string | null,
    photoBase64: null as string | null,
  });

  // Paiement
  const [paymentMethod, setPaymentMethod] = useState<'mobile' | 'card' | 'digital_wallet'>('mobile');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [transactionDetails, setTransactionDetails] = useState<any>(null);

  const { height: SCREEN_HEIGHT } = useWindowDimensions();

  // Montant
  const [currency] = useState<'FC' | 'USD' | 'EURO'>(defaultCurrency);
  const [amount, setAmount] = useState(currency === 'FC' ? 5000 : currency === 'USD' ? 5 : 5);
  const currencySymbol = currency === 'FC' ? 'FC' : currency === 'USD' ? '$' : '€';
  const formattedAmount = amount.toLocaleString();

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

  const positions = [
    'Membre Actif', 'Ancien', 'Diacre', 'Pasteur', 'Secrétaire', 
    'Trésorier', 'Musicien', 'Choriste', 'Enseignant', 'Évangéliste'
  ];

  const departments = [
    'Adoration', 'Enseignement', 'Évangélisation', 'Finance', 
    'Média', 'Musique', 'Jeunesse', 'Femmes', 'Hommes', 'Enfants'
  ];

  const resetForm = () => {
    setProcessing(false);
    setStep('form');
    setMemberInfo({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      address: '',
      member_type: 'Membre',
      position: '',
      departments: [],
      salary: '',
      photoUri: null,
      photoBase64: null,
    });
    setPaymentMethod('mobile');
    setSelectedProvider('');
    setPhoneNumber('');
    setCardNumber('');
    setCardHolder('');
    setExpiryDate('');
    setCvv('');
    setTransactionDetails(null);
  };

  const handleClose = () => {
    if (processing) {
      Alert.alert(
        'Inscription en cours',
        'Une inscription est en cours. Voulez-vous vraiment annuler ?',
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

  const validateForm = (): boolean => {
    if (!memberInfo.first_name.trim()) {
      Alert.alert('Erreur', 'Le prénom est obligatoire');
      return false;
    }
    if (!memberInfo.last_name.trim()) {
      Alert.alert('Erreur', 'Le nom est obligatoire');
      return false;
    }
    if (!memberInfo.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(memberInfo.email)) {
      Alert.alert('Erreur', 'Veuillez entrer un email valide');
      return false;
    }
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

  const handleProcessPayment = async () => {
    if (!validatePaymentDetails()) {
      return;
    }

    setProcessing(true);
    setStep('processing');

    try {
      const serviceAvailable = await PaymentAPI.checkServiceAvailability(paymentMethod, selectedProvider);
      
      if (!serviceAvailable) {
        Alert.alert('Service indisponible', 'Le service de paiement est temporairement indisponible. Veuillez réessayer plus tard ou choisir une autre méthode.');
        setProcessing(false);
        setStep('payment');
        return;
      }

      const balanceCheck = await PaymentAPI.checkUserBalance(amount, currency);
      
      if (!balanceCheck.success) {
        Alert.alert('Solde insuffisant', balanceCheck.message || 'Votre solde est insuffisant pour effectuer ce paiement.');
        setProcessing(false);
        setStep('payment');
        return;
      }

      const paymentResult = await PaymentAPI.processPayment({
        amount,
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
          amount,
          currency,
        });

        // Préparer les données du membre
        const memberData: MemberData = {
          first_name: memberInfo.first_name.trim(),
          last_name: memberInfo.last_name.trim(),
          email: memberInfo.email.trim().toLowerCase(),
          phone: memberInfo.phone.trim() || undefined,
          address: memberInfo.address.trim() || undefined,
          member_type: memberInfo.member_type,
          position: memberInfo.position || undefined,
          departments: memberInfo.departments,
          salary: memberInfo.salary || undefined,
          photo_url: memberInfo.photoBase64 ? `data:image/jpeg;base64,${memberInfo.photoBase64}` : undefined,
          qr_code: `CH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          has_dossier: true,
          registration_date: new Date().toISOString(),
          is_active: true,
        };

        setStep('success');
        
        setTimeout(() => {
          onComplete(memberData);
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
                setStep('payment');
              },
            },
            {
              text: 'Changer de méthode',
              onPress: () => {
                setProcessing(false);
                setStep('payment');
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
              setStep('payment');
            },
          },
        ]
      );
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Nous avons besoin de l\'accès à la caméra pour prendre une photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setMemberInfo(prev => ({
          ...prev,
          photoUri: result.assets[0].uri,
          photoBase64: result.assets[0].base64 || null,
        }));
      }
    } catch (error) {
      console.error('Erreur prise de photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo. Veuillez réessayer.');
    }
  };

  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Nous avons besoin de l\'accès à la galerie pour sélectionner une photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setMemberInfo(prev => ({
          ...prev,
          photoUri: result.assets[0].uri,
          photoBase64: result.assets[0].base64 || null,
        }));
      }
    } catch (error) {
      console.error('Erreur sélection photo:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner la photo. Veuillez réessayer.');
    }
  };

  const removePhoto = () => {
    setMemberInfo(prev => ({
      ...prev,
      photoUri: null,
      photoBase64: null,
    }));
  };

  const toggleDepartment = (department: string) => {
    setMemberInfo(prev => ({
      ...prev,
      departments: prev.departments.includes(department)
        ? prev.departments.filter(d => d !== department)
        : [...prev.departments, department]
    }));
  };

  const renderForm = () => (
    <ScrollView style={styles.formContainer}>
      <Text style={styles.formTitle}>📝 Formulaire d'inscription</Text>
      <Text style={styles.formSubtitle}>Complétez les informations du membre</Text>

      {/* Photo */}
      <View style={styles.photoSection}>
        <Text style={styles.sectionLabel}>Photo du membre (optionnel)</Text>
        <View style={styles.photoContainer}>
          {memberInfo.photoUri ? (
            <View style={styles.photoPreviewContainer}>
              <View style={styles.photoPreview}>
                <Image 
                  source={{ uri: memberInfo.photoUri }}
                  style={styles.photoImage}
                />
              </View>
              <TouchableOpacity 
                style={styles.removePhotoButton}
                onPress={removePhoto}
              >
                <X size={16} color="white" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoPlaceholder}>
              <User size={40} color="#7f8c8d" />
              <Text style={styles.photoPlaceholderText}>Aucune photo</Text>
            </View>
          )}
          
          <View style={styles.photoButtons}>
            <TouchableOpacity 
              style={[styles.photoButton, styles.cameraButton]}
              onPress={takePhoto}
            >
              <Camera size={20} color="white" />
              <Text style={styles.photoButtonText}>Camera</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.photoButton, styles.galleryButton]}
              onPress={pickFromGallery}
            >
              <ImageIcon size={20} color="white" />
              <Text style={styles.photoButtonText}>Galerie</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Informations de base */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Informations personnelles</Text>
        
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.inputLabel}>Prénom *</Text>
            <TextInput
              style={styles.input}
              placeholder="Prénom"
              value={memberInfo.first_name}
              onChangeText={(text) => setMemberInfo(prev => ({ ...prev, first_name: text }))}
            />
          </View>
          
          <View style={styles.halfInput}>
            <Text style={styles.inputLabel}>Nom *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nom de famille"
              value={memberInfo.last_name}
              onChangeText={(text) => setMemberInfo(prev => ({ ...prev, last_name: text }))}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email *</Text>
          <View style={styles.inputWithIcon}>
            <Mail size={18} color="#7f8c8d" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.inputWithIconPadding]}
              placeholder="email@exemple.com"
              value={memberInfo.email}
              onChangeText={(text) => setMemberInfo(prev => ({ ...prev, email: text }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Téléphone</Text>
          <View style={styles.inputWithIcon}>
            <Phone size={18} color="#7f8c8d" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.inputWithIconPadding]}
              placeholder="+243 XX XXX XXX"
              value={memberInfo.phone}
              onChangeText={(text) => setMemberInfo(prev => ({ ...prev, phone: text }))}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Adresse</Text>
          <View style={styles.inputWithIcon}>
            <MapPin size={18} color="#7f8c8d" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.inputWithIconPadding]}
              placeholder="Adresse complète"
              value={memberInfo.address}
              onChangeText={(text) => setMemberInfo(prev => ({ ...prev, address: text }))}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>
      </View>

      {/* Type de membre */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Type de membre</Text>
        <View style={styles.typeButtons}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              memberInfo.member_type === 'Membre' && styles.typeButtonActive
            ]}
            onPress={() => setMemberInfo(prev => ({ ...prev, member_type: 'Membre' }))}
          >
            <UsersIcon size={20} color={memberInfo.member_type === 'Membre' ? 'white' : '#7f8c8d'} />
            <Text style={[
              styles.typeButtonText,
              memberInfo.member_type === 'Membre' && styles.typeButtonTextActive
            ]}>
              Membre
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.typeButton,
              memberInfo.member_type === 'Personnel' && styles.typeButtonActive
            ]}
            onPress={() => setMemberInfo(prev => ({ ...prev, member_type: 'Personnel' }))}
          >
            <Briefcase size={20} color={memberInfo.member_type === 'Personnel' ? 'white' : '#7f8c8d'} />
            <Text style={[
              styles.typeButtonText,
              memberInfo.member_type === 'Personnel' && styles.typeButtonTextActive
            ]}>
              Personnel
            </Text>
          </TouchableOpacity>
        </View>

        {memberInfo.member_type === 'Personnel' && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Poste</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={memberInfo.position}
                  onValueChange={(itemValue) => setMemberInfo(prev => ({ ...prev, position: itemValue }))}
                  style={styles.picker}
                >
                  <Picker.Item label="Sélectionnez un poste..." value="" />
                  {positions.map((position) => (
                    <Picker.Item key={position} label={position} value={position} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Salaire ({currency})</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={memberInfo.salary}
                onChangeText={(text) => setMemberInfo(prev => ({ ...prev, salary: text }))}
                keyboardType="numeric"
              />
            </View>
          </>
        )}
      </View>

      {/* Départements */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Départements</Text>
        <View style={styles.departmentsContainer}>
          {departments.map((department) => (
            <TouchableOpacity
              key={department}
              style={[
                styles.departmentChip,
                memberInfo.departments.includes(department) && styles.departmentChipActive
              ]}
              onPress={() => toggleDepartment(department)}
            >
              <Text style={[
                styles.departmentChipText,
                memberInfo.departments.includes(department) && styles.departmentChipTextActive
              ]}>
                {department}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Montant et paiement */}
      <View style={[styles.section, styles.paymentInfo]}>
        <View style={styles.amountDisplay}>
          <DollarSign size={32} color="#27ae60" />
          <View style={styles.amountDetails}>
            <Text style={styles.amountLabel}>Montant de l'inscription</Text>
            <Text style={styles.amountValue}>
              {formattedAmount} {currencySymbol}
            </Text>
          </View>
        </View>
        
        <Text style={styles.paymentNote}>
          Ce montant inclus: Carte de membre, QR Code, Dossier numérique, et frais d'inscription.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.nextButton}
        onPress={() => {
          if (validateForm()) {
            setStep('payment');
          }
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.nextButtonText}>Continuer vers le paiement</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderPayment = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>💳 Paiement de l'inscription</Text>
      <Text style={styles.stepSubtitle}>Choisissez votre méthode de paiement</Text>

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

      {/* Détails du paiement selon la méthode */}
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
          />
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
          <TextInput
            style={styles.input}
            placeholder="1234 5678 9012 3456"
            value={cardNumber}
            onChangeText={(text) => setCardNumber(formatCardNumber(text))}
            keyboardType="numeric"
            maxLength={19}
            placeholderTextColor="#95a5a6"
          />

          <Text style={styles.sectionLabel}>Nom du titulaire</Text>
          <TextInput
            style={styles.input}
            placeholder="JOHN DOE"
            value={cardHolder}
            onChangeText={setCardHolder}
            autoCapitalize="characters"
            placeholderTextColor="#95a5a6"
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
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.sectionLabel}>Code de sécurité (CVV)</Text>
              <TextInput
                style={styles.input}
                placeholder="123"
                value={cvv}
                onChangeText={setCvv}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                placeholderTextColor="#95a5a6"
              />
            </View>
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
        </>
      )}

      <View style={styles.packageInfo}>
        <Folder size={20} color="#9b59b6" />
        <Text style={styles.packageText}>
          ✅ Ce paiement inclut: Carte de membre + QR Code + Dossier numérique
        </Text>
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setStep('form')}
          disabled={processing}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.payButton, processing && styles.payButtonDisabled]}
          onPress={handleProcessPayment}
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

      <View style={styles.securityInfo}>
        <Lock size={14} color="#27ae60" />
        <Text style={styles.securityText}>
          Toutes les transactions sont cryptées et sécurisées
        </Text>
      </View>
    </View>
  );

  const renderProcessing = () => (
    <View style={styles.processingContainer}>
      <ActivityIndicator size="large" color="#3498db" />
      <Text style={styles.processingTitle}>Traitement en cours</Text>
      <Text style={styles.processingText}>
        Veuillez patienter pendant que nous traitons votre paiement et créons le dossier...
      </Text>
      
      <View style={styles.processingSteps}>
        <View style={styles.processingStep}>
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <Text style={styles.stepText}>Validation des informations</Text>
        </View>
        <View style={styles.processingStep}>
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <Text style={styles.stepText}>Traitement du paiement</Text>
        </View>
        <View style={styles.processingStep}>
          <View style={[styles.stepDot, processing && styles.stepDotActive]} />
          <Text style={styles.stepText}>Création du dossier</Text>
        </View>
      </View>
      
      <View style={styles.packageProcessing}>
        <Folder size={40} color="#3498db" />
        <Text style={styles.packageProcessingText}>
          Génération de la carte, QR Code et dossier numérique en cours...
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
      <Text style={styles.successTitle}>✅ Inscription Réussie !</Text>
      
      {transactionDetails && (
        <View style={styles.transactionDetails}>
          <View style={styles.transactionRow}>
            <Text style={styles.transactionLabel}>Membre:</Text>
            <Text style={styles.transactionValue}>
              {memberInfo.first_name} {memberInfo.last_name}
            </Text>
          </View>
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
        </View>
      )}
      
      <View style={styles.successFeatures}>
        <View style={styles.featureItem}>
          <QrCode size={24} color="#27ae60" />
          <Text style={styles.featureText}>Carte avec QR Code générée</Text>
        </View>
        <View style={styles.featureItem}>
          <Folder size={24} color="#9b59b6" />
          <Text style={styles.featureText}>Dossier numérique créé</Text>
        </View>
        <View style={styles.featureItem}>
          <Check size={24} color="#3498db" />
          <Text style={styles.featureText}>Paiement confirmé</Text>
        </View>
      </View>
      
      <Text style={styles.successMessage}>
        L'inscription de {memberInfo.first_name} {memberInfo.last_name} a été traitée avec succès.
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
              <Text style={styles.title}>
                {step === 'form' ? 'Formulaire d\'inscription' : 
                 step === 'payment' ? 'Paiement' : 
                 step === 'processing' ? 'Traitement' : 'Succès'}
              </Text>
              <Text style={styles.subtitle}>
                {step === 'form' ? 'Complétez toutes les informations' : 
                 step === 'payment' ? 'Sélectionnez votre méthode de paiement' : 
                 step === 'processing' ? 'Veuillez patienter...' : 'Inscription réussie !'}
              </Text>
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
                <User size={32} color="#27ae60" />
                <Text style={styles.memberName}>
                  {memberInfo.first_name || memberInfo.last_name 
                    ? `${memberInfo.first_name} ${memberInfo.last_name}`.trim()
                    : 'Nouveau membre'}
                </Text>
              </View>
              <View style={styles.amountContainer}>
                <Text style={styles.amountLabel}>Montant total à payer</Text>
                <Text style={styles.amount}>
                  {formattedAmount} {currencySymbol}
                </Text>
                <Text style={styles.amountNote}>
                  Frais d'inscription complet
                </Text>
              </View>
            </View>

            {step === 'form' && renderForm()}
            {step === 'payment' && renderPayment()}
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
  // Form Styles
  formContainer: {
    padding: 20,
    paddingTop: 0,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  photoSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
  },
  photoContainer: {
    alignItems: 'center',
  },
  photoPreviewContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  photoPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e0e0e0',
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#3498db',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#e74c3c',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#bdc3c7',
    borderStyle: 'dashed',
  },
  photoPlaceholderText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 8,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  cameraButton: {
    backgroundColor: '#3498db',
  },
  galleryButton: {
    backgroundColor: '#9b59b6',
  },
  photoButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfInput: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
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
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#dee2e6',
    gap: 10,
  },
  typeButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  typeButtonTextActive: {
    color: 'white',
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    height: 56,
  },
  departmentsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  departmentChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: 'white',
  },
  departmentChipActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  departmentChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2c3e50',
  },
  departmentChipTextActive: {
    color: 'white',
  },
  paymentInfo: {
    backgroundColor: '#e8f5e9',
    borderWidth: 2,
    borderColor: '#c8e6c9',
  },
  amountDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  amountDetails: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  paymentNote: {
    fontSize: 13,
    color: '#27ae60',
    lineHeight: 18,
  },
  nextButton: {
    backgroundColor: '#3498db',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  // Payment Styles
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
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  packageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3e5f5',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#9b59b6',
  },
  packageText: {
    flex: 1,
    fontSize: 13,
    color: '#9b59b6',
    fontWeight: '600',
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
  // Processing Styles
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
  packageProcessing: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3e5f5',
    padding: 20,
    borderRadius: 15,
    marginTop: 30,
    gap: 15,
    width: '100%',
  },
  packageProcessingText: {
    flex: 1,
    fontSize: 14,
    color: '#9b59b6',
    fontWeight: '600',
  },
  processingNote: {
    fontSize: 12,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  // Success Styles
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
  successFeatures: {
    backgroundColor: '#e8f5e9',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#c8e6c9',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#27ae60',
    fontWeight: '600',
    flex: 1,
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