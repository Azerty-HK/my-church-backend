import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, X } from 'lucide-react-native';
import { StorageService } from '../lib/storage';

interface ImagePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onImageSelected: (url: string) => void;
  type: 'logo' | 'member';
  currentImage?: string;
}

export function ImagePickerModal({
  visible,
  onClose,
  onImageSelected,
  type,
  currentImage
}: ImagePickerModalProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const requestPermissions = async (permissionType: 'camera' | 'library') => {
    try {
      if (permissionType === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission refusée',
            'My Church a besoin de la permission d\'accéder à la caméra pour prendre des photos.'
          );
          return false;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission refusée',
            'My Church a besoin de la permission d\'accéder à vos photos.'
          );
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('❌ Erreur permissions:', error);
      return false;
    }
  };

  const pickImageFromCamera = async () => {
    try {
      const hasPermission = await requestPermissions('camera');
      if (!hasPermission) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'logo' ? [1, 1] : [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPreviewUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('❌ Erreur caméra:', error);
      Alert.alert('Erreur', 'Impossible d\'accéder à la caméra');
    }
  };

  const pickImageFromLibrary = async () => {
    try {
      const hasPermission = await requestPermissions('library');
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'logo' ? [1, 1] : [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPreviewUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('❌ Erreur galerie:', error);
      Alert.alert('Erreur', 'Impossible d\'accéder à la galerie');
    }
  };

  const handleUpload = async () => {
    console.log('🔄 Début de l\'upload...', { previewUri, type });

    if (!previewUri) {
      Alert.alert('Erreur', 'Veuillez sélectionner une image');
      return;
    }

    setUploading(true);
    try {
      const path = type === 'logo' ? 'logos' : 'members';
      console.log('📁 Upload vers:', path);

      const result = await StorageService.uploadImage(previewUri, path);
      console.log('📤 Résultat upload:', result);

      if (result.success && result.url) {
        console.log('✅ Upload réussi, URL:', result.url);
        onImageSelected(result.url);
        setPreviewUri(null);
        onClose();
        Alert.alert('✅ Succès', 'Image uploadée avec succès!');
      } else {
        console.error('❌ Échec upload:', result.error);
        Alert.alert('❌ Erreur', result.error || 'Impossible d\'uploader l\'image');
      }
    } catch (error: any) {
      console.error('❌ Exception upload:', error);
      Alert.alert('❌ Erreur', error.message || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setPreviewUri(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <X size={24} color="#7f8c8d" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {type === 'logo' ? '🏛️ Logo de l\'église' : '👤 Photo de profil'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          {previewUri || currentImage ? (
            <View style={styles.previewSection}>
              <View style={styles.previewHeader}>
                <Text style={styles.sectionTitle}>Aperçu</Text>
                {previewUri && (
                  <TouchableOpacity
                    style={[styles.validateButton, uploading && styles.validateButtonDisabled]}
                    onPress={() => {
                      console.log('👆 Bouton Valider pressé');
                      handleUpload();
                    }}
                    disabled={uploading}
                    activeOpacity={0.7}
                  >
                    {uploading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={styles.validateButtonText}>
                        ✓ Valider
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
              <View style={[
                styles.previewContainer,
                type === 'logo' && styles.logoPreview
              ]}>
                <Image
                  source={{ uri: previewUri || currentImage }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
              </View>
              {previewUri && (
                <TouchableOpacity
                  style={styles.changeButton}
                  onPress={() => setPreviewUri(null)}
                >
                  <Text style={styles.changeButtonText}>
                    Choisir une autre image
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.emptyState}>
              {type === 'logo' ? (
                <ImageIcon size={64} color="#bdc3c7" />
              ) : (
                <Camera size={64} color="#bdc3c7" />
              )}
              <Text style={styles.emptyText}>
                {type === 'logo'
                  ? 'Aucun logo sélectionné'
                  : 'Aucune photo sélectionnée'
                }
              </Text>
            </View>
          )}

          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>
              Choisissez une option
            </Text>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={pickImageFromCamera}
              disabled={uploading}
            >
              <Camera size={24} color="#3498db" />
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>📸 Prendre une photo</Text>
                <Text style={styles.actionSubtitle}>
                  Utiliser l'appareil photo
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={pickImageFromLibrary}
              disabled={uploading}
            >
              <ImageIcon size={24} color="#9b59b6" />
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>🖼️ Choisir depuis la galerie</Text>
                <Text style={styles.actionSubtitle}>
                  Sélectionner une image existante
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {previewUri && (
            <TouchableOpacity
              style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Text style={styles.uploadButtonText}>
                    ⬆️ Uploader l'image
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💡 L'image sera automatiquement optimisée et sauvegardée de manière sécurisée.
            </Text>
            {type === 'logo' && (
              <Text style={styles.infoText}>
                🏛️ Le logo sera affiché dans l'en-tête de l'application et sur les exports.
              </Text>
            )}
            {type === 'member' && (
              <Text style={styles.infoText}>
                👤 La photo sera intégrée dans le QR Code du membre.
              </Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
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
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerSpacer: {
    width: 24,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  previewSection: {
    marginBottom: 24,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  validateButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  validateButtonDisabled: {
    backgroundColor: '#95a5a6',
    opacity: 0.6,
  },
  validateButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  previewContainer: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPreview: {
    height: 200,
    borderRadius: 100,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  changeButton: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#3498db',
    borderRadius: 8,
    alignItems: 'center',
  },
  changeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 16,
  },
  actionsSection: {
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#ecf0f1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionContent: {
    marginLeft: 16,
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  uploadButton: {
    backgroundColor: '#27ae60',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  uploadButtonDisabled: {
    backgroundColor: '#bdc3c7',
    shadowOpacity: 0,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  infoText: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 8,
    lineHeight: 20,
  },
});