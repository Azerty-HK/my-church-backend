"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionService = exports.PERMISSIONS = void 0;
exports.PERMISSIONS = [
    { key: 'canViewMembers', name: 'Voir les membres', description: 'Peut consulter la liste des membres' },
    { key: 'canEditMembers', name: 'Modifier les membres', description: 'Peut ajouter/modifier/supprimer des membres' },
    { key: 'canViewFinances', name: 'Voir les finances', description: 'Peut consulter les données financières' },
    { key: 'canEditFinances', name: 'Modifier les finances', description: 'Peut ajouter des revenus et dépenses' },
    { key: 'canApproveExpenses', name: 'Approuver les dépenses', description: 'Peut approuver les dépenses en attente' },
    { key: 'canViewReports', name: 'Voir les rapports', description: 'Peut consulter les rapports et archives' },
    { key: 'canCreateReports', name: 'Créer des rapports', description: 'Peut générer et exporter des rapports' },
    { key: 'canManageSettings', name: 'Gérer les paramètres', description: 'Peut modifier les paramètres de l\'église' },
];
class PermissionService {
    static getPermissionsForPosition(position) {
        const basePermissions = {
            canViewMembers: false,
            canEditMembers: false,
            canViewFinances: false,
            canEditFinances: false,
            canApproveExpenses: false,
            canViewReports: false,
            canCreateReports: false,
            canManageSettings: false,
        };
        switch (position) {
            case 'Pasteur':
                // Le pasteur a tous les droits
                return {
                    canViewMembers: true,
                    canEditMembers: true,
                    canViewFinances: true,
                    canEditFinances: true,
                    canApproveExpenses: true,
                    canViewReports: true,
                    canCreateReports: true,
                    canManageSettings: true,
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
                // Le secrétaire gère les membres et rapports
                return {
                    ...basePermissions,
                    canViewMembers: true,
                    canEditMembers: true,
                    canViewReports: true,
                    canCreateReports: true,
                };
            case 'Lecteur':
                // Le lecteur peut seulement consulter les rapports
                return {
                    ...basePermissions,
                    canViewReports: true,
                };
            case 'Gardien':
                // Le gardien a des permissions limitées
                return {
                    ...basePermissions,
                    canViewMembers: true,
                };
            default:
                // Autres postes ont des permissions de base
                return basePermissions;
        }
    }
    static canPerformAction(memberPermissions, action) {
        return memberPermissions[action] === true;
    }
    static getRestrictedPositions() {
        return ['Lecteur', 'Secrétaire', 'Trésorier'];
    }
    static isRestrictedPosition(position) {
        if (!position)
            return false;
        return this.getRestrictedPositions().includes(position);
    }
    static validatePositionCreation(position, creatorPosition) {
        if (!position)
            return { isValid: true };
        const restrictedPositions = this.getRestrictedPositions();
        if (restrictedPositions.includes(position)) {
            if (creatorPosition !== 'Pasteur') {
                return {
                    isValid: false,
                    error: `Seul le Pasteur peut créer le poste de ${position}`
                };
            }
        }
        return { isValid: true };
    }
    static getPositionHierarchy() {
        return {
            'Pasteur': 10,
            'Trésorier': 8,
            'Secrétaire': 7,
            'Lecteur': 6,
            'Ouvrier': 5,
            'Moniteur(trice)': 4,
            'Intercesseur(seuse)': 3,
            'Choriste': 2,
            'Sécurité': 2,
            'Protocole': 2,
            'Gardien': 1,
        };
    }
    static canManagePosition(managerPosition, targetPosition) {
        if (!managerPosition || !targetPosition)
            return false;
        const hierarchy = this.getPositionHierarchy();
        const managerLevel = hierarchy[managerPosition] || 0;
        const targetLevel = hierarchy[targetPosition] || 0;
        return managerLevel > targetLevel;
    }
}
exports.PermissionService = PermissionService;
