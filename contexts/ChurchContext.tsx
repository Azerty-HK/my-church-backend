import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Church, User } from '../types/database';
import { AuthService } from '../lib/auth';
import { DatabaseService } from '../lib/database';
import { RBACService, type RolePermissions } from '../utils/rbac';
import { ArchiveScheduler } from '../services/archiveScheduler';

interface ChurchContextType {
  church: Church | null;
  user: User | null;
  permissions: RolePermissions;
  loading: boolean;
  error: string | null;
  refreshChurch: () => Promise<void>;
  updateChurch: (updates: Partial<Church>) => Promise<void>;
  clearError: () => void;
}

const ChurchContext = createContext<ChurchContextType | undefined>(undefined);

interface ChurchProviderProps {
  children: ReactNode;
}

export function ChurchProvider({ children }: ChurchProviderProps) {
  const [church, setChurch] = useState<Church | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<RolePermissions>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const loadChurchAndUser = async () => {
    try {
      console.log('🏛️ Chargement du contexte My Church...');
      setError(null);
      
      const session = await AuthService.getCurrentSession();
      console.log('👤 Session utilisateur My Church:', session?.user?.id);
      
      if (session?.user && session?.church) {
        setUser(session.user);
        setChurch(session.church);

        // Calculer les permissions basées sur le rôle
        const userPermissions = RBACService.getPermissionsForRole(session.user.role);
        setPermissions(userPermissions);

        // Initialiser le planificateur d'archives automatiques
        ArchiveScheduler.initialize(session.church.id);

        console.log('⛪ Données My Church chargées:', session.church.name);
        console.log('👤 Utilisateur:', session.user.email, session.user.role);
        console.log('🔐 Permissions:', Object.keys(userPermissions).filter(k => userPermissions[k]));
      } else {
        console.log('ℹ️ Aucune session My Church active');
        setUser(null);
        setChurch(null);
        setPermissions({});
      }
    } catch (error: any) {
      console.error('💥 Erreur loadChurchAndUser My Church:', error);
      setError(`Erreur de connexion: ${error.message}`);
      setUser(null);
      setChurch(null);
      setPermissions({});
    } finally {
      setLoading(false);
    }
  };

  const refreshChurch = async () => {
    console.log('🔄 Actualisation My Church...');
    setLoading(true);
    setError(null);
    await loadChurchAndUser();
  };

  const updateChurch = async (updates: Partial<Church>) => {
    if (!church) {
      throw new Error('Aucune église à mettre à jour');
    }
    
    try {
      console.log('📝 Mise à jour église My Church:', updates);
      setError(null);
      
      const updatedChurch = await DatabaseService.updateChurch(church.id, updates);
      setChurch(updatedChurch);
      
      // Audit log
      if (user) {
        await DatabaseService.createAuditLogEntry({
          church_id: church.id,
          user_id: user.id,
          action: 'UPDATE_CHURCH',
          resource_type: 'Church',
          resource_id: church.id,
          details: updates
        });
      }
      
      console.log('✅ Église My Church mise à jour avec succès');
    } catch (error: any) {
      console.error('❌ Erreur mise à jour église My Church:', error);
      setError(`Erreur lors de la mise à jour: ${error.message}`);
      throw error;
    }
  };

  useEffect(() => {
    loadChurchAndUser();
    
    // Écouter les changements d'authentification
    const { data: { subscription } } = AuthService.onAuthStateChange(async (event, session) => {
      console.log('🔄 Changement d\'authentification My Church:', event);
      
      if (event === 'SIGNED_IN' && session) {
        console.log('✅ Utilisateur My Church connecté, rechargement...');
        await loadChurchAndUser();
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 Utilisateur My Church déconnecté');
        // Arrêter le planificateur
        ArchiveScheduler.stop();
        setUser(null);
        setChurch(null);
        setPermissions({});
        setError(null);
        setLoading(false);
      }
    });

    return () => {
      if (subscription && subscription.unsubscribe) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const value: ChurchContextType = {
    church,
    user,
    permissions,
    loading,
    error,
    refreshChurch,
    updateChurch,
    clearError,
  };

  return (
    <ChurchContext.Provider value={value}>
      {children}
    </ChurchContext.Provider>
  );
}

export function useChurch() {
  const context = useContext(ChurchContext);
  if (context === undefined) {
    throw new Error('useChurch must be used within a ChurchProvider');
  }
  return context;
}