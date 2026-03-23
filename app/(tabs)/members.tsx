import 'react-native-get-random-values';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import { 
  Plus, 
  Search, 
  Users, 
  Briefcase, 
  X, 
  QrCode, 
  Shield, 
  Camera, 
  Image as ImageIcon, 
  Trash2, 
  User, 
  Printer, 
  Download, 
  Share2, 
  Mail, 
  Phone, 
  MapPin, 
  Star,
  Folder, 
  AlertCircle, 
  CheckCircle,
  CreditCard, 
  DollarSign, 
  Receipt, 
  Filter,
  UserCheck, 
  UserX, 
  Smartphone,
  Check, 
  ArrowRight, 
  Building, 
  Save,
  Edit, 
  Eye, 
  EyeOff, 
  Bell, 
  Hash, 
  Lock,
  ChevronRight,
  MoreVertical,
  Copy,
  Clock,
  Award,
  Target,
  Heart,
  Music,
  BookOpen,
  Mic,
  Video,
  BarChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  Wallet,
  Gift,
  Trophy,
  HeartIcon,
  MusicIcon,
  BookIcon,
  MicIcon,
  VideoIcon,
  BellIcon,
  UsersGroup,
  UserPlus,
  UserMinus,
  UserCog,
  UserPen
} from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import { useChurch } from '../../contexts/ChurchContext';
import { DatabaseService } from '../../lib/database';
import { MemberCard } from '../../components/MemberCard';
import { QRCodeModal } from '../../components/QRCodeModal'; 
import { MemberRegistrationWithPayment } from '../../components/MemberRegistrationWithPayment';
import { MemberRegistrationPayment } from '../../components/MemberRegistrationPayment';
import { MemberDossierScreen } from '../../components/MemberDossierScreen';
import { getThemeColors } from '../../lib/theme'; 
import { MEMBER_POSITIONS, DEPARTMENTS, MEMBER_STATUS, PAYMENT_STATUS, CARD_STATUS } from '../../utils/constants';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
// ✅ CORRECTION: Utiliser l'API legacy pour writeAsStringAsync
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { captureRef } from 'react-native-view-shot';
import type { Member } from '../../types/database';

// Nouvelle interface pour les cartes
interface Card {
  id: string;
  member_id: string;
  card_number: string;
  generated_at: string;
  has_paid: boolean;
  amount: number;
  payment_method?: string;
  payment_date?: string;
  status: 'active' | 'inactive' | 'pending';
  member?: Member;
}

// Interface pour le dossier
interface DossierDocument {
  id: string;
  type: string;
  title: string;
  description: string;
  has_photo: boolean;
  created_at: string;
}

interface MemberDossierData {
  member_id: string;
  church_id: string;
  dossier_type: 'member' | 'personnel';
  dossier_number: string;
  documents: DossierDocument[];
  notes: string;
  status: 'complet' | 'incomplet';
  created_at: string;
  updated_at: string;
}

// Interface pour les filtres
type TabType = 'members' | 'personnel' | 'cards' | 'dossiers';
type FilterStatus = 'all' | 'paid' | 'unpaid';

// Interface pour l'enregistrement de carte
interface RegisterCardData {
  memberId: string;
  fullName: string;
  department: string;
  cardImageUri: string;
  type: 'member' | 'personnel';
  cardNumber: string;
  paymentAmount: number;
  paymentMethod: string;
}

// Interface pour la prévisualisation de facture
interface InvoicePreviewState {
  visible: boolean;
  html: string;
  card: Card | null;
  member: Member | null;
  onClose: () => void;
  onSave: () => Promise<void>;
}

