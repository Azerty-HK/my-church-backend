import React, { useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Alert,
  Platform,
  ScrollView,
  TextInput,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { 
  Printer,
  Download,
  Share2,
  Edit,
  Trash2,
  Save,
  User,
  Camera,
  QrCode,
  X,
  Mail,
  Phone,
  MapPin,
  Award,
  Calendar,
  CreditCard,
  FileText,
  CheckCircle,
  Building
} from 'lucide-react-native';
import type { Member, Church } from '../types/database';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import QRCode from 'react-native-qrcode-svg';

const { width: screenWidth } = Dimensions.get('window');

// Dimensions exactes pour impression PVC
const CARD_WIDTH = 85.6; // mm (standard carte bancaire)
const CARD_HEIGHT = 53.98; // mm

interface MemberCardProps {
  member: Member;
  church: Church;
  onEdit?: () => void;
  onDelete?: () => void;
  onUpdate?: (updatedMember: Member) => void;
  onAddToDossier?: (pdfUri: string, dossierId?: string) => void;
}

export function MemberCard({ 
  member, 
  church,
  onEdit, 
  onDelete,
  onUpdate,
  onAddToDossier
}: MemberCardProps) {
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [savingToDossier, setSavingToDossier] = useState(false);
  const qrCodeRef = useRef<any>(null);

  // États pour l'édition
  const [editedMember, setEditedMember] = useState({
    first_name: member.first_name,
    last_name: member.last_name,
    email: member.email,
    phone: member.phone || '',
    address: member.address || '',
    city: member.city || '',
    department: member.department || '',
    position: member.position || '',
    photo_url: member.photo_url || null,
  });

  const getQRCodeData = () => {
    return JSON.stringify({
      id: member.id,
      name: `${member.first_name} ${member.last_name}`,
      type: member.member_type,
      church: church.name,
      church_id: church.id,
      email: member.email,
      phone: member.phone,
      department: member.department,
      dossier: member.dossier_number,
      generated: new Date().toISOString(),
      valid_until: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
    });
  };

  const generatePrintableHTML = async (): Promise<string> => {
    try {
      let qrCodeBase64 = '';
      if (qrCodeRef.current) {
        qrCodeBase64 = await new Promise((resolve) => {
          qrCodeRef.current?.toDataURL((data: string) => {
            resolve(data);
          });
        });
      }

      // Calculer l'âge si date de naissance existe
      const calculateAge = (birthDate: string) => {
        if (!birthDate) return '';
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
        return age + ' ans';
      };

      // Déterminer la couleur selon le type de membre
      const getCardColor = () => {
        switch (member.member_type) {
          case 'Personnel': return 'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)';
          case 'Membre': return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
          case 'Ancien': return 'linear-gradient(135deg, #f46b45 0%, #eea849 100%)';
          default: return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }
      };

      const memberPhoto = member.photo_url 
        ? `<img src="${member.photo_url}" style="width: 30mm; height: 30mm; object-fit: cover; border-radius: 4mm; border: 2px solid white; position: absolute; right: 5mm; top: 12mm; box-shadow: 0 4px 12px rgba(0,0,0,0.3);" />`
        : `<div style="width: 30mm; height: 30mm; border: 2px solid white; border-radius: 4mm; position: absolute; right: 5mm; top: 12mm; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(0,0,0,0.1) 100%); box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
            <div style="font-size: 24pt; color: white; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
              ${member.first_name.charAt(0)}${member.last_name.charAt(0)}
            </div>
          </div>`;

      const qrCodeImage = qrCodeBase64 
        ? `<img src="${qrCodeBase64}" style="width: 20mm; height: 20mm; position: absolute; right: 5mm; bottom: 5mm; background: white; padding: 2mm; border-radius: 3mm; box-shadow: 0 3px 8px rgba(0,0,0,0.2); border: 1px solid #e0e0e0;" />`
        : `<div style="width: 20mm; height: 20mm; border: 2px dashed rgba(255,255,255,0.5); position: absolute; right: 5mm; bottom: 5mm; display: flex; align-items: center; justify-content: center; border-radius: 3mm; background: rgba(255,255,255,0.1);">
            <div style="font-size: 10pt; color: rgba(255,255,255,0.7); font-weight: bold;">QR</div>
          </div>`;

      const memberTypeBadge = member.member_type === 'Personnel' 
        ? `<div style="position: absolute; top: 5mm; left: 5mm; background: rgba(255,255,255,0.95); padding: 1.5mm 4mm; border-radius: 4mm; font-size: 9pt; font-weight: 800; color: #4b6cb7; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 2px 6px rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.5);">
            ${member.member_type}
          </div>`
        : '';

      // Construction de l'adresse complète avec département
      const fullAddress = member.address 
        ? `${member.address}${member.city ? ', ' + member.city : ''}${member.department ? ', ' + member.department : ''}`
        : '';

      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Carte de Membre - ${member.first_name} ${member.last_name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              font-family: 'Montserrat', sans-serif;
            }
            
            body {
              padding: 5mm;
              background: #f5f5f5;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            
            .card-container {
              width: ${CARD_WIDTH}mm;
              height: ${CARD_HEIGHT}mm;
              position: relative;
              overflow: hidden;
              border-radius: 4.5mm;
              background: ${getCardColor()};
              box-shadow: 0 12px 35px rgba(0,0,0,0.35);
              color: white;
            }
            
            .card-overlay {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.15) 100%);
            }
            
            .church-name {
              position: absolute;
              top: 5mm;
              left: 5mm;
              right: 40mm;
              font-size: 11pt;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.8px;
              color: rgba(255,255,255,0.98);
              text-shadow: 0 2px 4px rgba(0,0,0,0.3);
            }
            
            .card-title {
              position: absolute;
              top: 10mm;
              left: 5mm;
              font-size: 15pt;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 1.2px;
              color: white;
              text-shadow: 0 2px 4px rgba(0,0,0,0.3);
            }
            
            .member-info {
              position: absolute;
              top: 20mm;
              left: 5mm;
              right: 40mm;
            }
            
            .member-name {
              font-size: 13pt;
              font-weight: 900;
              margin-bottom: 2.5mm;
              color: white;
              text-shadow: 0 1px 3px rgba(0,0,0,0.4);
              line-height: 1.2;
            }
            
            .member-detail {
              font-size: 8.5pt;
              margin-bottom: 1.2mm;
              display: flex;
              align-items: center;
              color: rgba(255,255,255,0.95);
              text-shadow: 0 1px 2px rgba(0,0,0,0.2);
            }
            
            .detail-icon {
              margin-right: 3mm;
              font-size: 8pt;
              min-width: 15px;
            }
            
            .member-id {
              position: absolute;
              bottom: 5mm;
              left: 5mm;
              font-size: 7.5pt;
              color: rgba(255,255,255,0.75);
              font-weight: 700;
              text-shadow: 0 1px 2px rgba(0,0,0,0.2);
            }
            
            .validity {
              position: absolute;
              bottom: 5mm;
              left: 25mm;
              font-size: 7.5pt;
              color: rgba(255,255,255,0.75);
              font-weight: 700;
              text-shadow: 0 1px 2px rgba(0,0,0,0.2);
            }
            
            .signature {
              position: absolute;
              bottom: 2mm;
              right: 5mm;
              font-size: 6.5pt;
              color: rgba(255,255,255,0.6);
              text-align: right;
              font-style: italic;
              text-shadow: 0 1px 1px rgba(0,0,0,0.2);
            }
            
            .dossier-badge {
              position: absolute;
              bottom: 2mm;
              left: 50%;
              transform: translateX(-50%);
              background: rgba(255,255,255,0.2);
              padding: 1mm 3mm;
              border-radius: 3mm;
              font-size: 7pt;
              font-weight: 700;
              color: white;
              border: 1px solid rgba(255,255,255,0.3);
            }
            
            ${memberTypeBadge}
            
            @media print {
              body {
                padding: 0;
                background: none;
              }
              
              .card-container {
                width: ${CARD_WIDTH}mm;
                height: ${CARD_HEIGHT}mm;
                border-radius: 4.5mm;
                page-break-inside: avoid;
                margin: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="card-container">
            <div class="card-overlay"></div>
            
            <!-- Badge type de membre -->
            ${memberTypeBadge}
            
            <!-- Nom de l'église -->
            <div class="church-name">${church.name}</div>
            
            <!-- Titre de la carte -->
            <div class="card-title">CARTE DE MEMBRE</div>
            
            <!-- Informations du membre -->
            <div class="member-info">
              <div class="member-name">
                ${member.first_name.toUpperCase()}<br/>${member.last_name.toUpperCase()}
              </div>
              
              ${member.email ? `
                <div class="member-detail">
                  <span class="detail-icon">✉️</span> ${member.email}
                </div>
              ` : ''}
              
              ${member.phone ? `
                <div class="member-detail">
                  <span class="detail-icon">📱</span> ${member.phone}
                </div>
              ` : ''}
              
              ${fullAddress ? `
                <div class="member-detail">
                  <span class="detail-icon">📍</span> ${fullAddress}
                </div>
              ` : ''}
              
              ${member.position ? `
                <div class="member-detail">
                  <span class="detail-icon">💼</span> ${member.position}
                </div>
              ` : ''}
              
              ${member.department ? `
                <div class="member-detail">
                  <span class="detail-icon">🏛️</span> ${member.department}
                </div>
              ` : ''}
            </div>
            
            <!-- Photo du membre -->
            ${memberPhoto}
            
            <!-- QR Code -->
            ${qrCodeImage}
            
            <!-- Informations techniques -->
            <div class="member-id">ID: ${member.id.substring(0, 8).toUpperCase()}</div>
            <div class="validity">
              VALIDE JUSQU'AU: ${new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).toUpperCase()}
            </div>
            
            <!-- Numéro de dossier si existe -->
            ${member.dossier_number ? `
              <div class="dossier-badge">
                📁 ${member.dossier_number}
              </div>
            ` : ''}
            
            <div class="signature">MY CHURCH • ${new Date().getFullYear()}</div>
          </div>
        </body>
        </html>
      `;
    } catch (error) {
      console.error('Erreur génération HTML:', error);
      return '';
    }
  };

  const handleExportPDF = async () => {
    setGeneratingPDF(true);
    try {
      const html = await generatePrintableHTML();
      
      if (!html) {
        throw new Error('Impossible de générer le document');
      }

      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
        width: CARD_WIDTH * 3.78, // Conversion mm en pixels
        height: CARD_HEIGHT * 3.78,
        margins: {
          left: 0,
          top: 0,
          right: 0,
          bottom: 0
        }
      });

      const timestamp = Date.now();
      const fileName = `Carte_Membre_${member.first_name}_${member.last_name}_${timestamp}.pdf`;
      const newUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.moveAsync({
        from: uri,
        to: newUri,
      });

      // Créer un dossier spécifique pour les cartes de membres
      const cardsDirectory = `${FileSystem.documentDirectory}MyChurch/Cartes_Membres/`;
      const dirInfo = await FileSystem.getInfoAsync(cardsDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(cardsDirectory, { intermediates: true });
      }

      // Déplacer le fichier PDF dans le dossier spécifique
      const finalUri = `${cardsDirectory}${fileName}`;
      await FileSystem.moveAsync({
        from: newUri,
        to: finalUri,
      });

      // Si la fonction onAddToDossier existe, proposer d'ajouter au dossier
      if (onAddToDossier) {
        Alert.alert(
          '✅ Carte générée',
          'Que souhaitez-vous faire avec cette carte ?',
          [
            {
              text: 'Ajouter au dossier',
              onPress: () => {
                setSavingToDossier(true);
                onAddToDossier(finalUri, member.dossier_number || `DOS-${member.id}`);
                setTimeout(() => setSavingToDossier(false), 1000);
              }
            },
            {
              text: 'Partager',
              onPress: () => handleSharePDF(finalUri)
            },
            {
              text: 'Sauvegarder seulement',
              style: 'cancel'
            }
          ]
        );
      } else {
        // Proposer de partager
        await handleSharePDF(finalUri);
      }
    } catch (error: any) {
      console.error('Erreur génération PDF:', error);
      Alert.alert(
        '❌ Erreur',
        error.message || 'Impossible de générer la carte.',
        [{ text: 'OK' }]
      );
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleSharePDF = async (fileUri: string) => {
    setSharing(true);
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: `🎴 Carte de Membre - ${member.first_name} ${member.last_name}`,
          UTI: 'com.adobe.pdf',
        });
        
        Alert.alert(
          '✅ Succès',
          'La carte a été générée et sauvegardée.',
          [
            { text: 'Voir le fichier', onPress: () => {} },
            { text: 'OK' }
          ]
        );
      } else {
        Alert.alert(
          '✅ PDF généré',
          `La carte a été sauvegardée dans: ${fileUri}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      Alert.alert('❌ Erreur', 'Impossible de partager la carte.');
    } finally {
      setSharing(false);
    }
  };

  const handleShareCard = async () => {
    setSharing(true);
    try {
      const html = await generatePrintableHTML();
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Partager la carte de ${member.first_name} ${member.last_name}`,
          UTI: 'com.adobe.pdf',
        });
      }
    } catch (error) {
      Alert.alert('❌ Erreur', 'Impossible de partager la carte.');
    } finally {
      setSharing(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      const updatedMember = {
        ...member,
        ...editedMember
      };

      if (onUpdate) {
        await onUpdate(updatedMember);
      }

      setEditing(false);
      Alert.alert('✅ Succès', 'Les modifications ont été sauvegardées.');
    } catch (error) {
      Alert.alert('❌ Erreur', 'Impossible de sauvegarder les modifications.');
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer ${member.first_name} ${member.last_name} ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: onDelete
        },
      ]
    );
  };

  const handleCreateDossier = () => {
    Alert.alert(
      'Créer un dossier',
      'Voulez-vous créer un dossier pour ce membre ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Créer avec la carte',
          onPress: async () => {
            try {
              // D'abord générer la carte
              await handleExportPDF();
              
              // Ensuite créer le dossier
              Alert.alert(
                '✅ Dossier créé',
                'Le dossier a été créé avec succès et la carte y a été ajoutée.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              Alert.alert('❌ Erreur', 'Impossible de créer le dossier.');
            }
          }
        },
        {
          text: 'Créer vide',
          onPress: () => {
            Alert.alert('Dossier vide créé', 'Le dossier a été créé sans documents.');
          }
        }
      ]
    );
  };

  if (editing) {
    return (
      <View style={styles.editingCard}>
        <View style={styles.editHeader}>
          <Text style={styles.editTitle}>✏️ Modifier le membre</Text>
          <TouchableOpacity onPress={() => setEditing(false)} style={styles.cancelButton}>
            <X size={20} color="#e74c3c" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.editForm} showsVerticalScrollIndicator={false}>
          <View style={styles.photoEditContainer}>
            {member.photo_url ? (
              <Image source={{ uri: member.photo_url }} style={styles.editPhoto} />
            ) : (
              <View style={styles.editPhotoPlaceholder}>
                <User size={40} color="#bdc3c7" />
              </View>
            )}
            <TouchableOpacity style={styles.changePhotoButton}>
              <Camera size={16} color="white" />
              <Text style={styles.changePhotoText}>Changer photo</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.editRow}>
            <View style={[styles.editField, { flex: 1 }]}>
              <Text style={styles.editLabel}>Prénom</Text>
              <TextInput
                style={styles.editInput}
                value={editedMember.first_name}
                onChangeText={(text) => setEditedMember(prev => ({ ...prev, first_name: text }))}
                placeholder="Prénom"
              />
            </View>

            <View style={[styles.editField, { flex: 1, marginLeft: 10 }]}>
              <Text style={styles.editLabel}>Nom</Text>
              <TextInput
                style={styles.editInput}
                value={editedMember.last_name}
                onChangeText={(text) => setEditedMember(prev => ({ ...prev, last_name: text }))}
                placeholder="Nom"
              />
            </View>
          </View>

          <View style={styles.editField}>
            <Text style={styles.editLabel}>Email</Text>
            <TextInput
              style={styles.editInput}
              value={editedMember.email}
              onChangeText={(text) => setEditedMember(prev => ({ ...prev, email: text }))}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.editField}>
            <Text style={styles.editLabel}>Téléphone</Text>
            <TextInput
              style={styles.editInput}
              value={editedMember.phone}
              onChangeText={(text) => setEditedMember(prev => ({ ...prev, phone: text }))}
              placeholder="Téléphone"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.editField}>
            <Text style={styles.editLabel}>Adresse</Text>
            <TextInput
              style={styles.editInput}
              value={editedMember.address}
              onChangeText={(text) => setEditedMember(prev => ({ ...prev, address: text }))}
              placeholder="Adresse"
            />
          </View>

          <View style={styles.editRow}>
            <View style={[styles.editField, { flex: 1 }]}>
              <Text style={styles.editLabel}>Ville</Text>
              <TextInput
                style={styles.editInput}
                value={editedMember.city}
                onChangeText={(text) => setEditedMember(prev => ({ ...prev, city: text }))}
                placeholder="Ville"
              />
            </View>

            <View style={[styles.editField, { flex: 1, marginLeft: 10 }]}>
              <Text style={styles.editLabel}>Département</Text>
              <TextInput
                style={styles.editInput}
                value={editedMember.department}
                onChangeText={(text) => setEditedMember(prev => ({ ...prev, department: text }))}
                placeholder="Département"
              />
            </View>
          </View>

          {member.member_type === 'Personnel' && (
            <View style={styles.editField}>
              <Text style={styles.editLabel}>Poste</Text>
              <TextInput
                style={styles.editInput}
                value={editedMember.position}
                onChangeText={(text) => setEditedMember(prev => ({ ...prev, position: text }))}
                placeholder="Poste"
              />
            </View>
          )}

          <View style={styles.editActions}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit}>
              <Save size={18} color="white" />
              <Text style={styles.saveButtonText}>Sauvegarder</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Déterminer la couleur selon le type de membre
  const getCardGradient = () => {
    switch (member.member_type) {
      case 'Personnel':
        return ['#4b6cb7', '#182848'];
      case 'Ancien':
        return ['#f46b45', '#eea849'];
      default:
        return ['#667eea', '#764ba2'];
    }
  };

  // Construction de l'adresse complète avec département pour l'affichage
  const fullAddress = member.address 
    ? `${member.address}${member.city ? ', ' + member.city : ''}${member.department ? ', ' + member.department : ''}`
    : '';

  return (
    <View style={styles.container}>
      {/* QR Code caché pour l'impression */}
      <View style={styles.hiddenQRCode}>
        <QRCode
          ref={qrCodeRef}
          value={getQRCodeData()}
          size={250}
          color="#2c3e50"
          backgroundColor="white"
          getRef={(ref) => (qrCodeRef.current = ref)}
          logoSize={50}
          logoBackgroundColor="white"
        />
      </View>

      {/* Titre de la carte */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardTypeTitle}>
          {member.member_type === 'Personnel' ? '🛡️ CARTE PERSONNEL' : '🎴 CARTE MEMBRE'}
        </Text>
        <Text style={styles.cardSubtitle}>Format PVC 85.6mm × 53.98mm</Text>
        {member.dossier_number && (
          <View style={styles.dossierBadge}>
            <FileText size={12} color="#3498db" />
            <Text style={styles.dossierBadgeText}>{member.dossier_number}</Text>
          </View>
        )}
      </View>

      {/* Prévisualisation de la carte */}
      <View style={[
        styles.cardPreview,
        { 
          backgroundColor: getCardGradient()[0],
          shadowColor: getCardGradient()[0]
        }
      ]}>
        {/* Overlay gradient */}
        <View style={[
          styles.cardOverlay,
          { backgroundColor: getCardGradient()[1] }
        ]} />
        
        {/* Badge type de membre */}
        {member.member_type === 'Personnel' && (
          <View style={styles.typeBadge}>
            <Award size={12} color="#4b6cb7" />
            <Text style={styles.typeBadgeText}>{member.member_type}</Text>
          </View>
        )}

        {/* Nom de l'église */}
        <View style={[
          styles.churchNameContainer,
          { left: member.member_type === 'Personnel' ? 70 : 12 }
        ]}>
          <Text style={styles.churchName} numberOfLines={1}>
            {church?.name || 'ÉGLISE LOCALE'}
          </Text>
        </View>

        {/* Titre de la carte */}
        <Text style={styles.cardTitlePreview}>CARTE DE MEMBRE</Text>

        {/* Informations du membre */}
        <View style={styles.memberInfoPreview}>
          <Text style={styles.memberNamePreview}>
            {member.first_name.toUpperCase()}
          </Text>
          <Text style={styles.memberLastNamePreview}>
            {member.last_name.toUpperCase()}
          </Text>

          {member.email && (
            <View style={styles.detailRow}>
              <Mail size={10} color="rgba(255,255,255,0.95)" />
              <Text style={styles.detailText} numberOfLines={1}>
                {member.email}
              </Text>
            </View>
          )}

          {member.phone && (
            <View style={styles.detailRow}>
              <Phone size={10} color="rgba(255,255,255,0.95)" />
              <Text style={styles.detailText}>
                {member.phone}
              </Text>
            </View>
          )}

          {fullAddress && (
            <View style={styles.detailRow}>
              <MapPin size={10} color="rgba(255,255,255,0.95)" />
              <Text style={styles.detailText} numberOfLines={2}>
                {fullAddress}
              </Text>
            </View>
          )}

          {member.position && (
            <View style={styles.detailRow}>
              <CreditCard size={10} color="rgba(255,255,255,0.95)" />
              <Text style={styles.detailText}>
                {member.position}
              </Text>
            </View>
          )}

          {member.department && (
            <View style={styles.detailRow}>
              <Building size={10} color="rgba(255,255,255,0.95)" />
              <Text style={styles.detailText}>
                {member.department}
              </Text>
            </View>
          )}
        </View>

        {/* Photo du membre */}
        <View style={styles.photoContainerPreview}>
          {member.photo_url ? (
            <Image 
              source={{ uri: member.photo_url }} 
              style={styles.memberPhotoPreview}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.photoPlaceholderPreview}>
              <Text style={styles.photoInitials}>
                {member.first_name.charAt(0)}{member.last_name.charAt(0)}
              </Text>
            </View>
          )}
        </View>

        {/* QR Code */}
        <View style={styles.qrContainerPreview}>
          <QRCode
            value={getQRCodeData()}
            size={65}
            color="#000000"
            backgroundColor="white"
            logoSize={15}
            logoBackgroundColor="white"
          />
        </View>

        {/* Informations techniques */}
        <View style={styles.techInfo}>
          <Text style={styles.memberId}>
            ID: {member.id.substring(0, 8).toUpperCase()}
          </Text>
          <Text style={styles.validity}>
            VALIDE JUSQU'AU: {new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).toUpperCase()}
          </Text>
        </View>

        {/* Numéro de dossier */}
        {member.dossier_number && (
          <View style={styles.dossierContainer}>
            <Text style={styles.dossierText}>📁 {member.dossier_number}</Text>
          </View>
        )}

        {/* Signature */}
        <View style={styles.signaturePreview}>
          <Text style={styles.signatureText}>MY CHURCH • {new Date().getFullYear()}</Text>
        </View>
      </View>

      {/* Actions principales */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.pdfButton]} 
          onPress={handleExportPDF}
          disabled={generatingPDF}
        >
          {generatingPDF ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Download size={18} color="white" />
              <Text style={styles.actionButtonText}>Générer PDF</Text>
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.shareButton]} 
          onPress={handleShareCard}
          disabled={sharing}
        >
          {sharing ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Share2 size={18} color="white" />
              <Text style={styles.actionButtonText}>Partager</Text>
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.printButton]} 
          onPress={() => Alert.alert('Impression', 'Prêt pour impression PVC\n\nFormat: 85.6mm × 53.98mm', [{ text: 'OK' }])}
        >
          <Printer size={18} color="white" />
          <Text style={styles.actionButtonText}>Imprimer</Text>
        </TouchableOpacity>
      </View>

      {/* Boutons admin */}
      <View style={styles.adminActions}>
        <TouchableOpacity 
          style={[styles.adminButton, styles.qrButton]} 
          onPress={() => Alert.alert(
            'QR Code', 
            `Code d'identification du membre\n\nScannez ce code pour vérifier les informations du membre.\n\nID: ${member.id}`,
            [{ text: 'OK' }]
          )}
        >
          <QrCode size={16} color="white" />
          <Text style={styles.adminButtonText}>Voir QR</Text>
        </TouchableOpacity>
        
        {!member.has_dossier && onAddToDossier && (
          <TouchableOpacity 
            style={[styles.adminButton, styles.dossierButton]} 
            onPress={handleCreateDossier}
            disabled={savingToDossier}
          >
            {savingToDossier ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <FileText size={16} color="white" />
                <Text style={styles.adminButtonText}>Créer Dossier</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        
        {onEdit && (
          <TouchableOpacity 
            style={[styles.adminButton, styles.editButton]} 
            onPress={() => setEditing(true)}
          >
            <Edit size={16} color="white" />
            <Text style={styles.adminButtonText}>Modifier</Text>
          </TouchableOpacity>
        )}
        
        {onDelete && (
          <TouchableOpacity 
            style={[styles.adminButton, styles.deleteButton]} 
            onPress={confirmDelete}
          >
            <Trash2 size={16} color="white" />
            <Text style={styles.adminButtonText}>Supprimer</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#ecf0f1',
    width: screenWidth - 32,
    alignSelf: 'center',
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTypeTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#2c3e50',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#7f8c8d',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  dossierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 6,
    borderWidth: 1,
    borderColor: '#3498db',
    marginTop: 4,
  },
  dossierBadgeText: {
    fontSize: 11,
    color: '#3498db',
    fontWeight: '800',
  },
  cardPreview: {
    width: '100%',
    height: 260,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 20,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  cardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.4,
  },
  typeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 18,
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#4b6cb7',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  churchNameContainer: {
    position: 'absolute',
    top: 12,
    right: 100,
  },
  churchName: {
    fontSize: 13,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.98)',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardTitlePreview: {
    position: 'absolute',
    top: 32,
    left: 12,
    fontSize: 18,
    fontWeight: '900',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  memberInfoPreview: {
    position: 'absolute',
    top: 65,
    left: 12,
    right: 100,
  },
  memberNamePreview: {
    fontSize: 16,
    fontWeight: '900',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginBottom: 3,
  },
  memberLastNamePreview: {
    fontSize: 20,
    fontWeight: '900',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    gap: 6,
  },
  detailText: {
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.95)',
    flex: 1,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  photoContainerPreview: {
    position: 'absolute',
    top: 65,
    right: 12,
    width: 85,
    height: 85,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: 'white',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  memberPhotoPreview: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholderPreview: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  photoInitials: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  qrContainerPreview: {
    position: 'absolute',
    bottom: 45,
    right: 12,
    backgroundColor: 'white',
    padding: 5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  techInfo: {
    position: 'absolute',
    bottom: 18,
    left: 12,
  },
  memberId: {
    fontSize: 9.5,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '800',
    marginBottom: 3,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  validity: {
    fontSize: 9.5,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  dossierContainer: {
    position: 'absolute',
    bottom: 10,
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  dossierText: {
    fontSize: 9,
    color: 'white',
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  signaturePreview: {
    position: 'absolute',
    bottom: 10,
    right: 12,
  },
  signatureText: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.6)',
    fontStyle: 'italic',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  pdfButton: {
    backgroundColor: '#e74c3c',
  },
  shareButton: {
    backgroundColor: '#3498db',
  },
  printButton: {
    backgroundColor: '#2c3e50',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
  },
  adminActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 100,
  },
  qrButton: {
    backgroundColor: '#9b59b6',
  },
  dossierButton: {
    backgroundColor: '#27ae60',
  },
  editButton: {
    backgroundColor: '#f39c12',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  adminButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '800',
  },
  hiddenQRCode: {
    position: 'absolute',
    left: -1000,
    opacity: 0,
  },
  // Styles pour l'édition
  editingCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#f39c12',
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  editTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2c3e50',
  },
  cancelButton: {
    padding: 4,
  },
  editForm: {
    maxHeight: 400,
  },
  photoEditContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  editPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#3498db',
    marginBottom: 10,
  },
  editPhotoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  changePhotoText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
  },
  editRow: {
    flexDirection: 'row',
    gap: 10,
  },
  editField: {
    marginBottom: 15,
  },
  editLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 6,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editInput: {
    borderWidth: 2,
    borderColor: '#ecf0f1',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2c3e50',
    backgroundColor: '#f8f9fa',
    fontWeight: '700',
  },
  editActions: {
    marginTop: 20,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27ae60',
    paddingVertical: 15,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
  },
}); 