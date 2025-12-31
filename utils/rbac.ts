import type { UserRole } from '../types/database';

export interface Permission {
  key: string;
  name: string;
  description: string;
}

export const PERMISSIONS: Permission[] = [
  { key: 'canViewMembers', name: 'Voir les membres', description: 'Peut consulter la liste des membres' },
  { key: 'canEditMembers', name: 'Modifier les membres', description: 'Peut ajouter/modifier/supprimer des membres' },
  { key: 'canViewFinances', name: 'Voir les finances', description: 'Peut consulter les données financières' },
  { key: 'canEditFinances', name: 'Modifier les finances', description: 'Peut ajouter des revenus et dépenses' },
  { key: 'canApproveExpenses', name: 'Approuver les dépenses', description: 'Peut approuver les dépenses en attente' },
  { key: 'canViewReports', name: 'Voir les rapports', description: 'Peut consulter les rapports et archives' },
  { key: 'canCreateReports', name: 'Créer des rapports', description: 'Peut générer et exporter des rapports' },
  { key: 'canManageSettings', name: 'Gérer les paramètres', description: 'Peut modifier les paramètres de l\'église' },
  { key: 'canManageUsers', name: 'Gérer les utilisateurs', description: 'Peut créer/modifier/supprimer des utilisateurs' },
  { key: 'canViewAudit', name: 'Voir l\'audit', description: 'Peut consulter le journal d\'audit' },
  { key: 'canManageEvents', name: 'Gérer les événements', description: 'Peut créer et gérer les événements' },
  { key: 'canViewAttendance', name: 'Voir les présences', description: 'Peut consulter les présences aux événements' },
];

export interface RolePermissions {
  [key: string]: boolean;
}

export class RBACService {
  static getPermissionsForRole(role: UserRole): RolePermissions {
    const basePermissions: RolePermissions = {
      canViewMembers: false,
      canEditMembers: false,
      canViewFinances: false,
      canEditFinances: false,
      canApproveExpenses: false,
      canViewReports: false,
      canCreateReports: false,
      canManageSettings: false,
      canManageUsers: false,
      canViewAudit: false,
    };

    switch (role) {
      case 'Admin':
        // L'Admin a tous les droits
        return {
          canViewMembers: true,
          canEditMembers: true,
          canViewFinances: true,
          canEditFinances: true,
          canApproveExpenses: true,
          canViewReports: true,
          canCreateReports: true,
          canManageSettings: true,
          canManageUsers: true,
          canViewAudit: true,
        };
        
      case 'Trésorier':
        // Le trésorier gère les finances
        return {
          ...basePermissions,
          canViewFinances: true,
          canEditFinances: true,
          canApproveExpenses: true,
          canViewReports: true,
          canCreateReports: true,
        };
        
      case 'Secrétaire':
        // Le secrétaire gère les membres et événements
        return {
          ...basePermissions,
          canViewMembers: true,
          canEditMembers: true,
          canViewReports: true,
          canCreateReports: true,
        };
        
      case 'Lecteur':
        // Le lecteur peut seulement consulter
        return {
          ...basePermissions,
          canViewMembers: true,
          canViewFinances: true,
          canViewReports: true,
        };
        
      default:
        return basePermissions;
    }
  }

  static canPerformAction(userPermissions: RolePermissions, action: string): boolean {
    return userPermissions[action] === true;
  }

  static getRoleHierarchy(): Record<UserRole, number> {
    return {
      'Admin': 10,
      'Trésorier': 7,
      'Secrétaire': 5,
      'Lecteur': 3,
    };
  }

  static canManageUser(managerRole: UserRole, targetRole: UserRole): boolean {
    const hierarchy = this.getRoleHierarchy();
    const managerLevel = hierarchy[managerRole] || 0;
    const targetLevel = hierarchy[targetRole] || 0;
    
    return managerLevel > targetLevel;
  }

  static getAvailableRoles(currentUserRole: UserRole): UserRole[] {
    const hierarchy = this.getRoleHierarchy();
    const currentLevel = hierarchy[currentUserRole] || 0;
    
    return (Object.keys(hierarchy) as UserRole[]).filter(role => 
      hierarchy[role] < currentLevel
    );
  }

  static getRoleDisplayName(role: UserRole): string {
    const names = {
      'Admin': '👑 Administrateur',
      'Trésorier': '💰 Trésorier',
      'Secrétaire': '📑 Secrétaire',
      'Lecteur': '👀 Lecteur',
    };
    return names[role] || role;
  }

  static getRoleDescription(role: UserRole): string {
    const descriptions = {
      'Admin': 'Accès complet à toutes les fonctionnalités',
      'Trésorier': 'Gestion financière complète et rapports',
      'Secrétaire': 'Gestion des membres et événements',
      'Lecteur': 'Consultation uniquement, aucune modification',
    };
    return descriptions[role] || '';
  }
}