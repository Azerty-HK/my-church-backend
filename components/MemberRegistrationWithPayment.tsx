import React, { useState, useRef } from 'react';
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
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Users as UsersIcon,
  Camera,
  Image as ImageIcon,
  Building,
  Download,
  Share2,
  Printer,
  AlertCircle
} from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { captureRef } from 'react-native-view-shot';

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
  church_id: string;
  has_paid?: boolean;
  card_number?: string;
  payment_method?: string;
  payment_date?: string;
  payment_amount?: number;
  payment_currency?: string;
}

interface MemberRegistrationWithPaymentProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (memberData: MemberData, paymentData?: PaymentData, departmentName?: string) => void;
  churchId: string;
  defaultCurrency: 'FC' | 'USD' | 'EURO';
  churchName?: string;
}

export function MemberRegistrationWithPayment({
  visible,
  onClose,
  onComplete,
  churchId,
  defaultCurrency,
  churchName = 'Église',
}: MemberRegistrationWithPaymentProps) {
  const [step, setStep] = useState<'form' | 'payment' | 'processing' | 'success'>('form');
  const [processing, setProcessing] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  
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

  // Paiement - SUPPRESSION de 'Cash'
  const [paymentMethod, setPaymentMethod] = useState<'Mobile Money' | 'Carte Bancaire'>('Mobile Money');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [transactionDetails, setTransactionDetails] = useState<any>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [generatedCardNumber, setGeneratedCardNumber] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');

  const { height: SCREEN_HEIGHT } = useWindowDimensions();
  const cardViewRef = useRef<View>(null);
  const invoiceViewRef = useRef<View>(null);

  // Montant fixe en 5 USD
  const [currency] = useState<'FC' | 'USD' | 'EURO'>(defaultCurrency);
  const [amount] = useState(5); // TOUJOURS 5 USD
  const currencySymbol = '$'; // TOUJOURS USD
  const formattedAmount = amount.toLocaleString();

  const positions = [
    'Membre Actif', 'Ancien', 'Diacre', 'Pasteur', 'Secrétaire', 
    'Trésorier', 'Lecteur', 'Choriste', 'Administrateur', 'Évangéliste'
  ];

  const departments = [
    'Chorale', 'Ecodim', 'Évangélisation', 'Sécurité', 'Protocole',
    'Presse et Technique', 'Nettoyage', 'Jeunesse', 'Femmes', 'Hommes', 'Intercession',
  ];

  const resetForm = () => {
    setProcessing(false);
    setPaymentCompleted(false);
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
    setPaymentMethod('Mobile Money');
    setPhoneNumber('');
    setCardNumber('');
    setCardHolder('');
    setExpiryDate('');
    setCvv('');
    setTransactionDetails(null);
    setPaymentData(null);
    setGeneratedCardNumber('');
    setSelectedDepartment('');
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
    if (!selectedDepartment) {
      Alert.alert('Erreur', 'Veuillez sélectionner un département');
      return false;
    }
    return true;
  };

  const validatePaymentDetails = (): boolean => {
    if (!selectedDepartment) {
      Alert.alert('Département requis', 'Veuillez sélectionner un département');
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

  const generateQRCode = (memberId: string): string => {
    return `QR-${memberId}-${Date.now().toString(36).toUpperCase()}`;
  };

  const captureCardAsImage = async (): Promise<string> => {
    try {
      if (!cardViewRef.current) {
        throw new Error('La carte n\'est pas encore générée');
      }

      const uri = await captureRef(cardViewRef.current, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      return uri;
    } catch (error) {
      console.error('Erreur capture carte:', error);
      throw error;
    }
  };

  const generateInvoiceImage = async (): Promise<string> => {
    try {
      // Créer une vue de facture pour la capture
      const html = generateInvoiceHTML();
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false
      });

      // Pour une vraie image, nous créerons un PNG à partir du PDF
      // Pour l'instant, nous retournons l'URI du PDF
      // Note: Dans une vraie implémentation, vous voudriez convertir le PDF en image
      return uri;
    } catch (error) {
      console.error('Erreur génération facture image:', error);
      throw error;
    }
  };

  const saveImageToGallery = async (imageUri: string, fileName: string, type: 'card' | 'invoice'): Promise<boolean> => {
    try {
      // Demander les permissions
      if (Platform.OS !== 'web') {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission requise', `Veuillez autoriser l'accès à la galerie pour sauvegarder ${type === 'card' ? 'la carte' : 'la facture'}.`);
          return false;
        }
      }

      // Créer un nom de fichier unique avec timestamp
      const timestamp = Date.now();
      const fileExtension = imageUri.toLowerCase().endsWith('.pdf') ? 'pdf' : 'png';
      const finalFileName = `${fileName}-${timestamp}.${fileExtension}`;
      
      // Déterminer le dossier de destination
      const albumName = 'MyChurch';
      const directory = Platform.select({
        ios: `${FileSystem.documentDirectory}`,
        android: `${FileSystem.documentDirectory}`,
        default: `${FileSystem.documentDirectory}`,
      });

      const newPath = `${directory}${finalFileName}`;

      // Copier le fichier vers le nouvel emplacement
      await FileSystem.copyAsync({
        from: imageUri,
        to: newPath,
      });

      // Sauvegarder dans la galerie
      if (Platform.OS !== 'web') {
        const asset = await MediaLibrary.createAssetAsync(newPath);
        const album = await MediaLibrary.getAlbumAsync(albumName);
        
        if (album === null) {
          await MediaLibrary.createAlbumAsync(albumName, asset, false);
        } else {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        }
      }

      // Indexer le fichier pour qu'il apparaisse dans la galerie
      if (Platform.OS === 'android') {
        // Pour Android, s'assurer que le fichier est indexé
        const contentUri = await FileSystem.getContentUriAsync(newPath);
        if (contentUri) {
          console.log('Fichier indexé avec succès:', contentUri);
        }
      }

      return true;
    } catch (error) {
      console.error(`Erreur sauvegarde ${type}:`, error);
      throw error;
    }
  };

  const saveCardToGallery = async (): Promise<boolean> => {
    try {
      const cardImageUri = await captureCardAsImage();
      const saved = await saveImageToGallery(
        cardImageUri, 
        `Carte-Membre-${memberInfo.first_name}-${memberInfo.last_name}`,
        'card'
      );

      if (saved) {
        Alert.alert('✅ Succès', 'La carte a été enregistrée dans votre galerie');
      }
      return saved;
    } catch (error) {
      console.error('Erreur sauvegarde carte galerie:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la carte dans la galerie');
      return false;
    }
  };

  const saveInvoiceToGallery = async (): Promise<boolean> => {
    try {
      const invoiceImageUri = await generateInvoiceImage();
      const saved = await saveImageToGallery(
        invoiceImageUri, 
        `Facture-${transactionDetails?.reference || 'invoice'}`,
        'invoice'
      );

      if (saved) {
        Alert.alert('✅ Succès', 'La facture a été enregistrée dans votre galerie');
      }
      return saved;
    } catch (error) {
      console.error('Erreur sauvegarde facture galerie:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la facture dans la galerie');
      return false;
    }
  };

  const shareImage = async (imageUri: string, title: string) => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(imageUri, {
          mimeType: imageUri.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/png',
          dialogTitle: title,
          UTI: imageUri.toLowerCase().endsWith('.pdf') ? 'com.adobe.pdf' : 'public.image'
        });
      } else {
        Alert.alert('Erreur', 'Le partage n\'est pas disponible sur cet appareil');
      }
    } catch (error) {
      console.error('Erreur partage:', error);
      Alert.alert('Erreur', 'Impossible de partager le fichier');
    }
  };

  const generateInvoiceHTML = (): string => {
    if (!transactionDetails) {
      return '<html><body><h1>Facture non disponible</h1></body></html>';
    }

    const formattedDate = new Date(transactionDetails.timestamp).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Facture - MyChurch</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 30px;
            color: #333;
            background-color: white;
          }
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            border: 2px solid #3498db;
            border-radius: 15px;
            padding: 30px;
            background-color: #fff;
          }
          .invoice-header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #3498db;
          }
          .app-name {
            color: #3498db;
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .invoice-title {
            font-size: 20px;
            color: #2c3e50;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .invoice-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            flex-wrap: wrap;
          }
          .detail-section {
            flex: 1;
            min-width: 250px;
            margin-bottom: 20px;
          }
          .detail-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
            text-transform: uppercase;
            font-weight: bold;
          }
          .detail-value {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 15px;
            color: #2c3e50;
          }
          .payment-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            overflow: hidden;
          }
          .payment-table th {
            background-color: #3498db;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: bold;
          }
          .payment-table td {
            padding: 15px;
            border-bottom: 1px solid #dee2e6;
            color: #2c3e50;
          }
          .total-row {
            font-weight: bold;
            background-color: #f8f9fa;
          }
          .total-amount {
            color: #27ae60;
            font-size: 20px;
          }
          .payment-info {
            background-color: #f8f9fa;
            padding: 25px;
            border-radius: 12px;
            margin-bottom: 30px;
            border-left: 5px solid #27ae60;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #ecf0f1;
            color: #666;
            font-size: 14px;
          }
          .status-badge {
            display: inline-block;
            padding: 8px 15px;
            background-color: #27ae60;
            color: white;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
          }
          .church-info {
            background-color: #e3f2fd;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
            font-weight: bold;
            color: #1976d2;
          }
          @media print {
            body {
              padding: 0;
            }
            .invoice-container {
              border: none;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="invoice-header">
            <div class="app-name">MyChurch</div>
            <div class="invoice-title">FACTURE DE PAIEMENT</div>
            <div>Carte de membre numérique</div>
          </div>
          
          <div class="church-info">
            ${churchName}
          </div>
          
          <div class="invoice-details">
            <div class="detail-section">
              <div class="detail-label">Informations du membre</div>
              <div class="detail-value">${memberInfo.first_name} ${memberInfo.last_name}</div>
              
              <div class="detail-label">Email</div>
              <div class="detail-value">${memberInfo.email}</div>
              
              <div class="detail-label">Téléphone</div>
              <div class="detail-value">${memberInfo.phone || 'Non spécifié'}</div>
              
              <div class="detail-label">Type de membre</div>
              <div class="detail-value">${memberInfo.member_type}</div>
              
              <div class="detail-label">Poste</div>
              <div class="detail-value">${memberInfo.position || 'Non spécifié'}</div>
            </div>
            
            <div class="detail-section">
              <div class="detail-label">Référence facture</div>
              <div class="detail-value">${transactionDetails.reference}</div>
              
              <div class="detail-label">Date et heure</div>
              <div class="detail-value">${formattedDate}</div>
              
              <div class="detail-label">Statut</div>
              <div class="detail-value">
                <span class="status-badge">PAYÉ</span>
              </div>
              
              <div class="detail-label">Numéro de carte</div>
              <div class="detail-value">${generatedCardNumber}</div>
              
              <div class="detail-label">Département</div>
              <div class="detail-value">${selectedDepartment}</div>
            </div>
          </div>
          
          <table class="payment-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantité</th>
                <th>Prix unitaire</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Carte de ${memberInfo.member_type === 'Membre' ? 'membre' : 'personnel'} numérique</td>
                <td>1</td>
                <td>${transactionDetails.amount} ${transactionDetails.currency}</td>
                <td>${transactionDetails.amount} ${transactionDetails.currency}</td>
              </tr>
              <tr class="total-row">
                <td colspan="3" style="text-align: right; padding-right: 20px;">TOTAL</td>
                <td class="total-amount">${transactionDetails.amount} ${transactionDetails.currency}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="payment-info">
            <div class="detail-label">Moyen de paiement</div>
            <div class="detail-value">${transactionDetails.method}</div>
            
            ${transactionDetails.phoneNumber ? `
              <div class="detail-label">Numéro de téléphone</div>
              <div class="detail-value">${transactionDetails.phoneNumber}</div>
            ` : ''}
            
            <div class="detail-label">Département assigné</div>
            <div class="detail-value">${selectedDepartment}</div>
            
            <div class="detail-label">ID Transaction</div>
            <div class="detail-value">${transactionDetails.transactionId}</div>
            
            <div class="detail-label">Note</div>
            <div class="detail-value">Paiement inscription carte membre - Département: ${selectedDepartment}</div>
          </div>
          
          <div class="footer">
            <p><strong>${churchName}</strong></p>
            <p>Cette facture a été générée automatiquement par MyChurch</p>
            <p><em>Merci pour votre confiance !</em></p>
            <p style="font-size: 12px; margin-top: 10px;">Date d'émission: ${formattedDate}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const generateAndDownloadInvoice = async () => {
    try {
      // Générer et sauvegarder l'image de la facture
      const saved = await saveInvoiceToGallery();
      
      if (saved) {
        // Optionnel: aussi générer un PDF
        const html = generateInvoiceHTML();
        const { uri } = await Print.printToFileAsync({
          html,
          base64: false
        });

        const pdfName = `facture-${transactionDetails?.reference || 'invoice'}.pdf`;
        const newPath = `${FileSystem.documentDirectory}${pdfName}`;
        
        await FileSystem.moveAsync({
          from: uri,
          to: newPath
        });

        // Partager le PDF si l'utilisateur le souhaite
        if (Platform.OS === 'ios' || (await Sharing.isAvailableAsync())) {
          await Sharing.shareAsync(newPath, {
            dialogTitle: 'Partager la facture PDF',
          });
        }

        return newPath;
      }
      return null;
    } catch (error) {
      console.error('Erreur génération facture:', error);
      Alert.alert('Erreur', 'Impossible de générer la facture');
      return null;
    }
  };

  const handleProcessPayment = async () => {
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
        amount: 5,
        currency: 'USD',
        cardNumber,
        department: selectedDepartment,
        phoneNumber: paymentMethod === 'Mobile Money' ? phoneNumber : undefined,
      };

      setTransactionDetails(transactionData);
      setGeneratedCardNumber(cardNumber);

      // Créer les données de paiement
      const paymentData: PaymentData = {
        method: paymentMethod,
        reference: transactionData.reference,
        timestamp: transactionData.timestamp,
        note: `Paiement inscription carte membre - 5 USD - Département: ${selectedDepartment}`,
        phoneNumber: paymentMethod === 'Mobile Money' ? phoneNumber : undefined,
        cardNumber: paymentMethod === 'Carte Bancaire' ? cardNumber.replace(/\s/g, '').slice(-4) : undefined,
        cardHolder: paymentMethod === 'Carte Bancaire' ? cardHolder : undefined,
        expiryDate: paymentMethod === 'Carte Bancaire' ? expiryDate : undefined,
        cvv: paymentMethod === 'Carte Bancaire' ? cvv : undefined,
      };

      setPaymentData(paymentData);
      setPaymentCompleted(true);

      // Générer ID membre
      const memberId = `MEM-${Date.now().toString(36).toUpperCase()}`;
      const qrCode = generateQRCode(memberId);

      // Préparer les données du membre avec paiement
      const memberData: MemberData = {
        first_name: memberInfo.first_name.trim(),
        last_name: memberInfo.last_name.trim(),
        email: memberInfo.email.trim().toLowerCase(),
        phone: memberInfo.phone.trim() || undefined,
        address: memberInfo.address.trim() || undefined,
        member_type: memberInfo.member_type,
        position: memberInfo.position || undefined,
        departments: [selectedDepartment],
        salary: memberInfo.salary || undefined,
        photo_url: memberInfo.photoBase64 ? `data:image/jpeg;base64,${memberInfo.photoBase64}` : undefined,
        qr_code: qrCode,
        has_dossier: true,
        registration_date: new Date().toISOString(),
        is_active: true,
        church_id: churchId,
        has_paid: true,
        card_number: cardNumber,
        payment_method: paymentMethod,
        payment_date: new Date().toISOString(),
        payment_amount: 5,
        payment_currency: 'USD',
      };

      setStep('success');
      
      setTimeout(() => {
        onComplete(memberData, paymentData, selectedDepartment);
      }, 3000);
      
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

  const renderCard = () => (
    <View ref={cardViewRef} style={styles.cardContainer}>
      <View style={styles.card}>
        {/* En-tête de la carte */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardHeaderTitle}>MyChurch</Text>
          <Text style={styles.cardHeaderSubtitle}>
            {memberInfo.member_type === 'Membre' ? 'CARTE DE MEMBRE' : 'CARTE DE PERSONNEL'}
          </Text>
        </View>
        
        {/* Corps de la carte */}
        <View style={styles.cardBody}>
          {/* Photo */}
          <View style={styles.cardPhotoContainer}>
            {memberInfo.photoUri ? (
              <Image 
                source={{ uri: memberInfo.photoUri }} 
                style={styles.cardPhoto}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.cardPhotoPlaceholder}>
                <User size={40} color="#666" />
              </View>
            )}
          </View>
          
          {/* Informations */}
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>
              {memberInfo.first_name} {memberInfo.last_name}
            </Text>
            
            {memberInfo.member_type === 'Personnel' && memberInfo.position && (
              <Text style={styles.cardPosition}>{memberInfo.position}</Text>
            )}
            
            {selectedDepartment && (
              <Text style={styles.cardDepartment}>
                📂 {selectedDepartment}
              </Text>
            )}
            
            <View style={styles.cardDetails}>
              {memberInfo.phone && (
                <View style={styles.cardDetailRow}>
                  <Phone size={12} color="#666" />
                  <Text style={styles.cardDetailText}>{memberInfo.phone}</Text>
                </View>
              )}
              
              {memberInfo.email && (
                <View style={styles.cardDetailRow}>
                  <Mail size={12} color="#666" />
                  <Text style={styles.cardDetailText}>{memberInfo.email}</Text>
                </View>
              )}
              
              {memberInfo.address && (
                <View style={styles.cardDetailRow}>
                  <MapPin size={12} color="#666" />
                  <Text style={styles.cardDetailText}>{memberInfo.address}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        
        {/* Pied de carte */}
        <View style={styles.cardFooter}>
          <View style={styles.cardNumberContainer}>
            <CreditCard size={12} color="#3498db" />
            <Text style={styles.cardNumber}>{generatedCardNumber}</Text>
          </View>
          <Text style={styles.cardChurch}>{churchName}</Text>
        </View>
      </View>
    </View>
  );

  const renderForm = () => (
    <ScrollView style={styles.formContainer}>
      <Text style={styles.formTitle}>📝 Formulaire d'inscription</Text>
      <Text style={styles.formSubtitle}>Complétez les informations du membre</Text>

      {/* Église */}
      <View style={[styles.section, styles.churchInfo]}>
        <Building size={24} color="#3498db" />
        <Text style={styles.churchName}>{churchName}</Text>
      </View>

      {/* Photo */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Photo du membre (optionnel)</Text>
        <View style={styles.photoContainer}>
          {memberInfo.photoUri ? (
            <View style={styles.photoPreviewContainer}>
              <Image 
                source={{ uri: memberInfo.photoUri }}
                style={styles.photoImage}
              />
              <TouchableOpacity 
                style={styles.removePhotoButton}
                onPress={removePhoto}
              >
                <Text style={styles.removePhotoText}>×</Text>
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

      {/* Département */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Département *</Text>
        <Text style={styles.inputHelp}>
          La carte sera automatiquement enregistrée dans le dossier de ce département
        </Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.departmentsScroll}>
          <View style={styles.departmentsContainer}>
            {departments.map((department) => (
              <TouchableOpacity
                key={department}
                style={[
                  styles.departmentChip,
                  selectedDepartment === department && styles.departmentChipActive
                ]}
                onPress={() => setSelectedDepartment(department)}
              >
                <Text style={[
                  styles.departmentChipText,
                  selectedDepartment === department && styles.departmentChipTextActive
                ]}>
                  {department}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        
        {!selectedDepartment && (
          <Text style={styles.errorText}>
            ⚠️ Veuillez sélectionner un département si pas déjà fait.
          </Text>
        )}
        
        <View style={styles.infoBox}>
          <Text style={styles.infoBoxTitle}>📂 Information importante</Text>
          <Text style={styles.infoBoxText}>
            • Le département sera automatiquement créé si c'est le premier paiement{'\n'}
            • La carte sera enregistrée dans le dossier "{selectedDepartment || 'département sélectionné'}"{'\n'}
            • Vous pourrez modifier le département plus tard
          </Text>
        </View>
      </View>

      {/* Montant et paiement */}
      <View style={[styles.section, styles.paymentInfo]}>
        <View style={styles.amountDisplay}>
          <DollarSign size={32} color="#27ae60" />
          <View style={styles.amountDetails}>
            <Text style={styles.amountLabel}>Montant de l'inscription</Text>
            <Text style={styles.amountValue}>
              5 USD
            </Text>
          </View>
        </View>
        
        <Text style={styles.paymentNote}>
          Ce montant inclus: Carte de membre, QR Code, Dossier numérique dans "{selectedDepartment || 'le département'}", et frais d'inscription.
        </Text>
        
        <Text style={styles.importantRule}>
          ⚠️ IMPORTANT: La carte est générée uniquement après paiement de 5 USD
        </Text>
        
        <Text style={styles.departmentRule}>
          📂 La carte sera automatiquement enregistrée dans le dossier du département "{selectedDepartment || 'sélectionné'}"
        </Text>
      </View>

      <View style={styles.buttonGroupForm}>
        <TouchableOpacity
          style={[styles.nextButton, !selectedDepartment && styles.nextButtonDisabled]}
          onPress={() => {
            if (validateForm()) {
              setStep('payment');
            }
          }}
          disabled={!selectedDepartment}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>Continuer vers le paiement</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderPayment = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>💳 Paiement de la carte - 5 USD</Text>
      <Text style={styles.stepSubtitle}>Indiquez comment le paiement a été effectué</Text>

      {selectedDepartment && (
        <View style={styles.departmentBadge}>
          <Text style={styles.departmentBadgeText}>
            📂 Département: {selectedDepartment}
          </Text>
          <Text style={styles.departmentBadgeSubtext}>
            La carte sera enregistrée dans ce département
          </Text>
        </View>
      )}

      <View style={styles.paymentAmountInfo}>
        <DollarSign size={40} color="#27ae60" />
        <View style={styles.paymentAmountDetails}>
          <Text style={styles.paymentAmountText}>Montant: 5 USD</Text>
          <Text style={styles.paymentDepartmentText}>
            Département: {selectedDepartment}
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

      {/* Détails du paiement selon la méthode */}
      {paymentMethod === 'Mobile Money' && (
        <>
          <Text style={styles.sectionLabel}>Numéro de téléphone utilisé *</Text>
          <TextInput
            style={styles.input}
            placeholder="+243 XX XXX XXX"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            autoComplete="tel"
            placeholderTextColor="#95a5a6"
          />
          <Text style={styles.inputHelp}>
            Entrez le numéro utilisé pour le paiement
          </Text>
        </>
      )}

      {paymentMethod === 'Carte Bancaire' && (
        <>
          <Text style={styles.sectionLabel}>Numéro de carte *</Text>
          <TextInput
            style={styles.input}
            placeholder="1234 5678 9012 3456"
            value={cardNumber}
            onChangeText={(text) => setCardNumber(formatCardNumber(text))}
            keyboardType="numeric"
            maxLength={19}
            placeholderTextColor="#95a5a6"
          />

          <Text style={styles.sectionLabel}>Nom du titulaire *</Text>
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
              <Text style={styles.sectionLabel}>Date d'expiration *</Text>
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
              <Text style={styles.sectionLabel}>Code de sécurité (CVV) *</Text>
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

      <View style={styles.paymentWarning}>
        <AlertCircle size={20} color="#e74c3c" />
        <Text style={styles.paymentWarningText}>
          ⚠️ IMPORTANT: Ce système enregistre uniquement le paiement effectué en dehors de l'application.
          Aucun transfert d'argent n'a lieu dans l'application. Montant fixe: 5 USD.
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
              <Check size={20} color="white" />
              <Text style={styles.payButtonText}>
                Confirmer le paiement (5 USD)
              </Text>
            </>
          )}
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

  const renderProcessing = () => (
    <View style={styles.processingContainer}>
      <ActivityIndicator size="large" color="#3498db" />
      <Text style={styles.processingTitle}>Enregistrement en cours</Text>
      <Text style={styles.processingText}>
        Veuillez patienter pendant que nous enregistrons le paiement et créons le dossier...
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
          <Text style={styles.stepText}>Enregistrement dans "{selectedDepartment}"</Text>
        </View>
      </View>
      
      <View style={styles.packageProcessing}>
        <Folder size={40} color="#3498db" />
        <View style={styles.packageProcessingInfo}>
          <Text style={styles.packageProcessingText}>
            Génération de la carte et enregistrement dans le département
          </Text>
          <Text style={styles.packageProcessingDepartment}>
            📂 {selectedDepartment}
          </Text>
        </View>
      </View>
      
      <View style={styles.paymentWarning}>
        <AlertCircle size={20} color="#e74c3c" />
        <Text style={styles.paymentWarningText}>
          ⚠️ Ce système enregistre uniquement le paiement effectué en dehors de l'application.
          Aucun transfert d'argent n'a lieu dans l'application.
        </Text>
      </View>
      
      <Text style={styles.processingNote}>
        Ne fermez pas cette fenêtre pendant le traitement
      </Text>
    </View>
  );

  const renderSuccess = () => (
    <ScrollView style={styles.successContainer}>
      <View style={styles.successHeader}>
        <View style={styles.successIcon}>
          <Check size={60} color="white" />
        </View>
        <Text style={styles.successTitle}>✅ Inscription Réussie !</Text>
        
        <View style={styles.memberInfoSuccess}>
          <User size={20} color="#27ae60" />
          <Text style={styles.memberNameSuccess}>
            {memberInfo.first_name} {memberInfo.last_name}
          </Text>
        </View>
        
        {selectedDepartment && (
          <View style={styles.departmentSuccess}>
            <Folder size={16} color="#3498db" />
            <Text style={styles.departmentSuccessText}>
              Département: {selectedDepartment}
            </Text>
          </View>
        )}
      </View>
      
      {transactionDetails && (
        <View style={styles.transactionDetails}>
          <View style={styles.transactionRow}>
            <Text style={styles.transactionLabel}>Type:</Text>
            <Text style={styles.transactionValue}>
              {memberInfo.member_type}
            </Text>
          </View>
          <View style={styles.transactionRow}>
            <Text style={styles.transactionLabel}>Département:</Text>
            <Text style={styles.transactionValue}>{selectedDepartment}</Text>
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
              {transactionDetails.amount} {transactionDetails.currency}
            </Text>
          </View>
          <View style={styles.transactionRow}>
            <Text style={styles.transactionLabel}>Méthode:</Text>
            <Text style={styles.transactionValue}>
              {transactionDetails.method}
            </Text>
          </View>
        </View>
      )}
      
      {/* Affichage de la carte */}
      <View style={styles.cardPreviewSection}>
        <Text style={styles.cardPreviewTitle}>Votre carte de membre</Text>
        {renderCard()}
        
        <Text style={styles.cardPreviewNote}>
          📂 Cette carte a été automatiquement enregistrée dans le dossier "{selectedDepartment}"
        </Text>
      </View>
      
      <View style={styles.successActions}>
        <TouchableOpacity
          style={[styles.successButton, styles.downloadButton]}
          onPress={async () => {
            try {
              await saveCardToGallery();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de télécharger la carte');
            }
          }}
        >
          <Download size={20} color="white" />
          <Text style={styles.successButtonText}>Télécharger la carte (Image)</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.successButton, styles.shareButton]}
          onPress={async () => {
            try {
              const cardImageUri = await captureCardAsImage();
              await shareImage(cardImageUri, 'Partager la carte de membre');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de partager la carte');
            }
          }}
        >
          <Share2 size={20} color="white" />
          <Text style={styles.successButtonText}>Partager la carte</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.successButton, styles.invoiceButton]}
          onPress={async () => {
            await generateAndDownloadInvoice();
          }}
        >
          <Printer size={20} color="white" />
          <Text style={styles.successButtonText}>Télécharger la facture</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.successMessage}>
        L'inscription de {memberInfo.first_name} {memberInfo.last_name} a été traitée avec succès.
        La carte a été enregistrée dans le département "{selectedDepartment}".
      </Text>
      
      <ActivityIndicator size="small" color="#27ae60" style={styles.successSpinner} />
      <Text style={styles.successClosing}>
        Fermeture automatique dans 3 secondes...
      </Text>
    </ScrollView>
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
                 step === 'payment' ? 'Indiquez comment le paiement a été effectué' : 
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
                {memberInfo.photoUri ? (
                  <Image 
                    source={{ uri: memberInfo.photoUri }}
                    style={styles.memberPhoto}
                  />
                ) : (
                  <User size={32} color="#27ae60" />
                )}
                <Text style={styles.memberName}>
                  {memberInfo.first_name || memberInfo.last_name 
                    ? `${memberInfo.first_name} ${memberInfo.last_name}`.trim()
                    : 'Nouveau membre'}
                </Text>
              </View>
              <View style={styles.amountContainer}>
                <Text style={styles.amountLabel}>Montant du paiement</Text>
                <Text style={styles.amount}>
                  5 USD
                </Text>
                <Text style={styles.amountNote}>
                  {selectedDepartment ? `Département: ${selectedDepartment}` : 'Sélectionnez un département'}
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
  churchInfo: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bbdefb',
  },
  churchName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    flex: 1,
  },
  section: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
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
    marginBottom: 16,
    position: 'relative',
  },
  photoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e0e0e0',
    borderWidth: 4,
    borderColor: '#3498db',
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#e74c3c',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
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
  inputHelp: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 12,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 12,
    color: '#e74c3c',
    marginTop: 8,
    marginBottom: 12,
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
  departmentsScroll: {
    marginBottom: 12,
  },
  departmentsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
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
  infoBox: {
    backgroundColor: '#f3e5f5',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e1bee7',
  },
  infoBoxTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7b1fa2',
    marginBottom: 8,
  },
  infoBoxText: {
    fontSize: 13,
    color: '#4a148c',
    lineHeight: 18,
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
    marginBottom: 8,
  },
  importantRule: {
    fontSize: 13,
    color: '#e74c3c',
    fontWeight: '600',
    textAlign: 'center',
    padding: 12,
    backgroundColor: '#fdeaea',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f5c6cb',
    marginBottom: 8,
  },
  departmentRule: {
    fontSize: 13,
    color: '#3498db',
    fontWeight: '600',
    textAlign: 'center',
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbdefb',
  },
  buttonGroupForm: {
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  nextButton: {
    backgroundColor: '#3498db',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#bdc3c7',
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
  departmentBadge: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#3498db',
    alignItems: 'center',
  },
  departmentBadgeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 4,
  },
  departmentBadgeSubtext: {
    fontSize: 12,
    color: '#1976d2',
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
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  halfInput: {
    flex: 1,
  },
  paymentAmountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
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
  packageProcessingInfo: {
    flex: 1,
  },
  packageProcessingText: {
    fontSize: 14,
    color: '#9b59b6',
    fontWeight: '600',
    marginBottom: 4,
  },
  packageProcessingDepartment: {
    fontSize: 12,
    color: '#9b59b6',
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
    padding: 20,
    paddingBottom: 40,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
    marginBottom: 12,
  },
  memberNameSuccess: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  departmentSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  departmentSuccessText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '600',
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
  cardPreviewSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  cardPreviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
    textAlign: 'center',
  },
  cardPreviewNote: {
    fontSize: 12,
    color: '#3498db',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  cardContainer: {
    alignItems: 'center',
    width: '100%',
  },
  card: {
    width: 350,
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dee2e6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeader: {
    backgroundColor: '#3498db',
    padding: 20,
    alignItems: 'center',
  },
  cardHeaderTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardHeaderSubtitle: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  cardBody: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'flex-start',
  },
  cardPhotoContainer: {
    marginRight: 20,
  },
  cardPhoto: {
    width: 100,
    height: 120,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#3498db',
  },
  cardPhotoPlaceholder: {
    width: 100,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3498db',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  cardPosition: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDepartment: {
    fontSize: 12,
    color: '#9b59b6',
    fontWeight: '600',
    marginBottom: 12,
  },
  cardDetails: {
    gap: 8,
    marginBottom: 12,
  },
  cardDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardDetailText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  cardFooter: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  cardChurch: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  successActions: {
    gap: 12,
    marginBottom: 24,
  },
  successButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  downloadButton: {
    backgroundColor: '#3498db',
  },
  shareButton: {
    backgroundColor: '#9b59b6',
  },
  invoiceButton: {
    backgroundColor: '#27ae60',
  },
  successButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
    alignSelf: 'center',
  },
  successClosing: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 8,
    fontStyle: 'italic',
    textAlign: 'center',
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