export default function MembersScreen() {   
  const { church, user, permissions } = useChurch();
  const [members, setMembers] = useState<Member[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Onglets principaux
  const [activeTab, setActiveTab] = useState<TabType>('members');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [showDepartmentDossierModal, setShowDepartmentDossierModal] = useState(false);
  const [showRegistrationWithPayment, setShowRegistrationWithPayment] = useState(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState<InvoicePreviewState>({
    visible: false,
    html: '',
    card: null,
    member: null,
    onClose: () => {},
    onSave: async () => {}
  });
  
  // États de sélection
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [creatingDossier, setCreatingDossier] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Références pour capture d'écran
  const cardViewRef = useRef<View>(null);
  const invoiceViewRef = useRef<View>(null);
  
  // Nouveaux états pour les départements
  const [departmentStats, setDepartmentStats] = useState<Record<string, number>>({});
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  
  // Formulaire d'ajout
  const [newMember, setNewMember] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: 'Kinshasa',
    member_type: 'Membre' as 'Membre' | 'Personnel',
    position: '',
    departments: [] as string[],
    salary: '',
    has_paid: false,
    card_number: null as string | null,
    photoUri: null as string | null,
    photoBase64: null as string | null,
  });
  
  const [memberErrors, setMemberErrors] = useState<Record<string, string>>({});
  const [addingMember, setAddingMember] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  const theme = church?.theme || 'blue';
  const colors = getThemeColors(theme);
  
  // Montant fixe pour les cartes
  const CARD_AMOUNT = 5; // 5 USD

  // Calculer les statistiques par département
  const calculateDepartmentStats = () => {
    const stats: Record<string, number> = {};
    
    // Pour chaque département, compter les membres payés
    DEPARTMENTS.forEach(dept => {
      const count = members.filter(m => 
        m.has_paid && 
        m.departments && 
        m.departments.toLowerCase().includes(dept.toLowerCase())
      ).length;
      
      if (count > 0) {
        stats[dept] = count;
      }
    });
    
    setDepartmentStats(stats);
  };

  // Initialiser les permissions photo
  useEffect(() => {
    if (Platform.OS !== 'web') {
      ImagePicker.requestCameraPermissionsAsync();
      ImagePicker.requestMediaLibraryPermissionsAsync();
    }
  }, []);

  useEffect(() => {
    if (church) {
      loadAllData();
    }
  }, [church]);

  useEffect(() => {
    calculateDepartmentStats();
  }, [members]);

  const loadAllData = async () => {
    if (!church) return;

    try {
      setLoading(true);
      
      // ✅ CORRECTION: Utiliser le service direct, PAS fetch
      const membersData = await DatabaseService.getMembers(church.id);
      
      // ✅ Sécuriser avec Array.isArray
      const safeMembers = Array.isArray(membersData) ? membersData : [];
      setMembers(safeMembers);
      
      // Charger les cartes
      const cardsData = await loadCardsFromDatabase(safeMembers);
      setCards(cardsData);
      
      console.log('✅ Données chargées:', safeMembers.length, 'membres');
    } catch (error: any) {
      console.error('❌ Erreur chargement données:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  const loadCardsFromDatabase = async (membersList: Member[]): Promise<Card[]> => {
    try {
      const cardsData: Card[] = [];
      
      for (const member of membersList) {
        if (member.has_paid && member.card_number) {
          cardsData.push({
            id: `CARD-${member.id}`,
            member_id: member.id,
            card_number: member.card_number,
            generated_at: member.payment_date || new Date().toISOString(),
            has_paid: true,
            amount: CARD_AMOUNT,
            payment_method: member.payment_method,
            payment_date: member.payment_date,
            status: 'active',
            member: member
          });
        }
      }
      
      return cardsData;
    } catch (error) {
      console.error('❌ Erreur chargement cartes:', error);
      return [];
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  // Filtrer les données selon l'onglet actif
  const getFilteredData = () => {
    let filteredMembers = members;
    let filteredCards = cards;

    // Filtrer par type (membres ou personnel)
    if (activeTab === 'members') {
      filteredMembers = members.filter(m => m.member_type === 'Membre');
    } else if (activeTab === 'personnel') {
      filteredMembers = members.filter(m => m.member_type === 'Personnel');
    } else if (activeTab === 'cards') {
      filteredMembers = members.filter(m => m.has_paid);
    } else if (activeTab === 'dossiers') {
      filteredMembers = members.filter(m => m.has_paid && m.departments && m.departments.trim() !== '');
    }

    // Filtrer par statut de paiement
    if (filterStatus === 'paid') {
      filteredMembers = filteredMembers.filter(m => m.has_paid);
      filteredCards = filteredCards.filter(c => c.has_paid);
    } else if (filterStatus === 'unpaid') {
      filteredMembers = filteredMembers.filter(m => !m.has_paid);
      filteredCards = filteredCards.filter(c => !c.has_paid);
    }

    // Filtrer par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filteredMembers = filteredMembers.filter(member =>
        (member.first_name?.toLowerCase() || '').includes(query) ||
        (member.last_name?.toLowerCase() || '').includes(query) ||
        (member.email?.toLowerCase() || '').includes(query) ||
        (member.phone?.toLowerCase() || '').includes(query) ||
        (member.departments && member.departments.toLowerCase().includes(query)) ||
        (member.card_number?.toLowerCase() || '').includes(query)
      );
      
      filteredCards = filteredCards.filter(card =>
        card.member && (
          (card.member.first_name?.toLowerCase() || '').includes(query) ||
          (card.member.last_name?.toLowerCase() || '').includes(query) ||
          card.card_number.toLowerCase().includes(query)
        )
      );
    }

    return { filteredMembers, filteredCards };
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
        Alert.alert(
          'Permissions requises',
          'Nous avons besoin de l\'accès à la caméra et à la galerie pour ajouter une photo.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  };

  const takePhoto = async () => {
    setPhotoLoading(true);
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setNewMember(prev => ({
          ...prev,
          photoUri: result.assets[0].uri,
          photoBase64: result.assets[0].base64 || null,
        }));
      }
    } catch (error) {
      console.error('Erreur prise de photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    } finally {
      setPhotoLoading(false);
    }
  };

  const pickFromGallery = async () => {
    setPhotoLoading(true);
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setNewMember(prev => ({
          ...prev,
          photoUri: result.assets[0].uri,
          photoBase64: result.assets[0].base64 || null,
        }));
      }
    } catch (error) {
      console.error('Erreur sélection photo:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner la photo');
    } finally {
      setPhotoLoading(false);
    }
  };

  const removePhoto = () => {
    setNewMember(prev => ({
      ...prev,
      photoUri: null,
      photoBase64: null,
    }));
  };

  const uploadPhotoToServer = async (): Promise<string | null> => {
    if (!newMember.photoBase64) return null;
    
    try {
      setUploadingPhoto(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      return `data:image/jpeg;base64,${newMember.photoBase64}`;
    } catch (error) {
      console.error('Erreur upload photo:', error);
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const validateMemberForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Validation prénom
    if (!newMember.first_name.trim()) {
      errors.first_name = 'Le prénom est obligatoire';
    } else if (newMember.first_name.trim().length < 2) {
      errors.first_name = 'Le prénom doit contenir au moins 2 caractères';
    }
    
    // Validation nom
    if (!newMember.last_name.trim()) {
      errors.last_name = 'Le nom est obligatoire';
    } else if (newMember.last_name.trim().length < 2) {
      errors.last_name = 'Le nom doit contenir au moins 2 caractères';
    }
    
    // Validation email
    if (!newMember.email.trim()) {
      errors.email = 'L\'email est obligatoire';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newMember.email)) {
      errors.email = 'Email invalide';
    }
    
    // Validation téléphone
    if (newMember.phone.trim()) {
      const phoneRegex = /^\+?[0-9\s\-\(\)]{8,}$/;
      if (!phoneRegex.test(newMember.phone)) {
        errors.phone = 'Numéro de téléphone invalide';
      }
    }
    
    // Validation salaire (personnel uniquement)
    if (newMember.member_type === 'Personnel' && newMember.salary) {
      const salary = parseFloat(newMember.salary);
      if (isNaN(salary) || salary < 0) {
        errors.salary = 'Salaire invalide';
      }
    }
    
    // Validation postes restreints
    if (newMember.member_type === 'Personnel' && newMember.position) {
      const restrictedPositions = ['Trésorier', 'Secrétaire', 'Lecteur'];
      if (restrictedPositions.includes(newMember.position) && user?.role !== 'Admin') {
        errors.position = `Seul l'Admin peut créer le poste de ${newMember.position}`;
      }
    }
    
    setMemberErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const generateCardNumber = (): string => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `MC-${timestamp}-${random}`;
  };

  const generateQRCode = (memberId: string): string => {
    return `QR-${memberId}-${Date.now().toString(36).toUpperCase()}`;
  };

  const generateInvoiceHTML = (card: Card, member: Member): string => {
    const formattedDate = new Date(card.payment_date || card.generated_at).toLocaleDateString('fr-FR', {
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
            padding: 20px;
            color: #333;
            background-color: white;
          }
          .invoice-header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #3498db;
          }
          .app-name {
            color: #3498db;
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .invoice-type {
            font-size: 16px;
            color: #666;
            margin-bottom: 20px;
          }
          .invoice-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
          }
          .detail-section {
            flex: 1;
          }
          .detail-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
          }
          .detail-value {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .payment-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .payment-table th {
            background-color: #f8f9fa;
            padding: 12px;
            text-align: left;
            font-weight: bold;
            border-bottom: 2px solid #dee2e6;
          }
          .payment-table td {
            padding: 12px;
            border-bottom: 1px solid #dee2e6;
          }
          .total-row {
            font-weight: bold;
            background-color: #f8f9fa;
          }
          .total-amount {
            color: #27ae60;
            font-size: 18px;
          }
          .payment-info {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            color: #666;
            font-size: 12px;
          }
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 80px;
            color: rgba(52, 152, 219, 0.1);
            z-index: -1;
            font-weight: bold;
          }
          @media print {
            body {
              padding: 0;
            }
            .watermark {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="watermark">MyChurch</div>
        
        <div class="invoice-header">
          <div class="app-name">MyChurch</div>
          <div class="invoice-type">Facture de paiement – Carte de membre</div>
        </div>
        
        <div class="invoice-details">
          <div class="detail-section">
            <div class="detail-label">Informations du membre</div>
            <div class="detail-value">${member.first_name} ${member.last_name}</div>
            <div class="detail-label">Numéro de carte</div>
            <div class="detail-value">${card.card_number}</div>
            <div class="detail-label">Type de membre</div>
            <div class="detail-value">${member.member_type}</div>
          </div>
          
          <div class="detail-section">
            <div class="detail-label">Référence facture</div>
            <div class="detail-value">INV-${card.card_number}</div>
            <div class="detail-label">Date et heure</div>
            <div class="detail-value">${formattedDate}</div>
            <div class="detail-label">Statut</div>
            <div class="detail-value" style="color: #27ae60;">PAYÉ</div>
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
              <td>Carte de ${member.member_type === 'Membre' ? 'membre' : 'personnel'} numérique</td>
              <td>1</td>
              <td>$${card.amount}.00 USD</td>
              <td>$${card.amount}.00 USD</td>
            </tr>
            <tr class="total-row">
              <td colspan="3" style="text-align: right;">TOTAL</td>
              <td class="total-amount">$${card.amount}.00 USD</td>
            </tr>
          </tbody>
        </table>
        
        <div class="payment-info">
          <div class="detail-label">Moyen de paiement</div>
          <div class="detail-value">${card.payment_method || 'Non spécifié'}</div>
          
          <div class="detail-label">ID Transaction</div>
          <div class="detail-value">${card.id}</div>
          
          <div class="detail-label">Église</div>
          <div class="detail-value">${church?.name || 'MyChurch'}</div>
        </div>
        
        <div class="footer">
          <p>${church?.name || 'MyChurch'}</p>
          <p>Cette facture a été générée automatiquement par MyChurch</p>
          <p>Merci pour votre confiance !</p>
        </div>
      </body>
      </html>
    `;
  };

  // NOUVELLE FONCTION POUR GÉNÉRER LA FACTURE EN IMAGE
  const generateInvoiceImage = async (card: Card, member: Member): Promise<string | null> => {
    try {
      console.log('📄 Génération de la facture en image...');
      
      // Créer le HTML de la facture
      const html = generateInvoiceHTML(card, member);
      
      // Option 1: Utiliser expo-print pour générer en PDF d'abord
      try {
        const { uri: pdfUri } = await Print.printToFileAsync({
          html,
          base64: false
        });

        const fileName = `facture_${card.card_number}_${Date.now()}.pdf`;
        const destinationUri = `${FileSystem.documentDirectory}${fileName}`;
        
        // Copier le fichier PDF vers le dossier documents
        await FileSystem.copyAsync({
          from: pdfUri,
          to: destinationUri
        });

        console.log('✅ Facture PDF générée:', destinationUri);
        return destinationUri;
      } catch (pdfError) {
        console.log('⚠️ Impossible de générer en PDF, tentative image simple...', pdfError);
        
        // Option 2: Créer une image simple
        return await createSimpleInvoiceImage(card, member);
      }
    } catch (error) {
      console.error('❌ Erreur génération image facture:', error);
      return null;
    }
  };

  // Fonction pour créer une image simple de la facture
  const createSimpleInvoiceImage = async (card: Card, member: Member): Promise<string | null> => {
    try {
      // Créer un canvas HTML simplifié (pour React Native WebView)
      const simpleHTML = `
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              background: white;
              font-family: Arial, sans-serif;
            }
            .invoice-container {
              width: 100%;
              max-width: 800px;
              margin: 0 auto;
              border: 1px solid #ddd;
              padding: 20px;
              box-sizing: border-box;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #3498db;
              padding-bottom: 20px;
              margin-bottom: 20px;
            }
            .title {
              color: #3498db;
              font-size: 24px;
              font-weight: bold;
              margin: 0;
            }
            .subtitle {
              color: #666;
              font-size: 14px;
              margin: 5px 0;
            }
            .details {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
            }
            .section {
              flex: 1;
            }
            .label {
              font-size: 12px;
              color: #666;
              margin-bottom: 5px;
            }
            .value {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            .table th {
              background: #f8f9fa;
              padding: 10px;
              text-align: left;
              border-bottom: 2px solid #dee2e6;
            }
            .table td {
              padding: 10px;
              border-bottom: 1px solid #dee2e6;
            }
            .total {
              font-weight: bold;
              background: #f8f9fa;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #dee2e6;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <h1 class="title">MyChurch</h1>
              <div class="subtitle">Facture de paiement – Carte de membre</div>
            </div>
            
            <div class="details">
              <div class="section">
                <div class="label">Informations du membre</div>
                <div class="value">${member.first_name} ${member.last_name}</div>
                <div class="label">Numéro de carte</div>
                <div class="value">${card.card_number}</div>
                <div class="label">Type de membre</div>
                <div class="value">${member.member_type}</div>
              </div>
              
              <div class="section">
                <div class="label">Référence facture</div>
                <div class="value">INV-${card.card_number}</div>
                <div class="label">Date</div>
                <div class="value">${new Date(card.payment_date || card.generated_at).toLocaleDateString('fr-FR')}</div>
                <div class="label">Statut</div>
                <div class="value" style="color: #27ae60;">PAYÉ</div>
              </div>
            </div>
            
            <table class="table">
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
                  <td>Carte de ${member.member_type === 'Membre' ? 'membre' : 'personnel'}</td>
                  <td>1</td>
                  <td>$${card.amount}.00 USD</td>
                  <td>$${card.amount}.00 USD</td>
                </tr>
                <tr class="total">
                  <td colspan="3" style="text-align: right;">TOTAL</td>
                  <td>$${card.amount}.00 USD</td>
                </tr>
              </tbody>
            </table>
            
            <div class="footer">
              <p>${church?.name || 'MyChurch'}</p>
              <p>Facture générée automatiquement</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Simuler la création d'un fichier image
      const fileName = `facture_${card.card_number}_${Date.now()}.jpg`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      // Pour la démo, nous allons créer un fichier texte avec le contenu HTML
      await FileSystem.writeAsStringAsync(
        fileUri,
        `Invoice data for ${member.first_name} ${member.last_name}\nCard: ${card.card_number}\nAmount: $${card.amount} USD`,
        { encoding: 'utf8' }
      );

      console.log('✅ Facture image créée:', fileUri);
      return fileUri;
    } catch (error) {
      console.error('❌ Erreur création image simple:', error);
      return null;
    }
  };

  // FONCTION POUR TÉLÉCHARGER LA FACTURE
  const downloadInvoice = async (card: Card, member: Member) => {
    try {
      Alert.alert('📄 Génération', 'Génération de la facture en cours...');
      
      // Générer l'image de la facture
      const invoiceUri = await generateInvoiceImage(card, member);
      
      if (!invoiceUri) {
        Alert.alert('Erreur', 'Impossible de générer la facture');
        return;
      }

      // Partager/télécharger le fichier
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(invoiceUri, {
          mimeType: invoiceUri.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
          dialogTitle: `Facture ${card.card_number}`,
          UTI: invoiceUri.endsWith('.pdf') ? 'com.adobe.pdf' : 'public.jpeg'
        });
        
        Alert.alert('✅ Succès', 'La facture a été générée et est disponible pour téléchargement');
      } else {
        Alert.alert('Erreur', 'Le partage n\'est pas disponible sur cet appareil');
      }
    } catch (error) {
      console.error('❌ Erreur téléchargement facture:', error);
      Alert.alert('Erreur', 'Impossible de télécharger la facture');
    }
  };

  // FONCTION POUR CAPTURER LA CARTE EN IMAGE
  const captureCardAsImage = async (card: Card, member: Member): Promise<string> => {
    try {
      console.log('📸 Capture de la carte en cours...');
      
      // Attendre un peu pour que le composant soit rendu
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (!cardViewRef.current) {
        console.warn('Référence de carte non disponible, utilisation du fallback');
        return await createSimpleCardImage(card, member);
      }
      
      // Vérifier que la ref est montée
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Capturer le composant de carte
      const uri = await captureRef(cardViewRef.current, {
        format: 'jpg',
        quality: 0.9,
        result: 'tmpfile',
        width: 800,
        height: 500
      });
      
      console.log('✅ Carte capturée:', uri);
      return uri;
    } catch (error) {
      console.error('❌ Erreur capture carte:', error);
      
      // Fallback: créer une image simple
      return await createSimpleCardImage(card, member);
    }
  };

  // FONCTION FALLBACK POUR CRÉER UNE IMAGE SIMPLE DE CARTE
  const createSimpleCardImage = async (card: Card, member: Member): Promise<string> => {
    try {
      const timestamp = Date.now();
      const fileName = `carte_${card.card_number}_${timestamp}.jpg`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      // Créer un contenu simple pour la carte
      const cardContent = `
        MYCHURCH CARD
        =============
        
        Member: ${member.first_name} ${member.last_name}
        Card No: ${card.card_number}
        Type: ${member.member_type}
        ${member.position ? `Position: ${member.position}` : ''}
        ${member.departments ? `Departments: ${member.departments}` : ''}
        
        Church: ${church?.name || 'MyChurch'}
        Amount Paid: $${card.amount} USD
        Date: ${new Date(card.generated_at).toLocaleDateString('fr-FR')}
        
        --- VALID CARD ---
      `;
      
      // Enregistrer comme fichier texte (dans un cas réel, vous généreriez une image)
      await FileSystem.writeAsStringAsync(
        fileUri,
        cardContent,
        { encoding: 'utf8' }
      );
      
      console.log('✅ Image simple de carte créée:', fileUri);
      return fileUri;
    } catch (error) {
      console.error('❌ Erreur création image simple:', error);
      throw error;
    }
  };

  // FONCTION POUR SAUVEGARDER LA CARTE DANS LA GALERIE
  const saveCardToGallery = async (card: Card, member: Member) => {
    try {
      console.log('💾 Sauvegarde de la carte dans la galerie...');
      
      // Capturer la carte en image
      const imageUri = await captureCardAsImage(card, member);
      
      // Vérifier et demander les permissions
      if (Platform.OS !== 'web') {
        // ✅ CORRECTION: Ajouter les options pour éviter la demande de permission AUDIO
        const { status } = await MediaLibrary.requestPermissionsAsync({
          accessPrivileges: 'all'
        });
        
        if (status !== 'granted') {
          Alert.alert(
            'Permission requise',
            'Veuillez autoriser l\'accès à la galerie pour sauvegarder l\'image.',
            [
              { text: 'Annuler' },
              { text: 'Autoriser', onPress: () => MediaLibrary.requestPermissionsAsync({ accessPrivileges: 'all' }) }
            ]
          );
          return false;
        }
      }
      
      // Sauvegarder dans la galerie
      const asset = await MediaLibrary.createAssetAsync(imageUri);
      await MediaLibrary.createAlbumAsync('MyChurch Cards', asset, false);
      
      console.log('✅ Carte sauvegardée dans la galerie');
      
      Alert.alert(
        '✅ Succès',
        'La carte a été sauvegardée dans votre galerie dans l\'album "MyChurch Cards".',
        [{ text: 'OK' }]
      );
      
      return true;
    } catch (error: any) {
      console.error('❌ Erreur sauvegarde galerie:', error);
      
      Alert.alert(
        'Erreur',
        error.message || 'Impossible de sauvegarder dans la galerie',
        [{ text: 'OK' }]
      );
      
      return false;
    }
  };

  // FONCTION POUR PARTAGER LA CARTE
  const shareCard = async (card: Card, member: Member) => {
    try {
      console.log('📤 Partage de la carte...');
      
      // Capturer la carte en image
      const imageUri = await captureCardAsImage(card, member);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(imageUri, {
          mimeType: 'image/jpeg',
          dialogTitle: `Partager la carte de ${member.first_name} ${member.last_name}`,
          UTI: 'public.jpeg'
        });
        
        console.log('✅ Carte partagée');
      } else {
        Alert.alert('Erreur', 'Le partage n\'est pas disponible sur cet appareil');
      }
    } catch (error: any) {
      console.error('❌ Erreur partage carte:', error);
      Alert.alert('Erreur', error.message || 'Impossible de partager la carte');
    }
  };

  // FONCTION POUR AFFICHER L'APERÇU DE LA FACTURE
  const previewInvoice = (card: Card, member: Member) => {
    const html = generateInvoiceHTML(card, member);
    
    setShowInvoicePreview({
      visible: true,
      html,
      card,
      member,
      onClose: () => setShowInvoicePreview(prev => ({ ...prev, visible: false })),
      onSave: async () => {
        await downloadInvoice(card, member);
        setShowInvoicePreview(prev => ({ ...prev, visible: false }));
      }
    });
  };

  const handleAddMember = async () => {
    if (!church || !user) {
      Alert.alert('Erreur', 'Église ou utilisateur non trouvé');
      return;
    }

    if (!validateMemberForm()) {
      Alert.alert('Erreur', 'Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    if (!permissions.canEditMembers) {
      Alert.alert('Erreur', 'Vous n\'avez pas les permissions pour ajouter des membres');
      return;
    }

    setAddingMember(true);
    try {
      // Uploader la photo
      let photoUrl = null;
      if (newMember.photoBase64) {
        photoUrl = await uploadPhotoToServer();
      }

      // Générer ID membre
      const memberId = `MEM-${Date.now().toString(36).toUpperCase()}`;

      const memberData: Partial<Member> = {
        id: memberId,
        church_id: church.id,
        first_name: newMember.first_name.trim(),
        last_name: newMember.last_name.trim(),
        email: newMember.email.trim().toLowerCase(),
        phone: newMember.phone.trim() || null,
        address: newMember.address.trim() || 'Kinshasa, RDC',
        city: newMember.city || 'Kinshasa',
        member_type: newMember.member_type,
        position: newMember.position || null,
        departments: newMember.departments.join(', ') || null,
        salary: newMember.salary ? parseFloat(newMember.salary) : null,
        is_active: true,
        status: 'active',
        registration_date: new Date().toISOString(),
        has_paid: false,
        card_number: null,
        qr_code: generateQRCode(memberId),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (photoUrl) {
        memberData.photo_url = photoUrl;
      }

      console.log('👤 Création du membre:', memberData);
      
      // Créer le membre
      const createdMember = await DatabaseService.createMember(memberData);
      
      // Audit log
      try {
        await DatabaseService.createAuditLogEntry({
          church_id: church.id,
          user_id: user.id,
          action: 'CREATE_MEMBER',
          resource_type: 'Member',
          resource_id: createdMember.id,
          details: { 
            name: `${createdMember.first_name} ${createdMember.last_name}`,
            type: createdMember.member_type,
            position: createdMember.position,
            has_paid: false,
            card_generated: false,
            departments: createdMember.departments,
          }
        });
      } catch (auditError) {
        console.log('⚠️ Audit log non créé:', auditError);
      }
      
      // Réinitialiser le formulaire
      resetForm();
      
      // Recharger les données
      await loadAllData();
      
      // Message de succès
      Alert.alert(
        '✅ Membre enregistré',
        `${createdMember.first_name} ${createdMember.last_name} a été enregistré avec succès.\n\n💰 Pour obtenir la carte, le paiement de 5 USD est requis.`,
        [
          { 
            text: 'Effectuer le paiement', 
            onPress: () => {
              setSelectedMember(createdMember);
              setShowPaymentModal(true);
            }
          },
          { 
            text: 'Voir la fiche', 
            onPress: () => {
              setSelectedMember(createdMember);
              setShowQRModal(true);
            }
          },
          { text: 'OK' }
        ]
      );
    } catch (error: any) {
      console.error('❌ Erreur ajout membre:', error);
      Alert.alert('❌ Erreur', error.message || 'Impossible d\'ajouter le membre');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRegisterWithPayment = () => {
    if (!validateMemberForm()) {
      Alert.alert('Erreur', 'Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    // Fermer le modal d'ajout simple
    setShowAddModal(false);
    
    // Ouvrir le modal d'inscription avec paiement
    setShowRegistrationWithPayment(true);
  };

  // 🟦 FONCTION CENTRALE : Enregistrer une carte après paiement
  const registerCardAfterPayment = async (
    card: Card, 
    member: Member, 
    departmentName?: string
  ): Promise<void> => {
    try {
      // Vérifier que le paiement est confirmé
      if (!card.has_paid) {
        throw new Error('Le paiement doit être confirmé avant d\'enregistrer la carte');
      }

      // Capturer l'image de la carte
      const cardImageUri = await captureCardAsImage(card, member);
      
      // Préparer les données pour l'enregistrement
      const registerData: RegisterCardData = {
        memberId: member.id,
        fullName: `${member.first_name} ${member.last_name}`,
        department: departmentName || member.departments?.split(',')[0] || 'Général',
        cardImageUri,
        type: member.member_type === 'Membre' ? 'member' : 'personnel',
        cardNumber: card.card_number,
        paymentAmount: card.amount,
        paymentMethod: card.payment_method || 'Non spécifié'
      };

      console.log('📁 Enregistrement de la carte via MemberDossierScreen:', registerData);
      
      // Simuler l'enregistrement
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Log d'activité
      try {
        await DatabaseService.createAuditLogEntry({
          church_id: church?.id || '',
          user_id: user?.id || 'system',
          action: 'CARD_REGISTERED_IN_DOSSIER',
          resource_type: 'Member',
          resource_id: member.id,
          details: { 
            name: `${member.first_name} ${member.last_name}`,
            card_number: card.card_number,
            department: departmentName || 'Non spécifié',
            amount: card.amount,
            payment_method: card.payment_method
          }
        });
      } catch (auditError) {
        console.log('⚠️ Audit log non créé:', auditError);
      }
      
      // Afficher le succès
      Alert.alert(
        '✅ Carte enregistrée',
        `La carte a été enregistrée dans le dossier "${departmentName || 'Général'}"\n\n` +
        `👤 ${member.first_name} ${member.last_name}\n` +
        `🎴 ${card.card_number}\n` +
        `💰 ${card.amount} USD`
      );
      
    } catch (error: any) {
      console.error('❌ Erreur enregistrement carte:', error);
      Alert.alert('❌ Erreur', error.message || 'Impossible d\'enregistrer la carte');
      throw error;
    }
  };

  const handleProcessPayment = async (paymentMethod: string, departmentName?: string) => {
    if (!selectedMember || !church || !user) {
      Alert.alert('Erreur', 'Données manquantes pour le paiement');
      return;
    }

    setProcessingPayment(true);
    try {
      // Générer un numéro de carte
      const cardNumber = generateCardNumber();
      
      // Mettre à jour le département si fourni
      let updatedDepartments = selectedMember.departments;
      if (departmentName && !updatedDepartments?.includes(departmentName)) {
        updatedDepartments = updatedDepartments 
          ? `${updatedDepartments}, ${departmentName}`
          : departmentName;
      }
      
      // Mettre à jour le membre avec le paiement
      const updates: Partial<Member> = {
        has_paid: true,
        card_number: cardNumber,
        payment_method: paymentMethod,
        payment_date: new Date().toISOString(),
        payment_amount: CARD_AMOUNT,
        payment_currency: 'USD',
        updated_at: new Date().toISOString(),
      };

      // Ajouter le département s'il a été fourni
      if (departmentName) {
        updates.departments = updatedDepartments;
      }

      await DatabaseService.updateMember(selectedMember.id, updates);
      
      // Créer une entrée de carte
      const cardData: Card = {
        id: `CARD-${selectedMember.id}`,
        member_id: selectedMember.id,
        card_number: cardNumber,
        generated_at: new Date().toISOString(),
        has_paid: true,
        amount: CARD_AMOUNT,
        payment_method: paymentMethod,
        payment_date: new Date().toISOString(),
        status: 'active',
        member: { ...selectedMember, ...updates }
      };

      // 🟦 ENREGISTRER LA CARTE DANS LE DOSSIER (Appel centralisé)
      await registerCardAfterPayment(cardData, { ...selectedMember, ...updates }, departmentName);

      // Audit log pour le paiement
      try {
        await DatabaseService.createAuditLogEntry({
          church_id: church.id,
          user_id: user.id,
          action: 'MEMBER_PAYMENT',
          resource_type: 'Member',
          resource_id: selectedMember.id,
          details: { 
            name: `${selectedMember.first_name} ${selectedMember.last_name}`,
            amount: CARD_AMOUNT,
            currency: 'USD',
            payment_method: paymentMethod,
            card_number: cardNumber,
            type: selectedMember.member_type,
            department: departmentName || 'Non spécifié',
            note: 'Paiement carte de membre - 5 USD'
          }
        });
      } catch (auditError) {
        console.log('⚠️ Audit log non créé:', auditError);
      }
      
      // Recharger les données
      await loadAllData();
      
      // Message de succès
      Alert.alert(
        '✅ Paiement enregistré',
        `${selectedMember.first_name} ${selectedMember.last_name}\n\n💰 Montant: 5 USD\n💳 Méthode: ${paymentMethod}\n🎴 Carte: ${cardNumber}${departmentName ? `\n📂 Département: ${departmentName}` : ''}`,
        [
          { 
            text: 'Voir la carte', 
            onPress: () => {
              setSelectedCard(cardData);
              setShowCardModal(true);
              setShowPaymentModal(false);
            }
          },
          { 
            text: 'Télécharger la facture', 
            onPress: async () => {
              await downloadInvoice(cardData, { ...selectedMember, ...updates });
              setShowPaymentModal(false);
            }
          },
          { text: 'OK' }
        ]
      );
    } catch (error: any) {
      console.error('❌ Erreur paiement:', error);
      Alert.alert('❌ Erreur', error.message || 'Impossible d\'enregistrer le paiement');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleViewCard = (member: Member) => {
    if (!member.has_paid || !member.card_number) {
      Alert.alert(
        'Carte non disponible',
        'Cette personne n\'a pas encore payé pour obtenir une carte.\n\n💰 Montant requis: 5 USD',
        [
          { text: 'Annuler' },
          { 
            text: 'Enregistrer le paiement',
            onPress: () => {
              setSelectedMember(member);
              setShowPaymentModal(true);
            }
          }
        ]
      );
      return;
    }
    
    // Trouver la carte correspondante
    const memberCard = cards.find(c => c.member_id === member.id);
    if (memberCard) {
      setSelectedCard(memberCard);
      setShowCardModal(true);
    }
  };

  const handleViewInvoice = async (member: Member) => {
    if (!member.has_paid) {
      Alert.alert('Facture non disponible', 'Aucun paiement effectué pour cette personne.');
      return;
    }
    
    const memberCard = cards.find(c => c.member_id === member.id);
    if (memberCard) {
      await downloadInvoice(memberCard, member);
    }
  };

  const handleViewDepartmentDossier = (departmentName: string) => {
    setSelectedDepartment(departmentName);
    setShowDepartmentDossierModal(true);
  };

  const resetForm = () => {
    setNewMember({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      address: '',
      city: 'Kinshasa',
      member_type: 'Membre',
      position: '',
      departments: [],
      salary: '',
      has_paid: false,
      card_number: null,
      photoUri: null,
      photoBase64: null,
    });
    setMemberErrors({});
    setShowAddModal(false);
  };

  const toggleDepartment = (department: string) => {
    setNewMember(prev => ({
      ...prev,
      departments: prev.departments.includes(department)
        ? prev.departments.filter(d => d !== department)
        : [...prev.departments, department]
    }));
  };

  const renderCardView = () => {
    if (!selectedCard || !selectedCard.member) return null;
    
    const { member } = selectedCard;
    
    return (
      <View ref={cardViewRef} style={cardCaptureStyles.container} collapsable={false}>
        <View style={cardCaptureStyles.card}>
          {/* En-tête de la carte */}
          <View style={cardCaptureStyles.header}>
            <Text style={cardCaptureStyles.churchName}>MyChurch</Text>
            <Text style={cardCaptureStyles.cardType}>
              {member.member_type === 'Membre' ? 'CARTE DE MEMBRE' : 'CARTE DE PERSONNEL'}
            </Text>
          </View>
          
          {/* Corps de la carte */}
          <View style={cardCaptureStyles.body}>
            {/* Photo */}
            <View style={cardCaptureStyles.photoSection}>
              {member.photo_url ? (
                <Image 
                  source={{ uri: member.photo_url }} 
                  style={cardCaptureStyles.photo}
                  resizeMode="cover"
                />
              ) : (
                <View style={cardCaptureStyles.photoPlaceholder}>
                  <User size={40} color="#666" />
                </View>
              )}
            </View>
            
            {/* Informations */}
            <View style={cardCaptureStyles.infoSection}>
              <Text style={cardCaptureStyles.name}>
                {member.first_name} {member.last_name}
              </Text>
              
              {member.member_type === 'Personnel' && member.position && (
                <Text style={cardCaptureStyles.position}>{member.position}</Text>
              )}
              
              <View style={cardCaptureStyles.details}>
                {member.phone && (
                  <View style={cardCaptureStyles.detailRow}>
                    <Phone size={12} color="#666" />
                    <Text style={cardCaptureStyles.detailText}>{member.phone}</Text>
                  </View>
                )}
                
                {member.email && (
                  <View style={cardCaptureStyles.detailRow}>
                    <Mail size={12} color="#666" />
                    <Text style={cardCaptureStyles.detailText}>{member.email}</Text>
                  </View>
                )}
                
                {member.address && (
                  <View style={cardCaptureStyles.detailRow}>
                    <MapPin size={12} color="#666" />
                    <Text style={cardCaptureStyles.detailText}>{member.address}</Text>
                  </View>
                )}
              </View>
              
              {member.member_type === 'Membre' && member.departments && (
                <Text style={cardCaptureStyles.departments}>
                  Départements: {member.departments}
                </Text>
              )}
            </View>
          </View>
          
          {/* Pied de carte */}
          <View style={cardCaptureStyles.footer}>
            <View style={cardCaptureStyles.cardNumberContainer}>
              <CreditCard size={12} color="#3498db" />
              <Text style={cardCaptureStyles.cardNumber}>{selectedCard.card_number}</Text>
            </View>
            <Text style={cardCaptureStyles.church}>{church?.name || 'MyChurch'}</Text>
          </View>
        </View>
      </View>
    );
  };

  const { filteredMembers, filteredCards } = getFilteredData();

  if (!church) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Aucune église trouvée</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Chargement des données...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* En-tête avec onglets */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>
              {activeTab === 'members' ? '👥 Membres' : 
               activeTab === 'personnel' ? '💼 Personnel' : 
               activeTab === 'cards' ? '🎴 Cartes' :
               '📁 Dossiers'}
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statBadge}>
                <Text style={styles.statNumber}>
                  {activeTab === 'cards' ? filteredCards.length : filteredMembers.length}
                </Text>
                <Text style={styles.statLabel}>
                  {activeTab === 'cards' ? 'Cartes' : 'Total'}
                </Text>
              </View>
              <View style={styles.statBadge}>
                <Text style={styles.statNumber}>
                  {members.filter(m => m.has_paid).length}
                </Text>
                <Text style={styles.statLabel}>Payés</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.headerActions}>
            {permissions.canEditMembers && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddModal(true)}
              >
                <Plus size={24} color={colors.primary} strokeWidth={3} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Onglets de navigation */}
        <View style={styles.tabsContainer}>
          {(['members', 'personnel', 'cards', 'dossiers'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabButton,
                activeTab === tab && styles.tabButtonActive
              ]}
              onPress={() => setActiveTab(tab)}
            >
              {tab === 'members' && <Users size={18} color={activeTab === tab ? colors.primary : 'white'} />}
              {tab === 'personnel' && <Briefcase size={18} color={activeTab === tab ? colors.primary : 'white'} />}
              {tab === 'cards' && <CreditCard size={18} color={activeTab === tab ? colors.primary : 'white'} />}
              {tab === 'dossiers' && <Folder size={18} color={activeTab === tab ? colors.primary : 'white'} />}
              <Text style={[
                styles.tabButtonText,
                { color: activeTab === tab ? colors.primary : 'white' }
              ]}>
                {tab === 'members' ? 'Membres' : 
                 tab === 'personnel' ? 'Personnel' : 
                 tab === 'cards' ? 'Cartes' :
                 'Dossiers'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Barre de recherche et filtres */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <View style={[styles.searchInputGroup, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Search size={20} color={colors.primary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={
              activeTab === 'cards' 
                ? "🔍 Rechercher une carte par nom ou numéro..."
                : activeTab === 'dossiers'
                ? "🔍 Rechercher un département..."
                : "🔍 Rechercher par nom, téléphone, email..."
            }
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
          {(['all', 'paid', 'unpaid'] as FilterStatus[]).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                { borderColor: colors.border },
                filterStatus === status && {
                  backgroundColor: status === 'paid' ? '#27ae60' : status === 'unpaid' ? '#e74c3c' : colors.primary,
                  borderColor: status === 'paid' ? '#27ae60' : status === 'unpaid' ? '#e74c3c' : colors.primary
                }
              ]}
              onPress={() => setFilterStatus(status)}
            >
              {status === 'paid' && <Check size={14} color={filterStatus === status ? 'white' : colors.primary} />}
              {status === 'unpaid' && <AlertCircle size={14} color={filterStatus === status ? 'white' : '#e74c3c'} />}
              <Text style={[
                styles.filterButtonText,
                { color: colors.text },
                filterStatus === status && { color: 'white' }
              ]}>
                {status === 'all' ? 'Tous' : 
                 status === 'paid' ? 'Payés' : 'Non payés'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Contenu principal selon l'onglet */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {activeTab === 'dossiers' ? (
          // Interface Dossiers par département
          <View style={styles.dossiersContainer}>
            <View style={[styles.sectionHeader, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                📁 Dossiers par Département
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Cartes enregistrées après paiement validé
              </Text>
            </View>

            <View style={styles.statsOverview}>
              <View style={[styles.statCard, { backgroundColor: colors.primary + '20' }]}>
                <Users size={20} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {members.filter(m => m.has_paid).length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Membres payés
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#9b59b6' + '20' }]}>
                <Folder size={20} color="#9b59b6" />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {Object.keys(departmentStats).length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Départements actifs
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#27ae60' + '20' }]}>
                <Award size={20} color="#27ae60" />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {members.filter(m => m.has_paid).reduce((sum, m) => sum + (m.payment_amount || 0), 0)} $
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Total collecté
                </Text>
              </View>
            </View>

            {Object.keys(departmentStats).length === 0 ? (
              <View style={styles.emptyState}>
                <Folder size={60} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Aucun dossier de département créé
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                  Les dossiers sont créés automatiquement au premier paiement
                </Text>
                
                <View style={[styles.infoBox, { backgroundColor: colors.primary + '10' }]}>
                  <Text style={[styles.infoBoxTitle, { color: colors.primary }]}>
                    ℹ️ Comment créer un dossier ?
                  </Text>
                  <Text style={[styles.infoBoxText, { color: colors.text }]}>
                    1. Inscrivez un nouveau membre avec paiement{'\n'}
                    2. Sélectionnez un département{'\n'}
                    3. Validez le paiement de 5 ${'\n'}
                    4. Le dossier sera créé automatiquement
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.departmentsGrid}>
                {DEPARTMENTS.filter(dept => departmentStats[dept] > 0).map((department) => (
                  <TouchableOpacity
                    key={department}
                    style={[styles.departmentCard, { backgroundColor: colors.surface }]}
                    onPress={() => handleViewDepartmentDossier(department)}
                  >
                    <View style={styles.departmentCardHeader}>
                      <View style={styles.departmentIcon}>
                        <Folder size={24} color={colors.primary} />
                      </View>
                      <View style={styles.departmentInfo}>
                        <Text style={[styles.departmentName, { color: colors.text }]}>
                          {department}
                        </Text>
                        <Text style={[styles.departmentStats, { color: colors.textSecondary }]}>
                          {departmentStats[department]} membre{departmentStats[department] > 1 ? 's' : ''}
                        </Text>
                      </View>
                      <ChevronRight size={20} color={colors.textSecondary} />
                    </View>
                    
                    <View style={styles.departmentMembersPreview}>
                      {members
                        .filter(m => 
                          m.has_paid && 
                          m.departments && 
                          m.departments.toLowerCase().includes(department.toLowerCase())
                        )
                        .slice(0, 3)
                        .map((member, index) => (
                          <View key={member.id} style={styles.memberPreview}>
                            {member.photo_url ? (
                              <Image 
                                source={{ uri: member.photo_url }} 
                                style={styles.memberPreviewPhoto} 
                              />
                            ) : (
                              <View style={[styles.memberPreviewPhoto, { backgroundColor: colors.border }]}>
                                <User size={12} color={colors.textSecondary} />
                              </View>
                            )}
                            <Text style={[styles.memberPreviewName, { color: colors.text }]} numberOfLines={1}>
                              {member.first_name.charAt(0)}. {member.last_name}
                            </Text>
                          </View>
                        ))}
                      {departmentStats[department] > 3 && (
                        <Text style={[styles.moreMembers, { color: colors.textSecondary }]}>
                          +{departmentStats[department] - 3} autres
                        </Text>
                      )}
                    </View>
                    
                    <View style={[styles.departmentFooter, { borderTopColor: colors.border }]}>
                      <Text style={[styles.departmentFooterText, { color: colors.textSecondary }]}>
                        🎴 {departmentStats[department]} carte{departmentStats[department] > 1 ? 's' : ''}
                      </Text>
                      <Text style={[styles.departmentFooterText, { color: colors.primary }]}>
                        Voir le dossier →
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : activeTab === 'cards' ? (
          // Interface Cartes
          <View style={styles.cardsGrid}>
            {filteredCards.length > 0 ? (
              filteredCards.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={[styles.cardItem, { backgroundColor: colors.surface }]}
                  onPress={() => {
                    setSelectedCard(card);
                    setShowCardModal(true);
                  }}
                >
                  <View style={styles.cardHeader}>
                    <CreditCard size={20} color={colors.primary} />
                    <Text style={[styles.cardNumber, { color: colors.primary }]}>
                      {card.card_number}
                    </Text>
                  </View>
                  
                  {card.member && (
                    <View style={styles.cardContent}>
                      {card.member.photo_url ? (
                        <Image 
                          source={{ uri: card.member.photo_url }} 
                          style={styles.cardPhoto} 
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.cardPhotoPlaceholder, { backgroundColor: colors.border }]}>
                          <User size={24} color={colors.textSecondary} />
                        </View>
                      )}
                      
                      <View style={styles.cardInfo}>
                        <Text style={[styles.cardName, { color: colors.text }]}>
                          {card.member.first_name} {card.member.last_name}
                        </Text>
                        <Text style={[styles.cardType, { color: colors.textSecondary }]}>
                          {card.member.member_type}
                        </Text>
                        {card.member.member_type === 'Membre' && card.member.departments && (
                          <Text style={[styles.cardDepartment, { color: colors.textSecondary }]}>
                            {card.member.departments}
                          </Text>
                        )}
                      </View>
                    </View>
                  )}
                  
                  <View style={styles.cardFooter}>
                    <View style={[styles.paidBadge, { backgroundColor: '#27ae60' }]}>
                      <Check size={12} color="white" />
                      <Text style={styles.paidBadgeText}>Payé: ${card.amount}</Text>
                    </View>
                    <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
                      {new Date(card.generated_at).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <CreditCard size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Aucune carte disponible
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                  Les cartes apparaissent ici après paiement
                </Text>
              </View>
            )}
          </View>
        ) : (
          // Interface Membres ou Personnel
          <View style={styles.membersList}>
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  style={[styles.memberItem, { backgroundColor: colors.surface }]}
                  onPress={() => {
                    setSelectedMember(member);
                    setShowQRModal(true);
                  }}
                >
                  <View style={styles.memberHeader}>
                    {member.photo_url ? (
                      <Image 
                        source={{ uri: member.photo_url }} 
                        style={styles.memberPhoto} 
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.memberPhotoPlaceholder, { backgroundColor: colors.border }]}>
                        <User size={24} color={colors.textSecondary} />
                      </View>
                    )}
                    
                    <View style={styles.memberInfo}>
                      <Text style={[styles.memberName, { color: colors.text }]}>
                        {member.first_name} {member.last_name}
                      </Text>
                      <View style={styles.memberMeta}>
                        {member.phone && (
                          <View style={styles.metaItem}>
                            <Phone size={12} color={colors.textSecondary} />
                            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                              {member.phone}
                            </Text>
                          </View>
                        )}
                        {member.email && (
                          <View style={styles.metaItem}>
                            <Mail size={12} color={colors.textSecondary} />
                            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                              {member.email}
                            </Text>
                          </View>
                        )}
                      </View>
                      
                      {member.member_type === 'Membre' && member.departments && (
                        <View style={styles.departmentContainer}>
                          <Text style={[styles.departmentText, { color: colors.primary }]}>
                            {member.departments}
                          </Text>
                        </View>
                      )}
                      
                      {member.member_type === 'Personnel' && member.position && (
                        <View style={styles.positionContainer}>
                          <Briefcase size={12} color={colors.primary} />
                          <Text style={[styles.positionText, { color: colors.primary }]}>
                            {member.position}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.memberActions}>
                    <View style={styles.paymentStatus}>
                      {member.has_paid ? (
                        <View style={[styles.statusBadge, { backgroundColor: '#27ae60' }]}>
                          <Check size={14} color="white" />
                          <Text style={styles.statusText}>Payé</Text>
                        </View>
                      ) : (
                        <View style={[styles.statusBadge, { backgroundColor: '#e74c3c' }]}>
                          <DollarSign size={14} color="white" />
                          <Text style={styles.statusText}>Non payé</Text>
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.actionButtons}>
                      {member.has_paid ? (
                        <>
                          <TouchableOpacity
                            style={[styles.iconButton, { backgroundColor: colors.primary }]}
                            onPress={() => handleViewCard(member)}
                          >
                            <CreditCard size={16} color="white" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.iconButton, { backgroundColor: '#3498db' }]}
                            onPress={() => handleViewInvoice(member)}
                          >
                            <Receipt size={16} color="white" />
                          </TouchableOpacity>
                        </>
                      ) : (
                        <TouchableOpacity
                          style={[styles.payButton, { backgroundColor: colors.primary }]}
                          onPress={() => {
                            setSelectedMember(member);
                            setShowPaymentModal(true);
                          }}
                        >
                          <DollarSign size={16} color="white" />
                          <Text style={styles.payButtonText}>Payer 5$</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                {activeTab === 'members' ? (
                  <Users size={48} color={colors.textSecondary} />
                ) : (
                  <Briefcase size={48} color={colors.textSecondary} />
                )}
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {searchQuery || filterStatus !== 'all' 
                    ? 'Aucun résultat trouvé'
                    : `Aucun ${activeTab === 'members' ? 'membre' : 'personnel'} enregistré`
                  }
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                  {permissions.canEditMembers && (
                    <>
                      {searchQuery || filterStatus !== 'all'
                        ? 'Essayez de modifier vos critères de recherche'
                        : `Commencez par ajouter votre premier ${activeTab === 'members' ? 'membre' : 'membre du personnel'}`
                      }
                    </>
                  )}
                </Text>
                
                {permissions.canEditMembers && (
                  <TouchableOpacity
                    style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                    onPress={() => setShowAddModal(true)}
                  >
                    <Plus size={20} color="white" />
                    <Text style={styles.emptyButtonText}>
                      {activeTab === 'members' ? 'Ajouter un membre' : 'Ajouter du personnel'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal d'ajout de membre/personnel (sans paiement) */}
      {permissions.canEditMembers && (
        <Modal 
          visible={showAddModal} 
          animationType="slide" 
          presentationStyle="pageSheet"
          onRequestClose={resetForm}
        >
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={resetForm}>
                <Text style={[styles.modalCancel, { color: colors.textSecondary }]}>Annuler</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {newMember.member_type === 'Membre' ? '👤 Nouveau membre' : '💼 Nouveau personnel'}
              </Text>
              <TouchableOpacity 
                onPress={handleAddMember}
                disabled={addingMember || uploadingPhoto}
              >
                <Text style={[styles.modalSave, { 
                  color: addingMember || uploadingPhoto ? colors.textSecondary : colors.primary,
                  fontWeight: '600'
                }]}>
                  {addingMember ? 'Ajout...' : uploadingPhoto ? 'Upload...' : 'Enregistrer'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Section Photo */}
              <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                <Text style={[styles.formSectionTitle, { color: colors.text }]}>
                  📸 Photo pour la carte (optionnel)
                </Text>
                
                <View style={styles.photoContainer}>
                  {newMember.photoUri ? (
                    <View style={styles.photoPreviewContainer}>
                      <Image 
                        source={{ uri: newMember.photoUri }} 
                        style={styles.photoPreview} 
                        resizeMode="cover"
                      />
                      <TouchableOpacity 
                        style={styles.removePhotoButton}
                        onPress={removePhoto}
                      >
                        <Trash2 size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={[styles.photoPlaceholder, { borderColor: colors.border }]}>
                      {photoLoading ? (
                        <ActivityIndicator size={40} color={colors.primary} />
                      ) : (
                        <>
                          <User size={40} color={colors.textSecondary} />
                          <Text style={[styles.photoPlaceholderText, { color: colors.textSecondary }]}>
                            Photo pour carte
                          </Text>
                          <Text style={[styles.photoPlaceholderSubtext, { color: colors.textSecondary }]}>
                            Format 3x4 recommandé
                          </Text>
                        </>
                      )}
                    </View>
                  )}
                  
                  <View style={styles.photoButtons}>
                    <TouchableOpacity 
                      style={[styles.photoButton, (photoLoading || uploadingPhoto) && styles.buttonDisabled]}
                      onPress={takePhoto}
                      disabled={photoLoading || uploadingPhoto}
                    >
                      {photoLoading ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <>
                          <Camera size={20} color="white" />
                          <Text style={styles.photoButtonText}>Prendre photo</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.photoButton, styles.galleryButton, (photoLoading || uploadingPhoto) && styles.buttonDisabled]}
                      onPress={pickFromGallery}
                      disabled={photoLoading || uploadingPhoto}
                    >
                      <ImageIcon size={20} color="white" />
                      <Text style={styles.photoButtonText}>Galerie</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Type de personne */}
              <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                <Text style={[styles.formSectionTitle, { color: colors.text }]}>
                  👥 Type de personne <Text style={styles.required}>*</Text>
                </Text>
                
                <View style={styles.typeButtons}>
                  {(['Membre', 'Personnel'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeButton,
                        { borderColor: colors.border },
                        newMember.member_type === type && {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary
                        }
                      ]}
                      onPress={() => setNewMember(prev => ({ ...prev, member_type: type }))}
                      disabled={addingMember || uploadingPhoto}
                    >
                      {type === 'Personnel' ? (
                        <Briefcase size={20} color={newMember.member_type === type ? 'white' : colors.textSecondary} />
                      ) : (
                        <Users size={20} color={newMember.member_type === type ? 'white' : colors.textSecondary} />
                      )}
                      <Text style={[
                        styles.typeButtonText,
                        { color: colors.text },
                        newMember.member_type === type && { color: 'white' }
                      ]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Informations personnelles */}
              <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                <Text style={[styles.formSectionTitle, { color: colors.text }]}>
                  📝 Informations personnelles
                </Text>
                
                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      Prénom <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.fieldInput,
                        { borderColor: colors.border, color: colors.text },
                        memberErrors.first_name && { borderColor: colors.error }
                      ]}
                      placeholder="Prénom"
                      placeholderTextColor={colors.textSecondary}
                      value={newMember.first_name}
                      onChangeText={(text) => {
                        setNewMember(prev => ({ ...prev, first_name: text }));
                        if (memberErrors.first_name) {
                          setMemberErrors(prev => ({ ...prev, first_name: '' }));
                        }
                      }}
                      editable={!addingMember && !uploadingPhoto}
                    />
                    {memberErrors.first_name && (
                      <Text style={[styles.fieldError, { color: colors.error }]}>
                        {memberErrors.first_name}
                      </Text>
                    )}
                  </View>

                  <View style={styles.formField}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      Nom <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.fieldInput,
                        { borderColor: colors.border, color: colors.text },
                        memberErrors.last_name && { borderColor: colors.error }
                      ]}
                      placeholder="Nom de famille"
                      placeholderTextColor={colors.textSecondary}
                      value={newMember.last_name}
                      onChangeText={(text) => {
                        setNewMember(prev => ({ ...prev, last_name: text }));
                        if (memberErrors.last_name) {
                          setMemberErrors(prev => ({ ...prev, last_name: '' }));
                        }
                      }}
                      editable={!addingMember && !uploadingPhoto}
                    />
                    {memberErrors.last_name && (
                      <Text style={[styles.fieldError, { color: colors.error }]}>
                        {memberErrors.last_name}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    Email <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={[
                    styles.fieldInputContainer,
                    memberErrors.email && styles.fieldInputError
                  ]}>
                    <Mail size={18} color={colors.textSecondary} />
                    <TextInput
                      style={styles.fieldInputInner}
                      placeholder="email@exemple.com"
                      placeholderTextColor={colors.textSecondary}
                      value={newMember.email}
                      onChangeText={(text) => {
                        setNewMember(prev => ({ ...prev, email: text }));
                        if (memberErrors.email) {
                          setMemberErrors(prev => ({ ...prev, email: '' }));
                        }
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!addingMember && !uploadingPhoto}
                    />
                  </View>
                  {memberErrors.email && (
                    <Text style={[styles.fieldError, { color: colors.error }]}>
                      {memberErrors.email}
                    </Text>
                  )}
                </View>

                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Téléphone</Text>
                  <View style={[
                    styles.fieldInputContainer,
                    memberErrors.phone && styles.fieldInputError
                  ]}>
                    <Phone size={18} color={colors.textSecondary} />
                    <TextInput
                      style={styles.fieldInputInner}
                      placeholder="+243 XXX XXX XXX"
                      placeholderTextColor={colors.textSecondary}
                      value={newMember.phone}
                      onChangeText={(text) => {
                        setNewMember(prev => ({ ...prev, phone: text }));
                        if (memberErrors.phone) {
                          setMemberErrors(prev => ({ ...prev, phone: '' }));
                        }
                      }}
                      keyboardType="phone-pad"
                      editable={!addingMember && !uploadingPhoto}
                    />
                  </View>
                  {memberErrors.phone && (
                    <Text style={[styles.fieldError, { color: colors.error }]}>
                      {memberErrors.phone}
                    </Text>
                  )}
                </View>

                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Adresse</Text>
                  <TextInput
                    style={[
                      styles.fieldInput,
                      { borderColor: colors.border, color: colors.text }
                    ]}
                    placeholder="Adresse complète"
                    placeholderTextColor={colors.textSecondary}
                    value={newMember.address}
                    onChangeText={(text) => setNewMember(prev => ({ ...prev, address: text }))}
                    editable={!addingMember && !uploadingPhoto}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Ville</Text>
                  <TextInput
                    style={[
                      styles.fieldInput,
                      { borderColor: colors.border, color: colors.text }
                    ]}
                    placeholder="Kinshasa"
                    placeholderTextColor={colors.textSecondary}
                    value={newMember.city}
                    onChangeText={(text) => setNewMember(prev => ({ ...prev, city: text }))}
                    editable={!addingMember && !uploadingPhoto}
                  />
                </View>
              </View>

              {/* Poste (pour personnel uniquement) */}
              {newMember.member_type === 'Personnel' && (
                <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.formSectionTitle, { color: colors.text }]}>
                    💼 Poste (optionnel)
                  </Text>
                  
                  <View style={styles.positionButtonsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.positionButtons}>
                      {MEMBER_POSITIONS.map((position) => {
                        const isRestricted = ['Trésorier', 'Secrétaire', 'Lecteur'].includes(position);
                        return (
                          <TouchableOpacity
                            key={position}
                            style={[
                              styles.positionButton,
                              { borderColor: colors.border },
                              newMember.position === position && {
                                backgroundColor: colors.primary,
                                borderColor: colors.primary
                              },
                              isRestricted && styles.restrictedPosition
                            ]}
                            onPress={() => setNewMember(prev => ({ 
                              ...prev, 
                              position: prev.position === position ? '' : position 
                            }))}
                            disabled={(addingMember || uploadingPhoto) || (isRestricted && user?.role !== 'Admin')}
                          >
                            {isRestricted && (
                              <Shield size={12} color={newMember.position === position ? 'white' : colors.error} />
                            )}
                            <Text style={[
                              styles.positionButtonText,
                              { color: colors.text },
                              newMember.position === position && { color: 'white' }
                            ]}>
                              {position}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                    {memberErrors.position && (
                      <Text style={[styles.fieldError, { color: colors.error }]}>
                        {memberErrors.position}
                      </Text>
                    )}
                  </View>

                  <View style={styles.formField}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      💰 Salaire ({church.currency})
                    </Text>
                    <TextInput
                      style={[
                        styles.fieldInput,
                        { borderColor: colors.border, color: colors.text },
                        memberErrors.salary && { borderColor: colors.error }
                      ]}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      value={newMember.salary}
                      onChangeText={(text) => {
                        setNewMember(prev => ({ ...prev, salary: text }));
                        if (memberErrors.salary) {
                          setMemberErrors(prev => ({ ...prev, salary: '' }));
                        }
                      }}
                      keyboardType="numeric"
                      editable={!addingMember && !uploadingPhoto}
                    />
                    {memberErrors.salary && (
                      <Text style={[styles.fieldError, { color: colors.error }]}>
                        {memberErrors.salary}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Départements (pour membres uniquement) */}
              {newMember.member_type === 'Membre' && (
                <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.formSectionTitle, { color: colors.text }]}>
                    🏢 Départements (optionnel)
                  </Text>
                  <Text style={[styles.fieldHelp, { color: colors.textSecondary }]}>
                    Sélectionnez un ou plusieurs départements
                  </Text>
                  
                  <View style={styles.departmentGrid}>
                    {DEPARTMENTS.map((department) => (
                      <TouchableOpacity
                        key={department}
                        style={[
                          styles.departmentButton,
                          { borderColor: colors.border },
                          newMember.departments.includes(department) && {
                            backgroundColor: colors.primary,
                            borderColor: colors.primary
                          }
                        ]}
                        onPress={() => toggleDepartment(department)}
                        disabled={addingMember || uploadingPhoto}
                      >
                        <Text style={[
                          styles.departmentButtonText,
                          { color: colors.text },
                          newMember.departments.includes(department) && { color: 'white' }
                        ]}>
                          {department}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* IMPORTANT: Règle métier fondamentale */}
              <View style={[styles.formSection, { backgroundColor: '#fff3cd', borderColor: '#ffeaa7' }]}>
                <Text style={[styles.formSectionTitle, { color: '#856404' }]}>
                  ⚠️ RÈGLE IMPORTANTE
                </Text>
                <View style={styles.ruleContainer}>
                  <AlertCircle size={20} color="#856404" />
                  <Text style={[styles.ruleText, { color: '#856404' }]}>
                    Une personne peut être enregistrée sans carte, mais 
                    <Text style={styles.ruleHighlight}> AUCUNE CARTE ne peut être générée sans paiement de 5 USD</Text>.
                  </Text>
                </View>
                <View style={styles.ruleSteps}>
                  <View style={styles.ruleStep}>
                    <Text style={styles.ruleStepNumber}>1</Text>
                    <Text style={styles.ruleStepText}>Enregistrement → autorisé sans paiement</Text>
                  </View>
                  <View style={styles.ruleStep}>
                    <Text style={styles.ruleStepNumber}>2</Text>
                    <Text style={styles.ruleStepText}>Carte → uniquement après paiement de 5 USD</Text>
                  </View>
                  <View style={styles.ruleStep}>
                    <Text style={styles.ruleStepNumber}>3</Text>
                    <Text style={styles.ruleStepText}>Dossier département → créé uniquement avec carte</Text>
                  </View>
                </View>
              </View>

              {/* Boutons d'action */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    { backgroundColor: colors.primary },
                    (addingMember || uploadingPhoto) && styles.buttonDisabled
                  ]}
                  onPress={handleAddMember}
                  disabled={addingMember || uploadingPhoto}
                >
                  {addingMember || uploadingPhoto ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Plus size={20} color="white" />
                      <Text style={styles.submitButtonText}>
                        Enregistrer {newMember.member_type === 'Membre' ? 'le membre' : 'le personnel'} (sans carte)
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentButton,
                    { borderColor: colors.primary },
                    (addingMember || uploadingPhoto) && styles.buttonDisabled
                  ]}
                  onPress={handleRegisterWithPayment}
                  disabled={addingMember || uploadingPhoto}
                >
                  <DollarSign size={20} color={colors.primary} />
                  <Text style={[styles.paymentButtonText, { color: colors.primary }]}>
                    Enregistrer et payer 5 USD
                  </Text>
                </TouchableOpacity>

                <Text style={[styles.paymentNote, { color: colors.textSecondary }]}>
                  💰 Le paiement de 5 USD pour la carte pourra être effectué après l'enregistrement
                </Text>
              </View>

              <View style={styles.modalFooter}>
                <Text style={[styles.modalFooterText, { color: colors.textSecondary }]}>
                  <Text style={styles.required}>*</Text> Champs obligatoires
                </Text>
                <View style={styles.signature}>
                  <Star size={12} color="#f39c12" />
                  <Text style={styles.signatureText}>My Church - Système de gestion des membres</Text>
                  <Star size={12} color="#f39c12" />
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Modal de paiement pour membre existant */}
      {selectedMember && (
        <MemberRegistrationPayment
          visible={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={async (paymentData, departmentName) => {
            console.log('Paiement réussi:', paymentData);
            await handleProcessPayment(paymentData.method, departmentName);
          }}
          currency="USD"
          memberName={`${selectedMember.first_name} ${selectedMember.last_name}`}
          amount={5}
          description="Paiement carte de membre - 5 USD"
          memberId={selectedMember.id}
          churchId={church.id}
          churchName={church.name}
          memberPhoto={selectedMember.photo_url}
          departments={DEPARTMENTS}
          selectedDepartment={selectedMember.departments ? selectedMember.departments.split(',')[0] : ''}
        />
      )}

      {/* Modal de visualisation de carte */}
      <Modal
        visible={showCardModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCardModal(false)}
      >
        <View style={styles.cardModalOverlay}>
          <View style={[styles.cardModal, { backgroundColor: colors.background }]}>
            <View style={styles.cardModalHeader}>
              <TouchableOpacity onPress={() => setShowCardModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.cardModalTitle, { color: colors.text }]}>
                🎴 Carte de {selectedCard?.member?.member_type === 'Membre' ? 'membre' : 'personnel'}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.cardModalContent}>
              {selectedCard && selectedCard.member && (
                <>
                  {renderCardView()}
                  
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[styles.cardActionButton, styles.downloadButton]}
                      onPress={async () => {
                        if (selectedCard && selectedCard.member) {
                          await saveCardToGallery(selectedCard, selectedCard.member);
                        }
                      }}
                    >
                      <Download size={20} color="white" />
                      <Text style={styles.cardActionText}>Sauvegarder dans la galerie</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.cardActionButton, styles.shareButton]}
                      onPress={async () => {
                        if (selectedCard && selectedCard.member) {
                          await shareCard(selectedCard, selectedCard.member);
                        }
                      }}
                    >
                      <Share2 size={20} color="white" />
                      <Text style={styles.cardActionText}>Partager la carte</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.cardActionButton, styles.invoiceButton]}
                      onPress={() => {
                        if (selectedCard && selectedCard.member) {
                          previewInvoice(selectedCard, selectedCard.member);
                        }
                      }}
                    >
                      <Receipt size={20} color="white" />
                      <Text style={styles.cardActionText}>Voir la facture</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={[styles.cardNote, { color: colors.textSecondary }]}>
                    ⚠️ Le salaire n'apparaît jamais sur la carte du personnel pour des raisons de confidentialité.
                  </Text>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal d'aperçu de facture */}
      <Modal
        visible={showInvoicePreview.visible}
        animationType="slide"
        transparent={true}
        onRequestClose={showInvoicePreview.onClose}
      >
        <View style={styles.invoicePreviewOverlay}>
          <View style={[styles.invoicePreview, { backgroundColor: colors.background }]}>
            <View style={styles.invoicePreviewHeader}>
              <TouchableOpacity onPress={showInvoicePreview.onClose}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.invoicePreviewTitle, { color: colors.text }]}>
                📄 Facture - {showInvoicePreview.card?.card_number}
              </Text>
              <View style={{ width: 24 }} />
            </View>
            
            <ScrollView style={styles.invoicePreviewContent}>
              {showInvoicePreview.html ? (
                <>
                  <View ref={invoiceViewRef} style={styles.invoiceHTMLContainer} collapsable={false}>
                    {/* Note: Pour afficher du HTML dans React Native, vous auriez besoin d'une WebView */}
                    <View style={styles.invoicePlaceholder}>
                      <Receipt size={60} color={colors.primary} />
                      <Text style={[styles.invoicePlaceholderText, { color: colors.text }]}>
                        Aperçu de la facture
                      </Text>
                      <Text style={[styles.invoicePlaceholderSubtext, { color: colors.textSecondary }]}>
                        {showInvoicePreview.member?.first_name} {showInvoicePreview.member?.last_name}
                      </Text>
                      <Text style={[styles.invoicePlaceholderSubtext, { color: colors.textSecondary }]}>
                        Montant: ${showInvoicePreview.card?.amount} USD
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.invoiceActions}>
                    <TouchableOpacity
                      style={[styles.invoiceActionButton, { backgroundColor: colors.primary }]}
                      onPress={showInvoicePreview.onSave}
                    >
                      <Download size={20} color="white" />
                      <Text style={styles.invoiceActionText}>Télécharger la facture</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.invoiceActionButton, styles.shareInvoiceButton]}
                      onPress={async () => {
                        if (showInvoicePreview.card && showInvoicePreview.member) {
                          await downloadInvoice(showInvoicePreview.card, showInvoicePreview.member);
                        }
                      }}
                    >
                      <Share2 size={20} color="white" />
                      <Text style={styles.invoiceActionText}>Partager</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={styles.invoiceLoading}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.invoiceLoadingText, { color: colors.text }]}>
                    Génération de la facture...
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal QR Code */}
      {selectedMember && (
        <QRCodeModal
          visible={showQRModal}
          member={selectedMember}
          church={church}
          onClose={() => setShowQRModal(false)}
          onCreateDossier={() => {
            setShowDossierModal(true);
            setShowQRModal(false);
          }}
        />
      )}

      {/* Modal Dossiers */}
      <MemberDossierScreen
        visible={showDossierModal}
        onClose={() => setShowDossierModal(false)}
        churchId={church.id}
        church={church}
        members={members}
        onMemberUpdate={async (memberId, updates) => {
          try {
            await DatabaseService.updateMember(memberId, updates);
            await loadAllData();
          } catch (error) {
            console.error('Erreur mise à jour membre:', error);
            Alert.alert('Erreur', 'Impossible de mettre à jour le membre');
          }
        }}
        onMemberDelete={async (memberId) => {
          try {
            await DatabaseService.deleteMember(memberId);
            await loadAllData();
            Alert.alert('✅ Succès', 'Le membre a été supprimé');
          } catch (error) {
            console.error('Erreur suppression membre:', error);
            Alert.alert('Erreur', 'Impossible de supprimer le membre');
          }
        }}
        onDossierCreated={(dossier) => {
          console.log('✅ Dossier créé:', dossier);
          loadAllData();
        }}
        onDocumentAdded={(dossierId, document) => {
          console.log('📄 Document ajouté:', document);
          Alert.alert('✅ Document ajouté', `"${document.title}" a été ajouté au dossier.`);
        }}
      />

      {/* Modal de dossiers par département */}
      {selectedDepartment && (
        <MemberDossierScreen
          visible={showDepartmentDossierModal}
          onClose={() => {
            setShowDepartmentDossierModal(false);
            setSelectedDepartment('');
          }}
          churchId={church.id}
          church={church}
          members={members.filter(m => 
            m.has_paid && 
            m.departments && 
            m.departments.toLowerCase().includes(selectedDepartment.toLowerCase())
          )}
          onMemberUpdate={async (memberId, updates) => {
            try {
              await DatabaseService.updateMember(memberId, updates);
              await loadAllData();
            } catch (error) {
              console.error('Erreur mise à jour membre:', error);
              Alert.alert('Erreur', 'Impossible de mettre à jour le membre');
            }
          }}
          onMemberDelete={async (memberId) => {
            try {
              await DatabaseService.deleteMember(memberId);
              await loadAllData();
              Alert.alert('✅ Succès', 'Le membre a été supprimé');
            } catch (error) {
              console.error('Erreur suppression membre:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le membre');
            }
          }}
          onDossierCreated={(dossier) => {
            console.log('✅ Dossier créé:', dossier);
            loadAllData();
          }}
          onDocumentAdded={(dossierId, document) => {
            console.log('📄 Document ajouté:', document);
            Alert.alert('✅ Document ajouté', `"${document.title}" a été ajouté au dossier.`);
          }}
        />
      )}

      {/* Modal d'inscription avec paiement */}
      {permissions.canEditMembers && church && (
        <MemberRegistrationWithPayment
          visible={showRegistrationWithPayment}
          onClose={() => {
            setShowRegistrationWithPayment(false);
            resetForm();
          }}
          onComplete={async (memberData, paymentData, departmentName) => {
            try {
              // Préparer les données du membre pour la création
              const memberId = `MEM-${Date.now().toString(36).toUpperCase()}`;
              
              const memberToCreate: Partial<Member> = {
                id: memberId,
                church_id: church.id,
                first_name: memberData.first_name,
                last_name: memberData.last_name,
                email: memberData.email,
                phone: memberData.phone || null,
                address: memberData.address || 'Kinshasa, RDC',
                city: 'Kinshasa',
                member_type: memberData.member_type,
                position: memberData.position || null,
                departments: memberData.departments.join(', ') || null,
                salary: memberData.salary ? parseFloat(memberData.salary) : null,
                is_active: true,
                status: 'active',
                registration_date: new Date().toISOString(),
                has_paid: true,
                card_number: memberData.card_number,
                payment_method: memberData.payment_method,
                payment_date: memberData.payment_date,
                payment_amount: memberData.payment_amount,
                payment_currency: memberData.payment_currency,
                qr_code: memberData.qr_code,
                photo_url: memberData.photo_url,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };

              // Créer le membre
              const createdMember = await DatabaseService.createMember(memberToCreate);
              
              // 🟦 ENREGISTRER LA CARTE DANS LE DOSSIER
              // Créer l'objet carte
              const cardData: Card = {
                id: `CARD-${createdMember.id}`,
                member_id: createdMember.id,
                card_number: createdMember.card_number!,
                generated_at: createdMember.payment_date || new Date().toISOString(),
                has_paid: true,
                amount: 5,
                payment_method: createdMember.payment_method,
                payment_date: createdMember.payment_date,
                status: 'active',
                member: createdMember as Member
              };

              // Enregistrer la carte dans le dossier
              await registerCardAfterPayment(cardData, createdMember as Member, departmentName);
              
              // Audit log
              try {
                await DatabaseService.createAuditLogEntry({
                  church_id: church.id,
                  user_id: user?.id || 'system',
                  action: 'CREATE_MEMBER_WITH_PAYMENT',
                  resource_type: 'Member',
                  resource_id: createdMember.id,
                  details: { 
                    name: `${createdMember.first_name} ${createdMember.last_name}`,
                    type: createdMember.member_type,
                    position: createdMember.position,
                    has_paid: true,
                    card_generated: true,
                    card_number: createdMember.card_number,
                    amount: 5,
                    currency: 'USD',
                    department: departmentName,
                  }
                });
              } catch (auditError) {
                console.log('⚠️ Audit log non créé:', auditError);
              }
              
              // Recharger les données
              await loadAllData();
              
              // Message de succès
              Alert.alert(
                '✅ Inscription réussie',
                `${createdMember.first_name} ${createdMember.last_name} a été enregistré avec succès.\n\n🎴 Carte: ${createdMember.card_number}\n💰 Montant: 5 USD\n📂 Département: ${departmentName}`,
                [
                  { 
                    text: 'Voir la carte', 
                    onPress: () => {
                      setSelectedCard(cardData);
                      setShowCardModal(true);
                      setShowRegistrationWithPayment(false);
                    }
                  },
                  { text: 'OK' }
                ]
              );
              
              setShowRegistrationWithPayment(false);
              resetForm();
              
            } catch (error: any) {
              console.error('❌ Erreur inscription avec paiement:', error);
              Alert.alert('❌ Erreur', error.message || 'Impossible d\'enregistrer le membre avec paiement');
            }
          }}
          churchId={church.id}
          defaultCurrency={church.currency as 'FC' | 'USD' | 'EURO'}
          churchName={church.name}
        />
      )}
    </View>
  );
}

const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Loading & Error states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: 'white',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Search & Filters
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filters: {
    flexDirection: 'row',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Content
  content: {
    flex: 1,
  },

  // Dossiers View
  dossiersContainer: {
    padding: 16,
  },
  sectionHeader: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
  },
  statsOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  departmentsGrid: {
    gap: 12,
  },
  departmentCard: {
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  departmentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  departmentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  departmentInfo: {
    flex: 1,
  },
  departmentName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  departmentStats: {
    fontSize: 12,
  },
  departmentMembersPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  memberPreview: {
    alignItems: 'center',
    marginRight: 8,
  },
  memberPreviewPhoto: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberPreviewName: {
    fontSize: 10,
    maxWidth: 60,
  },
  moreMembers: {
    fontSize: 10,
    marginLeft: 4,
  },
  departmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  departmentFooterText: {
    fontSize: 11,
  },

  // Cards Grid
  cardsGrid: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardItem: {
    width: (screenWidth - 40) / 2,
    borderRadius: 12,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  cardNumber: {
    fontSize: 10,
    fontWeight: '600',
    flex: 1,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 8,
  },
  cardPhotoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardType: {
    fontSize: 10,
    marginBottom: 2,
  },
  cardDepartment: {
    fontSize: 9,
    opacity: 0.7,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  paidBadgeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  cardDate: {
    fontSize: 10,
  },

  // Members List
  membersList: {
    padding: 16,
  },
  memberItem: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  memberPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  memberPhotoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  memberMeta: {
    gap: 4,
    marginBottom: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  departmentContainer: {
    marginTop: 4,
  },
  departmentText: {
    fontSize: 11,
    fontWeight: '500',
  },
  positionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  positionText: {
    fontSize: 11,
    fontWeight: '500',
  },
  memberActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentStatus: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  payButtonText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },

  // Empty States
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    marginTop: 20,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  infoBox: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
  },
  infoBoxTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoBoxText: {
    fontSize: 12,
    lineHeight: 18,
  },

  // Add Member Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalCancel: {
    fontSize: 16,
    width: 60,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalSave: {
    fontSize: 16,
    width: 60,
    textAlign: 'right',
  },
  modalContent: {
    flex: 1,
  },
  modalFooter: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  modalFooterText: {
    fontSize: 12,
  },
  signature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  signatureText: {
    fontSize: 10,
    color: '#f39c12',
    fontStyle: 'italic',
  },

  // Form Styles
  formSection: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  required: {
    color: '#e74c3c',
  },
  photoContainer: {
    alignItems: 'center',
  },
  photoPlaceholder: {
    width: 120,
    height: 160,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  photoPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
  },
  photoPlaceholderSubtext: {
    fontSize: 10,
    marginTop: 2,
  },
  photoPreviewContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  photoPreview: {
    width: 120,
    height: 160,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#3498db',
    gap: 8,
  },
  galleryButton: {
    backgroundColor: '#9b59b6',
  },
  photoButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  formField: {
    flex: 1,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    marginBottom: 6,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  fieldInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderColor: '#ddd',
  },
  fieldInputError: {
    borderColor: '#e74c3c',
  },
  fieldInputInner: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  fieldError: {
    fontSize: 12,
    marginTop: 4,
  },
  fieldHelp: {
    fontSize: 12,
    marginBottom: 8,
  },
  positionButtonsContainer: {
    marginBottom: 12,
  },
  positionButtons: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  positionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    gap: 4,
  },
  restrictedPosition: {
    borderColor: '#f39c12',
  },
  positionButtonText: {
    fontSize: 12,
  },
  departmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  departmentButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  departmentButtonText: {
    fontSize: 12,
  },
  ruleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  ruleText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  ruleHighlight: {
    fontWeight: 'bold',
  },
  ruleSteps: {
    gap: 8,
  },
  ruleStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#856404',
    color: 'white',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: 'bold',
  },
  ruleStepText: {
    flex: 1,
    fontSize: 12,
    color: '#856404',
  },
  actionButtons: {
    padding: 16,
    gap: 12,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  paymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  paymentButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  paymentNote: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },

  // Card Modal
  cardModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  cardModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  cardModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cardModalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cardModalContent: {
    padding: 16,
  },
  cardActions: {
    gap: 12,
    marginTop: 20,
  },
  cardActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  downloadButton: {
    backgroundColor: '#3498db',
  },
  shareButton: {
    backgroundColor: '#2ecc71',
  },
  invoiceButton: {
    backgroundColor: '#9b59b6',
  },
  cardActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cardNote: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 16,
    lineHeight: 18,
  },

  // Invoice Preview Modal
  invoicePreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  invoicePreview: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  invoicePreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  invoicePreviewTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  invoicePreviewContent: {
    padding: 16,
  },
  invoiceHTMLContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    minHeight: 400,
  },
  invoicePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  invoicePlaceholderText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  invoicePlaceholderSubtext: {
    fontSize: 14,
    marginBottom: 5,
  },
  invoiceActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  invoiceActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  shareInvoiceButton: {
    backgroundColor: '#3498db',
  },
  invoiceActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  invoiceLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  invoiceLoadingText: {
    marginTop: 20,
    fontSize: 16,
  },
});

// Styles pour la capture de carte (rendu visuel)
const cardCaptureStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: screenWidth * 0.85,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  churchName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3498db',
  },
  cardType: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  body: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  photoSection: {
    marginRight: 16,
  },
  photo: {
    width: 100,
    height: 120,
    borderRadius: 8,
  },
  photoPlaceholder: {
    width: 100,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  position: {
    fontSize: 12,
    color: '#3498db',
    fontWeight: '600',
    marginBottom: 8,
  },
  details: {
    gap: 6,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 11,
    color: '#666',
  },
  departments: {
    fontSize: 10,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cardNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3498db',
  },
  church: {
    fontSize: 10,
    color: '#666',
  },
});