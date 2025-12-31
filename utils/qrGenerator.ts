import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export interface QRCodeData {
  memberId: string;
  churchId: string;
  timestamp: string;
  type: 'member' | 'dossier';
  dossierId?: string;
}

export interface MemberQRData extends QRCodeData {
  firstName: string;
  lastName: string;
  memberType: 'Membre' | 'Personnel';
  dossierNumber?: string;
  hasDossier: boolean;
}

export class QRGenerator {
  static generateMemberQR(
    memberId: string, 
    churchId: string, 
    memberNumber?: number,
    hasDossier?: boolean
  ): string {
    try {
      const memberNum = memberNumber ? memberNumber.toString().padStart(5, '0') : '00000';
      const churchCode = churchId.substring(0, 6).toUpperCase();
      const timestamp = Date.now().toString(36).toUpperCase();
      const dossierFlag = hasDossier ? 'D' : 'N';
      
      return `MC-${churchCode}-${memberNum}-${timestamp}-${dossierFlag}`;
    } catch (error) {
      console.error('❌ Erreur génération QR:', error);
      return `MC-DEFAULT-${Date.now()}`;
    }
  }

  static generateDossierQR(
    dossierId: string,
    memberId: string,
    churchId: string
  ): string {
    try {
      const dossierCode = dossierId.substring(0, 8).toUpperCase();
      const memberCode = memberId.substring(0, 6).toUpperCase();
      const churchCode = churchId.substring(0, 4).toUpperCase();
      const timestamp = Date.now().toString(36).toUpperCase();
      
      return `DOS-${churchCode}-${memberCode}-${dossierCode}-${timestamp}`;
    } catch (error) {
      console.error('❌ Erreur génération QR dossier:', error);
      return `DOS-DEFAULT-${Date.now()}`;
    }
  }

  static validateQR(qrCode: string): boolean {
    if (!qrCode || typeof qrCode !== 'string') return false;
    
    // Formats supportés:
    // MC- pour membre (avec ou sans dossier)
    // DOS- pour dossier
    const qrPattern = /^(MC|DOS)-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+(-[A-Z0-9]+)*$/;
    return qrPattern.test(qrCode);
  }

  static parseQR(qrCode: string): QRCodeData | null {
    try {
      if (!this.validateQR(qrCode)) return null;
      
      const parts = qrCode.split('-');
      if (parts.length < 4) return null;
      
      const type = parts[0] === 'MC' ? 'member' : 'dossier';
      
      const baseData: QRCodeData = {
        memberId: parts[2] || '',
        churchId: parts[1] || '',
        timestamp: parts[3] || '',
        type: type
      };

      if (type === 'dossier' && parts.length > 4) {
        return {
          ...baseData,
          dossierId: parts[3]
        };
      }

      if (type === 'member' && parts.length > 4) {
        return {
          ...baseData,
          dossierId: parts[4] === 'D' ? 'HAS_DOSSIER' : undefined
        };
      }
      
      return baseData;
    } catch (error) {
      console.error('❌ Erreur parsing QR:', error);
      return null;
    }
  }

  static parseMemberQR(qrCode: string): MemberQRData | null {
    try {
      const parsed = this.parseQR(qrCode);
      if (!parsed || parsed.type !== 'member') return null;

      // Pour un vrai scénario, vous auriez besoin d'accéder aux données du membre
      // Pour l'exemple, nous allons simuler l'extraction des informations
      const hasDossier = parsed.dossierId === 'HAS_DOSSIER';
      
      return {
        ...parsed,
        firstName: 'Non disponible',
        lastName: 'Non disponible',
        memberType: 'Membre',
        dossierNumber: hasDossier ? `DOS-${Date.now().toString(36).toUpperCase()}` : undefined,
        hasDossier: hasDossier
      };
    } catch (error) {
      console.error('❌ Erreur parsing QR membre:', error);
      return null;
    }
  }

  static generateUniqueCode(prefix: string = 'MC'): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${random}`;
  }

  static generateDossierNumber(memberId: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const memberCode = memberId.substring(0, 6).toUpperCase();
    return `DOS-${memberCode}-${timestamp}`;
  }

  static isExpired(qrCode: string, maxAgeHours: number = 24): boolean {
    try {
      const parsed = this.parseQR(qrCode);
      if (!parsed) return true;
      
      const timestamp = parseInt(parsed.timestamp, 36);
      const now = Date.now();
      const ageHours = (now - timestamp) / (1000 * 60 * 60);
      
      return ageHours > maxAgeHours;
    } catch (error) {
      console.error('❌ Erreur vérification expiration QR:', error);
      return true;
    }
  }

  static extractDossierInfo(qrCode: string): { hasDossier: boolean; dossierNumber?: string } {
    const parsed = this.parseQR(qrCode);
    if (!parsed) return { hasDossier: false };
    
    if (parsed.type === 'dossier') {
      return {
        hasDossier: true,
        dossierNumber: parsed.dossierId
      };
    }
    
    return {
      hasDossier: parsed.dossierId === 'HAS_DOSSIER'
    };
  }

  static generateMemberWithDossierQR(
    memberId: string,
    churchId: string,
    memberNumber: number,
    dossierId?: string
  ): string {
    try {
      const memberNum = memberNumber.toString().padStart(5, '0');
      const churchCode = churchId.substring(0, 6).toUpperCase();
      const timestamp = Date.now().toString(36).toUpperCase();
      
      if (dossierId) {
        const dossierCode = dossierId.substring(0, 6).toUpperCase();
        return `MC-${churchCode}-${memberNum}-${timestamp}-D-${dossierCode}`;
      } else {
        return `MC-${churchCode}-${memberNum}-${timestamp}-N`;
      }
    } catch (error) {
      console.error('❌ Erreur génération QR avec dossier:', error);
      return this.generateMemberQR(memberId, churchId, memberNumber);
    }
  }

  static scanQRForDossier(qrCode: string): { 
    type: 'member' | 'dossier'; 
    memberId?: string; 
    dossierId?: string;
    isValid: boolean;
  } {
    try {
      if (!this.validateQR(qrCode)) {
        return { type: 'member', isValid: false };
      }
      
      const parsed = this.parseQR(qrCode);
      if (!parsed) {
        return { type: 'member', isValid: false };
      }
      
      return {
        type: parsed.type,
        memberId: parsed.memberId,
        dossierId: parsed.type === 'dossier' ? parsed.dossierId : undefined,
        isValid: true
      };
    } catch (error) {
      console.error('❌ Erreur scan QR:', error);
      return { type: 'member', isValid: false };
    }
  }
}