import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  FlatList,
} from 'react-native';
import {
  X,
  Folder,
  FileText,
  User,
  Mail,
  Phone,
  Calendar,
  Download,
  Share2,
  Printer,
  Search,
  Filter,
  Plus,
  Trash2,
  Eye,
  Star,
  CreditCard,
  CheckCircle,
  AlertCircle,
  QrCode,
  Camera,
  Upload,
  Save,
  ArrowLeft,
  FolderPlus,
  FilePlus,
  Image as ImageIcon,
} from 'lucide-react-native';
import type { Member } from '../types/database';
import { DatabaseService } from '../lib/database';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { MemberCard } from './MemberCard';

interface DossierDocument {
  id: string;
  type: string;
  title: string;
  description: string;
  file_path: string;
  file_type: string;
  has_photo: boolean;
  created_at: string;
}

interface MemberDossier {
  id: string;
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

interface MemberDossierScreenProps {
  visible: boolean;
  onClose: () => void;
  churchId: string;
  church: any;
  members: Member[];
  onMemberUpdate: (memberId: string, updates: Partial<Member>) => Promise<void>;
  onMemberDelete: (memberId: string) => Promise<void>;
  onDossierCreated?: (dossier: MemberDossier) => void;
  onDocumentAdded?: (dossierId: string, document: DossierDocument) => void;
}

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
  const [dossiers, setDossiers] = useState<MemberDossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDossier, setSelectedDossier] = useState<MemberDossier | null>(null);
  const [addingDocument, setAddingDocument] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'complet' | 'incomplet'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [creatingDossier, setCreatingDossier] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDossierNotes, setNewDossierNotes] = useState('');

  // Charger les dossiers existants
  useEffect(() => {
    if (visible && churchId) {
      loadDossiers();
    }
  }, [visible, churchId]);

  const loadDossiers = async () => {
    try {
      setLoading(true);
      // Charger depuis la base de données ou créer des dossiers pour les membres qui en ont
      const membersWithDossier = members.filter(m => m.has_dossier);
      
      const loadedDossiers: MemberDossier[] = membersWithDossier.map(member => ({
        id: `DOSSIER-${member.id}`,
        member_id: member.id,
        church_id: churchId,
        dossier_number: member.dossier_number || `DOS-${Date.now().toString(36).toUpperCase()}`,
        dossier_type: member.member_type === 'Personnel' ? 'personnel' : 'member',
        documents: [
          {
            id: `CARD-${member.id}`,
            type: 'carte_membre',
            title: `🎴 Carte PVC - ${member.first_name} ${member.last_name}`,
            description: 'Carte de membre officielle format carte bancaire 85.6mm × 53.98mm',
            file_path: '',
            file_type: 'pdf',
            has_photo: !!member.photo_url,
            created_at: member.created_at || new Date().toISOString(),
          },
        ],
        notes: `Dossier de ${member.first_name} ${member.last_name}. ${member.position ? `Poste: ${member.position}` : ''}\nType: ${member.member_type}\nCréé automatiquement avec la carte de membre.`,
        status: (member.photo_url && member.email && member.phone) ? 'complet' : 'incomplet',
        created_at: member.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      
      setDossiers(loadedDossiers);
    } catch (error) {
      console.error('Erreur chargement dossiers:', error);
      Alert.alert('Erreur', 'Impossible de charger les dossiers');
    } finally {
      setLoading(false);
    }
  };

  const getMemberFromDossier = (dossier: MemberDossier) => {
    return members.find(m => m.id === dossier.member_id);
  };

  const filteredDossiers = dossiers.filter(dossier => {
    if (!searchQuery.trim() && filterStatus === 'all') return true;
    
    const member = getMemberFromDossier(dossier);
    if (!member) return false;
    
    const query = searchQuery.toLowerCase();
    const matchesSearch = searchQuery.trim() ? (
      member.first_name.toLowerCase().includes(query) ||
      member.last_name.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query) ||
      dossier.dossier_number.toLowerCase().includes(query) ||
      member.position?.toLowerCase().includes(query) || ''
    ) : true;
    
    const matchesFilter = filterStatus === 'all' || dossier.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const handleViewDossier = (dossier: MemberDossier) => {
    setSelectedDossier(dossier);
  };

  const handleCloseView = () => {
    setSelectedDossier(null);
  };

  // CRÉER UN NOUVEAU DOSSIER
  const handleCreateNewDossier = async () => {
    try {
      setCreatingDossier(true);
      
      // Trouver les membres sans dossier
      const membersWithoutDossier = members.filter(m => !m.has_dossier);
      
      if (membersWithoutDossier.length === 0) {
        Alert.alert('Aucun membre', 'Tous les membres ont déjà un dossier.');
        setShowCreateModal(false);
        return;
      }
      
      // Demander de sélectionner un membre
      Alert.alert(
        'Créer un dossier',
        'Sélectionnez un membre pour créer un dossier:',
        membersWithoutDossier.map(member => ({
          text: `${member.first_name} ${member.last_name}`,
          onPress: async () => {
            try {
              const dossierNumber = `DOS-${Date.now().toString(36).toUpperCase()}`;
              
              const newDossier: MemberDossier = {
                id: `DOSSIER-${member.id}`,
                member_id: member.id,
                church_id: churchId,
                dossier_number: dossierNumber,
                dossier_type: member.member_type === 'Personnel' ? 'personnel' : 'member',
                documents: [],
                notes: newDossierNotes || `Dossier créé manuellement pour ${member.first_name} ${member.last_name}.`,
                status: 'incomplet',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              
              // Ajouter le dossier
              setDossiers(prev => [...prev, newDossier]);
              
              // Mettre à jour le membre
              if (onMemberUpdate) {
                await onMemberUpdate(member.id, {
                  has_dossier: true,
                  dossier_number: dossierNumber
                });
              }
              
              // Notification
              if (onDossierCreated) {
                onDossierCreated(newDossier);
              }
              
              Alert.alert(
                '✅ Dossier créé',
                `Le dossier ${dossierNumber} a été créé pour ${member.first_name} ${member.last_name}.`,
                [{ 
                  text: 'Ajouter des documents',
                  onPress: () => {
                    setSelectedDossier(newDossier);
                    setShowCreateModal(false);
                  }
                }, { text: 'OK' }]
              );
              
              setNewDossierNotes('');
            } catch (error) {
              Alert.alert('❌ Erreur', 'Impossible de créer le dossier.');
            }
          }
        })).concat([{ text: 'Annuler', style: 'cancel' }])
      );
      
    } catch (error) {
      Alert.alert('❌ Erreur', 'Impossible de créer le dossier.');
    } finally {
      setCreatingDossier(false);
      setShowCreateModal(false);
    }
  };

  // AJOUTER UN DOCUMENT AU DOSSIER
  const handleAddDocument = async (dossier: MemberDossier) => {
    setAddingDocument(true);
    try {
      const member = getMemberFromDossier(dossier);
      
      Alert.alert(
        'Ajouter un document',
        'Que souhaitez-vous ajouter ?',
        [
          {
            text: '📸 Prendre une photo',
            onPress: async () => {
              try {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                  Alert.alert('Permission requise', 'L\'accès à la caméra est nécessaire.');
                  return;
                }
                
                const result = await ImagePicker.launchCameraAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: true,
                  quality: 0.8,
                  base64: true,
                });
                
                if (!result.canceled && result.assets[0]) {
                  const newDocument: DossierDocument = {
                    id: `DOC-${Date.now()}`,
                    type: 'photo',
                    title: `📸 Photo - ${member?.first_name || ''}`,
                    description: 'Photo ajoutée via l\'application',
                    file_path: result.assets[0].uri,
                    file_type: 'image',
                    has_photo: true,
                    created_at: new Date().toISOString(),
                  };
                  
                  addDocumentToDossier(dossier.id, newDocument);
                }
              } catch (error) {
                Alert.alert('Erreur', 'Impossible de prendre la photo.');
              }
            }
          },
          {
            text: '🖼️ Importer depuis la galerie',
            onPress: async () => {
              try {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                  Alert.alert('Permission requise', 'L\'accès à la galerie est nécessaire.');
                  return;
                }
                
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: true,
                  quality: 0.8,
                  base64: true,
                });
                
                if (!result.canceled && result.assets[0]) {
                  const newDocument: DossierDocument = {
                    id: `DOC-${Date.now()}`,
                    type: 'image',
                    title: `🖼️ Image - ${member?.first_name || ''}`,
                    description: 'Image importée depuis la galerie',
                    file_path: result.assets[0].uri,
                    file_type: 'image',
                    has_photo: true,
                    created_at: new Date().toISOString(),
                  };
                  
                  addDocumentToDossier(dossier.id, newDocument);
                }
              } catch (error) {
                Alert.alert('Erreur', 'Impossible d\'importer l\'image.');
              }
            }
          },
          {
            text: '🎴 Ajouter une carte de membre',
            onPress: () => {
              Alert.alert(
                'Ajouter une carte',
                'Générer une nouvelle carte ou importer une existante ?',
                [
                  {
                    text: 'Générer une nouvelle',
                    onPress: () => {
                      const newDocument: DossierDocument = {
                        id: `CARD-${Date.now()}`,
                        type: 'carte_membre',
                        title: `🎴 Carte - ${member?.first_name || ''}`,
                        description: 'Carte de membre générée automatiquement',
                        file_path: '',
                        file_type: 'pdf',
                        has_photo: !!member?.photo_url,
                        created_at: new Date().toISOString(),
                      };
                      
                      addDocumentToDossier(dossier.id, newDocument);
                      
                      Alert.alert(
                        'Carte à générer',
                        'La carte sera générée au format PDF. Utilisez le bouton "Générer PDF" sur la carte.',
                        [{ text: 'OK' }]
                      );
                    }
                  },
                  {
                    text: 'Importer un PDF',
                    onPress: () => {
                      // Ici vous pourriez ajouter la logique d'import PDF
                      Alert.alert('Import PDF', 'Fonctionnalité à venir.');
                    }
                  },
                  { text: 'Annuler', style: 'cancel' }
                ]
              );
            }
          },
          {
            text: '📝 Document texte',
            onPress: () => {
              Alert.prompt(
                'Nouveau document',
                'Entrez le titre du document:',
                [
                  { text: 'Annuler', style: 'cancel' },
                  {
                    text: 'Ajouter',
                    onPress: (title) => {
                      if (title) {
                        const newDocument: DossierDocument = {
                          id: `DOC-${Date.now()}`,
                          type: 'document',
                          title: `📝 ${title}`,
                          description: 'Document texte ajouté manuellement',
                          file_path: '',
                          file_type: 'text',
                          has_photo: false,
                          created_at: new Date().toISOString(),
                        };
                        
                        addDocumentToDossier(dossier.id, newDocument);
                      }
                    }
                  }
                ]
              );
            }
          },
          {
            text: 'Annuler',
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      Alert.alert('❌ Erreur', 'Impossible d\'ajouter le document.');
    } finally {
      setAddingDocument(false);
    }
  };

  const addDocumentToDossier = (dossierId: string, document: DossierDocument) => {
    setDossiers(prev => prev.map(dossier => {
      if (dossier.id === dossierId) {
        const updatedDocuments = [...dossier.documents, document];
        const updatedStatus = updatedDocuments.length > 0 ? 'complet' : dossier.status;
        
        const updatedDossier = {
          ...dossier,
          documents: updatedDocuments,
          status: updatedStatus,
          updated_at: new Date().toISOString()
        };
        
        // Notification
        if (onDocumentAdded) {
          onDocumentAdded(dossierId, document);
        }
        
        Alert.alert('✅ Document ajouté', `"${document.title}" a été ajouté au dossier.`);
        
        return updatedDossier;
      }
      return dossier;
    }));
  };

  // GÉNÉRER UN RAPPORT PDF
  const generateDossierReport = async (dossier: MemberDossier) => {
    setGeneratingReport(true);
    try {
      const member = getMemberFromDossier(dossier);
      if (!member) throw new Error('Membre non trouvé');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Dossier Membre - ${member.first_name} ${member.last_name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              font-family: 'Inter', sans-serif;
            }
            
            body {
              padding: 25px;
              background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            }
            
            .report-container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              border-radius: 25px;
              padding: 50px;
              box-shadow: 0 25px 75px rgba(0,0,0,0.15);
              border: 4px solid #3498db;
            }
            
            .header {
              text-align: center;
              padding-bottom: 40px;
              margin-bottom: 40px;
              border-bottom: 4px solid #3498db;
              position: relative;
            }
            
            .title {
              font-size: 42px;
              font-weight: 900;
              color: #2c3e50;
              margin-bottom: 15px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              letter-spacing: 1px;
            }
            
            .subtitle {
              font-size: 24px;
              color: #3498db;
              font-weight: 800;
            }
            
            .dossier-badge {
              position: absolute;
              top: 15px;
              right: 15px;
              background: ${dossier.status === 'complet' ? '#27ae60' : '#f39c12'};
              color: white;
              padding: 12px 24px;
              border-radius: 25px;
              font-size: 16px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 2px;
              box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            }
            
            .card-preview-section {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border-radius: 20px;
              padding: 35px;
              margin: 40px 0;
              color: white;
              position: relative;
              overflow: hidden;
              box-shadow: 0 15px 35px rgba(0,0,0,0.2);
            }
            
            .card-preview-section::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: linear-gradient(45deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 100%);
            }
            
            .card-preview-title {
              text-align: center;
              font-size: 22px;
              font-weight: 900;
              margin-bottom: 25px;
              text-transform: uppercase;
              letter-spacing: 3px;
              text-shadow: 0 2px 5px rgba(0,0,0,0.2);
            }
            
            .member-info-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
              gap: 25px;
              margin: 40px 0;
            }
            
            .info-card {
              background: #f8f9fa;
              padding: 25px;
              border-radius: 15px;
              border-left: 6px solid #3498db;
              transition: transform 0.3s ease;
              box-shadow: 0 8px 20px rgba(0,0,0,0.08);
            }
            
            .info-card:hover {
              transform: translateY(-8px);
              box-shadow: 0 15px 30px rgba(0,0,0,0.12);
            }
            
            .info-label {
              font-size: 14px;
              color: #7f8c8d;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              margin-bottom: 12px;
              font-weight: 800;
              display: flex;
              align-items: center;
              gap: 10px;
            }
            
            .info-value {
              font-size: 20px;
              color: #2c3e50;
              font-weight: 800;
            }
            
            .documents-section {
              margin-top: 50px;
            }
            
            .documents-title {
              font-size: 32px;
              font-weight: 900;
              color: #2c3e50;
              margin-bottom: 35px;
              padding-bottom: 20px;
              border-bottom: 3px solid #ecf0f1;
              display: flex;
              align-items: center;
              gap: 15px;
            }
            
            .documents-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
              gap: 20px;
            }
            
            .document-card {
              background: #e8f5e9;
              padding: 25px;
              border-radius: 15px;
              border-left: 6px solid #27ae60;
              display: flex;
              align-items: flex-start;
              gap: 20px;
              transition: all 0.3s ease;
              box-shadow: 0 8px 20px rgba(0,0,0,0.08);
            }
            
            .document-card:hover {
              transform: translateX(8px);
              box-shadow: 0 15px 30px rgba(39, 174, 96, 0.2);
            }
            
            .document-icon {
              font-size: 36px;
              background: white;
              width: 60px;
              height: 60px;
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #27ae60;
              box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            }
            
            .document-info {
              flex: 1;
            }
            
            .document-title {
              font-weight: 900;
              color: #27ae60;
              margin-bottom: 8px;
              font-size: 20px;
            }
            
            .document-desc {
              font-size: 16px;
              color: #7f8c8d;
              margin-bottom: 12px;
              line-height: 1.5;
            }
            
            .document-meta {
              font-size: 14px;
              color: #95a5a6;
              display: flex;
              align-items: center;
              gap: 15px;
              font-weight: 600;
            }
            
            .notes-section {
              margin-top: 50px;
              padding: 30px;
              background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
              border-radius: 15px;
              border-left: 6px solid #f39c12;
              box-shadow: 0 8px 20px rgba(0,0,0,0.08);
            }
            
            .notes-title {
              font-size: 26px;
              font-weight: 900;
              color: #856404;
              margin-bottom: 20px;
              display: flex;
              align-items: center;
              gap: 15px;
            }
            
            .notes-content {
              color: #856404;
              line-height: 1.8;
              font-size: 16px;
              font-weight: 500;
            }
            
            .footer {
              margin-top: 60px;
              text-align: center;
              padding-top: 40px;
              border-top: 3px solid #ecf0f1;
              color: #7f8c8d;
              font-size: 16px;
            }
            
            .signature {
              margin-top: 25px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 20px;
              color: #f39c12;
              font-weight: 900;
              font-size: 20px;
            }
            
            .qr-code-section {
              text-align: center;
              margin: 40px 0;
              padding: 30px;
              background: #f8f9fa;
              border-radius: 15px;
              box-shadow: 0 8px 20px rgba(0,0,0,0.08);
            }
            
            .qr-title {
              font-size: 24px;
              font-weight: 900;
              color: #2c3e50;
              margin-bottom: 20px;
            }
            
            @media print {
              body {
                padding: 0;
                background: white;
              }
              
              .report-container {
                box-shadow: none;
                border: none;
              }
              
              .dossier-badge {
                border: 3px solid ${dossier.status === 'complet' ? '#27ae60' : '#f39c12'};
              }
            }
          </style>
        </head>
        <body>
          <div class="report-container">
            <div class="header">
              <div class="dossier-badge">
                ${dossier.status === 'complet' ? '✅ DOSSIER COMPLET' : '⚠️ DOSSIER INCOMPLET'}
              </div>
              <h1 class="title">📁 DOSSIER DU MEMBRE</h1>
              <h2 class="subtitle">${church?.name || 'My Church'} - Système de Gestion des Membres</h2>
            </div>
            
            <!-- Informations principales -->
            <div class="member-info-grid">
              <div class="info-card">
                <div class="info-label">👤 Nom complet</div>
                <div class="info-value">${member.first_name} ${member.last_name}</div>
              </div>
              
              <div class="info-card">
                <div class="info-label">📋 Numéro de dossier</div>
                <div class="info-value">${dossier.dossier_number}</div>
              </div>
              
              <div class="info-card">
                <div class="info-label">🎭 Type de membre</div>
                <div class="info-value">${member.member_type}</div>
              </div>
              
              <div class="info-card">
                <div class="info-label">✉️ Email</div>
                <div class="info-value">${member.email || 'Non spécifié'}</div>
              </div>
              
              <div class="info-card">
                <div class="info-label">📱 Téléphone</div>
                <div class="info-value">${member.phone || 'Non spécifié'}</div>
              </div>
              
              <div class="info-card">
                <div class="info-label">📅 Date d'inscription</div>
                <div class="info-value">${new Date(member.created_at || '').toLocaleDateString('fr-FR', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</div>
              </div>
              
              ${member.position ? `
                <div class="info-card">
                  <div class="info-label">💼 Poste/Fonction</div>
                  <div class="info-value">${member.position}</div>
                </div>
              ` : ''}
              
              ${member.address ? `
                <div class="info-card">
                  <div class="info-label">📍 Adresse</div>
                  <div class="info-value">${member.address}</div>
                </div>
              ` : ''}
            </div>
            
            <!-- Section documents -->
            <div class="documents-section">
              <h3 class="documents-title">📎 DOCUMENTS ATTACHÉS (${dossier.documents.length})</h3>
              <div class="documents-grid">
                ${dossier.documents.map(doc => `
                  <div class="document-card">
                    <div class="document-icon">
                      ${doc.type === 'carte_membre' ? '🎴' : doc.type === 'photo' ? '📸' : doc.type === 'image' ? '🖼️' : '📝'}
                    </div>
                    <div class="document-info">
                      <div class="document-title">${doc.title}</div>
                      <div class="document-desc">${doc.description}</div>
                      <div class="document-meta">
                        <span>${doc.has_photo ? '📸 Avec photo' : '📄 Document'}</span>
                        <span>•</span>
                        <span>📅 Créé le ${new Date(doc.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}</span>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
            
            <!-- Notes -->
            ${dossier.notes ? `
              <div class="notes-section">
                <h3 class="notes-title">📝 NOTES DU DOSSIER</h3>
                <div class="notes-content">
                  ${dossier.notes.split('\n').map(line => `<p>${line}</p>`).join('')}
                </div>
              </div>
            ` : ''}
            
            <!-- Informations de génération -->
            <div class="footer">
              <p>📄 Document généré le ${new Date().toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
              <div class="signature">
                <span>✦</span>
                <span>${church?.name || 'My Church'} - Système de Gestion par Henock Aduma</span>
                <span>✦</span>
              </div>
              <div style="margin-top: 25px; font-size: 14px; color: #bdc3c7; text-align: center;">
                <p>🎴 Format de carte: PVC 85.6mm × 53.98mm (standard carte bancaire)</p>
                <p>🔒 Document sécurisé - Tous droits réservés © ${new Date().getFullYear()}</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      const fileName = `Dossier_${member.first_name}_${member.last_name}_${Date.now()}.pdf`;
      const dossierDirectory = `${FileSystem.documentDirectory}MyChurch/Dossiers/`;
      const dirInfo = await FileSystem.getInfoAsync(dossierDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dossierDirectory, { intermediates: true });
      }

      const newUri = `${dossierDirectory}${fileName}`;
      
      await FileSystem.moveAsync({
        from: uri,
        to: newUri,
      });

      // Ajouter le rapport comme document
      const newDocument: DossierDocument = {
        id: `REPORT-${Date.now()}`,
        type: 'rapport',
        title: `📊 Rapport Dossier - ${member.first_name} ${member.last_name}`,
        description: 'Rapport complet du dossier membre généré automatiquement',
        file_path: newUri,
        file_type: 'pdf',
        has_photo: false,
        created_at: new Date().toISOString(),
      };

      addDocumentToDossier(dossier.id, newDocument);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Dossier Membre - ${member.first_name} ${member.last_name}`,
          UTI: 'com.adobe.pdf',
        });
      }

      Alert.alert(
        '✅ Rapport généré',
        'Le dossier a été exporté en PDF et ajouté aux documents.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Erreur génération rapport:', error);
      Alert.alert('❌ Erreur', 'Impossible de générer le rapport.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleDeleteDossier = (dossier: MemberDossier) => {
    Alert.alert(
      'Supprimer le dossier',
      'Êtes-vous sûr de vouloir supprimer ce dossier ? Tous les documents associés seront également supprimés.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              // Supprimer le dossier de la liste
              setDossiers(prev => prev.filter(d => d.id !== dossier.id));
              
              // Marquer le membre comme n'ayant plus de dossier
              const member = getMemberFromDossier(dossier);
              if (member && onMemberUpdate) {
                await onMemberUpdate(member.id, { 
                  has_dossier: false,
                  dossier_number: null
                });
              }
              
              Alert.alert('✅ Dossier supprimé', 'Le dossier a été supprimé avec succès.');
            } catch (error) {
              Alert.alert('❌ Erreur', 'Impossible de supprimer le dossier.');
            }
          },
        },
      ]
    );
  };

  const handleAddToDossier = (dossierId: string, pdfUri: string) => {
    setDossiers(prev => prev.map(dossier => {
      if (dossier.id === dossierId) {
        // Chercher la carte existante
        const existingCardIndex = dossier.documents.findIndex(doc => doc.type === 'carte_membre');
        
        let updatedDocuments;
        if (existingCardIndex >= 0) {
          // Mettre à jour la carte existante
          updatedDocuments = [...dossier.documents];
          updatedDocuments[existingCardIndex] = {
            ...updatedDocuments[existingCardIndex],
            file_path: pdfUri,
            title: `🎴 Carte PDF - ${getMemberFromDossier(dossier)?.first_name || ''}`,
            description: 'Carte de membre en format PDF',
            updated_at: new Date().toISOString()
          };
        } else {
          // Ajouter une nouvelle carte
          const member = getMemberFromDossier(dossier);
          const newDocument: DossierDocument = {
            id: `CARD-${Date.now()}`,
            type: 'carte_membre',
            title: `🎴 Carte PDF - ${member?.first_name || ''}`,
            description: 'Carte de membre en format PDF',
            file_path: pdfUri,
            file_type: 'pdf',
            has_photo: !!member?.photo_url,
            created_at: new Date().toISOString(),
          };
          updatedDocuments = [...dossier.documents, newDocument];
        }

        const updatedDossier = {
          ...dossier,
          documents: updatedDocuments,
          status: updatedDocuments.length > 0 ? 'complet' : dossier.status,
          updated_at: new Date().toISOString()
        };

        Alert.alert('✅ Succès', 'La carte a été ajoutée au dossier.');
        
        return updatedDossier;
      }
      return dossier;
    }));
  };

  const handleUpdateMember = async (memberId: string, updates: Partial<Member>) => {
    try {
      if (onMemberUpdate) {
        await onMemberUpdate(memberId, updates);
      }
      // Recharger les dossiers
      await loadDossiers();
    } catch (error) {
      console.error('Erreur mise à jour membre:', error);
    }
  };

  const renderDossierItem = ({ item }: { item: MemberDossier }) => {
    const member = getMemberFromDossier(item);
    if (!member) return null;

    return (
      <TouchableOpacity
        style={styles.dossierItem}
        onPress={() => handleViewDossier(item)}
        activeOpacity={0.8}
      >
        <View style={styles.dossierHeader}>
          <View style={styles.memberInfo}>
            {member.photo_url ? (
              <Image source={{ uri: member.photo_url }} style={styles.memberPhoto} />
            ) : (
              <View style={styles.memberPhotoPlaceholder}>
                <Text style={styles.memberInitials}>
                  {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                </Text>
              </View>
            )}
            <View style={styles.memberDetails}>
              <Text style={styles.memberName}>
                {member.first_name} {member.last_name}
              </Text>
              <Text style={styles.memberType}>
                {member.member_type} • {item.dossier_number}
              </Text>
              <View style={[
                styles.statusBadge,
                item.status === 'complet' ? styles.statusComplete : styles.statusIncomplete
              ]}>
                {item.status === 'complet' ? (
                  <CheckCircle size={12} color="#27ae60" />
                ) : (
                  <AlertCircle size={12} color="#f39c12" />
                )}
                <Text style={[
                  styles.statusText,
                  item.status === 'complet' ? styles.statusTextComplete : styles.statusTextIncomplete
                ]}>
                  {item.status === 'complet' ? 'Dossier Complet' : 'Dossier Incomplet'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.dossierStats}>
            <View style={styles.docCountBadge}>
              <Text style={styles.docCount}>
                📎 {item.documents.length} doc{item.documents.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <Text style={styles.docDate}>
              📅 {new Date(item.updated_at).toLocaleDateString('fr-FR', { 
                day: '2-digit', 
                month: 'short' 
              })}
            </Text>
          </View>
        </View>
        
        <View style={styles.dossierActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.viewButton]}
            onPress={() => handleViewDossier(item)}
          >
            <Eye size={14} color="white" />
            <Text style={styles.actionButtonText}>Voir</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.reportButton]}
            onPress={() => generateDossierReport(item)}
            disabled={generatingReport}
          >
            {generatingReport ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <FileText size={14} color="white" />
                <Text style={styles.actionButtonText}>Rapport</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.addDocButton]}
            onPress={() => handleAddDocument(item)}
            disabled={addingDocument}
          >
            {addingDocument ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Plus size={14} color="white" />
                <Text style={styles.actionButtonText}>Ajouter</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteDossier(item)}
          >
            <Trash2 size={14} color="white" />
            <Text style={styles.actionButtonText}>Supp.</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDossierView = () => {
    if (!selectedDossier) return null;
    
    const member = getMemberFromDossier(selectedDossier);
    if (!member) return null;

    return (
      <Modal visible={!!selectedDossier} animationType="slide">
        <View style={styles.viewContainer}>
          <View style={styles.viewHeader}>
            <TouchableOpacity onPress={handleCloseView} style={styles.closeButton}>
              <ArrowLeft size={24} color="#7f8c8d" />
            </TouchableOpacity>
            <Text style={styles.viewTitle}>📁 DOSSIER DU MEMBRE</Text>
            <View style={styles.viewHeaderBadge}>
              <Text style={[
                styles.viewStatusBadge,
                selectedDossier.status === 'complet' ? styles.viewStatusComplete : styles.viewStatusIncomplete
              ]}>
                {selectedDossier.status === 'complet' ? '✅' : '⚠️'}
              </Text>
            </View>
          </View>

          <ScrollView style={styles.viewContent} showsVerticalScrollIndicator={false}>
            {/* Carte du membre intégrée */}
            <View style={styles.memberCardContainer}>
              <MemberCard
                member={member}
                church={church}
                onEdit={() => handleUpdateMember(member.id, member)}
                onDelete={() => handleDeleteDossier(selectedDossier)}
                onUpdate={(updatedMember) => handleUpdateMember(member.id, updatedMember)}
                onAddToDossier={(pdfUri) => handleAddToDossier(selectedDossier.id, pdfUri)}
              />
            </View>

            {/* Informations du dossier */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📋 INFORMATIONS DU DOSSIER</Text>
              <View style={styles.dossierInfoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Numéro de dossier</Text>
                  <Text style={styles.infoValue}>{selectedDossier.dossier_number}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Type de dossier</Text>
                  <Text style={styles.infoValue}>
                    {selectedDossier.dossier_type === 'personnel' ? '👔 PERSONNEL' : '👥 MEMBRE'}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Date création</Text>
                  <Text style={styles.infoValue}>
                    {new Date(selectedDossier.created_at).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Dernière mise à jour</Text>
                  <Text style={styles.infoValue}>
                    {new Date(selectedDossier.updated_at).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Documents</Text>
                  <Text style={styles.infoValue}>{selectedDossier.documents.length}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Statut</Text>
                  <View style={[
                    styles.statusBadgeSmall,
                    selectedDossier.status === 'complet' ? styles.statusComplete : styles.statusIncomplete
                  ]}>
                    <Text style={[
                      styles.statusTextSmall,
                      selectedDossier.status === 'complet' ? styles.statusTextComplete : styles.statusTextIncomplete
                    ]}>
                      {selectedDossier.status === 'complet' ? 'COMPLET' : 'INCOMPLET'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Documents */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📎 DOCUMENTS ({selectedDossier.documents.length})</Text>
                <TouchableOpacity
                  style={styles.addDocButton}
                  onPress={() => handleAddDocument(selectedDossier)}
                  disabled={addingDocument}
                >
                  {addingDocument ? (
                    <ActivityIndicator size="small" color="#3498db" />
                  ) : (
                    <>
                      <Plus size={16} color="#3498db" />
                      <Text style={styles.addDocText}>Ajouter</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              
              {selectedDossier.documents.length === 0 ? (
                <View style={styles.emptyDocuments}>
                  <FileText size={40} color="#bdc3c7" />
                  <Text style={styles.emptyDocumentsText}>Aucun document dans ce dossier</Text>
                  <Text style={styles.emptyDocumentsSubtext}>Ajoutez des documents pour compléter le dossier</Text>
                </View>
              ) : (
                selectedDossier.documents.map((doc) => (
                  <TouchableOpacity 
                    key={doc.id} 
                    style={styles.documentCard}
                    onPress={() => {
                      if (doc.file_path) {
                        Alert.alert(
                          'Document',
                          `Ouvrir ${doc.title} ?`,
                          [
                            { text: 'Annuler', style: 'cancel' },
                            { 
                              text: 'Ouvrir', 
                              onPress: () => {
                                Alert.alert('Ouverture', 'Document ouvert');
                              }
                            }
                          ]
                        );
                      }
                    }}
                  >
                    <View style={styles.documentIcon}>
                      {doc.type === 'carte_membre' ? (
                        <CreditCard size={24} color="#3498db" />
                      ) : doc.type === 'photo' ? (
                        <Camera size={24} color="#e74c3c" />
                      ) : doc.type === 'image' ? (
                        <ImageIcon size={24} color="#9b59b6" />
                      ) : doc.type === 'rapport' ? (
                        <FileText size={24} color="#27ae60" />
                      ) : (
                        <FileText size={24} color="#f39c12" />
                      )}
                    </View>
                    <View style={styles.documentInfo}>
                      <Text style={styles.documentTitle}>{doc.title}</Text>
                      <Text style={styles.documentDesc}>{doc.description}</Text>
                      <View style={styles.documentMeta}>
                        <Text style={styles.documentMetaItem}>
                          {doc.has_photo ? '📸 Avec photo' : '📄 Document'}
                        </Text>
                        <Text style={styles.documentMetaItem}>•</Text>
                        <Text style={styles.documentMetaItem}>
                          {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                        </Text>
                      </View>
                    </View>
                    {doc.file_path && (
                      <TouchableOpacity style={styles.downloadDocButton}>
                        <Download size={16} color="#3498db" />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Notes */}
            {selectedDossier.notes && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📝 NOTES</Text>
                <View style={styles.notesCard}>
                  <Text style={styles.notesText}>{selectedDossier.notes}</Text>
                </View>
              </View>
            )}

            {/* Actions */}
            <View style={styles.viewActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.fullButton, styles.printButton]}
                onPress={() => generateDossierReport(selectedDossier)}
                disabled={generatingReport}
              >
                {generatingReport ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Printer size={18} color="white" />
                    <Text style={styles.actionButtonText}>Générer rapport PDF</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.fullButton, styles.shareButton]}
                onPress={() => {
                  Alert.alert(
                    'Partager le dossier',
                    'Comment souhaitez-vous partager ce dossier ?',
                    [
                      {
                        text: 'Par email',
                        onPress: () => Alert.alert('Email', 'Fonctionnalité à implémenter')
                      },
                      {
                        text: 'Par WhatsApp',
                        onPress: () => Alert.alert('WhatsApp', 'Fonctionnalité à implémenter')
                      },
                      {
                        text: 'Autre application',
                        onPress: () => Alert.alert('Partage', 'Fonctionnalité à implémenter')
                      },
                      {
                        text: 'Annuler',
                        style: 'cancel'
                      }
                    ]
                  );
                }}
              >
                <Share2 size={18} color="white" />
                <Text style={styles.actionButtonText}>Partager le dossier</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.fullButton, styles.archiveButton]}
                onPress={() => {
                  Alert.alert(
                    'Archiver le dossier',
                    'Voulez-vous archiver ce dossier ?',
                    [
                      { text: 'Annuler', style: 'cancel' },
                      { 
                        text: 'Archiver', 
                        onPress: () => Alert.alert('Archivage', 'Dossier archivé avec succès')
                      }
                    ]
                  );
                }}
              >
                <Folder size={18} color="white" />
                <Text style={styles.actionButtonText}>Archiver le dossier</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#7f8c8d" />
            </TouchableOpacity>
            <View style={styles.headerTitle}>
              <Text style={styles.title}>📁 DOSSIERS DES MEMBRES</Text>
              <Text style={styles.subtitle}>{church?.name || 'My Church'}</Text>
            </View>
            <TouchableOpacity style={styles.statsButton}>
              <Text style={styles.statsCount}>{filteredDossiers.length}</Text>
            </TouchableOpacity>
          </View>

          {/* Barre de recherche et filtres */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputGroup}>
              <Search size={20} color="#3498db" />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher un dossier..."
                placeholderTextColor="#95a5a6"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={16} color="#e74c3c" />
                </TouchableOpacity>
              )}
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
              {(['all', 'complet', 'incomplet'] as const).map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterButton,
                    filterStatus === status && styles.filterButtonActive
                  ]}
                  onPress={() => setFilterStatus(status)}
                >
                  {status === 'complet' ? (
                    <CheckCircle size={14} color={filterStatus === status ? 'white' : '#27ae60'} />
                  ) : status === 'incomplet' ? (
                    <AlertCircle size={14} color={filterStatus === status ? 'white' : '#f39c12'} />
                  ) : (
                    <Filter size={14} color={filterStatus === status ? 'white' : '#3498db'} />
                  )}
                  <Text style={[
                    styles.filterButtonText,
                    filterStatus === status && styles.filterButtonTextActive
                  ]}>
                    {status === 'all' ? 'Tous' : status === 'complet' ? 'Complets' : 'Incomplets'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={styles.statsContainer}>
              <Text style={styles.statsText}>
                📊 {filteredDossiers.length} dossier{filteredDossiers.length !== 1 ? 's' : ''} 
                {filterStatus !== 'all' ? ` ${filterStatus === 'complet' ? 'complet' : 'incomplet'}${filteredDossiers.length !== 1 ? 's' : ''}` : ''}
              </Text>
            </View>
          </View>

          {/* Bouton créer un dossier */}
          <TouchableOpacity
            style={styles.createDossierButton}
            onPress={() => setShowCreateModal(true)}
            disabled={creatingDossier}
          >
            {creatingDossier ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <FolderPlus size={18} color="white" />
                <Text style={styles.createDossierButtonText}>Créer un nouveau dossier</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Liste des dossiers */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3498db" />
              <Text style={styles.loadingText}>Chargement des dossiers...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredDossiers}
              renderItem={renderDossierItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={true}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Folder size={64} color="#bdc3c7" />
                  <Text style={styles.emptyText}>Aucun dossier trouvé</Text>
                  <Text style={styles.emptySubtext}>
                    Créez votre premier dossier pour un membre
                  </Text>
                  <TouchableOpacity 
                    style={styles.emptyButton}
                    onPress={() => setShowCreateModal(true)}
                  >
                    <FolderPlus size={16} color="white" />
                    <Text style={styles.emptyButtonText}>Créer un premier dossier</Text>
                  </TouchableOpacity>
                </View>
              }
              refreshing={refreshing}
              onRefresh={loadDossiers}
            />
          )}

          {/* Modal créer un dossier */}
          <Modal visible={showCreateModal} transparent animationType="fade">
            <View style={styles.createModalOverlay}>
              <View style={styles.createModalContent}>
                <View style={styles.createModalHeader}>
                  <Text style={styles.createModalTitle}>📁 Créer un nouveau dossier</Text>
                  <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                    <X size={20} color="#7f8c8d" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.createModalBody}>
                  <Text style={styles.createModalLabel}>Notes (optionnel)</Text>
                  <TextInput
                    style={styles.createModalInput}
                    placeholder="Ajoutez des notes pour ce dossier..."
                    value={newDossierNotes}
                    onChangeText={setNewDossierNotes}
                    multiline
                    numberOfLines={3}
                  />
                  
                  <Text style={styles.createModalHelp}>
                    📝 Un dossier sera créé pour un membre sélectionné. Vous pourrez ensuite ajouter des documents.
                  </Text>
                </View>
                
                <View style={styles.createModalActions}>
                  <TouchableOpacity
                    style={[styles.createModalButton, styles.createModalCancel]}
                    onPress={() => setShowCreateModal(false)}
                  >
                    <Text style={styles.createModalButtonText}>Annuler</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.createModalButton, styles.createModalConfirm]}
                    onPress={handleCreateNewDossier}
                    disabled={creatingDossier}
                  >
                    {creatingDossier ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <FolderPlus size={16} color="white" />
                        <Text style={styles.createModalButtonText}>Créer le dossier</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.signature}>
              <Star size={14} color="#f39c12" />
              <Text style={styles.signatureText}>
                {church?.name || 'My Church'} - Système de Dossiers Automatiques
              </Text>
              <Star size={14} color="#f39c12" />
            </View>
            <Text style={styles.footerNote}>
              🎴 Format carte: 85.6mm × 53.98mm (standard carte bancaire) • 
              ⚡ Génération automatique de cartes PVC
            </Text>
          </View>
        </View>
      </Modal>

      {renderDossierView()}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#2c3e50',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  statsButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 40,
    alignItems: 'center',
  },
  statsCount: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
  },
  searchContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  searchInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3498db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 12,
    marginRight: 8,
  },
  filters: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  statsContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  statsText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '700',
  },
  createDossierButton: {
    marginHorizontal: 20,
    marginVertical: 10,
    backgroundColor: '#27ae60',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createDossierButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  dossierItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  dossierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  memberPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#3498db',
  },
  memberPhotoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInitials: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2c3e50',
    marginBottom: 4,
  },
  memberType: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 6,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusComplete: {
    backgroundColor: 'rgba(39, 174, 96, 0.1)',
    borderWidth: 1,
    borderColor: '#27ae60',
  },
  statusIncomplete: {
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    borderWidth: 1,
    borderColor: '#f39c12',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusTextSmall: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusTextComplete: {
    color: '#27ae60',
  },
  statusTextIncomplete: {
    color: '#f39c12',
  },
  dossierStats: {
    alignItems: 'flex-end',
  },
  docCountBadge: {
    backgroundColor: '#3498db',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
  },
  docCount: {
    fontSize: 11,
    color: 'white',
    fontWeight: '800',
  },
  docDate: {
    fontSize: 10,
    color: '#95a5a6',
    fontWeight: '600',
  },
  dossierActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
  },
  viewButton: {
    backgroundColor: '#3498db',
  },
  reportButton: {
    backgroundColor: '#27ae60',
  },
  addDocButton: {
    backgroundColor: '#9b59b6',
  },
  printButton: {
    backgroundColor: '#2c3e50',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  shareButton: {
    backgroundColor: '#3498db',
  },
  archiveButton: {
    backgroundColor: '#7f8c8d',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    color: '#7f8c8d',
    marginTop: 20,
    marginBottom: 8,
    fontWeight: '700',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bdc3c7',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
    paddingHorizontal: 40,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  signature: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  signatureText: {
    fontSize: 12,
    color: '#f39c12',
    fontStyle: 'italic',
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  footerNote: {
    fontSize: 11,
    color: '#95a5a6',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  // Styles pour la vue du dossier
  viewContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  viewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  viewTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2c3e50',
  },
  viewHeaderBadge: {
    width: 24,
  },
  viewStatusBadge: {
    fontSize: 20,
  },
  viewStatusComplete: {
    color: '#27ae60',
  },
  viewStatusIncomplete: {
    color: '#f39c12',
  },
  viewContent: {
    flex: 1,
    padding: 20,
  },
  memberCardContainer: {
    marginBottom: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2c3e50',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  dossierInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoItem: {
    flex: 1,
    minWidth: 150,
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    color: '#2c3e50',
    fontWeight: '700',
  },
  addDocText: {
    fontSize: 12,
    color: '#3498db',
    fontWeight: '800',
  },
  emptyDocuments: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyDocumentsText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 20,
    fontWeight: '700',
  },
  emptyDocumentsSubtext: {
    fontSize: 14,
    color: '#bdc3c7',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2c3e50',
    marginBottom: 4,
  },
  documentDesc: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 6,
    lineHeight: 16,
  },
  documentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  documentMetaItem: {
    fontSize: 10,
    color: '#95a5a6',
    fontWeight: '600',
  },
  downloadDocButton: {
    padding: 8,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderRadius: 8,
  },
  notesCard: {
    backgroundColor: '#fff3cd',
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f39c12',
  },
  notesText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 22,
  },
  viewActions: {
    gap: 12,
    marginBottom: 40,
  },
  fullButton: {
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  // Styles pour le modal de création
  createModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  createModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  createModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2c3e50',
  },
  createModalBody: {
    marginBottom: 20,
  },
  createModalLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '700',
    marginBottom: 8,
  },
  createModalInput: {
    borderWidth: 2,
    borderColor: '#ecf0f1',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    color: '#2c3e50',
    backgroundColor: '#f8f9fa',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  createModalHelp: {
    fontSize: 12,
    color: '#95a5a6',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  createModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  createModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  createModalCancel: {
    backgroundColor: '#e74c3c',
  },
  createModalConfirm: {
    backgroundColor: '#27ae60',
  },
  createModalButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
  },
}); 