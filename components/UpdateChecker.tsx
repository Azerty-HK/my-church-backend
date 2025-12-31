import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Download, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, X } from 'lucide-react-native';
import { UpdateService } from '../services/updateService';
import type { AppVersion } from '../services/updateService';

interface UpdateCheckerProps {
  children: React.ReactNode;
}

export function UpdateChecker({ children }: UpdateCheckerProps) {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<AppVersion | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateRequired, setUpdateRequired] = useState(false);

  // Exposer la fonction pour vérifier les mises à jour manuellement
  (UpdateChecker as any).checkForUpdates = async () => {
    const result = await UpdateService.checkForUpdates();
    if (result.hasUpdate && result.latestVersion) {
      setUpdateInfo(result.latestVersion);
      setUpdateRequired(result.isRequired || false);
      setShowUpdateModal(true);
      return true;
    }
    return false;
  };

  useEffect(() => {
    initializeUpdateService();
  }, []);

  const initializeUpdateService = async () => {
    try {
      await UpdateService.initializeUpdateChecker();
    } catch (error) {
      console.error('❌ Erreur initialisation service de mise à jour:', error);
    }
  };

  const checkForUpdates = async () => {
    try {
      console.log('🔍 Vérification automatique des mises à jour...');
      
      const result = await UpdateService.checkForUpdates();
      
      if (result.hasUpdate && result.latestVersion) {
        console.log('🆕 Mise à jour disponible:', result.latestVersion.version);
        setUpdateInfo(result.latestVersion);
        setUpdateRequired(result.isRequired || false);
        setShowUpdateModal(true);
        
        // Programmer une notification si ce n'est pas obligatoire
        if (!result.isRequired) {
          await UpdateService.scheduleUpdateNotification(result.latestVersion);
        }
      } else {
        console.log('✅ Application à jour');
      }
    } catch (error) {
      console.error('❌ Erreur vérification mises à jour:', error);
    }
  };

  const handleUpdate = async () => {
    if (!updateInfo) return;
    
    setIsUpdating(true);
    try {
      const success = await UpdateService.performUpdate();
      if (success) {
        setShowUpdateModal(false);
      }
    } catch (error) {
      console.error('❌ Erreur mise à jour:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSkipUpdate = () => {
    if (updateRequired) {
      // Ne pas permettre de fermer si la mise à jour est obligatoire
      return;
    }
    setShowUpdateModal(false);
  };

  return (
    <View style={styles.container}>
      {children}
      
      <Modal 
        visible={showUpdateModal} 
        transparent 
        animationType="fade"
        onRequestClose={handleSkipUpdate}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {!updateRequired && (
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={handleSkipUpdate}
              >
                <X size={24} color="#7f8c8d" />
              </TouchableOpacity>
            )}
            
            <View style={styles.header}>
              {updateRequired ? (
                <AlertTriangle size={64} color="#e74c3c" />
              ) : (
                <Download size={64} color="#3498db" />
              )}
              
              <Text style={styles.title}>
                {updateRequired ? '🚨 Mise à jour obligatoire' : '🆕 Nouvelle version disponible'}
              </Text>
              
              {updateInfo && (
                <Text style={styles.versionInfo}>
                  Version actuelle: {UpdateService.getCurrentVersion()}
                  {'\n'}
                  Nouvelle version: {updateInfo.version}
                </Text>
              )}
            </View>

            {updateInfo && (
              <View style={styles.content}>
                <Text style={styles.releaseNotesTitle}>📋 Nouveautés :</Text>
                {updateInfo.releaseNotes.map((note, index) => (
                  <Text key={index} style={styles.releaseNote}>
                    • {note}
                  </Text>
                ))}
                
                <Text style={styles.releaseDate}>
                  📅 Publié le: {new Date(updateInfo.releaseDate).toLocaleDateString('fr-FR')}
                </Text>
              </View>
            )}

            <View style={styles.actions}>
              {!updateRequired && (
                <TouchableOpacity 
                  style={styles.skipButton}
                  onPress={handleSkipUpdate}
                  disabled={isUpdating}
                >
                  <Text style={styles.skipButtonText}>Plus tard</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[
                  styles.updateButton,
                  updateRequired && styles.updateButtonRequired
                ]}
                onPress={handleUpdate}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Download size={20} color="white" />
                )}
                <Text style={styles.updateButtonText}>
                  {isUpdating ? 'Mise à jour...' : 'Mettre à jour'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                🔒 Mise à jour sécurisée • 📱 Données préservées
              </Text>
              <Text style={styles.footerSignature}>
                My Church - Created by Henock Aduma
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
    maxWidth: 400,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 8,
  },
  header: {
    alignItems: 'center',
    padding: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  versionInfo: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 20,
  },
  content: {
    padding: 20,
  },
  releaseNotesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  releaseNote: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 8,
    lineHeight: 20,
  },
  releaseDate: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#7f8c8d',
    fontSize: 14,
    fontWeight: '600',
  },
  updateButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498db',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  updateButtonRequired: {
    flex: 1,
    backgroundColor: '#e74c3c',
  },
  updateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: '#adb5bd',
    textAlign: 'center',
  },
  footerSignature: {
    fontSize: 10,
    color: '#f39c12',
    textAlign: 'center',
    fontStyle: 'italic',
    fontWeight: '600',
  },
});