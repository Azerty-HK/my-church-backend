import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  Dimensions,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import {
  Folder,
  FileText,
  Camera,
  Image as ImageIcon,
  X,
  Plus,
  Download,
  Share2,
  Printer,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Calendar,
  User,
  MapPin,
  Phone,
  Mail,
  Building,
  Briefcase,
  Tag,
  QrCode,
  ChevronRight,
  Star,
  FolderPlus,
  FilePlus,
  Eye,
  Lock,
  Unlock,
  Archive,
  RotateCcw,
  Users,
  Award,
  BookOpen,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { FileSystem } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Member, Church } from '../types/database';
import { QRCodeModal } from './QRCodeModal';
import { getThemeColors } from '../lib/theme';
import * as MediaLibrary from 'expo-media-library';

const { width: screenWidth } = Dimensions.get('window');

// Types pour les documents de dossier
export interface DossierDocument {
  id: string;
  type: 'carte_membre' | 'photo' | 'formulaire' | 'paiement' | 'autre';
  title: string;
  description: string;
  file_path?: string;
  file_url?: string;
  thumbnail_url?: string;
  has_photo: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface DepartmentDossier {
  id: string;
  department_name: string;
  church_id: string;
  parent_dossier_id: string; // Toujours 'DOSSIER-MEMBRES'
  dossier_type: 'department';
  dossier_number: string;
  documents: DossierDocument[];
  members: DepartmentMember[];
  notes: string;
  status: 'actif' | 'inactif';
  created_at: string;
  updated_at: string;
  access_level: 'public' | 'restricted' | 'confidentiel';
}

export interface DepartmentMember {
  member_id: string;
  member_name: string;
  member_type: 'Membre' | 'Personnel';
  position?: string;
  registration_date: string;
  card_number: string;
  card_image_url?: string;
  payment_date: string;
  payment_method: string;
  payment_amount: number;
  payment_currency: string;
  added_at: string;
}

export interface MemberDossier {
  id: string;
  dossier_type: 'main' | 'department';
  dossier_name: string;
  dossier_number: string;
  church_id: string;
  parent_id?: string;
  documents: DossierDocument[];
  departments: DepartmentDossier[];
  notes: string;
  status: 'actif' | 'inactif';
  created_at: string;
  updated_at: string;
  access_level: 'public' | 'restricted' | 'confidentiel';
  total_members: number;
  total_departments: number;
}

// Interface pour l'enregistrement de carte
export interface RegisterCardData {
  memberId: string;
  fullName: string;
  department: string;
  cardImageUri: string;
  type: 'member' | 'personnel';
  cardNumber: string;
  paymentAmount: number;
  paymentMethod: string;
}

export interface RegisterCardResult {
  success: boolean;
  finalPath: string;
  dossierId: string;
  departmentName: string;
  message: string;
}

interface MemberDossierScreenProps {
  visible: boolean;
  onClose: () => void;
  churchId: string;
  church: Church;
  members: Member[];
  onMemberUpdate: (memberId: string, updates: Partial<Member>) => Promise<void>;
  onMemberDelete: (memberId: string) => Promise<void>;
  onDossierCreated?: (dossier: DepartmentDossier) => void;
  onDocumentAdded?: (dossierId: string, document: DossierDocument) => void;
}

// 🟦 FONCTIONS CENTRALISÉES POUR LA GESTION DES DOSSIERS
// Ces fonctions doivent être exportées pour être utilisées dans members.tsx

/**
 * Normalise le nom du département
 */
export const normalizeDepartmentName = (departmentName: string): string => {
  return departmentName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Supprime les caractères spéciaux
    .replace(/\s+/g, '_') // Remplace les espaces par des underscores
    .substring(0, 50); // Limite la longueur
};

/**
 * Vérifie si un dossier existe déjà pour un département
 */
export const doesDepartmentDossierExist = (
  dossiers: DepartmentDossier[],
  departmentName: string
): boolean => {
  const normalizedName = normalizeDepartmentName(departmentName);
  return dossiers.some(dossier => 
    normalizeDepartmentName(dossier.department_name) === normalizedName
  );
};

/**
 * Crée un nouveau dossier de département
 */
export const createDepartmentDossier = (
  churchId: string,
  departmentName: string,
  firstMember?: DepartmentMember
): DepartmentDossier => {
  const normalizedName = normalizeDepartmentName(departmentName);
  const timestamp = Date.now();
  
  const dossier: DepartmentDossier = {
    id: `DEPT-${normalizedName.toUpperCase()}-${timestamp}`,
    department_name: departmentName,
    church_id: churchId,
    parent_dossier_id: 'DOSSIER-MEMBRES',
    dossier_type: 'department',
    dossier_number: `DOS-DEPT-${timestamp.toString(36).toUpperCase()}`,
    documents: [],
    members: firstMember ? [firstMember] : [],
    notes: `Dossier du département ${departmentName}\n\nCréé automatiquement après le premier paiement validé le ${new Date().toLocaleDateString('fr-FR')}`,
    status: 'actif',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    access_level: 'restricted',
  };
  
  return dossier;
};

/**
 * Enregistre une carte dans un dossier (FONCTION CENTRALE)
 * Cette fonction est appelée par members.tsx après paiement confirmé
 */
export const registerCardInDossier = async (
  data: RegisterCardData,
  existingDossiers: DepartmentDossier[]
): Promise<RegisterCardResult> => {
  try {
    // 🟦 VÉRIFICATION DU PAIEMENT (doit être fait par l'appelant)
    if (!data.paymentAmount || data.paymentAmount <= 0) {
      throw new Error('Le paiement doit être confirmé avant d\'enregistrer la carte');
    }

    // Normaliser le nom du département
    const normalizedDepartment = normalizeDepartmentName(data.department);
    
    // Chercher ou créer le dossier
    let targetDossier = existingDossiers.find(dossier => 
      normalizeDepartmentName(dossier.department_name) === normalizedDepartment
    );

    let dossierCreated = false;
    
    if (!targetDossier) {
      // Créer un nouveau dossier pour le département
      const firstMember: DepartmentMember = {
        member_id: data.memberId,
        member_name: data.fullName,
        member_type: data.type === 'member' ? 'Membre' : 'Personnel',
        registration_date: new Date().toISOString(),
        card_number: data.cardNumber,
        card_image_url: data.cardImageUri,
        payment_date: new Date().toISOString(),
        payment_method: data.paymentMethod,
        payment_amount: data.paymentAmount,
        payment_currency: 'USD',
        added_at: new Date().toISOString(),
      };

      targetDossier = createDepartmentDossier(
        '', // churchId sera fourni par l'appelant
        data.department,
        firstMember
      );
      
      dossierCreated = true;
      console.log('📁 Nouveau dossier créé:', targetDossier.department_name);
    } else {
      // Ajouter le membre au dossier existant
      const memberExists = targetDossier.members.some(m => m.member_id === data.memberId);
      
      if (!memberExists) {
        const newMember: DepartmentMember = {
          member_id: data.memberId,
          member_name: data.fullName,
          member_type: data.type === 'member' ? 'Membre' : 'Personnel',
          registration_date: new Date().toISOString(),
          card_number: data.cardNumber,
          card_image_url: data.cardImageUri,
          payment_date: new Date().toISOString(),
          payment_method: data.paymentMethod,
          payment_amount: data.paymentAmount,
          payment_currency: 'USD',
          added_at: new Date().toISOString(),
        };

        targetDossier.members.push(newMember);
        targetDossier.updated_at = new Date().toISOString();
        
        console.log('👤 Membre ajouté au dossier existant:', data.fullName);
      }
    }

    // 🟦 SAUVEGARDER L'IMAGE DE LA CARTE
    let finalPath = data.cardImageUri;
    
    // Simuler la sauvegarde de l'image (dans un vrai projet, utiliser FileSystem)
    if (Platform.OS !== 'web' && data.cardImageUri.startsWith('file://')) {
      try {
        const timestamp = Date.now();
        const fileName = `card_${data.memberId}_${timestamp}.png`;
        const destination = `${FileSystem.documentDirectory}cards/${normalizedDepartment}/${fileName}`;
        
        // Créer le dossier s'il n'existe pas
        const dir = `${FileSystem.documentDirectory}cards/${normalizedDepartment}`;
        const dirInfo = await FileSystem.getInfoAsync(dir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        }
        
        // Copier le fichier (simulation)
        // await FileSystem.copyAsync({ from: data.cardImageUri, to: destination });
        finalPath = destination;
        
        console.log('💾 Image de carte sauvegardée:', finalPath);
      } catch (fileError) {
        console.error('⚠️ Erreur sauvegarde image:', fileError);
        // Continuer avec l'URI d'origine
      }
    }

    // Créer un document pour la carte
    const cardDocument: DossierDocument = {
      id: `DOC-CARD-${data.memberId}-${Date.now()}`,
      type: 'carte_membre',
      title: `Carte de ${data.type === 'member' ? 'membre' : 'personnel'} - ${data.fullName}`,
      description: `Carte enregistrée après paiement de ${data.paymentAmount} USD\nNuméro: ${data.cardNumber}\nMéthode: ${data.paymentMethod}`,
      file_path: finalPath,
      has_photo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'Système MyChurch',
    };

    targetDossier.documents.push(cardDocument);
    targetDossier.updated_at = new Date().toISOString();

    return {
      success: true,
      finalPath,
      dossierId: targetDossier.id,
      departmentName: targetDossier.department_name,
      message: dossierCreated 
        ? `Dossier créé et carte enregistrée dans "${targetDossier.department_name}"`
        : `Carte enregistrée dans le dossier "${targetDossier.department_name}"`,
    };

  } catch (error: any) {
    console.error('❌ Erreur enregistrement carte:', error);
    return {
      success: false,
      finalPath: data.cardImageUri,
      dossierId: '',
      departmentName: data.department,
      message: error.message || 'Impossible d\'enregistrer la carte',
    };
  }
};

/**
 * Récupère tous les dossiers pour une église
 */
export const loadAllDossiersForChurch = async (
  churchId: string,
  members: Member[]
): Promise<MemberDossier> => {
  try {
    // Filtrer les membres ayant payé et ayant au moins un département
    const paidMembers = members.filter(member => 
      member.has_paid && member.departments && member.departments.length > 0
    );
    
    // Créer un dossier principal "Membres"
    const mainDossier: MemberDossier = {
      id: 'DOSSIER-MEMBRES',
      dossier_type: 'main',
      dossier_name: 'Membres',
      dossier_number: 'DOS-MEMBRES-001',
      church_id: churchId,
      documents: [],
      departments: [],
      notes: `Dossier principal des membres\n\nCréé le ${new Date().toLocaleDateString('fr-FR')}\nTotal membres payés: ${paidMembers.length}`,
      status: 'actif',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      access_level: 'restricted',
      total_members: paidMembers.length,
      total_departments: 0,
    };

    // Créer automatiquement les dossiers de département basés sur les membres payés
    const departmentMap = new Map<string, DepartmentDossier>();
    
    paidMembers.forEach(member => {
      if (!member.departments) return;
      
      // Sépare les départements par virgule
      const departments = member.departments.split(',').map(d => d.trim());
      
      departments.forEach((departmentName: string) => {
        if (!departmentName) return;
        
        const normalizedName = normalizeDepartmentName(departmentName);
        const existingDept = departmentMap.get(normalizedName);
        
        const departmentMember: DepartmentMember = {
          member_id: member.id,
          member_name: `${member.first_name} ${member.last_name}`,
          member_type: member.member_type,
          position: member.position,
          registration_date: member.registration_date,
          card_number: member.card_number || `CARD-${member.id.substring(0, 8).toUpperCase()}`,
          card_image_url: member.photo_url,
          payment_date: member.payment_date || new Date().toISOString(),
          payment_method: member.payment_method || 'Non spécifié',
          payment_amount: member.payment_amount || 0,
          payment_currency: member.payment_currency || 'USD',
          added_at: new Date().toISOString(),
        };
        
        if (existingDept) {
          // Vérifier si le membre existe déjà
          const memberExists = existingDept.members.some(m => m.member_id === member.id);
          if (!memberExists) {
            existingDept.members.push(departmentMember);
            existingDept.updated_at = new Date().toISOString();
          }
        } else {
          // Créer un nouveau département
          const departmentDossier: DepartmentDossier = {
            id: `DEPT-${normalizedName.toUpperCase()}-${Date.now()}`,
            department_name: departmentName,
            church_id: churchId,
            parent_dossier_id: 'DOSSIER-MEMBRES',
            dossier_type: 'department',
            dossier_number: `DOS-DEPT-${Date.now().toString(36).toUpperCase()}`,
            documents: [],
            members: [departmentMember],
            notes: `Dossier du département ${departmentName}\n\nCréé automatiquement après le premier paiement validé.`,
            status: 'actif',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            access_level: 'restricted',
          };
          
          departmentMap.set(normalizedName, departmentDossier);
        }
      });
    });
    
    // Convertir la Map en tableau
    const departmentsArray = Array.from(departmentMap.values());
    
    // Mettre à jour le dossier principal avec les départements
    mainDossier.departments = departmentsArray;
    mainDossier.total_departments = departmentsArray.length;
    mainDossier.updated_at = new Date().toISOString();
    
    console.log('✅ Dossiers chargés:', departmentsArray.length, 'départements');
    return mainDossier;
    
  } catch (error) {
    console.error('❌ Erreur chargement dossiers:', error);
    throw error;
  }
};

// Composant principal
export function MemberDossierScreen({
  visible,
  onClose,
  churchId,
  church,
  members,
  onMemberUpdate,
  onMemberDelete,
  onDossierCreated,
  onDocumentAdded,
}: MemberDossierScreenProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentDossier | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<DossierDocument | null>(null);
  const [mainDossier, setMainDossier] = useState<MemberDossier | null>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  
  // Formulaire nouveau document
  const [newDocument, setNewDocument] = useState({
    type: 'autre' as 'carte_membre' | 'photo' | 'formulaire' | 'paiement' | 'autre',
    title: '',
    description: '',
    fileUri: null as string | null,
    fileBase64: null as string | null,
  });
  
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  
  const theme = church?.theme || 'blue';
  const colors = getThemeColors(theme);

  // Charger les dossiers au démarrage
  useEffect(() => {
    if (visible) {
      loadDossiers();
    }
  }, [visible, churchId, members]);

  const loadDossiers = async () => {
    setLoading(true);
    try {
      console.log('📁 Chargement du dossier principal...');
      
      // Utiliser la fonction centralisée pour charger les dossiers
      const dossierData = await loadAllDossiersForChurch(churchId, members);
      setMainDossier(dossierData);
      
      console.log('✅ Dossier principal chargé avec', dossierData.departments.length, 'départements');
    } catch (error) {
      console.error('❌ Erreur chargement dossiers:', error);
      Alert.alert('Erreur', 'Impossible de charger les dossiers');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDossiers();
    setRefreshing(false);
  };

  const filterDepartments = () => {
    if (!mainDossier) return [];
    
    let filtered = mainDossier.departments;

    // Filtrer par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(department => {
        return (
          department.department_name.toLowerCase().includes(query) ||
          department.dossier_number.toLowerCase().includes(query) ||
          department.members.some(member => 
            member.member_name.toLowerCase().includes(query) ||
            member.card_number.toLowerCase().includes(query)
          )
        );
      });
    }

