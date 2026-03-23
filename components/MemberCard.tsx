import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Share,
  Platform,
  Alert,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Linking,
  Animated,
  Dimensions
} from 'react-native';
import { 
  User, Mail, Phone, MapPin, QrCode, Users, Briefcase, 
  Shield, DollarSign, Star, FolderPlus, Church, Share2, 
  FileText, Edit, X, Save, Download, CheckCircle,
  Calendar, Hash, Building, ShieldCheck, Image as ImageIcon,
  Printer, CreditCard, Receipt, Copy, Eye, EyeOff, Lock,
  AlertCircle, Info, DownloadCloud, Smartphone, Globe,
  Award, Tag, Clock, Zap, Activity, BarChart, TrendingUp
} from 'lucide-react-native';
import { formatAmount } from '../utils/currency';
import type { Member } from '../types/database';
import QRCode from 'react-native-qrcode-svg';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { CARD_CONFIG, BUSINESS_RULES, UI_CONSTANTS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/constants';

interface MemberCardProps {
  member: Member;
  currency: string;
  churchName?: string;
  churchLogo?: string;
  onPress?: () => void;
  onEdit?: (updatedMember: Member) => Promise<void>;
  onDelete?: () => Promise<void>;
  onAddToFolder?: () => void;
  onGenerateCard?: () => Promise<void>;
  onViewInvoice?: () => void;
  onMakePayment?: () => void;
  showActions?: boolean;
  compact?: boolean;
  theme?: 'default' | 'professional' | 'modern';
}

export function MemberCard({ 
  member, 
  currency, 
  churchName = 'MY CHURCH', 
  churchLogo,
  onPress, 
  onEdit,
  onDelete,
  onAddToFolder,
  onGenerateCard,
  onViewInvoice,
  onMakePayment,
  showActions = true,
  compact = false,
  theme = 'default'
}: MemberCardProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const [editedMember, setEditedMember] = useState<Member>({...member});
  const [cardScale] = useState(new Animated.Value(1));
  const [pulseAnim] = useState(new Animated.Value(1));
  
  const cardRef = useRef<View>(null);
  const { width } = Dimensions.get('window');
  
  // Effet d'animation de pulsation pour les membres actifs
  useEffect(() => {
    if (member.is_active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [member.is_active]);

  // Animation au survol
  const handlePressIn = () => {
    Animated.spring(cardScale, {
      toValue: 0.98,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(cardScale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  // Fonctions utilitaires
  const formatDepartments = (departments: string | string[]) => {
    if (!departments) return 'Aucun département assigné';
    if (Array.isArray(departments)) {
      return departments.join(', ');
    }
    return departments;
  };

  const getStatusColor = () => {
    if (!member.has_paid) return '#e74c3c'; // Non payé - rouge
    if (!member.is_active) return '#95a5a6'; // Inactif - gris
    return member.status === 'active' ? '#27ae60' : '#f39c12'; // Actif - vert, Autre - orange
  };

  const getStatusText = () => {
    if (!member.has_paid) return '❌ Non payé';
    if (!member.is_active) return '⏸️ Inactif';
    return member.status === 'active' ? '✅ Actif' : '⚠️ ' + member.status;
  };

  const getMemberTypeIcon = () => {
    return member.member_type === 'Personnel' ? (
      <Briefcase size={16} color="#9b59b6" />
    ) : (
      <Users size={16} color="#3498db" />
    );
  };

  const getPositionColor = () => {
    if (!member.position) return '#7f8c8d';
    const restrictedPositions = ['Pasteur', 'Trésorier', 'Secrétaire', 'Lecteur'];
    return restrictedPositions.includes(member.position) ? '#e74c3c' : '#3498db';
  };

  const isRestrictedPosition = () => {
    const restrictedPositions = ['Pasteur', 'Trésorier', 'Secrétaire', 'Lecteur'];
    return member.position ? restrictedPositions.includes(member.position) : false;
  };

  const hasCard = () => {
    return member.has_paid && member.card_number;
  };

  const getCardStatus = () => {
    if (!member.has_paid) return { text: '💰 Paiement requis', color: '#e74c3c' };
    if (!member.card_number) return { text: '🔄 Carte en attente', color: '#f39c12' };
    return { text: '✅ Carte active', color: '#27ae60' };
  };

  const renderMemberPhoto = () => {
    if (member.photo_url) {
      return (
        <Image 
          source={{ uri: member.photo_url }} 
          style={styles.photo} 
          resizeMode="cover"
        />
      );
    }
    
    return (
      <View style={styles.photoPlaceholder}>
        <User size={compact ? 24 : 32} color="#7f8c8d" />
        <Text style={styles.initials}>
          {member.first_name?.charAt(0)}{member.last_name?.charAt(0)}
        </Text>
      </View>
    );
  };

  // Fonctions principales
  const handleExportImage = async () => {
    try {
      setGeneratingImage(true);
      
      if (!cardRef.current) {
        Alert.alert('Erreur', ERROR_MESSAGES.OPERATION_FAILED);
        return;
      }

      const uri = await captureRef(cardRef.current, {
        format: 'png',
        quality: 1,
      });

      const downloadDir = FileSystem.documentDirectory + 'MyChurch/Cards/';
      const dirInfo = await FileSystem.getInfoAsync(downloadDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
      }

      const fileName = `Carte_${member.first_name}_${member.last_name}_${Date.now()}.png`;
      const fileUri = downloadDir + fileName;
      
      await FileSystem.copyAsync({ from: uri, to: fileUri });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'image/png',
          dialogTitle: `Carte Membre - ${member.first_name} ${member.last_name}`,
          UTI: 'public.png'
        });
      } else {
        Alert.alert(
          SUCCESS_MESSAGES.OPERATION_SUCCESSFUL,
          `L'image a été générée avec succès !\n\n📁 Emplacement: ${fileUri}`,
          [
            { text: 'OK', style: 'cancel' },
            {
              text: 'Ouvrir le dossier',
              onPress: () => Linking.openURL(`file://${downloadDir}`).catch(() => 
                Alert.alert('Erreur', ERROR_MESSAGES.OPERATION_FAILED)
              )
            }
          ]
        );
      }

    } catch (error) {
      console.error('Erreur génération image:', error);
      Alert.alert('Erreur', ERROR_MESSAGES.OPERATION_FAILED);
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setGeneratingPDF(true);
      
      const htmlContent = generateInvoiceHTML();
      
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      const downloadDir = FileSystem.documentDirectory + 'MyChurch/Invoices/';
      const dirInfo = await FileSystem.getInfoAsync(downloadDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
      }

      const fileName = `Facture_${member.first_name}_${member.last_name}_${Date.now()}.pdf`;
      const fileUri = downloadDir + fileName;
      
      await FileSystem.copyAsync({ from: uri, to: fileUri });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Facture - ${member.first_name} ${member.last_name}`,
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert(
          SUCCESS_MESSAGES.OPERATION_SUCCESSFUL,
          `La facture a été générée avec succès !\n\n📁 Emplacement: ${fileUri}`,
          [
            { text: 'OK', style: 'cancel' },
            {
              text: 'Ouvrir le dossier',
              onPress: () => Linking.openURL(`file://${downloadDir}`).catch(() => 
                Alert.alert('Erreur', ERROR_MESSAGES.OPERATION_FAILED)
              )
            }
          ]
        );
      }

    } catch (error) {
      console.error('Erreur génération PDF:', error);
      Alert.alert('Erreur', ERROR_MESSAGES.OPERATION_FAILED);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const generateInvoiceHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Facture - ${member.first_name} ${member.last_name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 3px solid #3498db; }
          .church-name { font-size: 24px; font-weight: bold; color: #2c3e50; margin-bottom: 5px; }
          .invoice-title { font-size: 20px; color: #3498db; margin-bottom: 5px; }
          .invoice-subtitle { font-size: 12px; color: #7f8c8d; margin-bottom: 20px; }
          .member-info { display: flex; margin-bottom: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; }
          .photo-section { text-align: center; margin-right: 30px; }
          .photo-placeholder { width: 80px; height: 80px; background-color: #ecf0f1; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; font-weight: bold; font-size: 24px; color: #7f8c8d; }
          .info-section { flex: 1; }
          .member-name { font-size: 22px; font-weight: bold; color: #2c3e50; margin-bottom: 5px; }
          .member-type { color: #3498db; font-weight: bold; margin-bottom: 5px; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 20px; background-color: ${getStatusColor()}; color: white; font-size: 12px; font-weight: bold; }
          .section { margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #eee; }
          .section-title { font-size: 16px; font-weight: bold; color: #2c3e50; margin-bottom: 15px; padding: 8px; background-color: #f8f9fa; border-radius: 4px; }
          .row { display: flex; margin-bottom: 8px; }
          .label { font-weight: bold; color: #2c3e50; width: 140px; }
          .value { flex: 1; color: #34495e; }
          .payment-details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .payment-amount { font-size: 32px; font-weight: bold; color: #27ae60; text-align: center; margin: 10px 0; }
          .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #eee; text-align: center; font-size: 10px; color: #95a5a6; }
          .signature { margin-top: 10px; font-weight: bold; color: #2c3e50; }
          .restricted-badge { display: inline-block; padding: 3px 8px; background-color: #ffeaa7; color: #d35400; font-size: 11px; border-radius: 4px; margin-left: 10px; }
          .card-info { background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .card-number { font-family: monospace; font-size: 18px; color: #1976d2; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="church-name">${churchName}</div>
          <div class="invoice-title">FACTURE OFFICIELLE - CARTE DE MEMBRE</div>
          <div class="invoice-subtitle">Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</div>
        </div>

        <div class="member-info">
          <div class="photo-section">
            <div class="photo-placeholder">
              ${member.photo_url ? 
                `<img src="${member.photo_url}" style="width:80px;height:80px;border-radius:50%;border:2px solid #3498db;" />` : 
                `${member.first_name?.charAt(0)}${member.last_name?.charAt(0)}`
              }
            </div>
            <span class="status">${getStatusText()}</span>
          </div>
          
          <div class="info-section">
            <div class="member-name">${member.first_name} ${member.last_name}</div>
            <div class="member-type">${member.member_type}</div>
            ${member.position ? `<div>${member.position} ${isRestrictedPosition() ? '<span class="restricted-badge">Rôle sensible</span>' : ''}</div>` : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-title">DÉTAILS DU PAIEMENT</div>
          <div class="payment-details">
            <div style="text-align: center;">
              <div style="font-size: 14px; color: #7f8c8d; margin-bottom: 5px;">Montant payé</div>
              <div class="payment-amount">$5.00 USD</div>
              <div style="font-size: 12px; color: #7f8c8d;">Prix fixe de la carte</div>
            </div>
            
            <div class="row">
              <div class="label">Date de paiement:</div>
              <div class="value">${member.payment_date ? new Date(member.payment_date).toLocaleDateString('fr-FR') : 'Non spécifiée'}</div>
            </div>
            
            ${member.payment_method ? `
            <div class="row">
              <div class="label">Méthode:</div>
              <div class="value">${member.payment_method}</div>
            </div>
            ` : ''}
            
            ${member.payment_reference ? `
            <div class="row">
              <div class="label">Référence:</div>
              <div class="value">${member.payment_reference}</div>
            </div>
            ` : ''}
          </div>
        </div>

        ${member.card_number ? `
        <div class="section">
          <div class="section-title">INFORMATIONS DE LA CARTE</div>
          <div class="card-info">
            <div style="text-align: center; margin-bottom: 10px;">
              <div style="font-size: 12px; color: #7f8c8d;">Numéro de carte</div>
              <div class="card-number">${member.card_number}</div>
            </div>
            
            <div class="row">
              <div class="label">Validité:</div>
              <div class="value">24 mois à partir de la date d'émission</div>
            </div>
            
            <div class="row">
              <div class="label">Type:</div>
              <div class="value">${member.member_type === 'Personnel' ? 'Carte Personnel PVC' : 'Carte Membre PVC'}</div>
            </div>
          </div>
        </div>
        ` : ''}

        <div class="section">
          <div class="section-title">COORDONNÉES DU MEMBRE</div>
          <div class="row">
            <div class="label">Email:</div>
            <div class="value">${member.email}</div>
          </div>
          ${member.phone ? `
          <div class="row">
            <div class="label">Téléphone:</div>
            <div class="value">${member.phone}</div>
          </div>
          ` : ''}
          ${member.address ? `
          <div class="row">
            <div class="label">Adresse:</div>
            <div class="value">${member.address}</div>
          </div>
          ` : ''}
          ${member.city ? `
          <div class="row">
            <div class="label">Ville:</div>
            <div class="value">${member.city}</div>
          </div>
          ` : ''}
          ${member.department ? `
          <div class="row">
            <div class="label">Département:</div>
            <div class="value">${member.department}</div>
          </div>
          ` : ''}
        </div>

        <div class="footer">
          <div>Document officiel - ${churchName} Management System</div>
          <div>Facture générée le: ${new Date().toLocaleDateString('fr-FR')}</div>
          <div class="signature">${churchName} - Créé par Henock Aduma</div>
          <div style="margin-top: 10px; font-size: 9px; color: #bdc3c7;">
            Cette facture est générée automatiquement par le système My Church<br>
            Pour toute question, contactez l'administration de l'église
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handleShare = async () => {
    try {
      const memberInfo = `
🎪 Église: ${churchName}
📅 Facture générée: ${new Date().toLocaleDateString('fr-FR')}

👤 INFORMATIONS DU MEMBRE
• Nom complet: ${member.first_name} ${member.last_name}
• Type: ${member.member_type}
• Statut: ${getStatusText()}
${member.position ? `• Poste: ${member.position}${isRestrictedPosition() ? ' (Rôle sensible)' : ''}\n` : ''}

💰 DÉTAILS DE PAIEMENT
• Montant: $5.00 USD
• Statut paiement: ${member.has_paid ? '✅ Payé' : '❌ Non payé'}
${member.payment_date ? `• Date paiement: ${new Date(member.payment_date).toLocaleDateString('fr-FR')}\n` : ''}
${member.payment_method ? `• Méthode: ${member.payment_method}\n` : ''}
${member.card_number ? `• Numéro carte: ${member.card_number}\n` : ''}

📞 COORDONNÉES
• Email: ${member.email}
${member.phone ? `• Téléphone: ${member.phone}\n` : ''}
${member.address ? `• Adresse: ${member.address}\n` : ''}
${member.city ? `• Ville: ${member.city}\n` : ''}
${member.department ? `• Département: ${member.department}\n` : ''}

🏛️ Système: My Church Management
✨ Créé par: Henock Aduma
      `.trim();

      await Share.share({
        message: memberInfo,
        title: `${member.member_type} - ${member.first_name} ${member.last_name} | ${churchName}`,
        ...(Platform.OS === 'android' && { dialogTitle: 'Partager les informations' })
      });

    } catch (error) {
      console.error('Erreur partage:', error);
      Alert.alert('Erreur', ERROR_MESSAGES.OPERATION_FAILED);
    }
  };

  const handleSaveEdit = async () => {
    if (!onEdit) {
      setShowEditModal(false);
      return;
    }

    try {
      setProcessingAction(true);
      await onEdit(editedMember);
      setShowEditModal(false);
      Alert.alert('Succès', SUCCESS_MESSAGES.MEMBER_UPDATED);
    } catch (error) {
      console.error('Erreur édition:', error);
      Alert.alert('Erreur', ERROR_MESSAGES.OPERATION_FAILED);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    Alert.alert(
      'Confirmer la suppression',
      `Voulez-vous vraiment supprimer ${member.first_name} ${member.last_name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingAction(true);
              await onDelete();
              Alert.alert('Succès', SUCCESS_MESSAGES.MEMBER_DELETED);
            } catch (error) {
              console.error('Erreur suppression:', error);
              Alert.alert('Erreur', ERROR_MESSAGES.OPERATION_FAILED);
            } finally {
              setProcessingAction(false);
            }
          }
        }
      ]
    );
  };

  const handleGenerateCard = async () => {
    if (!onGenerateCard) return;
    
    if (!member.has_paid) {
      Alert.alert(
        'Paiement requis',
        'Le paiement de 5 $ est requis pour générer la carte.\n\n' +
        'Cette règle s\'applique aux membres et au personnel.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Effectuer le paiement',
            onPress: () => {
              setShowPaymentModal(true);
              if (onMakePayment) onMakePayment();
            }
          }
        ]
      );
      return;
    }

    try {
      setProcessingAction(true);
      await onGenerateCard();
      Alert.alert('Succès', SUCCESS_MESSAGES.CARD_GENERATED);
    } catch (error) {
      console.error('Erreur génération carte:', error);
      Alert.alert('Erreur', ERROR_MESSAGES.OPERATION_FAILED);
    } finally {
      setProcessingAction(false);
    }
  };

  // Rendu conditionnel selon le mode compact
  if (compact) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.compactContainer, { transform: [{ scale: cardScale }] }]}
      >
        <View style={styles.compactContent}>
          <View style={styles.compactLeft}>
            {renderMemberPhoto()}
            <View style={[styles.compactStatusDot, { backgroundColor: getStatusColor() }]} />
          </View>
          
          <View style={styles.compactCenter}>
            <Text style={styles.compactName} numberOfLines={1}>
              {member.first_name} {member.last_name}
            </Text>
            <View style={styles.compactMeta}>
              <Text style={styles.compactType}>
                {getMemberTypeIcon()} {member.member_type}
              </Text>
              {member.position && (
                <Text style={styles.compactPosition} numberOfLines={1}>
                  • {member.position}
                </Text>
              )}
            </View>
          </View>
          
          <View style={styles.compactRight}>
            <View style={[styles.compactPaymentBadge, { 
              backgroundColor: member.has_paid ? '#27ae60' : '#e74c3c' 
            }]}>
              <Text style={styles.compactPaymentText}>
                {member.has_paid ? '$5 ✓' : '$5 ✗'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          transform: [
            { scale: cardScale },
            { scale: pulseAnim }
          ]
        }
      ]}
      ref={cardRef}
    >
      {/* En-tête avec actions */}
      <View style={styles.header}>
        <View style={styles.churchInfo}>
          {churchLogo ? (
            <Image source={{ uri: churchLogo }} style={styles.churchLogo} />
          ) : (
            <Church size={20} color="#3498db" />
          )}
          <Text style={styles.churchName} numberOfLines={1}>
            {churchName}
          </Text>
        </View>
        
        <View style={styles.headerActions}>
          {showActions && (
            <>
              <TouchableOpacity 
                style={[styles.headerAction, styles.shareAction]} 
                onPress={handleShare}
              >
                <Share2 size={18} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.headerAction, styles.exportAction]} 
                onPress={() => setShowExportModal(true)}
              >
                <Download size={18} color="white" />
              </TouchableOpacity>

              {onEdit && (
                <TouchableOpacity 
                  style={[styles.headerAction, styles.editAction]} 
                  onPress={() => setShowEditModal(true)}
                >
                  <Edit size={18} color="white" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>

      {/* Carte principale */}
      <View style={[
        styles.card, 
        theme === 'professional' && styles.cardProfessional,
        theme === 'modern' && styles.cardModern
      ]}>
        {/* Section statut paiement */}
        <View style={styles.paymentStatusBadge}>
          <View style={[styles.paymentDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.paymentText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
          {!member.has_paid && onMakePayment && (
            <TouchableOpacity 
              style={styles.payNowButton}
              onPress={() => {
                setShowPaymentModal(true);
                if (onMakePayment) onMakePayment();
              }}
            >
              <Text style={styles.payNowText}>Payer 5$</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Informations principales */}
        <View style={styles.memberHeader}>
          <View style={styles.photoContainer}>
            {renderMemberPhoto()}
          </View>
          
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>
              {member.first_name} {member.last_name}
            </Text>
            
            <View style={styles.typeContainer}>
              <View style={styles.typeBadge}>
                {getMemberTypeIcon()}
                <Text style={styles.memberType}>{member.member_type}</Text>
              </View>
              
              {member.position && (
                <View style={[
                  styles.positionBadge,
                  isRestrictedPosition() && styles.restrictedPositionBadge
                ]}>
                  <Briefcase size={12} color={isRestrictedPosition() ? '#e74c3c' : '#3498db'} />
                  <Text style={[
                    styles.positionText,
                    { color: isRestrictedPosition() ? '#e74c3c' : '#3498db' }
                  ]}>
                    {member.position}
                  </Text>
                  {isRestrictedPosition() && <Shield size={10} color="#e74c3c" />}
                </View>
              )}
            </View>
            
            <View style={styles.contactInfo}>
              {member.phone && (
                <View style={styles.contactItem}>
                  <Phone size={14} color="#7f8c8d" />
                  <Text style={styles.contactText}>{member.phone}</Text>
                </View>
              )}
              
              <View style={styles.contactItem}>
                <Mail size={14} color="#7f8c8d" />
                <Text style={styles.contactText}>{member.email}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Informations de carte */}
        {hasCard() ? (
          <View style={styles.cardInfoSection}>
            <View style={styles.cardInfoHeader}>
              <CreditCard size={18} color="#3498db" />
              <Text style={styles.cardInfoTitle}>Informations de la carte</Text>
            </View>
            
            <View style={styles.cardNumberContainer}>
              <Text style={styles.cardNumberLabel}>Numéro de carte:</Text>
              <Text style={styles.cardNumber}>{member.card_number}</Text>
              <TouchableOpacity onPress={() => {
                Alert.alert('Copié', 'Numéro de carte copié dans le presse-papier');
                // Ici, vous devrez implémenter la copie avec Clipboard
              }}>
                <Copy size={16} color="#3498db" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.cardActions}>
              <TouchableOpacity 
                style={[styles.cardAction, styles.viewCardAction]}
                onPress={() => setShowDetailsModal(true)}
              >
                <Eye size={16} color="white" />
                <Text style={styles.cardActionText}>Voir la carte</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.cardAction, styles.viewInvoiceAction]}
                onPress={() => {
                  setShowDetailsModal(true);
                  if (onViewInvoice) onViewInvoice();
                }}
              >
                <Receipt size={16} color="white" />
                <Text style={styles.cardActionText}>Facture</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.noCardSection}>
            <View style={styles.noCardIcon}>
              <CreditCard size={24} color="#95a5a6" />
            </View>
            <Text style={styles.noCardText}>
              {member.has_paid ? 'Carte en cours de génération...' : 'Carte non générée'}
            </Text>
            {onGenerateCard && (
              <TouchableOpacity 
                style={styles.generateCardButton}
                onPress={handleGenerateCard}
                disabled={processingAction}
              >
                {processingAction ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.generateCardText}>
                    {member.has_paid ? 'Générer la carte' : 'Payer et générer'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Détails supplémentaires */}
        <View style={styles.detailsSection}>
          {(member.address || member.city || member.department) && (
            <View style={styles.detailsRow}>
              {member.address && (
                <View style={styles.detailItem}>
                  <MapPin size={14} color="#7f8c8d" />
                  <Text style={styles.detailText}>{member.address}</Text>
                </View>
              )}
              
              {member.city && (
                <View style={styles.detailItem}>
                  <Building size={14} color="#7f8c8d" />
                  <Text style={styles.detailText}>{member.city}</Text>
                </View>
              )}
              
              {member.department && (
                <View style={styles.detailItem}>
                  <Users size={14} color="#7f8c8d" />
                  <Text style={styles.detailText}>{member.department}</Text>
                </View>
              )}
            </View>
          )}

          {member.departments && (
            <View style={styles.departmentsRow}>
              <Text style={styles.departmentsTitle}>Départements:</Text>
              <Text style={styles.departmentsList}>
                {formatDepartments(member.departments)}
              </Text>
            </View>
          )}

          <View style={styles.datesRow}>
            <View style={styles.dateItem}>
              <Calendar size={12} color="#7f8c8d" />
              <Text style={styles.dateText}>
                Inscrit: {new Date(member.created_at || Date.now()).toLocaleDateString('fr-FR')}
              </Text>
            </View>
            
            {member.registration_date && (
              <View style={styles.dateItem}>
                <Clock size={12} color="#7f8c8d" />
                <Text style={styles.dateText}>
                  Enregistré: {new Date(member.registration_date).toLocaleDateString('fr-FR')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Actions */}
        {showActions && (
          <View style={styles.actionsSection}>
            {onAddToFolder && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.folderButton]}
                onPress={onAddToFolder}
              >
                <FolderPlus size={18} color="white" />
                <Text style={styles.actionButtonText}>Ajouter au dossier</Text>
              </TouchableOpacity>
            )}
            
            {member.qr_code && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.qrButton]}
                onPress={() => setShowQRModal(true)}
              >
                <QrCode size={18} color="white" />
                <Text style={styles.actionButtonText}>QR Code</Text>
              </TouchableOpacity>
            )}
            
            {onDelete && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteButton]}
                onPress={handleDelete}
                disabled={processingAction}
              >
                {processingAction ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.actionButtonText}>Supprimer</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Signature */}
        <View style={styles.signature}>
          <Star size={10} color="#f39c12" />
          <Text style={styles.signatureText}>✨ {churchName} Management System</Text>
          <Star size={10} color="#f39c12" />
        </View>
      </View>

      {/* Modals */}
      {renderEditModal()}
      {renderExportModal()}
      {renderQRModal()}
      {renderDetailsModal()}
      {renderPaymentModal()}
    </Animated.View>
  );

  // Fonctions de rendu des modals
  function renderEditModal() {
    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={showEditModal}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Modifier le membre</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <X size={24} color="#2c3e50" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {/* Contenu du modal d'édition */}
            <Text style={styles.modalNote}>
              ⚠️ Modifiez avec précaution. Certains changements peuvent affecter la carte existante.
            </Text>
            
            {/* Formulaire d'édition */}
            <View style={styles.editSection}>
              <Text style={styles.sectionTitle}>Informations de base</Text>
              
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Prénom *</Text>
                  <TextInput
                    style={styles.input}
                    value={editedMember.first_name}
                    onChangeText={(text) => setEditedMember({...editedMember, first_name: text})}
                    placeholder="Prénom"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nom *</Text>
                  <TextInput
                    style={styles.input}
                    value={editedMember.last_name}
                    onChangeText={(text) => setEditedMember({...editedMember, last_name: text})}
                    placeholder="Nom"
                  />
                </View>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Type de membre *</Text>
                <View style={styles.typeOptions}>
                  {(['Membre', 'Personnel'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeOption,
                        editedMember.member_type === type && styles.typeOptionActive
                      ]}
                      onPress={() => setEditedMember({...editedMember, member_type: type})}
                    >
                      <Text style={[
                        styles.typeOptionText,
                        editedMember.member_type === type && styles.typeOptionTextActive
                      ]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Poste</Text>
                <TextInput
                  style={styles.input}
                  value={editedMember.position || ''}
                  onChangeText={(text) => setEditedMember({...editedMember, position: text})}
                  placeholder="Poste (optionnel)"
                />
              </View>
            </View>
            
            {/* Plus de sections... */}
          </ScrollView>
          
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]} 
              onPress={() => setShowEditModal(false)}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.saveButton]} 
              onPress={handleSaveEdit}
              disabled={processingAction}
            >
              {processingAction ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Save size={20} color="white" />
                  <Text style={styles.saveButtonText}>Enregistrer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  function renderExportModal() {
    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={showExportModal}
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.exportModalContainer}>
          <View style={styles.exportModalHeader}>
            <Text style={styles.exportModalTitle}>Options d'export</Text>
            <TouchableOpacity onPress={() => setShowExportModal(false)}>
              <X size={24} color="#2c3e50" />
            </TouchableOpacity>
          </View>

          <View style={styles.exportOptions}>
            <Text style={styles.exportOptionsTitle}>Exporter les informations</Text>
            <Text style={styles.exportOptionsSubtitle}>Choisissez le format d'export</Text>
            
            <TouchableOpacity 
              style={[styles.exportOption, styles.pdfOption]} 
              onPress={handleDownloadPDF}
              disabled={generatingPDF}
            >
              {generatingPDF ? (
                <View style={styles.exportOptionLoading}>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.exportOptionText}>Génération PDF...</Text>
                </View>
              ) : (
                <View style={styles.exportOptionContent}>
                  <FileText size={24} color="white" />
                  <View style={styles.exportOptionInfo}>
                    <Text style={styles.exportOptionTitle}>Exporter en PDF</Text>
                    <Text style={styles.exportOptionDesc}>Facture format A4</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.exportOption, styles.imageOption]} 
              onPress={handleExportImage}
              disabled={generatingImage}
            >
              {generatingImage ? (
                <View style={styles.exportOptionLoading}>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.exportOptionText}>Génération image...</Text>
                </View>
              ) : (
                <View style={styles.exportOptionContent}>
                  <ImageIcon size={24} color="white" />
                  <View style={styles.exportOptionInfo}>
                    <Text style={styles.exportOptionTitle}>Exporter en Image</Text>
                    <Text style={styles.exportOptionDesc}>Capture au format PNG</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.exportOption, styles.shareOption]} 
              onPress={handleShare}
            >
              <View style={styles.exportOptionContent}>
                <Share2 size={24} color="white" />
                <View style={styles.exportOptionInfo}>
                  <Text style={styles.exportOptionTitle}>Partager</Text>
                  <Text style={styles.exportOptionDesc}>Partager en texte</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.exportModalActions}>
            <TouchableOpacity 
              style={[styles.exportActionButton, styles.closeExportButton]} 
              onPress={() => setShowExportModal(false)}
            >
              <Text style={styles.exportActionButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  function renderQRModal() {
    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={showQRModal}
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModal}>
            <View style={styles.qrModalHeader}>
              <Text style={styles.qrModalTitle}>Code QR</Text>
              <TouchableOpacity onPress={() => setShowQRModal(false)}>
                <X size={24} color="#2c3e50" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.qrContent}>
              {member.qr_code ? (
                <>
                  <QRCode
                    value={member.qr_code}
                    size={200}
                    color="#2c3e50"
                    backgroundColor="white"
                  />
                  <Text style={styles.qrCodeText}>{member.qr_code}</Text>
                </>
              ) : (
                <View style={styles.noQrContent}>
                  <QrCode size={64} color="#95a5a6" />
                  <Text style={styles.noQrText}>Aucun QR Code disponible</Text>
                </View>
              )}
            </View>
            
            <View style={styles.qrActions}>
              <TouchableOpacity 
                style={[styles.qrActionButton, styles.closeQrButton]} 
                onPress={() => setShowQRModal(false)}
              >
                <Text style={styles.qrActionButtonText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  function renderDetailsModal() {
    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={showDetailsModal}
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.detailsModalContainer}>
          <View style={styles.detailsModalHeader}>
            <Text style={styles.detailsModalTitle}>Détails complets</Text>
            <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
              <X size={24} color="#2c3e50" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.detailsModalContent}>
            {/* Contenu détaillé */}
          </ScrollView>
        </View>
      </Modal>
    );
  }

  function renderPaymentModal() {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPaymentModal}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.paymentModalOverlay}>
          <View style={styles.paymentModal}>
            <View style={styles.paymentModalHeader}>
              <Text style={styles.paymentModalTitle}>Paiement de la carte</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <X size={24} color="#2c3e50" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.paymentModalContent}>
              <Text style={styles.paymentNote}>
                ⚠️ RÈGLE MÉTIER : Aucune carte ne peut être générée sans paiement de 5 $
              </Text>
              
              {/* Contenu du modal de paiement */}
            </View>
          </View>
        </View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  // Styles de base
  container: {
    marginBottom: 20,
    marginHorizontal: 16,
  },
  
  // En-tête
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  churchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  churchLogo: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  churchName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  shareAction: { backgroundColor: '#3498db' },
  exportAction: { backgroundColor: '#9b59b6' },
  editAction: { backgroundColor: '#f39c12' },
  
  // Carte principale
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    ...UI_CONSTANTS.SHADOW_MEDIUM,
  },
  cardProfessional: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cardModern: {
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  
  // Statut paiement
  paymentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  paymentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  paymentText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  payNowButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  payNowText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // En-tête membre
  memberHeader: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  photoContainer: {
    marginRight: 16,
    position: 'relative',
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f5f5f5',
    borderWidth: 3,
    borderColor: '#ecf0f1',
  },
  photoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#dfe6e9',
  },
  initials: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7f8c8d',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  memberType: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  positionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  restrictedPositionBadge: {
    backgroundColor: '#ffebee',
  },
  positionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  contactInfo: {
    gap: 6,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  
  // Informations carte
  cardInfoSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cardInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  cardNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dfe6e9',
  },
  cardNumberLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginRight: 8,
  },
  cardNumber: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#2c3e50',
    fontWeight: '600',
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cardAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  viewCardAction: {
    backgroundColor: '#3498db',
  },
  viewInvoiceAction: {
    backgroundColor: '#27ae60',
  },
  cardActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Pas de carte
  noCardSection: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  noCardIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  noCardText: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    marginBottom: 12,
  },
  generateCardButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  generateCardText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Détails
  detailsSection: {
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  departmentsRow: {
    marginBottom: 12,
  },
  departmentsTitle: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '600',
    marginBottom: 4,
  },
  departmentsList: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
  },
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  
  // Actions
  actionsSection: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  folderButton: {
    backgroundColor: '#2980b9',
  },
  qrButton: {
    backgroundColor: '#9b59b6',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Signature
  signature: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  signatureText: {
    fontSize: 11,
    color: '#f39c12',
    fontStyle: 'italic',
    fontWeight: '600',
  },
  
  // Mode compact
  compactContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    ...UI_CONSTANTS.SHADOW_SMALL,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactLeft: {
    position: 'relative',
    marginRight: 12,
  },
  compactStatusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  compactCenter: {
    flex: 1,
  },
  compactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  compactType: {
    fontSize: 12,
    color: '#7f8c8d',
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactPosition: {
    fontSize: 12,
    color: '#3498db',
    maxWidth: 100,
  },
  compactRight: {
    marginLeft: 8,
  },
  compactPaymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  compactPaymentText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // Modals (simplifiés pour la concision)
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalNote: {
    backgroundColor: '#fff3cd',
    color: '#856404',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 14,
  },
  editSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
    backgroundColor: '#f8f9fa',
  },
  typeOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dfe6e9',
    alignItems: 'center',
  },
  typeOptionActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  typeOptionText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  typeOptionTextActive: {
    color: 'white',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dfe6e9',
  },
  saveButton: {
    backgroundColor: '#27ae60',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  saveButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  
  // Modal export
  exportModalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  exportModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  exportModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  exportOptions: {
    flex: 1,
    padding: 20,
  },
  exportOptionsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  exportOptionsSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 30,
    textAlign: 'center',
  },
  exportOption: {
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    ...UI_CONSTANTS.SHADOW_SMALL,
  },
  pdfOption: {
    backgroundColor: '#e74c3c',
  },
  imageOption: {
    backgroundColor: '#3498db',
  },
  shareOption: {
    backgroundColor: '#27ae60',
  },
  exportOptionLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  exportOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  exportOptionInfo: {
    flex: 1,
  },
  exportOptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  exportOptionDesc: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  exportOptionText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  exportModalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  exportActionButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeExportButton: {
    backgroundColor: '#95a5a6',
  },
  exportActionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Modal QR
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  qrModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  qrContent: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrCodeText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#2c3e50',
    marginTop: 16,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    textAlign: 'center',
    width: '100%',
  },
  noQrContent: {
    alignItems: 'center',
    padding: 40,
  },
  noQrText: {
    fontSize: 16,
    color: '#95a5a6',
    textAlign: 'center',
    marginTop: 16,
  },
  qrActions: {
    width: '100%',
  },
  qrActionButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeQrButton: {
    backgroundColor: '#3498db',
  },
  qrActionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Modal paiement
  paymentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  paymentModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  paymentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  paymentModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  paymentModalContent: {
    padding: 20,
  },
  paymentNote: {
    backgroundColor: '#ffeaa7',
    color: '#856404',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
});