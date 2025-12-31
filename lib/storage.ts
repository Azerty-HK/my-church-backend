import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import * as FileSystem from 'expo-file-system';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export class StorageService {
  // Répertoire de stockage local pour les images
  private static IMAGES_DIR = `${FileSystem.documentDirectory}images/`;

  // Initialiser le répertoire de stockage
  static async initStorage() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.IMAGES_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.IMAGES_DIR, { intermediates: true });
        console.log('📁 Répertoire images créé:', this.IMAGES_DIR);
      }
    } catch (error) {
      console.error('❌ Erreur init storage:', error);
    }
  }

  static async uploadImage(
    uri: string,
    path: 'logos' | 'members',
    filename?: string
  ): Promise<UploadResult> {
    try {
      console.log('📤 Upload image réel vers stockage local...');
      console.log('📍 URI source:', uri);
      console.log('📁 Dossier:', path);

      // Initialiser le stockage
      await this.initStorage();

      // Vérifier que le fichier source existe
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('Le fichier source n\'existe pas');
      }

      console.log('📊 Taille du fichier:', fileInfo.size, 'bytes');

      // Générer un nom de fichier unique
      const extension = uri.split('.').pop() || 'jpg';
      const finalFilename = filename || `${path}_${uuidv4()}.${extension}`;
      const destinationUri = `${this.IMAGES_DIR}${finalFilename}`;

      // Copier le fichier vers le stockage permanent
      await FileSystem.copyAsync({
        from: uri,
        to: destinationUri
      });

      console.log('✅ Image sauvegardée avec succès');
      console.log('💾 URI locale:', destinationUri);

      return {
        success: true,
        url: destinationUri
      };
    } catch (error: any) {
      console.error('❌ Erreur upload image:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de l\'upload'
      };
    }
  }

  static async deleteImage(url: string): Promise<boolean> {
    try {
      console.log('🗑️ Suppression image:', url);

      // Vérifier si c'est une image locale
      if (url.startsWith(this.IMAGES_DIR)) {
        const fileInfo = await FileSystem.getInfoAsync(url);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(url);
          console.log('✅ Image locale supprimée avec succès');
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Erreur suppression image:', error);
      return false;
    }
  }

  static getImageUrl(path: string): string {
    // Si c'est déjà une URL complète (http, https, ou file)
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('file://')) {
      return path;
    }

    // Sinon, c'est un chemin local
    return path;
  }

  static async compressImage(uri: string): Promise<string> {
    try {
      console.log('🗜️ Compression d\'image...');
      // Pour l'instant, on retourne l'URI sans compression
      // On pourrait utiliser expo-image-manipulator pour compresser réellement
      console.log('✅ Image prête (pas de compression appliquée)');
      return uri;
    } catch (error) {
      console.error('❌ Erreur compression image:', error);
      return uri;
    }
  }

  static isValidImageUrl(url: string | undefined | null): boolean {
    if (!url) return false;

    // Accepter les URLs HTTP/HTTPS et les chemins locaux
    if (url.startsWith('file://') || url.startsWith(this.IMAGES_DIR)) {
      return true;
    }

    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
