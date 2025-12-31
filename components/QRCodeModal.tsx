import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Share,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { X, QrCode, Share2, Star, Download, Printer, Mail, Phone, User, Calendar, Folder, Save } from 'lucide-react-native';
import type { Member } from '../types/database';
import QRCode from 'react-native-qrcode-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { captureRef } from 'react-native-view-shot';

interface QRCodeModalProps {
  visible: boolean;
  member: Member | null;
  onClose: () => void;
  onSaveToDossier?: () => void;
}

export function QRCodeModal({ visible, member, onClose, onSaveToDossier }: QRCodeModalProps) {
  const [printing, setPrinting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [savingToDossier, setSavingToDossier] = useState(false);
  const cardRef = useRef<View>(null);
  const qrCodeRef = useRef<any>(null);

  if (!member) return null;

  const getQRCodeData = () => {
    const memberData = {
      id: member.id,
      church_id: member.church_id,
      name: `${member.first_name} ${member.last_name}`,
      type: member.member_type,
      position: member.position || 'Membre',
      email: member.email,
      phone: member.phone || '',
      departments: member.departments || [],
      qr_code: member.qr_code,
      registration_date: member.registration_date || member.created_at,
      is_active: member.is_active,
      timestamp: new Date().toISOString(),
    };
    return JSON.stringify(memberData);
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

      const memberPhoto = member.photo_url 
        ? `<img src="${member.photo_url}" style="width: 140px; height: 140px; border-radius: 70px; object-fit: cover; border: 4px solid #3498db; margin-bottom: 15px;" />`
        : `<div style="width: 140px; height: 140px; border-radius: 70px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; border: 4px solid #3498db; margin-bottom: 15px;">
            <span style="font-size: 42px; color: white;">${member.first_name.charAt(0)}${member.last_name.charAt(0)}</span>
          </div>`;

      const qrCodeImage = qrCodeBase64 
        ? `<img src="${qrCodeBase64}" style="width: 140px; height: 140px; border: 3px solid #3498db; border-radius: 12px; padding: 15px; background: white;" />`
        : `<div style="width: 140px; height: 140px; display: flex; align-items: center; justify-content: center; background: #f8f9fa; border: 3px solid #3498db; border-radius: 12px;">
            <span style="color: #7f8c8d; font-size: 16px; font-weight: 600;">QR Code</span>
          </div>`;

      const statusColor = member.is_active ? '#27ae60' : '#e74c3c';
      const statusBg = member.is_active ? '#d5f4e6' : '#fdeaea';

      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Carte de Membre - ${member.first_name} ${member.last_name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              font-family: 'Inter', sans-serif;
            }
            
            body {
              padding: 30px;
              background: #f8f9fa;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            
            .card {
              max-width: 600px;
              width: 100%;
              background: white;
              border-radius: 20px;
              box-shadow: 0 15px 40px rgba(0,0,0,0.12);
              padding: 35px;
              border: 3px solid #3498db;
              margin: 0 auto;
            }
            
            .header {
              text-align: center;
              padding-bottom: 25px;
              margin-bottom: 25px;
              border-bottom: 3px solid #3498db;
            }
            
            .church-title {
              font-size: 32px;
              font-weight: 900;
              color: #2c3e50;
              margin-bottom: 8px;
              letter-spacing: 1px;
            }
            
            .card-title {
              font-size: 22px;
              color: #3498db;
              font-weight: 700;
              margin-bottom: 5px;
            }
            
            .card-body {
              display: flex;
              flex-direction: column;
              gap: 25px;
            }
            
            .profile-section {
              display: flex;
              align-items: center;
              gap: 30px;
            }
            
            .info-section {
              flex: 1;
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
            }
            
            .detail-item {
              margin-bottom: 12px;
            }
            
            .detail-label {
              font-size: 11px;
              color: #7f8c8d;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 5px;
              font-weight: 600;
            }
            
            .detail-value {
              font-size: 14px;
              color: #2c3e50;
              font-weight: 600;
              padding: 10px 14px;
              background: #f8f9fa;
              border-radius: 10px;
              border-left: 4px solid #3498db;
            }
            
            .qr-section {
              text-align: center;
              padding: 25px;
              background: #f8f9fa;
              border-radius: 15px;
              border: 2px solid #3498db;
              margin-top: 20px;
            }
            
            .qr-code-text {
              font-family: 'Courier New', monospace;
              font-size: 15px;
              font-weight: bold;
              color: #2c3e50;
              margin-top: 15px;
              padding: 12px 20px;
              background: white;
              border-radius: 10px;
              border: 2px solid #3498db;
              display: inline-block;
            }
            
            .footer {
              margin-top: 25px;
              text-align: center;
              font-size: 12px;
              color: #95a5a6;
              border-top: 1px solid #ecf0f1;
              padding-top: 20px;
            }
            
            @media print {
              body {
                background: white;
                padding: 0;
              }
              
              .card {
                box-shadow: none;
                border: 3px solid #3498db;
                margin: 0;
                max-width: 100%;
                border-radius: 0;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1 class="church-title">MY CHURCH</h1>
              <h2 class="card-title">CARTE DE MEMBRE</h2>
              <p style="color: #7f8c8d; font-size: 14px;">ID: ${member.id}</p>
            </div>
            
            <div class="card-body">
              <div class="profile-section">
                <div>
                  ${memberPhoto}
                </div>
                <div class="info-section">
                  <div class="detail-item">
                    <div class="detail-label">Nom complet</div>
                    <div class="detail-value">${member.first_name} ${member.last_name}</div>
                  </div>
                  
                  <div class="detail-item">
                    <div class="detail-label">Type de membre</div>
                    <div class="detail-value">${member.member_type}</div>
                  </div>
                  
                  <div class="detail-item">
                    <div class="detail-label">Poste</div>
                    <div class="detail-value">${member.position || 'Membre'}</div>
                  </div>
                  
                  <div class="detail-item">
                    <div class="detail-label">Email</div>
                    <div class="detail-value">${member.email || 'Non spécifié'}</div>
                  </div>
                  
                  <div class="detail-item">
                    <div class="detail-label">Téléphone</div>
                    <div class="detail-value">${member.phone || 'Non spécifié'}</div>
                  </div>
                  
                  <div class="detail-item">
                    <div class="detail-label">Statut</div>
                    <div class="detail-value" style="background: ${statusBg}; color: ${statusColor}; border-left-color: ${statusColor};">
                      ${member.is_active ? '✅ Actif' : '❌ Inactif'}
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="qr-section">
                ${qrCodeImage}
                <div class="qr-code-text">${member.qr_code}</div>
              </div>
            </div>
            
            <div class="footer">
              <p>Carte générée le ${new Date().toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
              <p style="margin-top: 10px; font-style: italic; color: #bdc3c7;">
                My Church App - Créé par Henock Aduma
              </p>
            </div>
          </div>
        </body>
        </html>
      `;
    } catch (error) {
      console.error('Erreur génération HTML:', error);
      return '';
    }
  };

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const { status } = await Print.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'L\'application a besoin de l\'autorisation d\'imprimer.',
          [{ text: 'OK' }]
        );
        return;
      }

      const html = await generatePrintableHTML();
      
      if (!html) {
        throw new Error('Impossible de générer le document');
      }

      await Print.printAsync({
        html,
        orientation: Print.Orientation.portrait,
        margins: {
          left: 20,
          top: 20,
          right: 20,
          bottom: 20,
        },
      });
      
      Alert.alert(
        '✅ Impression réussie',
        'La carte de membre a été envoyée à l\'imprimante avec succès.',
        [{ text: 'Parfait' }]
      );
    } catch (error: any) {
      console.error('Erreur d\'impression:', error);
      Alert.alert(
        '❌ Erreur d\'impression',
        error.message || 'Impossible d\'imprimer la carte de membre.',
        [{ text: 'OK' }]
      );
    } finally {
      setPrinting(false);
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
      });

      const fileName = `Carte_Membre_${member.first_name}_${member.last_name}_${Date.now()}.pdf`;
      const newUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.moveAsync({
        from: uri,
        to: newUri,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Carte de Membre - ${member.first_name} ${member.last_name}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert(
          '✅ PDF généré',
          `Le PDF a été sauvegardé dans: ${newUri}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Erreur génération PDF:', error);
      Alert.alert(
        '❌ Erreur',
        error.message || 'Impossible de générer le PDF.',
        [{ text: 'OK' }]
      );
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleSaveToGallery = async () => {
    if (!cardRef.current) {
      Alert.alert('Erreur', 'Impossible de capturer la carte.');
      return;
    }

    setSaving(true);
    try {
      if (Platform.OS !== 'web') {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        
        if (status !== 'granted') {
          Alert.alert(
            'Permission requise', 
            'L\'application a besoin de l\'accès à la galerie pour sauvegarder.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'data-uri',
      });

      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        const asset = await MediaLibrary.createAssetAsync(uri);
        await MediaLibrary.createAlbumAsync('My Church Cards', asset, false);
        
        Alert.alert(
          '✅ Sauvegarde réussie',
          'La carte de membre a été sauvegardée dans votre galerie (dossier "My Church Cards").',
          [
            { text: 'OK' },
            {
              text: 'Ouvrir',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('photos-redirect://');
                }
              }
            }
          ]
        );
      }
    } catch (error: any) {
      console.error('Erreur sauvegarde:', error);
      Alert.alert(
        '❌ Erreur de sauvegarde',
        error.message || 'Impossible de sauvegarder la carte de membre.',
        [{ text: 'OK' }]
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveToDossier = async () => {
    setSavingToDossier(true);
    try {
      // Simuler la sauvegarde dans le dossier
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (onSaveToDossier) {
        onSaveToDossier();
      }
      
      Alert.alert(
        '✅ Ajouté au dossier',
        'La carte de membre a été ajoutée au dossier avec succès.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Erreur ajout dossier:', error);
      Alert.alert('❌ Erreur', 'Impossible d\'ajouter au dossier.');
    } finally {
      setSavingToDossier(false);
    }
  };

  const handleShare = async () => {
    try {
      const shareMessage = `🎴 **CARTE DE MEMBRE MY CHURCH**\n\n👤 **${member.first_name} ${member.last_name}**\n📧 ${member.email}\n📞 ${member.phone || 'Non spécifié'}\n💼 ${member.position || 'Membre'}\n📋 **QR Code:** ${member.qr_code}\n📅 Inscrit le: ${new Date(member.created_at || '').toLocaleDateString('fr-FR')}\n\n✅ **Statut:** ${member.is_active ? 'Actif' : 'Inactif'}\n🔐 **ID Membre:** ${member.id}\n\n✨ **My Church** - Créé par Henock Aduma`;

      await Share.share({
        message: shareMessage,
        title: `🎴 Carte Membre - ${member.first_name} ${member.last_name}`,
      });
    } catch (error) {
      console.error('❌ Erreur partage:', error);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#666" />
          </TouchableOpacity>
          
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <QrCode size={64} color="#3498db" strokeWidth={1.5} />
              <Text style={styles.title}>🎴 Carte de Membre</Text>
              <Text style={styles.memberName}>
                {member.first_name} {member.last_name}
              </Text>
              <Text style={styles.memberType}>
                {member.member_type} {member.position ? `• ${member.position}` : ''}
              </Text>
              <View style={styles.statusBadge}>
                <Text style={[
                  styles.statusText,
                  { color: member.is_active ? '#27ae60' : '#e74c3c' }
                ]}>
                  {member.is_active ? '✅ Actif' : '❌ Inactif'}
                </Text>
              </View>
            </View>

            {/* Carte de membre avec photo et QR code */}
            <View ref={cardRef} style={styles.memberCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>MY CHURCH</Text>
                <Text style={styles.cardSubtitle}>Carte de Membre Officielle</Text>
              </View>
              
              <View style={styles.cardBody}>
                {/* Photo et QR code */}
                <View style={styles.photoQrSection}>
                  <View style={styles.photoSection}>
                    {member.photo_url ? (
                      <Image 
                        source={{ uri: member.photo_url }} 
                        style={styles.memberPhoto}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <Text style={styles.initials}>
                          {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.photoLabel}>Photo du membre</Text>
                  </View>
                  
                  <View style={styles.qrSection}>
                    <View style={styles.qrContainer}>
                      <QRCode
                        ref={qrCodeRef}
                        value={getQRCodeData()}
                        size={120}
                        color="#2c3e50"
                        backgroundColor="white"
                        getRef={(ref) => (qrCodeRef.current = ref)}
                      />
                    </View>
                    <Text style={styles.qrLabel}>QR Code d'identification</Text>
                    <Text style={styles.qrCodeText}>{member.qr_code}</Text>
                  </View>
                </View>
                
                {/* Informations du membre */}
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <User size={14} color="#3498db" />
                    <Text style={styles.infoLabel}>Nom complet</Text>
                    <Text style={styles.infoValue}>
                      {member.first_name} {member.last_name}
                    </Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={styles.infoIcon}>👥</Text>
                    <Text style={styles.infoLabel}>Type de membre</Text>
                    <Text style={styles.infoValue}>{member.member_type}</Text>
                  </View>
                  
                  {member.position && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoIcon}>💼</Text>
                      <Text style={styles.infoLabel}>Poste / Fonction</Text>
                      <Text style={styles.infoValue}>{member.position}</Text>
                    </View>
                  )}
                  
                  <View style={styles.infoItem}>
                    <Mail size={14} color="#3498db" />
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{member.email}</Text>
                  </View>
                  
                  {member.phone && (
                    <View style={styles.infoItem}>
                      <Phone size={14} color="#3498db" />
                      <Text style={styles.infoLabel}>Téléphone</Text>
                      <Text style={styles.infoValue}>{member.phone}</Text>
                    </View>
                  )}
                  
                  <View style={styles.infoItem}>
                    <Calendar size={14} color="#3498db" />
                    <Text style={styles.infoLabel}>Date d'inscription</Text>
                    <Text style={styles.infoValue}>
                      {new Date(member.created_at || '').toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.cardFooter}>
                <Text style={styles.idLabel}>ID Membre</Text>
                <Text style={styles.idValue}>{member.id}</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionsGrid}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.printButton]}
                onPress={handlePrint}
                disabled={printing}
              >
                {printing ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Printer size={20} color="white" />
                    <Text style={styles.actionButtonText}>Imprimer</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.pdfButton]}
                onPress={handleExportPDF}
                disabled={generatingPDF}
              >
                {generatingPDF ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Download size={20} color="white" />
                    <Text style={styles.actionButtonText}>PDF</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleSaveToGallery}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Save size={20} color="white" />
                    <Text style={styles.actionButtonText}>Sauvegarder</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.dossierButton]}
                onPress={handleSaveToDossier}
                disabled={savingToDossier}
              >
                {savingToDossier ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Folder size={20} color="white" />
                    <Text style={styles.actionButtonText}>Dossier</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.secondaryActions}>
              <TouchableOpacity 
                style={[styles.secondaryButton, styles.shareButton]}
                onPress={handleShare}
              >
                <Share2 size={18} color="#3498db" />
                <Text style={styles.secondaryButtonText}>Partager</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.description}>
              💡 Cette carte permet l'identification rapide du membre avec photo et QR code unique. 
              Scannez le QR code pour accéder aux informations du membre.
            </Text>
          </ScrollView>

          <View style={styles.signature}>
            <Star size={14} color="#f39c12" />
            <Text style={styles.signatureText}>My Church - Created by Henock Aduma</Text>
            <Star size={14} color="#f39c12" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '100%',
    maxWidth: 450,
    maxHeight: '90%',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 15,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 30,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2c3e50',
    marginTop: 15,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  memberName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3498db',
    marginBottom: 4,
    textAlign: 'center',
  },
  memberType: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '600',
    marginBottom: 12,
  },
  statusBadge: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Carte de membre
  memberCard: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 25,
    borderWidth: 3,
    borderColor: '#3498db',
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#ecf0f1',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2c3e50',
    letterSpacing: 1,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '700',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  cardBody: {
    gap: 25,
  },
  photoQrSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 25,
    marginBottom: 20,
  },
  photoSection: {
    alignItems: 'center',
    flex: 1,
  },
  memberPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#3498db',
    backgroundColor: '#f8f9fa',
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#3498db',
  },
  initials: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  photoLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  qrSection: {
    alignItems: 'center',
    flex: 1,
  },
  qrContainer: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#3498db',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  qrLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  qrCodeText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#2c3e50',
    marginTop: 6,
    fontWeight: '600',
    textAlign: 'center',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  infoItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#3498db',
  },
  infoIcon: {
    fontSize: 16,
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 11,
    color: '#7f8c8d',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 13,
    color: '#2c3e50',
    fontWeight: '700',
    lineHeight: 18,
  },
  cardFooter: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: '#ecf0f1',
    alignItems: 'center',
    backgroundColor: 'linear-gradient(135deg, #3498db 0%, #2c3e50 100%)',
    borderRadius: 12,
    padding: 15,
  },
  idLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    fontWeight: '500',
  },
  idValue: {
    fontSize: 18,
    fontWeight: '900',
    color: 'white',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 15,
  },
  actionButton: {
    flex: 1,
    minWidth: '22%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  printButton: {
    backgroundColor: '#2c3e50',
  },
  pdfButton: {
    backgroundColor: '#e74c3c',
  },
  saveButton: {
    backgroundColor: '#27ae60',
  },
  dossierButton: {
    backgroundColor: '#9b59b6',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secondaryActions: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#3498db',
    gap: 8,
    backgroundColor: 'white',
  },
  shareButton: {
    borderColor: '#3498db',
  },
  secondaryButtonText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '700',
  },
  description: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 25,
    marginTop: 15,
    marginBottom: 25,
    fontStyle: 'italic',
  },
  signature: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#fff3cd',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderTopWidth: 2,
    borderTopColor: '#f39c12',
  },
  signatureText: {
    fontSize: 11,
    color: '#f39c12',
    fontWeight: '800',
    fontStyle: 'italic',
    letterSpacing: 0.3,
  },
}); 