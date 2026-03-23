"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
require("react-native-get-random-values");
const uuid_1 = require("uuid");
const FileSystem = __importStar(require("expo-file-system"));
class StorageService {
    // Initialiser le répertoire de stockage
    static async initStorage() {
        try {
            const dirInfo = await FileSystem.getInfoAsync(this.IMAGES_DIR);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(this.IMAGES_DIR, { intermediates: true });
                console.log('📁 Répertoire images créé:', this.IMAGES_DIR);
            }
        }
        catch (error) {
            console.error('❌ Erreur init storage:', error);
        }
    }
    static async uploadImage(uri, path, filename) {
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
            const finalFilename = filename || `${path}_${(0, uuid_1.v4)()}.${extension}`;
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
        }
        catch (error) {
            console.error('❌ Erreur upload image:', error);
            return {
                success: false,
                error: error.message || 'Erreur lors de l\'upload'
            };
        }
    }
    static async deleteImage(url) {
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
        }
        catch (error) {
            console.error('❌ Erreur suppression image:', error);
            return false;
        }
    }
    static getImageUrl(path) {
        // Si c'est déjà une URL complète (http, https, ou file)
        if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('file://')) {
            return path;
        }
        // Sinon, c'est un chemin local
        return path;
    }
    static async compressImage(uri) {
        try {
            console.log('🗜️ Compression d\'image...');
            // Pour l'instant, on retourne l'URI sans compression
            // On pourrait utiliser expo-image-manipulator pour compresser réellement
            console.log('✅ Image prête (pas de compression appliquée)');
            return uri;
        }
        catch (error) {
            console.error('❌ Erreur compression image:', error);
            return uri;
        }
    }
    static isValidImageUrl(url) {
        if (!url)
            return false;
        // Accepter les URLs HTTP/HTTPS et les chemins locaux
        if (url.startsWith('file://') || url.startsWith(this.IMAGES_DIR)) {
            return true;
        }
        try {
            const parsedUrl = new URL(url);
            return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
        }
        catch {
            return false;
        }
    }
}
exports.StorageService = StorageService;
// Répertoire de stockage local pour les images
StorageService.IMAGES_DIR = `${FileSystem.documentDirectory}images/`;
