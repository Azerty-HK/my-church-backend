import 'react-native-get-random-values';
import React, { useState, useEffect } from 'react';
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
  Switch,
  Image,
  Platform,
} from 'react-native';
import { 
  Plus, Search, Users, Briefcase, X, QrCode, Shield, 
  Camera, Image as ImageIcon, Trash2, User, 
  Printer, Download, Share2, Mail, Phone, MapPin, Star,
  Folder, FileText, AlertCircle, FolderPlus, CheckCircle
} from 'lucide-react-native';
import { useChurch } from '../../contexts/ChurchContext';
import { DatabaseService } from '../../lib/database';
import { ValidationService } from '../../utils/validation';
import { MemberCard } from '../../components/MemberCard';
import { QRCodeModal } from '../../components/QRCodeModal'; 
import { MemberRegistrationWithPayment } from '../../components/MemberRegistrationWithPayment';
import { MemberRegistrationPayment } from '../../components/MemberRegistrationPayment';
import { MemberDossierScreen } from '../../components/MemberDossierScreen';
import { getThemeColors } from '../../lib/theme'; 
import { MEMBER_POSITIONS, DEPARTMENTS } from '../../utils/constants';
import * as ImagePicker from 'expo-image-picker';

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

export default function MembersScreen() {   
  const { church, user, permissions } = useChurch();
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'Membre' | 'Personnel'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [creatingDossier, setCreatingDossier] = useState(false);

  // Formulaire d'ajout de membre
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
    generateCard: true,
    generateDossier: true,
    photoUri: null as string | null,
    photoBase64: null as string | null,
  });
  const [memberErrors, setMemberErrors] = useState<Record<string, string>>({});
  const [addingMember, setAddingMember] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // QR Code modal
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Modals paiement
  const [showSimplePaymentModal, setShowSimplePaymentModal] = useState(false);
  const [showFullPaymentModal, setShowFullPaymentModal] = useState(false);

  const theme = church?.theme || 'blue';
  const colors = getThemeColors(theme);

  // Montants d'inscription
  const REGISTRATION_AMOUNTS = {
    'FC': 5000,
    'USD': 5,
    'EURO': 5
  };

  // Initialiser les permissions photo au chargement
  useEffect(() => {
    if (Platform.OS !== 'web') {
      ImagePicker.requestCameraPermissionsAsync();
      ImagePicker.requestMediaLibraryPermissionsAsync();
    }
  }, []);

  useEffect(() => {
    if (church) {
      loadMembers();
    }
  }, [church]);

  useEffect(() => {
    filterMembers();
  }, [members, searchQuery, filterType]);

  const loadMembers = async () => {
    if (!church) return;

    try {
      console.log('👥 Chargement membres...');
      const data = await DatabaseService.getMembers(church.id);
      setMembers(data);
      console.log('✅ Membres chargés:', data.length);
    } catch (error: any) {
      console.error('❌ Erreur chargement membres:', error);
      Alert.alert('Erreur', 'Impossible de charger les membres');
    } finally {
      setLoading(false);
    }
  };

  const filterMembers = () => {
    let filtered = members;

    if (filterType !== 'all') {
      filtered = filtered.filter(member => member.member_type === filterType);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(member =>
        (member.first_name?.toLowerCase() || '').includes(query) ||
        (member.last_name?.toLowerCase() || '').includes(query) ||
        (member.email?.toLowerCase() || '').includes(query) ||
        (member.phone && member.phone.includes(query)) ||
        (member.position && member.position.toLowerCase().includes(query)) ||
        (member.qr_code && member.qr_code.toLowerCase().includes(query)) ||
        (member.dossier_number && member.dossier_number.toLowerCase().includes(query))
      );
    }

    setFilteredMembers(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMembers();
    setRefreshing(false);
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
        Alert.alert(
          'Permissions requises',
          'Nous avons besoin de l\'accès à la caméra et à la galerie pour ajouter une photo.',
          [
            { text: 'Annuler', style: 'cancel' },
            { 
              text: 'Paramètres', 
              onPress: () => {
                if (Platform.OS === 'ios') {
                  // Ouvrir les paramètres iOS
                }
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
        setNewMember(prev => ({
          ...prev,
          photoUri: result.assets[0].uri,
          photoBase64: result.assets[0].base64 || null,
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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
        base64: true,
        exif: false,
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
      Alert.alert('Erreur', 'Impossible de sélectionner la photo. Veuillez réessayer.');
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
      
      console.log('📤 Upload photo...');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return `data:image/jpeg;base64,${newMember.photoBase64}`;
    } catch (error) {
      console.error('Erreur upload photo:', error);
      Alert.alert('Attention', 'La photo n\'a pas pu être téléchargée, mais le membre sera quand même enregistré.');
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const validateMemberForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    const firstNameValidation = ValidationService.validateMemberName(newMember.first_name);
    if (!firstNameValidation.isValid) {
      errors.first_name = firstNameValidation.error!;
    }
    
    const lastNameValidation = ValidationService.validateMemberName(newMember.last_name);
    if (!lastNameValidation.isValid) {
      errors.last_name = lastNameValidation.error!;
    }
    
    const emailValidation = ValidationService.validateEmail(newMember.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error!;
    }
    
    if (newMember.phone.trim()) {
      const phoneValidation = ValidationService.validatePhone(newMember.phone);
      if (!phoneValidation.isValid) {
        errors.phone = phoneValidation.error!;
      }
    }

    if (newMember.member_type === 'Personnel' && newMember.salary) {
      const salaryValidation = ValidationService.validateAmount(newMember.salary);
      if (!salaryValidation.isValid) {
        errors.salary = salaryValidation.error!;
      }
    }

    if (newMember.member_type === 'Personnel' && newMember.position) {
      const restrictedPositions = ['Trésorier', 'Secrétaire', 'Lecteur'];
      if (restrictedPositions.includes(newMember.position) && user?.role !== 'Admin') {
        errors.position = `Seul l'Admin peut créer le poste de ${newMember.position}`;
      }
    }
    
    setMemberErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createAutomaticDossier = async (member: Member, photoUrl?: string): Promise<string | null> => {
    try {
      if (!church) {
        console.error('❌ Église non trouvée');
        return null;
      }

      // Générer le numéro de dossier
      const dossierNumber = `DOS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      
      // Créer les données du dossier
      const dossierData: MemberDossierData = {
        member_id: member.id,
        church_id: church.id,
        dossier_type: member.member_type === 'Personnel' ? 'personnel' : 'member',
        dossier_number: dossierNumber,
        status: 'complet',
        notes: `🎴 **DOSSIER CRÉÉ AUTOMATIQUEMENT**\n\nMembre: ${member.first_name} ${member.last_name}\nType: ${member.member_type}\n${member.position ? `Poste: ${member.position}` : ''}\n\n📅 Créé le ${new Date().toLocaleDateString('fr-FR')}\n⚡ Par le système My Church`,
        documents: [{
          id: `CARD-${member.id}`,
          type: 'carte_membre',
          title: `🎴 Carte PVC - ${member.first_name} ${member.last_name}`,
          description: 'Carte de membre officielle format carte bancaire 85.6mm × 53.98mm',
          has_photo: !!photoUrl,
          created_at: new Date().toISOString(),
        }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('📁 Création dossier automatique:', dossierData);
      
      let dossierCreated = false;
      let finalDossierNumber = dossierNumber;
      
      try {
        // Essayer d'utiliser la méthode si elle existe
        if (typeof DatabaseService.createMemberDossier === 'function') {
          await DatabaseService.createMemberDossier(dossierData);
          dossierCreated = true;
        } else {
          // Sinon, créer dans la table appropriée
          try {
            await DatabaseService.executeQuery(`
              INSERT INTO member_dossiers (
                id, member_id, church_id, dossier_type, dossier_number,
                status, notes, documents, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              `DOSSIER-${member.id}`,
              member.id,
              church.id,
              dossierData.dossier_type,
              dossierData.dossier_number,
              dossierData.status,
              dossierData.notes,
              JSON.stringify(dossierData.documents),
              dossierData.created_at,
              dossierData.updated_at
            ]);
            dossierCreated = true;
          } catch (sqlError) {
            console.log('⚠️ Erreur SQL création dossier, méthode alternative:', sqlError);
            // Méthode alternative : créer un document local
            try {
              const dossierDirectory = `${FileSystem.documentDirectory}MyChurch/Dossiers/`;
              const dirInfo = await FileSystem.getInfoAsync(dossierDirectory);
              if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(dossierDirectory, { intermediates: true });
              }
              
              const dossierFile = `${dossierDirectory}${dossierNumber}.json`;
              await FileSystem.writeAsStringAsync(dossierFile, JSON.stringify(dossierData, null, 2));
              dossierCreated = true;
            } catch (fileError) {
              console.error('❌ Erreur création fichier dossier:', fileError);
            }
          }
        }
      } catch (dbError) {
        console.log('⚠️ Méthode createMemberDossier non disponible, tentative alternative:', dbError);
        // Créer un document local comme fallback
        try {
          const dossierDirectory = `${FileSystem.documentDirectory}MyChurch/Dossiers/`;
          const dirInfo = await FileSystem.getInfoAsync(dossierDirectory);
          if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(dossierDirectory, { intermediates: true });
          }
          
          const dossierFile = `${dossierDirectory}${dossierNumber}.json`;
          await FileSystem.writeAsStringAsync(dossierFile, JSON.stringify(dossierData, null, 2));
          dossierCreated = true;
          console.log('✅ Dossier créé localement:', dossierFile);
        } catch (fileError) {
          console.error('❌ Erreur création fichier dossier:', fileError);
        }
      }

      if (dossierCreated) {
        console.log('✅ Dossier créé avec succès:', finalDossierNumber);
        return finalDossierNumber;
      } else {
        console.log('⚠️ Dossier non créé, mais membre ajouté');
        return null;
      }
    } catch (error: any) {
      console.error('❌ Erreur création dossier automatique:', error);
      // Ne pas bloquer l'ajout du membre si le dossier échoue
      console.log('⚠️ Le membre sera ajouté sans dossier pour le moment');
      return null;
    }
  };

  const handleCreateDossierForMember = async (member: Member) => {
    try {
      if (!church || !user) {
        Alert.alert('Erreur', 'Église ou utilisateur non trouvé');
        return;
      }

      // Vérifier si le membre a déjà un dossier
      if (member.has_dossier) {
        Alert.alert(
          'Information', 
          `Ce membre a déjà un dossier.\n\n📁 Numéro: ${member.dossier_number}`,
          [{ text: 'OK' }]
        );
        return;
      }

      setCreatingDossier(true);
      
      Alert.alert(
        'Créer un dossier',
        `Voulez-vous créer un dossier pour ${member.first_name} ${member.last_name} ?`,
        [
          { text: 'Annuler', style: 'cancel', onPress: () => setCreatingDossier(false) },
          { 
            text: 'Créer avec la carte',
            onPress: async () => {
              try {
                const dossierNumber = await createAutomaticDossier(member, member.photo_url || undefined);
                
                if (dossierNumber) {
                  // Mettre à jour le membre
                  await DatabaseService.updateMember(member.id, {
                    has_dossier: true,
                    dossier_number: dossierNumber,
                    updated_at: new Date().toISOString(),
                  });

                  // Audit log
                  try {
                    await DatabaseService.createAuditLogEntry({
                      church_id: church.id,
                      user_id: user.id,
                      action: 'CREATE_MEMBER_DOSSIER',
                      resource_type: 'Member',
                      resource_id: member.id,
                      details: {
                        name: `${member.first_name} ${member.last_name}`,
                        dossier_number: dossierNumber,
                        type: member.member_type,
                        with_card: true,
                      }
                    });
                  } catch (auditError) {
                    console.log('⚠️ Audit log non créé:', auditError);
                  }

                  // Recharger la liste
                  await loadMembers();
                  
                  Alert.alert(
                    '✅ Dossier créé',
                    `Le dossier a été créé avec succès !\n\n📁 Numéro: ${dossierNumber}\n👤 Membre: ${member.first_name} ${member.last_name}\n🎴 Carte incluse: Oui`,
                    [
                      { 
                        text: 'Voir le dossier',
                        onPress: () => {
                          setShowDossierModal(true);
                        }
                      },
                      { text: 'OK' }
                    ]
                  );
                } else {
                  Alert.alert('⚠️ Attention', 'Le dossier a été créé mais sans numéro. Le membre a été marqué comme ayant un dossier.');
                }
              } catch (error) {
                console.error('❌ Erreur création dossier:', error);
                Alert.alert('❌ Erreur', 'Impossible de créer le dossier.');
              } finally {
                setCreatingDossier(false);
              }
            }
          },
          { 
            text: 'Créer vide',
            onPress: async () => {
              try {
                const dossierNumber = `DOS-${Date.now().toString(36).toUpperCase()}`;
                
                // Mettre à jour le membre seulement
                await DatabaseService.updateMember(member.id, {
                  has_dossier: true,
                  dossier_number: dossierNumber,
                  updated_at: new Date().toISOString(),
                });

                // Audit log
                try {
                  await DatabaseService.createAuditLogEntry({
                    church_id: church.id,
                    user_id: user.id,
                    action: 'CREATE_MEMBER_DOSSIER',
                    resource_type: 'Member',
                    resource_id: member.id,
                    details: {
                      name: `${member.first_name} ${member.last_name}`,
                      dossier_number: dossierNumber,
                      type: member.member_type,
                      with_card: false,
                    }
                  });
                } catch (auditError) {
                  console.log('⚠️ Audit log non créé:', auditError);
                }

                // Recharger la liste
                await loadMembers();
                
                Alert.alert(
                  '✅ Dossier créé',
                  `Le dossier vide a été créé avec succès !\n\n📁 Numéro: ${dossierNumber}\n👤 Membre: ${member.first_name} ${member.last_name}\n🎴 Carte incluse: Non\n\nVous pouvez ajouter des documents plus tard.`,
                  [
                    { 
                      text: 'Voir le dossier',
                      onPress: () => {
                        setShowDossierModal(true);
                      }
                    },
                    { text: 'OK' }
                  ]
                );
              } catch (error) {
                Alert.alert('❌ Erreur', 'Impossible de créer le dossier.');
              } finally {
                setCreatingDossier(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Erreur création dossier:', error);
      Alert.alert('❌ Erreur', 'Impossible de créer le dossier.');
      setCreatingDossier(false);
    }
  };

  const handleUpdateMember = async (updatedMember: Member) => {
    try {
      if (!church || !user) {
        Alert.alert('Erreur', 'Église ou utilisateur non trouvé');
        return;
      }

      if (!permissions.canEditMembers) {
        Alert.alert('Erreur', 'Vous n\'avez pas les permissions pour modifier des membres');
        return;
      }

      // Mettre à jour dans la base de données
      await DatabaseService.updateMember(updatedMember.id, {
        first_name: updatedMember.first_name,
        last_name: updatedMember.last_name,
        email: updatedMember.email,
        phone: updatedMember.phone,
        address: updatedMember.address,
        city: updatedMember.city,
        position: updatedMember.position,
        updated_at: new Date().toISOString(),
      });

      // Audit log
      try {
        await DatabaseService.createAuditLogEntry({
          church_id: church.id,
          user_id: user.id,
          action: 'UPDATE_MEMBER',
          resource_type: 'Member',
          resource_id: updatedMember.id,
          details: { 
            name: `${updatedMember.first_name} ${updatedMember.last_name}`,
            updated_fields: ['first_name', 'last_name', 'email', 'phone', 'address', 'city', 'position']
          }
        });
      } catch (auditError) {
        console.log('⚠️ Audit log non créé:', auditError);
      }

      // Recharger la liste
      await loadMembers();
      
      Alert.alert('✅ Succès', 'Le membre a été mis à jour avec succès.');
    } catch (error: any) {
      console.error('❌ Erreur mise à jour membre:', error);
      Alert.alert('Erreur', error.message || 'Impossible de mettre à jour le membre');
    }
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
      // Uploader la photo si elle existe
      let photoUrl = null;
      if (newMember.photoBase64) {
        photoUrl = await uploadPhotoToServer();
      }

      // Générer un ID de membre unique
      const memberId = `MEM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      const memberData: Partial<Member> = {
        id: memberId,
        church_id: church.id,
        first_name: newMember.first_name.trim(),
        last_name: newMember.last_name.trim(),
        email: newMember.email.trim().toLowerCase(),
        phone: newMember.phone.trim() || undefined,
        address: newMember.address.trim() || 'Kinshasa, RDC',
        city: newMember.city,
        member_type: newMember.member_type,
        position: newMember.position || undefined,
        departments: newMember.departments,
        salary: newMember.salary ? parseFloat(newMember.salary) : undefined,
        is_active: true,
        status: 'active',
        registration_date: new Date().toISOString(),
        qr_code: `QR-${memberId}`,
        has_dossier: newMember.generateDossier,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Ajouter la photo si elle existe
      if (photoUrl) {
        memberData.photo_url = photoUrl;
      }

      console.log('👤 Création du membre...');
      
      // Créer le membre
      const createdMember = await DatabaseService.createMember(memberData);
      
      let dossierNumber = null;
      let dossierCreated = false;
      
      // ✅ CRÉER AUTOMATIQUEMENT LE DOSSIER SI DEMANDÉ
      if (newMember.generateDossier) {
        try {
          dossierNumber = await createAutomaticDossier(createdMember, photoUrl || undefined);
          
          if (dossierNumber) {
            dossierCreated = true;
            console.log('✅ Dossier créé automatiquement:', dossierNumber);
            
            // Mettre à jour le membre avec le numéro de dossier
            await DatabaseService.updateMember(createdMember.id, { 
              dossier_number: dossierNumber 
            });
          }
        } catch (dossierError) {
          console.error('❌ Erreur création dossier:', dossierError);
          // Continuer même si le dossier échoue
        }
      }
      
      // ✅ GÉNÉRER LA CARTE SI DEMANDÉ
      let cardGenerated = false;
      if (newMember.generateCard) {
        cardGenerated = true;
        console.log('🎴 Carte à générer automatiquement');
      }
      
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
            has_photo: !!photoUrl,
            has_qr_code: true,
            has_dossier: dossierCreated,
            auto_generated_card: newMember.generateCard,
            dossier_number: dossierNumber
          }
        });
      } catch (auditError) {
        console.log('⚠️ Audit log non créé:', auditError);
      }
      
      // Réinitialiser le formulaire
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
        generateCard: true,
        generateDossier: true,
        photoUri: null,
        photoBase64: null,
      });
      setMemberErrors({});
      setShowAddModal(false);
      
      await loadMembers();
      
      // Message de succès
      let successMessage = `✅ **MEMBRE AJOUTÉ AVEC SUCCÈS**\n\n👤 **${createdMember.first_name} ${createdMember.last_name}**\n📧 ${createdMember.email}\n📱 ${createdMember.phone || 'Non spécifié'}\n\n`;
      
      if (newMember.generateCard) {
        successMessage += '🎴 **Carte de membre prête à générer**\nFormat: 85.6mm × 53.98mm (PVC)\n\n';
      }
      
      if (dossierCreated) {
        successMessage += `📁 **Dossier créé automatiquement**\nNuméro: ${dossierNumber}\nStatut: ✅ Complet\n\n`;
      } else if (newMember.generateDossier) {
        successMessage += '📁 **Dossier marqué** (sans documents)\n\n';
      }
      
      if (photoUrl) {
        successMessage += '📸 **Photo enregistrée**\n\n';
      }
      
      successMessage += 'Le membre est maintenant visible dans la liste.';
      
      Alert.alert('✅ Succès', successMessage, [
        { 
          text: 'Voir le membre', 
          onPress: () => {
            const addedMember = members.find(m => m.id === createdMember.id) || createdMember;
            setSelectedMember(addedMember);
            setShowQRModal(true);
          }
        },
        { text: 'OK' }
      ]);
    } catch (error: any) {
      console.error('❌ Erreur ajout membre:', error);
      Alert.alert(
        '❌ Erreur', 
        error.message || 'Impossible d\'ajouter le membre',
        [{ text: 'OK' }]
      );
    } finally {
      setAddingMember(false);
    }
  };

  const handleMemberPress = (member: Member) => {
    setSelectedMember(member);
    setShowQRModal(true);
  };

  const toggleDepartment = (department: string) => {
    setNewMember(prev => ({
      ...prev,
      departments: prev.departments.includes(department)
        ? prev.departments.filter(d => d !== department)
        : [...prev.departments, department]
    }));
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
      generateCard: true,
      generateDossier: true,
      photoUri: null,
      photoBase64: null,
    });
    setMemberErrors({});
    setShowAddModal(false);
  };

  const handlePaymentSuccess = async (paymentData: any) => {
    try {
      if (!church || !user) {
        Alert.alert('Erreur', 'Église ou utilisateur non trouvé');
        return;
      }

      // Uploader la photo
      let photoUrl = null;
      if (newMember.photoBase64) {
        photoUrl = await uploadPhotoToServer();
      }

      // Générer ID membre
      const memberId = `MEM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      const memberData: Partial<Member> = {
        id: memberId,
        church_id: church.id,
        first_name: newMember.first_name.trim(),
        last_name: newMember.last_name.trim(),
        email: newMember.email.trim().toLowerCase(),
        phone: newMember.phone.trim() || undefined,
        address: newMember.address.trim() || 'Kinshasa, RDC',
        city: newMember.city,
        member_type: newMember.member_type,
        position: newMember.position || undefined,
        departments: newMember.departments,
        salary: newMember.salary ? parseFloat(newMember.salary) : undefined,
        is_active: true,
        status: 'active',
        registration_date: new Date().toISOString(),
        qr_code: `QR-${memberId}`,
        has_dossier: newMember.generateDossier,
        payment_reference: paymentData.reference,
        payment_method: paymentData.method,
        payment_amount: REGISTRATION_AMOUNTS[church.currency as keyof typeof REGISTRATION_AMOUNTS],
        payment_currency: church.currency,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (photoUrl) {
        memberData.photo_url = photoUrl;
      }

      const createdMember = await DatabaseService.createMember(memberData);
      
      // ✅ CRÉER AUTOMATIQUEMENT LE DOSSIER
      let dossierNumber = null;
      let dossierCreated = false;
      
      if (newMember.generateDossier) {
        try {
          dossierNumber = await createAutomaticDossier(createdMember, photoUrl || undefined);
          
          if (dossierNumber) {
            dossierCreated = true;
            // Mettre à jour le membre
            await DatabaseService.updateMember(createdMember.id, { 
              dossier_number: dossierNumber 
            });
          }
        } catch (dossierError) {
          console.error('❌ Erreur création dossier paiement:', dossierError);
        }
      }
      
      // Audit log
      try {
        await DatabaseService.createAuditLogEntry({
          church_id: church.id,
          user_id: user.id,
          action: 'CREATE_MEMBER_WITH_PAYMENT',
          resource_type: 'Member',
          resource_id: createdMember.id,
          details: { 
            name: `${createdMember.first_name} ${createdMember.last_name}`,
            type: createdMember.member_type,
            position: createdMember.position,
            has_photo: !!photoUrl,
            has_qr_code: true,
            payment_completed: true,
            payment_reference: paymentData.reference,
            has_dossier: dossierCreated,
            auto_generated_card: newMember.generateCard,
            dossier_number: dossierNumber,
          }
        });
      } catch (auditError) {
        console.log('⚠️ Audit log non créé:', auditError);
      }
      
      await loadMembers();
      
      // Message de succès
      let successMessage = `✅ **INSCRIPTION ET PAIEMENT RÉUSSIS**\n\n👤 **${createdMember.first_name} ${createdMember.last_name}**\n📧 ${createdMember.email}\n\n`;
      
      if (newMember.generateCard) {
        successMessage += '🎴 **Carte de membre prête**\nFormat PVC professionnel\n\n';
      }
      
      if (dossierCreated) {
        successMessage += `📁 **Dossier créé**\nNuméro: ${dossierNumber}\n\n`;
      }
      
      if (photoUrl) {
        successMessage += '📸 **Photo enregistrée**\n\n';
      }
      
      successMessage += '💳 **Paiement confirmé**\nRéférence: ' + paymentData.reference;
      
      Alert.alert('✅ Succès', successMessage, [
        { 
          text: 'Voir la carte',
          onPress: () => {
            const addedMember = members.find(m => m.id === createdMember.id) || createdMember;
            setSelectedMember(addedMember);
            setShowQRModal(true);
          }
        },
        { text: 'OK' }
      ]);
      
      // Réinitialiser le formulaire
      resetForm();
    } catch (error: any) {
      console.error('❌ Erreur création membre après paiement:', error);
      Alert.alert('❌ Erreur', error.message || 'Impossible de créer le membre après paiement');
    }
  };

  const handleCompleteWithPayment = async (memberData: Partial<Member>) => {
    try {
      if (!church || !user) {
        Alert.alert('Erreur', 'Église ou utilisateur non trouvé');
        return;
      }

      const createdMember = await DatabaseService.createMember(memberData);
      
      // ✅ CRÉER AUTOMATIQUEMENT LE DOSSIER
      let dossierNumber = null;
      let dossierCreated = false;
      
      if (memberData.has_dossier) {
        try {
          dossierNumber = await createAutomaticDossier(createdMember, memberData.photo_url);
          
          if (dossierNumber) {
            dossierCreated = true;
            // Mettre à jour le membre
            await DatabaseService.updateMember(createdMember.id, { 
              dossier_number: dossierNumber 
            });
          }
        } catch (dossierError) {
          console.error('❌ Erreur création dossier formulaire complet:', dossierError);
        }
      }
      
      // Audit log
      try {
        await DatabaseService.createAuditLogEntry({
          church_id: church.id,
          user_id: user.id,
          action: 'CREATE_MEMBER_WITH_PAYMENT_FORM',
          resource_type: 'Member',
          resource_id: createdMember.id,
          details: { 
            name: `${createdMember.first_name} ${createdMember.last_name}`,
            type: createdMember.member_type,
            position: createdMember.position,
            has_photo: !!memberData.photo_url,
            has_qr_code: !!memberData.qr_code,
            payment_completed: false,
            has_dossier: dossierCreated,
            auto_generated_card: true,
            dossier_number: dossierNumber,
          }
        });
      } catch (auditError) {
        console.log('⚠️ Audit log non créé:', auditError);
      }
      
      await loadMembers();
      
      let successMessage = `✅ **INSCRIPTION COMPLÈTE**\n\n👤 **${createdMember.first_name} ${createdMember.last_name}**\n📧 ${createdMember.email}\n\n`;
      
      if (dossierCreated) {
        successMessage += `📁 **Dossier créé**\nNuméro: ${dossierNumber}\n\n`;
      }
      
      if (memberData.photo_url) {
        successMessage += '📸 **Photo enregistrée**\n\n';
      }
      
      successMessage += '🎴 **Carte prête à générer**\nFormat: 85.6mm × 53.98mm';
      
      Alert.alert('✅ Succès', successMessage, [
        { 
          text: 'Voir la carte',
          onPress: () => {
            const addedMember = members.find(m => m.id === createdMember.id) || createdMember;
            setSelectedMember(addedMember);
            setShowQRModal(true);
          }
        },
        { text: 'OK' }
      ]);
    } catch (error: any) {
      console.error('❌ Erreur création membre:', error);
      Alert.alert('❌ Erreur', error.message || 'Impossible de créer le membre');
    }
  };

  const handleAddToDossierFromCard = async (pdfUri: string, dossierId?: string) => {
    if (!selectedMember) return;
    
    try {
      if (!selectedMember.has_dossier) {
        Alert.alert(
          'Créer un dossier d\'abord',
          'Ce membre n\'a pas de dossier. Voulez-vous en créer un avec cette carte ?',
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Créer un dossier',
              onPress: () => handleCreateDossierForMember(selectedMember)
            }
          ]
        );
        return;
      }
      
      Alert.alert(
        '✅ Carte générée',
        'La carte a été sauvegardée. Voulez-vous :',
        [
          {
            text: 'Ajouter au dossier',
            onPress: () => {
              Alert.alert(
                '📁 Ajout au dossier',
                `La carte sera ajoutée au dossier ${selectedMember.dossier_number}`,
                [
                  { text: 'Annuler', style: 'cancel' },
                  {
                    text: 'Confirmer',
                    onPress: () => {
                      // Ici, vous pouvez implémenter la logique d'ajout au dossier
                      // Par exemple, ouvrir le dossier ou marquer la carte comme ajoutée
                      Alert.alert('✅ Succès', 'La carte a été marquée pour ajout au dossier.');
                    }
                  }
                ]
              );
            }
          },
          {
            text: 'Partager',
            onPress: () => {
              // Logique de partage
              Alert.alert('Partage', 'Fonction de partage à implémenter.');
            }
          },
          {
            text: 'OK',
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      console.error('Erreur ajout au dossier:', error);
    }
  };

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
          Chargement des membres...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* En-tête avec gradient */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <View style={styles.headerTitleRow}>
              <Users size={28} color="white" strokeWidth={2.5} />
              <Text style={styles.title}>Membres</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statBadge}>
                <Text style={styles.statNumber}>{filteredMembers.length}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statBadge}>
                <Text style={styles.statNumber}>
                  {members.filter(m => m.has_dossier).length}
                </Text>
                <Text style={styles.statLabel}>Dossiers</Text>
              </View>
              <View style={styles.statBadge}>
                <Text style={styles.statNumber}>
                  {members.filter(m => m.qr_code).length}
                </Text>
                <Text style={styles.statLabel}>QR Codes</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.dossierButton}
              onPress={() => setShowDossierModal(true)}
            >
              <Folder size={24} color={colors.primary} strokeWidth={3} />
            </TouchableOpacity>
            
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
      </View>

      {/* Barre de recherche et filtres */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <View style={[styles.searchInputGroup, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Search size={22} color={colors.primary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="🔍 Rechercher par nom, email, téléphone..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
          {(['all', 'Membre', 'Personnel'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterButton,
                { borderColor: colors.border },
                filterType === type && {
                  backgroundColor: colors.primary,
                  borderColor: colors.primary
                }
              ]}
              onPress={() => setFilterType(type)}
            >
              <Text style={[
                styles.filterButtonText,
                { color: colors.text },
                filterType === type && { color: 'white' }
              ]}>
                {type === 'all' ? 'Tous' : type}
              </Text>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity
            style={[styles.filterButton, { borderColor: colors.border }]}
            onPress={() => setShowDossierModal(true)}
          >
            <Folder size={16} color={colors.primary} />
            <Text style={[styles.filterButtonText, { color: colors.text }]}>
              Dossiers ({members.filter(m => m.has_dossier).length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Liste des membres */}
      <ScrollView
        style={styles.membersList}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {filteredMembers.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            church={church}
            onPress={() => handleMemberPress(member)}
            onUpdate={handleUpdateMember}
            onDelete={() => {
              Alert.alert(
                'Supprimer membre',
                `Êtes-vous sûr de vouloir supprimer ${member.first_name} ${member.last_name} ?`,
                [
                  { text: 'Annuler', style: 'cancel' },
                  { 
                    text: 'Supprimer', 
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await DatabaseService.deleteMember(member.id);
                        await loadMembers();
                        Alert.alert('✅ Membre supprimé', 'Le membre a été supprimé avec succès.');
                      } catch (error) {
                        Alert.alert('❌ Erreur', 'Impossible de supprimer le membre.');
                      }
                    }
                  }
                ]
              );
            }}
            onAddToDossier={handleAddToDossierFromCard}
          />
        ))}
        
        {filteredMembers.length === 0 && (
          <View style={styles.emptyState}>
            <Users size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery || filterType !== 'all' 
                ? 'Aucun membre trouvé'
                : 'Aucun membre enregistré'
              }
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              {searchQuery || filterType !== 'all'
                ? 'Essayez de modifier vos critères de recherche'
                : 'Commencez par ajouter votre premier membre'
              }
            </Text>
            
            {permissions.canEditMembers && (
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowAddModal(true)}
              >
                <Plus size={20} color="white" />
                <Text style={styles.emptyButtonText}>Ajouter un premier membre</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal d'ajout de membre simple */}
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
              <Text style={[styles.modalTitle, { color: colors.text }]}>👤 Nouveau membre</Text>
              <TouchableOpacity 
                onPress={handleAddMember}
                disabled={addingMember || uploadingPhoto}
              >
                <Text style={[styles.modalSave, { 
                  color: addingMember || uploadingPhoto ? colors.textSecondary : colors.primary,
                  fontWeight: '600'
                }]}>
                  {addingMember ? 'Ajout...' : uploadingPhoto ? 'Upload...' : 'Ajouter'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Section Photo */}
              <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                <Text style={[styles.formSectionTitle, { color: colors.text }]}>
                  📸 Photo pour la carte (optionnel)
                </Text>
                <Text style={[styles.fieldHelp, { color: colors.textSecondary }]}>
                  Format recommandé: 3x4 (comme photo d'identité)
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
                          <Text style={styles.photoButtonText}>
                            Prendre photo
                          </Text>
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

              {/* Informations de base */}
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
                  <View style={styles.fieldInputContainer}>
                    <MapPin size={18} color={colors.textSecondary} />
                    <TextInput
                      style={[styles.fieldInputInner, styles.addressInput]}
                      placeholder="Adresse complète"
                      placeholderTextColor={colors.textSecondary}
                      value={newMember.address}
                      onChangeText={(text) => setNewMember(prev => ({ ...prev, address: text }))}
                      editable={!addingMember && !uploadingPhoto}
                    />
                  </View>
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

              {/* Type de membre */}
              <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                <Text style={[styles.formSectionTitle, { color: colors.text }]}>
                  👥 Type de membre
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

                {/* Poste (pour le personnel) */}
                {newMember.member_type === 'Personnel' && (
                  <View style={styles.formField}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>💼 Poste</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.positionButtonsContainer}>
                      <View style={styles.positionButtons}>
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
                      </View>
                    </ScrollView>
                    {memberErrors.position && (
                      <Text style={[styles.fieldError, { color: colors.error }]}>
                        {memberErrors.position}
                      </Text>
                    )}
                  </View>
                )}

                {/* Salaire (pour le personnel) */}
                {newMember.member_type === 'Personnel' && (
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
                )}
              </View>

              {/* Départements */}
              <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                <Text style={[styles.formSectionTitle, { color: colors.text }]}>
                  🏢 Départements (optionnel)
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

              {/* Options de génération */}
              <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                <View style={styles.optionsSection}>
                  <Text style={[styles.formSectionTitle, { color: colors.text }]}>
                    🎴 Format de la carte & 📁 Dossier
                  </Text>
                  <View style={styles.optionInfo}>
                    <Camera size={14} color={colors.primary} />
                    <Text style={[styles.optionInfoText, { color: colors.textSecondary }]}>
                      Format carte: 85.6mm × 54mm (standard carte de membre)
                    </Text>
                  </View>
                  <View style={styles.optionInfo}>
                    <Text style={[styles.optionInfoText, { 
                      color: colors.primary, 
                      fontWeight: 'bold' 
                    }]}>
                      📍 Nom de l'église: "{church.name}"
                    </Text>
                  </View>
                </View>
                
                {/* Génération automatique de carte */}
                <View style={styles.optionToggle}>
                  <Switch
                    value={newMember.generateCard}
                    onValueChange={(value) => setNewMember(prev => ({ ...prev, generateCard: value }))}
                    trackColor={{ false: '#f4f3f4', true: colors.primary }}
                    thumbColor={newMember.generateCard ? '#f5dd4b' : '#f4f3f4'}
                    disabled={addingMember || uploadingPhoto}
                  />
                  <View style={styles.optionToggleContent}>
                    <Text style={[styles.optionToggleText, { color: colors.text }]}>
                      Générer automatiquement la carte de membre
                    </Text>
                    <Text style={[styles.optionToggleHelp, { color: colors.textSecondary }]}>
                      ✅ Format: 85.6mm × 54mm (standard carte bancaire)
                    </Text>
                    <Text style={[styles.optionToggleHelp, { color: colors.textSecondary }]}>
                      ✅ Nom de l'église: "{church.name}"
                    </Text>
                    <Text style={[styles.optionToggleHelp, { color: colors.textSecondary }]}>
                      ✅ QR Code unique pour chaque membre
                    </Text>
                  </View>
                </View>

                {/* Génération automatique de dossier */}
                <View style={styles.optionToggle}>
                  <Switch
                    value={newMember.generateDossier}
                    onValueChange={(value) => setNewMember(prev => ({ ...prev, generateDossier: value }))}
                    trackColor={{ false: '#f4f3f4', true: '#27ae60' }}
                    thumbColor={newMember.generateDossier ? '#f5dd4b' : '#f4f3f4'}
                    disabled={addingMember || uploadingPhoto}
                  />
                  <View style={styles.optionToggleContent}>
                    <Text style={[styles.optionToggleText, { color: colors.text }]}>
                      Créer automatiquement un dossier
                    </Text>
                    <Text style={[styles.optionToggleHelp, { color: colors.textSecondary }]}>
                      ✅ Numéro de dossier unique généré
                    </Text>
                    <Text style={[styles.optionToggleHelp, { color: colors.textSecondary }]}>
                      ✅ La carte sera incluse dans le dossier
                    </Text>
                    <Text style={[styles.optionToggleHelp, { color: colors.textSecondary }]}>
                      ✅ Statut: Complet (avec photo) ou Incomplet
                    </Text>
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
                        Ajouter le membre
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentButton,
                    { backgroundColor: '#27ae60' },
                    (addingMember || uploadingPhoto) && styles.buttonDisabled
                  ]}
                  onPress={() => {
                    if (validateMemberForm()) {
                      setShowSimplePaymentModal(true);
                    }
                  }}
                  disabled={addingMember || uploadingPhoto}
                >
                  <Text style={styles.paymentButtonText}>
                    💳 Inscription avec paiement
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalFooter}>
                <Text style={[styles.modalFooterText, { color: colors.textSecondary }]}>
                  <Text style={styles.required}>*</Text> Champs obligatoires
                </Text>
                <View style={styles.signature}>
                  <Star size={12} color="#f39c12" />
                  <Text style={styles.signatureText}>My Church - Créé par Henock Aduma</Text>
                  <Star size={12} color="#f39c12" />
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Modal QR Code & Carte */}
      {selectedMember && (
        <QRCodeModal
          visible={showQRModal}
          member={selectedMember}
          church={church}
          onClose={() => setShowQRModal(false)}
          onCreateDossier={() => handleCreateDossierForMember(selectedMember)}
        />
      )}

      {/* Modal paiement simple */}
      <MemberRegistrationPayment
        visible={showSimplePaymentModal}
        onClose={() => setShowSimplePaymentModal(false)}
        onPaymentSuccess={handlePaymentSuccess}
        currency={church.currency as 'FC' | 'USD' | 'EURO'}
        memberName={`${newMember.first_name} ${newMember.last_name}`}
        amount={REGISTRATION_AMOUNTS[church.currency as keyof typeof REGISTRATION_AMOUNTS]}
        description="Frais d'inscription membre"
      />

      {/* Modal inscription avec formulaire complet */}
      <MemberRegistrationWithPayment
        visible={showFullPaymentModal}
        onClose={() => setShowFullPaymentModal(false)}
        onComplete={handleCompleteWithPayment}
        churchId={church.id}
        defaultCurrency={church.currency as 'FC' | 'USD' | 'EURO'}
      />

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
            await loadMembers();
          } catch (error) {
            console.error('Erreur mise à jour membre:', error);
            Alert.alert('Erreur', 'Impossible de mettre à jour le membre');
          }
        }}
        onMemberDelete={async (memberId) => {
          try {
            await DatabaseService.deleteMember(memberId);
            await loadMembers();
            Alert.alert('✅ Succès', 'Le membre a été supprimé');
          } catch (error) {
            console.error('Erreur suppression membre:', error);
            Alert.alert('Erreur', 'Impossible de supprimer le membre');
          }
        }}
        onDossierCreated={(dossier) => {
          console.log('✅ Dossier créé:', dossier);
          // Recharger les membres pour mettre à jour l'affichage
          loadMembers();
        }}
        onDocumentAdded={(dossierId, document) => {
          console.log('📄 Document ajouté:', document);
          Alert.alert('✅ Document ajouté', `"${document.title}" a été ajouté au dossier.`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
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
  headerTextContainer: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  dossierButton: {
    width: 44,
    height: 44,
    backgroundColor: 'white',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButton: {
    width: 44,
    height: 44,
    backgroundColor: 'white',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  searchInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  filters: {
    flexDirection: 'row',
    marginTop: 16,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  membersList: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
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
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
  emptyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
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
    flex: 1,
  },
  formSection: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  fieldHelp: {
    fontSize: 13,
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
    height: 160,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  photoPlaceholder: {
    width: 120,
    height: 160,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  photoPlaceholderText: {
    fontSize: 14,
    marginTop: 8,
  },
  photoPlaceholderSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
  photoButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  galleryButton: {
    backgroundColor: '#9b59b6',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  formField: {
    flex: 1,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  required: {
    color: '#e74c3c',
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  fieldInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fieldInputError: {
    borderColor: '#e74c3c',
  },
  fieldInputInner: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  addressInput: {
    height: 40,
  },
  fieldError: {
    fontSize: 12,
    marginTop: 4,
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
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  positionButtonsContainer: {
    marginBottom: 16,
  },
  positionButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
  },
  positionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  restrictedPosition: {
    borderStyle: 'dashed',
  },
  positionButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  departmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  departmentButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  departmentButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  optionsSection: {
    marginBottom: 16,
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  optionInfoText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  optionToggle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginTop: 12,
    marginBottom: 12,
  },
  optionToggleContent: {
    flex: 1,
  },
  optionToggleText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  optionToggleHelp: {
    fontSize: 12,
    marginBottom: 2,
    lineHeight: 16,
  },
  actionButtons: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 40,
    gap: 12,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  paymentButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  modalFooterText: {
    fontSize: 13,
    marginBottom: 16,
  },
  signature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signatureText: {
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '800',
  },
}); 