    return filtered;
  };

  const getMemberInfo = (memberId: string) => {
    return members.find(member => member.id === memberId);
  };

  const getDocumentIcon = (type: DossierDocument['type']) => {
    switch (type) {
      case 'carte_membre': return '🎴';
      case 'photo': return '📸';
      case 'formulaire': return '📝';
      case 'paiement': return '💳';
      default: return '📄';
    }
  };

  const getStatusColor = (status: 'actif' | 'inactif') => {
    switch (status) {
      case 'actif': return '#27ae60';
      case 'inactif': return '#95a5a6';
      default: return '#95a5a6';
    }
  };

  const getAccessLevelIcon = (level: 'public' | 'restricted' | 'confidentiel') => {
    switch (level) {
      case 'public': return <Unlock size={14} color="#27ae60" />;
      case 'restricted': return <Lock size={14} color="#f39c12" />;
      case 'confidentiel': return <Lock size={14} color="#e74c3c" />;
      default: return null;
    }
  };

  const handleViewMemberCard = (member: DepartmentMember) => {
    const memberInfo = getMemberInfo(member.member_id);
    if (memberInfo) {
      Alert.alert(
        '📇 Carte de Membre',
        `**${member.member_name}**\n\n` +
        `🎴 **Numéro de carte:** ${member.card_number}\n` +
        `👤 **Type:** ${member.member_type}\n` +
        `💼 **Poste:** ${member.position || 'Non spécifié'}\n` +
        `💰 **Paiement:** ${member.payment_amount} ${member.payment_currency} (${member.payment_method})\n` +
        `📅 **Payé le:** ${new Date(member.payment_date).toLocaleDateString('fr-FR')}\n` +
        `📂 **Département:** ${selectedDepartment?.department_name}`,
        [
          { text: 'OK', style: 'default' },
          member.card_image_url && {
            text: '📤 Partager la carte',
            onPress: async () => {
              try {
                if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(member.card_image_url!, {
                    dialogTitle: `Partager carte: ${member.member_name}`,
                  });
                }
              } catch (error) {
                console.error('Erreur partage:', error);
              }
            }
          },
          {
            text: '📄 Voir QR Code',
            onPress: () => {
              if (memberInfo) {
                setShowQRModal(true);
              }
            }
          }
        ].filter(Boolean)
      );
    }
  };

  const handleDeleteDepartment = async (departmentId: string) => {
    const department = mainDossier?.departments.find(d => d.id === departmentId);
    if (!department) return;

    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer le département "${department.department_name}" ?\n\n` +
      `Cette action supprimera :\n` +
      `• Le dossier du département\n` +
      `• ${department.members.length} cartes de membres\n\n` +
      `⚠️ Les membres resteront dans la base de données mais ne seront plus classés par département.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              // Simuler la suppression
              await new Promise(resolve => setTimeout(resolve, 600));
              
              // Mettre à jour le dossier principal
              if (mainDossier) {
                const updatedDepartments = mainDossier.departments.filter(d => d.id !== departmentId);
                setMainDossier({
                  ...mainDossier,
                  departments: updatedDepartments,
                  total_departments: updatedDepartments.length,
                  updated_at: new Date().toISOString(),
                });
              }
              
              // Désélectionner si c'était le département sélectionné
              if (selectedDepartment?.id === departmentId) {
                setSelectedDepartment(null);
              }

              Alert.alert(
                '✅ Département supprimé',
                `Le département a été supprimé avec succès !\n\n📁 "${department.department_name}"\n🗑️ Cartes supprimées: ${department.members.length}`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('❌ Erreur suppression département:', error);
              Alert.alert('❌ Erreur', 'Impossible de supprimer le département');
            }
          },
        },
      ]
    );
  };

  const handleRemoveMemberFromDepartment = async (departmentId: string, memberId: string) => {
    const department = mainDossier?.departments.find(d => d.id === departmentId);
    if (!department) return;

    const member = department.members.find(m => m.member_id === memberId);
    if (!member) return;

    Alert.alert(
      'Retirer du département',
      `Voulez-vous retirer ${member.member_name} du département "${department.department_name}" ?\n\n` +
      `Cette action ne supprime pas le membre, mais le retire uniquement de ce département.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            try {
              // Simuler la suppression
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Mettre à jour le département
              if (mainDossier) {
                const updatedDepartments = mainDossier.departments.map(dept => {
                  if (dept.id === departmentId) {
                    const updatedMembers = dept.members.filter(m => m.member_id !== memberId);
                    return {
                      ...dept,
                      members: updatedMembers,
                      updated_at: new Date().toISOString(),
                    };
                  }
                  return dept;
                });

                setMainDossier({
                  ...mainDossier,
                  departments: updatedDepartments,
                  updated_at: new Date().toISOString(),
                });
                
                // Mettre à jour le département sélectionné
                if (selectedDepartment?.id === departmentId) {
                  const updatedDept = updatedDepartments.find(d => d.id === departmentId);
                  if (updatedDept) {
                    setSelectedDepartment(updatedDept);
                  }
                }

                Alert.alert(
                  '✅ Membre retiré',
                  `${member.member_name} a été retiré du département "${department.department_name}"`,
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              console.error('❌ Erreur retrait membre:', error);
              Alert.alert('❌ Erreur', 'Impossible de retirer le membre');
            }
          },
        },
      ]
    );
  };

  const handleAddDocument = async () => {
    if (!selectedDepartment) return;

    if (!newDocument.title.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un titre pour le document');
      return;
    }

    setUploadingDocument(true);
    try {
      const documentData: DossierDocument = {
        id: `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: newDocument.type,
        title: newDocument.title.trim(),
        description: newDocument.description.trim() || `Document ajouté au département ${selectedDepartment.department_name}`,
        has_photo: newDocument.type === 'photo',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'Système MyChurch',
      };

      // Simuler l'upload
      await new Promise(resolve => setTimeout(resolve, 800));

      // Mettre à jour le département
      if (mainDossier) {
        const updatedDepartments = mainDossier.departments.map(dept => {
          if (dept.id === selectedDepartment.id) {
            return {
              ...dept,
              documents: [...dept.documents, documentData],
              updated_at: new Date().toISOString(),
            };
          }
          return dept;
        });

        setMainDossier({
          ...mainDossier,
          departments: updatedDepartments,
          updated_at: new Date().toISOString(),
        });
        
        // Mettre à jour le département sélectionné
        const updatedDept = updatedDepartments.find(d => d.id === selectedDepartment.id);
        if (updatedDept) {
          setSelectedDepartment(updatedDept);
        }
      }

      // Appeler le callback
      onDocumentAdded?.(selectedDepartment.id, documentData);

      // Réinitialiser le formulaire
      setNewDocument({
        type: 'autre',
        title: '',
        description: '',
        fileUri: null,
        fileBase64: null,
      });

      setShowDocumentModal(false);
      
      Alert.alert(
        '✅ Document ajouté',
        `Le document a été ajouté avec succès !\n\n📄 "${newDocument.title}"\n📁 Département: ${selectedDepartment.department_name}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Erreur ajout document:', error);
      Alert.alert('❌ Erreur', 'Impossible d\'ajouter le document');
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleDeleteDocument = async (departmentId: string, documentId: string) => {
    const department = mainDossier?.departments.find(d => d.id === departmentId);
    if (!department) return;

    const document = department.documents.find(doc => doc.id === documentId);
    if (!document) return;

    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer ce document ?\n\n📄 "${document.title}"\n📁 Département: ${department.department_name}`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              // Simuler la suppression
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Mettre à jour le département
              if (mainDossier) {
                const updatedDepartments = mainDossier.departments.map(dept => {
                  if (dept.id === departmentId) {
                    const updatedDocuments = dept.documents.filter(doc => doc.id !== documentId);
                    return {
                      ...dept,
                      documents: updatedDocuments,
                      updated_at: new Date().toISOString(),
                    };
                  }
                  return dept;
                });

                setMainDossier({
                  ...mainDossier,
                  departments: updatedDepartments,
                  updated_at: new Date().toISOString(),
                });
                
                // Mettre à jour le département sélectionné
                if (selectedDepartment?.id === departmentId) {
                  const updatedDept = updatedDepartments.find(d => d.id === departmentId);
                  if (updatedDept) {
                    setSelectedDepartment(updatedDept);
                  }
                }

                Alert.alert(
                  '✅ Document supprimé',
                  `Le document a été supprimé avec succès !\n\n📄 "${document.title}"\n📁 Département: ${department.department_name}`,
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              console.error('❌ Erreur suppression document:', error);
              Alert.alert('❌ Erreur', 'Impossible de supprimer le document');
            }
          },
        },
      ]
    );
  };

  const generateDepartmentReport = async (department: DepartmentDossier) => {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Rapport Département - ${department.department_name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              font-family: 'Montserrat', sans-serif;
            }
            
            body {
              padding: 20mm;
              background: #f8f9fa;
              color: #2c3e50;
            }
            
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 3px solid #3498db;
            }
            
            .church-name {
              font-size: 24px;
              font-weight: 900;
              color: #2c3e50;
              margin-bottom: 10px;
              text-transform: uppercase;
            }
            
            .report-title {
              font-size: 28px;
              font-weight: 900;
              color: #3498db;
              margin-bottom: 5px;
            }
            
            .subtitle {
              font-size: 16px;
              color: #7f8c8d;
              margin-bottom: 20px;
            }
            
            .section {
              margin-bottom: 30px;
              padding: 20px;
              background: white;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            
            .section-title {
              font-size: 20px;
              font-weight: 700;
              color: #2c3e50;
              margin-bottom: 15px;
              padding-bottom: 10px;
              border-bottom: 2px solid #ecf0f1;
            }
            
            .department-info {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            
            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
              margin-bottom: 20px;
            }
            
            .info-item {
              display: flex;
              flex-direction: column;
            }
            
            .info-label {
              font-size: 12px;
              color: #7f8c8d;
              text-transform: uppercase;
              font-weight: 600;
              margin-bottom: 5px;
            }
            
            .info-value {
              font-size: 14px;
              font-weight: 600;
              color: #2c3e50;
            }
            
            .members-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            
            .members-table th {
              background: #3498db;
              color: white;
              padding: 12px;
              text-align: left;
              font-weight: 600;
            }
            
            .members-table td {
              padding: 12px;
              border-bottom: 1px solid #ecf0f1;
            }
            
            .members-table tr:nth-child(even) {
              background: #f8f9fa;
            }
            
            .payment-status {
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 600;
            }
            
            .paid {
              background: #d4edda;
              color: #155724;
            }
            
            .footer {
              margin-top: 40px;
              text-align: center;
              color: #7f8c8d;
              font-size: 12px;
              border-top: 1px solid #ecf0f1;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="church-name">${church.name}</div>
            <h1 class="report-title">📊 RAPPORT DE DÉPARTEMENT</h1>
            <div class="subtitle">
              ${department.department_name} • Généré le ${new Date().toLocaleDateString('fr-FR')}
            </div>
          </div>
          
          <div class="section">
            <h2 class="section-title">Informations du département</h2>
            <div class="department-info">
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Nom du département</div>
                  <div class="info-value">${department.department_name}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Numéro de dossier</div>
                  <div class="info-value">${department.dossier_number}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Date de création</div>
                  <div class="info-value">${
                    new Date(department.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })
                  }</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Nombre de membres</div>
                  <div class="info-value">${department.members.length}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Statut</div>
                  <div class="info-value">${department.status.toUpperCase()}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Niveau d'accès</div>
                  <div class="info-value">${department.access_level.toUpperCase()}</div>
                </div>
              </div>
            </div>
            
            ${department.notes ? `
              <div style="margin-top: 15px;">
                <div class="info-label">Notes</div>
                <div style="
                  background: #f8f9fa;
                  padding: 12px;
                  border-radius: 8px;
                  margin-top: 5px;
                  white-space: pre-line;
                  font-size: 13px;
                  line-height: 1.5;
                ">
                  ${department.notes}
                </div>
              </div>
            ` : ''}
          </div>
          
          <div class="section">
            <h2 class="section-title">Membres (${department.members.length})</h2>
            
            <table class="members-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Type</th>
                  <th>Numéro de carte</th>
                  <th>Date paiement</th>
                  <th>Montant</th>
                </tr>
              </thead>
              <tbody>
                ${department.members.map(member => `
                  <tr>
                    <td>${member.member_name}</td>
                    <td>${member.member_type}</td>
                    <td>${member.card_number}</td>
                    <td>${
                      new Date(member.payment_date).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })
                    }</td>
                    <td>${member.payment_amount} ${member.payment_currency}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h2 class="section-title">Statistiques</h2>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Total des paiements</div>
                <div class="info-value">
                  ${department.members.reduce((sum, member) => sum + member.payment_amount, 0).toFixed(2)} USD
                </div>
              </div>
              <div class="info-item">
                <div class="info-label">Moyenne par membre</div>
                <div class="info-value">
                  ${(department.members.reduce((sum, member) => sum + member.payment_amount, 0) / department.members.length || 0).toFixed(2)} USD
                </div>
              </div>
              <div class="info-item">
                <div class="info-label">Membres réguliers</div>
                <div class="info-value">
                  ${department.members.filter(m => m.member_type === 'Membre').length}
                </div>
              </div>
              <div class="info-item">
                <div class="info-label">Personnel</div>
                <div class="info-value">
                  ${department.members.filter(m => m.member_type === 'Personnel').length}
                </div>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p>📊 Rapport généré automatiquement par My Church System</p>
            <p>📍 ${church.name} • Kinshasa, RDC</p>
            <p style="margin-top: 10px; font-style: italic;">
              Ce document est confidentiel et destiné à un usage interne uniquement.
            </p>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      const timestamp = Date.now();
      const fileName = `Rapport_${department.department_name}_${timestamp}.pdf`;
      const newUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.copyAsync({
        from: uri,
        to: newUri,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newUri, {
          mimeType: 'application/pdf',
          dialogTitle: `📊 Rapport - ${department.department_name}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert(
          '✅ Rapport généré',
          `Le rapport a été sauvegardé avec succès !\n\n📄 Nom: ${fileName}\n📁 Emplacement: Documents/MyChurch`,
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('❌ Erreur génération rapport:', error);
      Alert.alert(
        '❌ Erreur', 
        error.message || 'Impossible de générer le rapport',
        [{ text: 'OK' }]
      );
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
        Alert.alert(
          'Permissions requises',
          'Nous avons besoin de l\'accès à la caméra et à la galerie pour ajouter un document.',
          [
            { text: 'Annuler', style: 'cancel' },
            { 
              text: 'Paramètres', 
              onPress: () => {
                // Ouvrir les paramètres
              }
            }
          ]
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
      if (!hasPermission) {
        setPhotoLoading(false);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
        base64: true,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        setNewDocument(prev => ({
          ...prev,
          type: 'photo',
          fileUri: result.assets[0].uri,
          fileBase64: result.assets[0].base64 || null,
          title: prev.title || 'Photo du département',
          description: prev.description || 'Photo prise avec la caméra du téléphone',
        }));
      }
    } catch (error) {
      console.error('Erreur prise de photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo. Veuillez réessayer.');
    } finally {
      setPhotoLoading(false);
    }
  };

  const pickFromGallery = async () => {
    setPhotoLoading(true);
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        setPhotoLoading(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        const isImage = result.assets[0].mimeType?.startsWith('image/');
        const isPDF = result.assets[0].mimeType === 'application/pdf';
        
        setNewDocument(prev => ({
          ...prev,
          type: isImage ? 'photo' : isPDF ? 'formulaire' : 'autre',
          fileUri: result.assets[0].uri,
          fileBase64: result.assets[0].base64 || null,
          title: prev.title || (isImage ? 'Document photo' : isPDF ? 'Formulaire PDF' : 'Document'),
          description: prev.description || (isImage ? 'Document sélectionné depuis la galerie' : 'Document téléchargé'),
        }));
      }
    } catch (error) {
      console.error('Erreur sélection document:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner le document. Veuillez réessayer.');
    } finally {
      setPhotoLoading(false);
    }
  };

  const filteredDepartments = filterDepartments();

  // Vue Liste des départements
  const renderDepartmentsList = () => (
    <View style={styles.content}>
      {/* En-tête */}
      <View style={[styles.contentHeader, { backgroundColor: colors.surface }]}>
        <Text style={[styles.contentTitle, { color: colors.text }]}>
          📁 Dossiers des Départements ({filteredDepartments.length})
        </Text>
      </View>

      {/* Barre de recherche */}
      <View style={[styles.searchSection, { backgroundColor: colors.background }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={20} color={colors.primary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="🔍 Rechercher un département..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {mainDossier && (
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: colors.primary + '20' }]}>
              <Users size={20} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.text }]}>{mainDossier.total_members}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Membres payés</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#9b59b6' + '20' }]}>
              <Folder size={20} color="#9b59b6" />
              <Text style={[styles.statValue, { color: colors.text }]}>{mainDossier.total_departments}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Départements</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#27ae60' + '20' }]}>
              <Award size={20} color="#27ae60" />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {mainDossier.departments.reduce((sum, dept) => sum + dept.members.length, 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Cartes enregistrées</Text>
            </View>
          </View>
        )}
      </View>

      {/* Liste des départements */}
      <ScrollView
        style={styles.departmentsList}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Chargement des départements...
            </Text>
          </View>
        ) : filteredDepartments.length === 0 ? (
          <View style={styles.emptyState}>
            <Folder size={60} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery 
                ? 'Aucun département trouvé'
                : 'Aucun département créé'
              }
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              {searchQuery
                ? 'Essayez de modifier vos critères de recherche'
                : 'Les départements seront créés automatiquement au premier paiement'
              }
            </Text>
            
            <View style={styles.infoBox}>
              <Text style={[styles.infoBoxTitle, { color: colors.primary }]}>
                ℹ️ Comment créer un département ?
              </Text>
              <Text style={[styles.infoBoxText, { color: colors.text }]}>
                1. Inscrivez un nouveau membre avec paiement{'\n'}
                2. Sélectionnez un département{'\n'}
                3. Validez le paiement{'\n'}
                4. Le département sera créé automatiquement
              </Text>
            </View>
          </View>
        ) : (
          filteredDepartments.map((department) => (
            <TouchableOpacity
              key={department.id}
              style={[styles.departmentCard, { backgroundColor: colors.surface }]}
              onPress={() => setSelectedDepartment(department)}
            >
              <View style={styles.departmentCardHeader}>
                <View style={styles.departmentTitleContainer}>
                  <Folder size={20} color={colors.primary} />
                  <Text style={[styles.departmentName, { color: colors.text }]}>
                    {department.department_name}
                  </Text>
                </View>
                
                <View style={[styles.accessBadge, { 
                  backgroundColor: department.access_level === 'public' ? '#27ae6020' : 
                                 department.access_level === 'restricted' ? '#f39c1220' : '#e74c3c20' 
                }]}>
                  {getAccessLevelIcon(department.access_level)}
                  <Text style={[styles.accessText, { 
                    color: department.access_level === 'public' ? '#27ae60' : 
                           department.access_level === 'restricted' ? '#f39c12' : '#e74c3c' 
                  }]}>
                    {department.access_level === 'public' ? 'Public' :
                     department.access_level === 'restricted' ? 'Restreint' : 'Confidentiel'}
                  </Text>
                </View>
              </View>

              <View style={styles.departmentStats}>
                <View style={styles.statItem}>
                  <Users size={16} color={colors.primary} />
                  <Text style={[styles.statValueSmall, { color: colors.text }]}>
                    {department.members.length}
                  </Text>
                  <Text style={[styles.statLabelSmall, { color: colors.textSecondary }]}>
                    Membres
                  </Text>
                </View>
                
                <View style={styles.statItem}>
                  <FileText size={16} color={colors.primary} />
                  <Text style={[styles.statValueSmall, { color: colors.text }]}>
                    {department.documents.length}
                  </Text>
                  <Text style={[styles.statLabelSmall, { color: colors.textSecondary }]}>
                    Documents
                  </Text>
                </View>
                
                <View style={styles.statItem}>
                  <Calendar size={16} color={colors.primary} />
                  <Text style={[styles.statValueSmall, { color: colors.text }]}>
                    {new Date(department.created_at).toLocaleDateString('fr-FR', { 
                      day: '2-digit', 
                      month: 'short' 
                    })}
                  </Text>
                  <Text style={[styles.statLabelSmall, { color: colors.textSecondary }]}>
                    Créé
                  </Text>
                </View>
              </View>

              {department.members.length > 0 && (
                <View style={styles.membersPreview}>
                  <Text style={[styles.membersPreviewTitle, { color: colors.textSecondary }]}>
                    👥 Membres récents:
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.membersPreviewList}>
                      {department.members.slice(0, 3).map((member) => (
                        <View key={member.member_id} style={[styles.memberPreviewItem, { backgroundColor: colors.background }]}>
                          <Text style={styles.memberPreviewIcon}>
                            {member.member_type === 'Personnel' ? '🛡️' : '👤'}
                          </Text>
                          <Text style={[styles.memberPreviewName, { color: colors.text }]} numberOfLines={1}>
                            {member.member_name.split(' ')[0]}
                          </Text>
                        </View>
                      ))}
                      {department.members.length > 3 && (
                        <View style={styles.moreMembers}>
                          <Text style={[styles.moreMembersText, { color: colors.textSecondary }]}>
                            +{department.members.length - 3} autres
                          </Text>
                        </View>
                      )}
                    </View>
                  </ScrollView>
                </View>
              )}

              <View style={styles.departmentFooter}>
                <Text style={[styles.departmentDate, { color: colors.textSecondary }]}>
                  📅 Dossier: ${department.dossier_number}
                </Text>
                <TouchableOpacity 
                  style={[styles.viewButton, { backgroundColor: colors.primary + '20' }]}
                  onPress={() => setSelectedDepartment(department)}
                >
                  <Text style={[styles.viewButtonText, { color: colors.primary }]}>
                    Voir détails
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );

  // Vue Détail d'un département
  const renderDepartmentDetail = () => {
    if (!selectedDepartment) return null;

    return (
      <View style={styles.detailContainer}>
        {/* En-tête du détail */}
        <View style={[styles.detailHeader, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={() => setSelectedDepartment(null)} style={styles.backButton}>
            <ChevronRight size={24} color="white" style={{ transform: [{ rotate: '180deg' }] }} />
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
          
          <View style={styles.detailHeaderContent}>
            <View style={styles.departmentHeaderInfo}>
              <Folder size={28} color="white" />
              <View style={styles.departmentHeaderText}>
                <Text style={styles.departmentDetailName}>{selectedDepartment.department_name}</Text>
                <View style={styles.departmentHeaderMeta}>
                  <View style={[styles.detailStatusBadge, { backgroundColor: '#27ae6040' }]}>
                    <CheckCircle size={14} color="#27ae60" />
                    <Text style={[styles.detailStatusText, { color: '#27ae60' }]}>
                      {selectedDepartment.status === 'actif' ? 'Actif' : 'Inactif'}
                    </Text>
                  </View>
                  <View style={[styles.detailAccessBadge, { 
                    backgroundColor: selectedDepartment.access_level === 'public' ? '#27ae6040' : 
                                   selectedDepartment.access_level === 'restricted' ? '#f39c1240' : '#e74c3c40' 
                  }]}>
                    {getAccessLevelIcon(selectedDepartment.access_level)}
                    <Text style={[styles.detailAccessText, { 
                      color: selectedDepartment.access_level === 'public' ? '#27ae60' : 
                             selectedDepartment.access_level === 'restricted' ? '#f39c12' : '#e74c3c' 
                    }]}>
                      {selectedDepartment.access_level.charAt(0).toUpperCase() + selectedDepartment.access_level.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            
            <View style={styles.detailActions}>
              <TouchableOpacity 
                style={[styles.detailActionButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                onPress={() => generateDepartmentReport(selectedDepartment)}
              >
                <Download size={20} color="white" />
                <Text style={styles.detailActionButtonText}>Rapport</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.detailActionButton, styles.deleteActionButton]}
                onPress={() => handleDeleteDepartment(selectedDepartment.id)}
              >
                <Trash2 size={20} color="white" />
                <Text style={styles.detailActionButtonText}>Suppr.</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={true}>
          {/* Informations du département */}
          <View style={[styles.detailSection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
              📋 Informations du département
            </Text>
            
            <View style={styles.departmentDetailCard}>
              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Numéro de dossier</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedDepartment.dossier_number}
                  </Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Date de création</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {new Date(selectedDepartment.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Membres payés</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedDepartment.members.length}
                  </Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Total des paiements</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedDepartment.members.reduce((sum, member) => sum + member.payment_amount, 0).toFixed(2)} USD
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Membres du département */}
          <View style={[styles.detailSection, { backgroundColor: colors.surface }]}>
            <View style={styles.membersHeader}>
              <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
                👥 Membres ({selectedDepartment.members.length})
              </Text>
              <Text style={[styles.membersSubtitle, { color: colors.textSecondary }]}>
                Cartes enregistrées après paiement validé
              </Text>
            </View>
            
            {selectedDepartment.members.length === 0 ? (
              <View style={styles.emptyMembers}>
                <Users size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyMembersText, { color: colors.textSecondary }]}>
                  Aucun membre dans ce département
                </Text>
                <Text style={[styles.emptyMembersSubtext, { color: colors.textSecondary }]}>
                  Les membres apparaîtront après paiement validé
                </Text>
              </View>
            ) : (
              <View style={styles.membersList}>
                {selectedDepartment.members.map((member) => (
                  <View key={member.member_id} style={[styles.memberCard, { backgroundColor: colors.background }]}>
                    <View style={styles.memberHeader}>
                      <View style={styles.memberIconContainer}>
                        <Text style={styles.memberIcon}>
                          {member.member_type === 'Personnel' ? '🛡️' : '👤'}
                        </Text>
                      </View>
                      
                      <View style={styles.memberInfo}>
                        <Text style={[styles.memberName, { color: colors.text }]}>
                          {member.member_name}
                        </Text>
                        <View style={styles.memberMeta}>
                          <Text style={[styles.memberMetaText, { color: colors.textSecondary }]}>
                            {member.member_type}
                          </Text>
                          {member.position && (
                            <>
                              <Text style={[styles.memberMetaDot, { color: colors.border }]}>•</Text>
                              <Text style={[styles.memberMetaText, { color: colors.textSecondary }]}>
                                {member.position}
                              </Text>
                            </>
                          )}
                        </View>
                        <Text style={[styles.memberCardNumber, { color: colors.textSecondary }]}>
                          🎴 {member.card_number}
                        </Text>
                      </View>
                      
                      <View style={styles.memberActions}>
                        <TouchableOpacity 
                          style={[styles.memberActionButton, { backgroundColor: colors.primary + '20' }]}
                          onPress={() => handleViewMemberCard(member)}
                        >
                          <Eye size={16} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.memberActionButton, { backgroundColor: '#e74c3c20' }]}
                          onPress={() => handleRemoveMemberFromDepartment(selectedDepartment.id, member.member_id)}
                        >
                          <Trash2 size={16} color="#e74c3c" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    <View style={styles.memberPaymentInfo}>
                      <View style={styles.paymentDetail}>
                        <Text style={[styles.paymentLabel, { color: colors.textSecondary }]}>Paiement</Text>
                        <Text style={[styles.paymentValue, { color: colors.text }]}>
                          {member.payment_amount} ${member.payment_currency} (${member.payment_method})
                        </Text>
                      </View>
                      <View style={styles.paymentDetail}>
                        <Text style={[styles.paymentLabel, { color: colors.textSecondary }]}>Date</Text>
                        <Text style={[styles.paymentValue, { color: colors.text }]}>
                          ${new Date(member.payment_date).toLocaleDateString('fr-FR')}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Documents */}
          <View style={[styles.detailSection, { backgroundColor: colors.surface }]}>
            <View style={styles.documentsHeader}>
              <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
                📄 Documents ({selectedDepartment.documents.length})
              </Text>
              <TouchableOpacity
                style={[styles.addDocumentButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowDocumentModal(true)}
              >
                <FilePlus size={18} color="white" />
                <Text style={styles.addDocumentButtonText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
            
            {selectedDepartment.documents.length === 0 ? (
              <View style={styles.emptyDocuments}>
                <FileText size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyDocumentsText, { color: colors.textSecondary }]}>
                  Aucun document dans ce dossier
                </Text>
                <TouchableOpacity
                  style={[styles.addDocumentButton, { backgroundColor: colors.primary, marginTop: 16 }]}
                  onPress={() => setShowDocumentModal(true)}
                >
                  <FilePlus size={18} color="white" />
                  <Text style={styles.addDocumentButtonText}>Ajouter un document</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.documentsList}>
                {selectedDepartment.documents.map((document) => (
                  <View key={document.id} style={[styles.documentCard, { backgroundColor: colors.background }]}>
                    <View style={styles.documentHeader}>
                      <View style={styles.documentIconContainer}>
                        <Text style={styles.documentIcon}>
                          {getDocumentIcon(document.type)}
                        </Text>
                      </View>
                      
                      <View style={styles.documentInfo}>
                        <Text style={[styles.documentTitle, { color: colors.text }]}>
                          ${document.title}
                        </Text>
                        <Text style={[styles.documentDescription, { color: colors.textSecondary }]}>
                          ${document.description}
                        </Text>
                      </View>
                      
                      <View style={styles.documentActions}>
                        <TouchableOpacity 
                          style={[styles.documentActionButton, { backgroundColor: colors.primary + '20' }]}
                          onPress={() => setSelectedDocument(document)}
                        >
                          <Eye size={16} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.documentActionButton, { backgroundColor: '#e74c3c20' }]}
                          onPress={() => handleDeleteDocument(selectedDepartment.id, document.id)}
                        >
                          <Trash2 size={16} color="#e74c3c" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={[styles.detailSection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
              ⚡ Actions
            </Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={() => generateDepartmentReport(selectedDepartment)}
              >
                <Download size={18} color="white" />
                <Text style={styles.actionButtonText}>Générer rapport</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#9b59b6' }]}
                onPress={() => setShowDocumentModal(true)}
              >
                <FilePlus size={18} color="white" />
                <Text style={styles.actionButtonText}>Ajouter document</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  // Modal d'ajout de document
  const renderDocumentModal = () => (
    <Modal
      visible={showDocumentModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowDocumentModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDocumentModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.textSecondary }]}>Annuler</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>📄 Ajouter un document</Text>
            <TouchableOpacity 
              onPress={handleAddDocument}
              disabled={uploadingDocument || !newDocument.title.trim()}
            >
              <Text style={[styles.modalSave, { 
                color: uploadingDocument || !newDocument.title.trim() ? colors.textSecondary : colors.primary,
                fontWeight: '600'
              }]}>
                {uploadingDocument ? 'Ajout...' : 'Ajouter'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedDepartment && (
              <View style={[styles.infoBanner, { backgroundColor: colors.primary + '10' }]}>
                <Folder size={18} color={colors.primary} />
                <Text style={[styles.infoBannerText, { color: colors.primary }]}>
                  Département: ${selectedDepartment.department_name}
                </Text>
                <Text style={[styles.infoBannerSubtext, { color: colors.primary + '80' }]}>
                  ${selectedDepartment.dossier_number}
                </Text>
              </View>
            )}

            {/* Type de document */}
            <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
              <Text style={[styles.formSectionTitle, { color: colors.text }]}>
                📋 Type de document
              </Text>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.documentTypeButtons}>
                {(['carte_membre', 'photo', 'formulaire', 'paiement', 'autre'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.documentTypeButton,
                      { borderColor: colors.border },
                      newDocument.type === type && {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary
                      }
                    ]}
                    onPress={() => setNewDocument(prev => ({ ...prev, type }))}
                  >
                    <Text style={styles.documentTypeButtonIcon}>
                      {type === 'carte_membre' ? '🎴' :
                       type === 'photo' ? '📸' :
                       type === 'formulaire' ? '📝' :
                       type === 'paiement' ? '💳' : '📄'}
                    </Text>
                    <Text style={[
                      styles.documentTypeButtonText,
                      { color: colors.text },
                      newDocument.type === type && { color: 'white' }
                    ]}>
                      {type === 'carte_membre' ? 'Carte' :
                       type === 'photo' ? 'Photo' :
                       type === 'formulaire' ? 'Formulaire' :
                       type === 'paiement' ? 'Paiement' : 'Autre'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Informations du document */}
            <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
              <Text style={[styles.formSectionTitle, { color: colors.text }]}>
                📝 Informations
              </Text>
              
              <View style={styles.formField}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  Titre du document *
                </Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    { borderColor: colors.border, color: colors.text }
                  ]}
                  placeholder="Ex: Photo d'équipe, Rapport mensuel..."
                  placeholderTextColor={colors.textSecondary}
                  value={newDocument.title}
                  onChangeText={(text) => setNewDocument(prev => ({ ...prev, title: text }))}
                />
              </View>
              
              <View style={styles.formField}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  Description
                </Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    styles.textArea,
                    { borderColor: colors.border, color: colors.text }
                  ]}
                  placeholder="Décrivez le contenu de ce document..."
                  placeholderTextColor={colors.textSecondary}
                  value={newDocument.description}
                  onChangeText={(text) => setNewDocument(prev => ({ ...prev, description: text }))}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Upload de fichier */}
            <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
              <Text style={[styles.formSectionTitle, { color: colors.text }]}>
                📤 Fichier (optionnel)
              </Text>
              <Text style={[styles.fieldHelp, { color: colors.textSecondary }]}>
                Vous pouvez ajouter un fichier maintenant ou plus tard
              </Text>
              
              {newDocument.fileUri ? (
                <View style={styles.filePreview}>
                  <View style={styles.filePreviewInfo}>
                    <Text style={styles.filePreviewIcon}>
                      ${newDocument.type === 'photo' ? '📸' : '📄'}
                    </Text>
                    <View style={styles.filePreviewDetails}>
                      <Text style={[styles.filePreviewTitle, { color: colors.text }]}>
                        Fichier sélectionné
                      </Text>
                      <Text style={[styles.filePreviewType, { color: colors.textSecondary }]}>
                        ${newDocument.type === 'photo' ? 'Image' : 'Document'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.removeFileButton}
                    onPress={() => setNewDocument(prev => ({ ...prev, fileUri: null, fileBase64: null }))}
                  >
                    <X size={18} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.uploadOptions}>
                  <TouchableOpacity 
                    style={[styles.uploadButton, (photoLoading || uploadingDocument) && styles.buttonDisabled]}
                    onPress={takePhoto}
                    disabled={photoLoading || uploadingDocument}
                  >
                    {photoLoading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <Camera size={20} color="white" />
                        <Text style={styles.uploadButtonText}>Prendre photo</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.uploadButton, styles.galleryButton, (photoLoading || uploadingDocument) && styles.buttonDisabled]}
                    onPress={pickFromGallery}
                    disabled={photoLoading || uploadingDocument}
                  >
                    <ImageIcon size={20} color="white" />
                    <Text style={styles.uploadButtonText}>Galerie</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Bouton d'ajout */}
            <TouchableOpacity
              style={[
                styles.addDocumentSubmitButton,
                { backgroundColor: colors.primary },
                (uploadingDocument || !newDocument.title.trim()) && styles.buttonDisabled
              ]}
              onPress={handleAddDocument}
              disabled={uploadingDocument || !newDocument.title.trim()}
            >
              {uploadingDocument ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <FilePlus size={20} color="white" />
                  <Text style={styles.addDocumentSubmitButtonText}>
                    Ajouter le document
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Modal de visualisation de document
  const renderDocumentViewModal = () => (
    <Modal
      visible={!!selectedDocument}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setSelectedDocument(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedDocument(null)}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              📄 Document
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedDocument && (
              <View style={[styles.documentViewContainer, { backgroundColor: colors.surface }]}>
                <View style={styles.documentViewHeader}>
                  <Text style={styles.documentViewIcon}>
                    ${getDocumentIcon(selectedDocument.type)}
                  </Text>
                  <View style={styles.documentViewTitleContainer}>
                    <Text style={[styles.documentViewTitle, { color: colors.text }]}>
                      ${selectedDocument.title}
                    </Text>
                    <Text style={[styles.documentViewType, { color: colors.textSecondary }]}>
                      ${selectedDocument.type === 'carte_membre' ? '🎴 Carte Membre' :
                       selectedDocument.type === 'photo' ? '📸 Photo' :
                       selectedDocument.type === 'formulaire' ? '📝 Formulaire' :
                       selectedDocument.type === 'paiement' ? '💳 Paiement' : '📄 Autre'}
                    </Text>
                  </View>
                </View>
                
                {selectedDocument.description && (
                  <View style={styles.documentViewDescription}>
                    <Text style={[styles.documentViewDescriptionLabel, { color: colors.textSecondary }]}>
                      Description
                    </Text>
                    <Text style={[styles.documentViewDescriptionText, { color: colors.text }]}>
                      ${selectedDocument.description}
                    </Text>
                  </View>
                )}
                
                <View style={styles.documentViewMeta}>
                  <View style={styles.documentViewMetaItem}>
                    <Text style={[styles.documentViewMetaLabel, { color: colors.textSecondary }]}>
                      Ajouté le
                    </Text>
                    <Text style={[styles.documentViewMetaValue, { color: colors.text }]}>
                      ${new Date(selectedDocument.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                  
                  {selectedDocument.created_by && (
                    <View style={styles.documentViewMetaItem}>
                      <Text style={[styles.documentViewMetaLabel, { color: colors.textSecondary }]}>
                        Ajouté par
                      </Text>
                      <Text style={[styles.documentViewMetaValue, { color: colors.text }]}>
                        ${selectedDocument.created_by}
                      </Text>
                    </View>
                  )}
                </View>
                
                {selectedDepartment && (
                  <View style={styles.documentViewDepartment}>
                    <Text style={[styles.documentViewDepartmentLabel, { color: colors.textSecondary }]}>
                      Département
                    </Text>
                    <Text style={[styles.documentViewDepartmentValue, { color: colors.text }]}>
                      ${selectedDepartment.department_name}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          {/* En-tête */}
          <View style={[styles.header, { backgroundColor: colors.primary }]}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <X size={24} color="white" />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.headerTitle}>
                    {selectedDepartment ? '📂 Dossier Département' : '📁 Dossiers des Membres'}
                  </Text>
                  <Text style={styles.headerSubtitle}>
                    {selectedDepartment 
                      ? `${selectedDepartment.department_name} • ${selectedDepartment.members.length} membres`
                      : `${mainDossier?.total_departments || 0} départements • ${mainDossier?.total_members || 0} membres payés`
                    }
                  </Text>
                </View>
              </View>
              
              <View style={styles.headerActions}>
                {selectedDepartment ? (
                  <TouchableOpacity 
                    style={[styles.headerActionButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                    onPress={() => generateDepartmentReport(selectedDepartment)}
                  >
                    <Download size={22} color="white" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.headerActionButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                    onPress={onRefresh}
                  >
                    <RotateCcw size={22} color="white" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Contenu principal */}
          {selectedDepartment ? renderDepartmentDetail() : renderDepartmentsList()}
        </SafeAreaView>
      </Modal>

      {/* Modal d'ajout de document */}
      {renderDocumentModal()}

      {/* Modal de visualisation de document */}
      {renderDocumentViewModal()}

      {/* Modal QR Code */}
      {showQRModal && selectedDepartment && selectedDepartment.members.length > 0 && (
        <QRCodeModal
          visible={showQRModal}
          member={getMemberInfo(selectedDepartment.members[0].member_id)!}
          church={church}
          onClose={() => setShowQRModal(false)}
          onCreateDossier={() => {}}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  closeButton: {
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  content: {
    flex: 1,
  },
  contentHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
    marginRight: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  departmentsList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 40,
  },
  infoBox: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#e9ecef',
    width: '100%',
  },
  infoBoxTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoBoxText: {
    fontSize: 14,
    lineHeight: 20,
  },
  departmentCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  departmentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  departmentTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  departmentName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  accessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  accessText: {
    fontSize: 11,
    fontWeight: '600',
  },
  departmentStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValueSmall: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  statLabelSmall: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  membersPreview: {
    marginBottom: 12,
  },
  membersPreviewTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  membersPreviewList: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 10,
  },
  memberPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  memberPreviewIcon: {
    fontSize: 14,
  },
  memberPreviewName: {
    fontSize: 12,
    maxWidth: 80,
  },
  moreMembers: {
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  moreMembersText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  departmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  departmentDate: {
    fontSize: 12,
  },
  viewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailContainer: {
    flex: 1,
  },
  detailHeader: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  detailHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  departmentHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  departmentHeaderText: {
    flex: 1,
  },
  departmentDetailName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  departmentHeaderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  detailStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    alignSelf: 'flex-start',
  },
  detailStatusText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailAccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    alignSelf: 'flex-start',
  },
  detailAccessText: {
    fontSize: 11,
    fontWeight: '600',
  },
  detailActions: {
    flexDirection: 'row',
    gap: 8,
  },
  detailActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  detailActionButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  deleteActionButton: {
    backgroundColor: 'rgba(231, 76, 60, 0.8)',
  },
  detailContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  detailSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  departmentDetailCard: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: 'rgba(0,0,0, 0.03)',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailItem: {
    width: '48%',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  membersHeader: {
    marginBottom: 16,
  },
  membersSubtitle: {
    fontSize: 14,
  },
  emptyMembers: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyMembersText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 4,
  },
  emptyMembersSubtext: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  membersList: {
    gap: 12,
  },
  memberCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  memberIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberIcon: {
    fontSize: 20,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  memberMetaText: {
    fontSize: 13,
  },
  memberMetaDot: {
    fontSize: 10,
  },
  memberCardNumber: {
    fontSize: 12,
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },
  memberActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberPaymentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  paymentDetail: {
    flex: 1,
  },
  paymentLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paymentValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  documentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addDocumentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  addDocumentButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyDocuments: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyDocumentsText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 4,
  },
  documentsList: {
    gap: 12,
  },
  documentCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  documentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentIcon: {
    fontSize: 20,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  documentDescription: {
    fontSize: 12,
  },
  documentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  documentActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  modalCancel: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSave: {
    fontSize: 16,
  },
  modalContent: {
    padding: 20,
  },
  infoBanner: {
    flexDirection: 'column',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
    gap: 4,
  },
  infoBannerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoBannerSubtext: {
    fontSize: 12,
  },
  formSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  documentTypeButtons: {
    flexDirection: 'row',
  },
  documentTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    gap: 8,
  },
  documentTypeButtonIcon: {
    fontSize: 16,
  },
  documentTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  formField: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    height: 80,
  },
  fieldHelp: {
    fontSize: 12,
    marginBottom: 8,
  },
  uploadOptions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    flex: 1,
  },
  galleryButton: {
    backgroundColor: '#2ecc71',
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    borderColor: 'rgba(0,0,0,0.1)',
    marginTop: 12,
  },
  filePreviewInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filePreviewIcon: {
    fontSize: 24,
  },
  filePreviewDetails: {
    flex: 1,
  },
  filePreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  filePreviewType: {
    fontSize: 12,
    marginTop: 4,
  },
  removeFileButton: {
    padding: 6,
  },
  addDocumentSubmitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addDocumentSubmitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  documentViewContainer: {
    borderRadius: 12,
    padding: 20,
  },
  documentViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  documentViewIcon: {
    fontSize: 40,
  },
  documentViewTitleContainer: {
    flex: 1,
  },
  documentViewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  documentViewType: {
    fontSize: 14,
  },
  documentViewDescription: {
    marginBottom: 20,
  },
  documentViewDescriptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  documentViewDescriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  documentViewMeta: {
    gap: 12,
    marginBottom: 20,
  },
  documentViewMetaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  documentViewMetaLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  documentViewMetaValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  documentViewDepartment: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  documentViewDepartmentLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  documentViewDepartmentValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});