import 'react-native-get-random-values';
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { QrCode, X, Share2, RefreshCw, Star, Download, Printer, Camera } from 'lucide-react-native';
import { DatabaseService } from '../lib/database';
import type { Member } from '../types/database';
import QRCode from 'react-native-qrcode-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

interface QRCodeGeneratorProps {
  visible: boolean;
  member: Member;
  onClose: () => void;
  onRegenerated: () => void;
}

export function QRCodeGenerator({ visible, member, onClose, onRegenerated }: QRCodeGeneratorProps) {
  const [regenerating, setRegenerating] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [saving, setSaving] = useState(false);
  const cardRef = useRef<View>(null);
  const qrCodeRef = useRef<any>(null);

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

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const newQRCode = await DatabaseService.regenerateMemberQR(member.id);
      
      Alert.alert(
        '✅ QR Code régénéré!',
        `Nouveau QR Code pour ${member.first_name} ${member.last_name}:\n\n📱 ${newQRCode}\n\n✨ Created by Henock Aduma`,
        [{ text: 'Parfait!', onPress: onRegenerated }]
      );
    } catch (error: any) {
      Alert.alert('❌ Erreur', 'Impossible de régénérer le QR Code');
    } finally {
      setRegenerating(false);
    }
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
        ? `<img src="${member.photo_url}" style="width: 120px; height: 120px; border-radius: 60px; object-fit: cover; border: 4px solid #3498db; margin-bottom: 10px;" />`
        : `<div style="width: 120px; height: 120px; border-radius: 60px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; border: 4px solid #3498db; margin-bottom: 10px;">
            <span style="font-size: 36px; color: white; font-weight: bold;">${member.first_name.charAt(0)}${member.last_name.charAt(0)}</span>
          </div>`;

      const qrCodeImage = qrCodeBase64 
        ? `<img src="${qrCodeBase64}" style="width: 120px; height: 120px; border: 3px solid #3498db; border-radius: 12px; padding: 10px; background: white;" />`
        : `<div style="width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; background: #f8f9fa; border: 3px solid #3498db; border-radius: 12px;">
            <span style="color: #7f8c8d; font-size: 14px; font-weight: 600;">QR Code</span>
          </div>`;

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
              padding: 40px;
              background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
              min-height: 100vh;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            
            .card {
              max-width: 800px;
              width: 100%;
              background: white;
              border-radius: 20px;
              box-shadow: 0 20px 50px rgba(0,0,0,0.15);
              padding: 40px;
              border: 3px solid #3498db;
            }
            
            .header {
              text-align: center;
              padding-bottom: 25px;
              margin-bottom: 30px;
              border-bottom: 4px solid #3498db;
            }
            
            .church-title {
              font-size: 36px;
              font-weight: 900;
              color: #2c3e50;
              margin-bottom: 10px;
              letter-spacing: 2px;
              text-transform: uppercase;
            }
            
            .card-title {
              font-size: 24px;
              color: #3498db;
              font-weight: 700;
              margin-bottom: 5px;
            }
            
            .card-body {
              display: flex;
              gap: 40px;
              margin-bottom: 30px;
            }
            
            .left-column {
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 20px;
            }
            
            .right-column {
              flex: 2;
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
            }
            
            .detail-item {
              margin-bottom: 15px;
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
              font-size: 16px;
              color: #2c3e50;
              font-weight: 600;
              padding: 8px 12px;
              background: #f8f9fa;
              border-radius: 8px;
              border-left: 4px solid #3498db;
            }
            
            .qr-code-section {
              text-align: center;
              margin-top: 30px;
              padding-top: 25px;
              border-top: 2px solid #ecf0f1;
            }
            
            .qr-code-value {
              font-family: 'Courier New', monospace;
              font-size: 16px;
              font-weight: bold;
              color: #2c3e50;
              margin-top: 15px;
              padding: 15px;
              background: #f8f9fa;
              border-radius: 10px;
              border: 2px solid #3498db;
              display: inline-block;
            }
            
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #95a5a6;
              border-top: 2px solid #ecf0f1;
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
            </div>
            
            <div class="card-body">
              <div class="left-column">
                ${memberPhoto}
                ${qrCodeImage}
              </div>
              
              <div class="right-column">
                <div class="detail-item">
                  <div class="detail-label">Nom complet</div>
                  <div class="detail-value">${member.first_name} ${member.last_name}</div>
                </div>
                
                <div class="detail-item">
                  <div class="detail-label">Type de membre</div>
                  <div class="detail-value">${member.member_type}</div>
                </div>
                
                <div class="detail-item">
                  <div class="detail-label">Poste / Fonction</div>
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
                  <div class="detail-label">Date d'inscription</div>
                  <div class="detail-value">${new Date(member.created_at || Date.now()).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</div>
                </div>
              </div>
            </div>
            
            <div class="qr-code-section">
              <div class="qr-code-value">${member.qr_code}</div>
            </div>
            
            <div class="footer">
              <p>Carte générée le ${new Date().toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
              <p style="margin-top: 10px; font-style: italic;">My Church App - Créé par Henock Aduma</p>
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

  const handleSaveImage = async () => {
    if (!cardRef.current) {
      Alert.alert('Erreur', 'Impossible de capturer la carte.');
      return;
    }

    setSaving(true);
    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'data-uri',
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `Carte de Membre - ${member.first_name} ${member.last_name}`,
          UTI: 'public.png',
        });
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

  const handleShare = async () => {
    try {
      await Share.share({
        message: `📱 Carte de Membre My Church\n\n👤 ${member.first_name} ${member.last_name}\n📧 ${member.email}\n📞 ${member.phone || 'Non spécifié'}\n💼 ${member.position || 'Membre'}\n📋 QR Code: ${member.qr_code}\n\n✨ My Church - Created by Henock Aduma`,
        title: `Carte Membre - ${member.first_name} ${member.last_name}`,
      });
    } catch (error) {
      Alert.alert('❌ Erreur', 'Impossible de partager la carte');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#666" />
          </TouchableOpacity>
          
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <QrCode size={64} color="#3498db" />
              <Text style={styles.title}>🎴 Carte de Membre</Text>
              <Text style={styles.memberName}>
                {member.first_name} {member.last_name}
              </Text>
              <Text style={styles.memberType}>
                {member.member_type} {member.position ? `• ${member.position}` : ''}
              </Text>
            </View>

            {/* Carte avec photo et QR code */}
            <View ref={cardRef} style={styles.memberCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>MY CHURCH</Text>
                <Text style={styles.cardSubtitle}>Carte de Membre</Text>
              </View>
              
              <View style={styles.cardBody}>
                <View style={styles.photoQrRow}>
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
                    <Text style={styles.photoLabel}>Photo</Text>
                  </View>
                  
                  <View style={styles.qrSection}>
                    <QRCode
                      ref={qrCodeRef}
                      value={getQRCodeData()}
                      size={100}
                      color="#2c3e50"
                      backgroundColor="white"
                      getRef={(ref) => (qrCodeRef.current = ref)}
                    />
                    <Text style={styles.qrLabel}>QR Code</Text>
                  </View>
                </View>
                
                <View style={styles.memberInfo}>
                  <Text style={styles.memberNameLarge}>
                    {member.first_name} {member.last_name}
                  </Text>
                  <Text style={styles.memberRole}>
                    {member.position || member.member_type}
                  </Text>
                  <Text style={styles.memberEmail}>{member.email}</Text>
                  {member.phone && (
                    <Text style={styles.memberPhone}>{member.phone}</Text>
                  )}
                </View>
              </View>
              
              <View style={styles.qrCodeDisplay}>
                <Text style={styles.qrCodeText}>{member.qr_code}</Text>
              </View>
            </View>

            <Text style={styles.description}>
              💡 Cette carte permet l'identification rapide du membre avec photo et QR code unique
            </Text>

            <View style={styles.actions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleShare}
              >
                <Share2 size={20} color="#3498db" />
                <Text style={styles.actionButtonText}>📤 Partager</Text>
              </TouchableOpacity>

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
                    <Text style={[styles.actionButtonText, styles.printButtonText]}>
                      🖨️ Imprimer
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.secondaryActions}>
              <TouchableOpacity 
                style={[styles.secondaryActionButton, styles.saveButton]}
                onPress={handleSaveImage}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Download size={20} color="white" />
                    <Text style={styles.secondaryActionButtonText}>
                      💾 Sauvegarder
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.secondaryActionButton, styles.regenerateButton]}
                onPress={handleRegenerate}
                disabled={regenerating}
              >
                {regenerating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <RefreshCw size={20} color="white" />
                    <Text style={styles.secondaryActionButtonText}>
                      🔄 Régénérer QR
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.signature}>
            <Star size={16} color="#f39c12" />
            <Text style={styles.signatureText}>My Church - Created by Henock Aduma</Text>
            <Star size={16} color="#f39c12" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 32,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
  },
  memberName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#3498db',
    marginBottom: 4,
  },
  memberType: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  // Styles pour la carte
  memberCard: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#3498db',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    letterSpacing: 1,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '600',
    marginTop: 4,
  },
  cardBody: {
    gap: 20,
  },
  photoQrRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20,
  },
  photoSection: {
    alignItems: 'center',
    flex: 1,
  },
  memberPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#3498db',
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#3498db',
  },
  initials: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  photoLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  qrSection: {
    alignItems: 'center',
    flex: 1,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3498db',
  },
  qrLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  memberInfo: {
    alignItems: 'center',
  },
  memberNameLarge: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2c3e50',
    textAlign: 'center',
  },
  memberRole: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  memberEmail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 8,
    textAlign: 'center',
  },
  memberPhone: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
    textAlign: 'center',
  },
  qrCodeDisplay: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#3498db',
  },
  qrCodeText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#2c3e50',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    fontStyle: 'italic',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3498db',
    gap: 6,
  },
  actionButtonText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '600',
  },
  printButton: {
    backgroundColor: '#3498db',
  },
  printButtonText: {
    color: 'white',
  },
  secondaryActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 12,
    marginBottom: 20,
  },
  secondaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  saveButton: {
    backgroundColor: '#27ae60',
  },
  regenerateButton: {
    backgroundColor: '#e74c3c',
  },
  secondaryActionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
    borderTopWidth: 1,
    borderTopColor: '#f39c12',
  },
  signatureText: {
    fontSize: 12,
    color: '#f39c12',
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
}); 