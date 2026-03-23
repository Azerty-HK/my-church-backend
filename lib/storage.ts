import 'react-native-get-random-values';
import * as FileSystem from 'expo-file-system/legacy';
import { v4 as uuidv4 } from 'uuid';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export class StorageService {
  // Répertoire de stockage local des images
  private static IMAGES_DIR = `${FileSystem.documentDirectory}images/`;

  // Création du répertoire si inexistant
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

  // Upload local d'une image
  static async uploadImage(
    uri: string,
    path: 'logos' | 'members',
    filename?: string
  ): Promise<UploadResult> {
    try {
      console.log('📤 Upload image vers stockage local...');
      console.log('📍 URI source:', uri);

      await this.initStorage();

      // Vérifier l'existence du fichier source avec l'API legacy
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error("Le fichier source n'existe pas");
      }

      console.log('📊 Taille du fichier:', fileInfo.size, 'bytes');

      // Générer un nom unique
      const extension = uri.split('.').pop() || 'jpg';
      const finalFilename = filename || `${path}_${uuidv4()}.${extension}`;
      const destinationUri = `${this.IMAGES_DIR}${finalFilename}`;

      // Copier le fichier vers le stockage local
      await FileSystem.copyAsync({
        from: uri,
        to: destinationUri
      });

      console.log('✅ Image sauvegardée avec succès dans :', destinationUri);

      return {
        success: true,
        url: destinationUri
      };
    } catch (error: any) {
      console.error('❌ Erreur upload image:', error);
      return {
        success: false,
        error: error.message || "Erreur lors de l'upload"
      };
    }
  }

  // Suppression d'une image locale
  static async deleteImage(url: string): Promise<boolean> {
    try {
      console.log('🗑️ Suppression image:', url);

      // Vérifier si c'est une image interne
      if (url.startsWith(this.IMAGES_DIR)) {
        const fileInfo = await FileSystem.getInfoAsync(url);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(url);
          console.log('✅ Image supprimée');
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Erreur suppression image:', error);
      return false;
    }
  }

  // Récupérer l'URL complète
  static getImageUrl(path: string): string {
    if (
      path.startsWith('http://') ||
      path.startsWith('https://') ||
      path.startsWith('file://')
    ) {
      return path;
    }

    return path;
  }

  // (Optionnel) Compression d'image — ici sans compression
  static async compressImage(uri: string): Promise<string> {
    try {
      console.log('🗜️ Compression image (placeholder)...');
      return uri; // pas de compression pour l'instant
    } catch (error) {
      console.error('❌ Erreur compression image:', error);
      return uri;
    }
  }

  // Vérifier si une URL est valide
  static isValidImageUrl(url?: string | null): boolean {
    if (!url) return false;

    // Fichiers locaux autorisés
    if (url.startsWith('file://') || url.startsWith(this.IMAGES_DIR)) {
      return true;
    }

    // Vérifie si c'est une vraie URL HTTP/HTTPS
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // Vérifier l'existence d'un fichier avec l'API legacy
  static async fileExists(uri: string): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      return fileInfo.exists;
    } catch {
      return false;
    }
  }

  // Obtenir les informations d'un fichier
  static async getFileInfo(uri: string) {
    try {
      return await FileSystem.getInfoAsync(uri);
    } catch (error) {
      console.error('❌ Erreur getFileInfo:', error);
      return null;
    }
  }
} 