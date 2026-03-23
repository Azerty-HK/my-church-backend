import 'react-native-get-random-values';
import { DatabaseService } from './database.ts';
import type { Church, User, SignUpData, CreateUserData } from '../types/database.ts';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  church: Church;
  user: User;
}

export class AuthService {
  static async signUp(data: SignUpData): Promise<AuthUser> {
    try {
      console.log('🚀 Inscription My Church - Created by Henock Aduma');
      console.log('📧 Email:', data.email);
      console.log('⛪ Église:', data.churchName);

      // Initialiser la base de données
      await DatabaseService.initialize();

      // Validation des données
      if (!data.email || data.email.length < 5) {
        throw new Error('Email invalide');
      }

      if (!data.password || data.password.length < 6) {
        throw new Error('Le mot de passe doit contenir au moins 6 caractères');
      }

      if (!data.churchName || data.churchName.trim().length < 2) {
        throw new Error('Le nom de l\'église doit contenir au moins 2 caractères');
      }

      const cleanAmount = Number(data.initialAmount) || 0;
      
      if (cleanAmount < 0) {
        throw new Error('Le montant initial ne peut pas être négatif');
      }
      
      if (cleanAmount > 999999999) {
        throw new Error('Le montant initial est trop élevé');
      }

      const normalizedEmail = data.email.trim().toLowerCase();

      // Vérifier si l'email existe déjà
      const existingUser = await DatabaseService.getUserByEmail(normalizedEmail);
      if (existingUser) {
        throw new Error('Un utilisateur avec cet email existe déjà');
      }

      // Créer l'église
      const churchData = {
        name: data.churchName.trim(),
        address: data.address?.trim() || '',
        email: normalizedEmail,
        phone: data.phone?.trim() || '',
        logo_url: data.logoUrl || '',
        currency: data.currency,
        initial_amount: cleanAmount,
        current_balance: cleanAmount,
        bank_balance: 0,
        theme: 'blue' as const,
        expense_limit: 1000,
        subscription_type: 'trial' as const,
        subscription_start: null,
        subscription_end: null,
        trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        setup_completed: true,
        is_active: true
      };

      const church = await DatabaseService.createChurch(churchData);
      
      // Créer l'utilisateur Admin
      const adminUser = await DatabaseService.createUser({
        email: normalizedEmail,
        password: data.password,
        firstName: data.firstName || 'Admin',
        lastName: data.lastName || 'Principal',
        role: 'Admin',
        churchId: church.id,
      });

      await DatabaseService.setCurrentUser(adminUser);

      // Audit log
      await DatabaseService.createAuditLogEntry({
        church_id: church.id,
        user_id: adminUser.id,
        action: 'CHURCH_CREATED',
        resource_type: 'Church',
        resource_id: church.id,
        details: { churchName: church.name, adminEmail: adminUser.email }
      });

      console.log('✅ Inscription réussie - My Church by Henock Aduma');
      console.log('🔑 API Key:', church.api_key);
      console.log('🔄 Update Code:', church.update_code);
      
      return { 
        id: adminUser.id, 
        email: adminUser.email, 
        role: adminUser.role,
        church,
        user: adminUser
      };
      
    } catch (error: any) {
      console.error('💥 Erreur inscription:', error);
      throw error;
    }
  }

  static async signIn(email: string, password: string): Promise<AuthUser> {
    try {
      console.log('🔐 Connexion My Church - Created by Henock Aduma');

      // Initialiser la base de données
      await DatabaseService.initialize();

      if (!email || !email.includes('@')) {
        throw new Error('Format d\'email invalide');
      }

      if (!password) {
        throw new Error('Mot de passe requis');
      }

      const normalizedEmail = email.trim().toLowerCase();

      const { user, church } = await DatabaseService.authenticateUser(normalizedEmail, password);

      await DatabaseService.setCurrentUser(user);

      // Audit log
      await DatabaseService.createAuditLogEntry({
        church_id: church.id,
        user_id: user.id,
        action: 'LOGIN',
        resource_type: 'User',
        resource_id: user.id,
        details: { email: user.email, role: user.role }
      });

      console.log('✅ Connexion réussie:', user.email, user.role);
      return {
        id: user.id,
        email: user.email,
        role: user.role,
        church,
        user
      };

    } catch (error: any) {
      console.error('💥 Erreur connexion:', error);
      throw error;
    }
  }

  static async signInByName(
    firstName: string,
    lastName: string,
    role: string,
    churchEmail: string,
    password: string
  ): Promise<AuthUser> {
    try {
      console.log('🔐 Connexion par nom My Church - Created by Henock Aduma');
      console.log('👤 Utilisateur:', firstName, lastName, '- Rôle:', role);

      // Initialiser la base de données
      await DatabaseService.initialize();

      if (!firstName || firstName.trim().length < 2) {
        throw new Error('Prénom invalide');
      }

      if (!lastName || lastName.trim().length < 2) {
        throw new Error('Nom invalide');
      }

      if (!role) {
        throw new Error('Rôle requis');
      }

      if (!churchEmail || !churchEmail.includes('@')) {
        throw new Error('Email de l\'église invalide');
      }

      if (!password) {
        throw new Error('Mot de passe requis');
      }

      const normalizedFirstName = firstName.trim();
      const normalizedLastName = lastName.trim();
      const normalizedChurchEmail = churchEmail.trim().toLowerCase();

      const { user, church } = await DatabaseService.authenticateByName(
        normalizedFirstName,
        normalizedLastName,
        role,
        normalizedChurchEmail,
        password
      );

      await DatabaseService.setCurrentUser(user);

      // Audit log
      await DatabaseService.createAuditLogEntry({
        church_id: church.id,
        user_id: user.id,
        action: 'LOGIN',
        resource_type: 'User',
        resource_id: user.id,
        details: {
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        }
      });

      console.log('✅ Connexion réussie:', user.first_name, user.last_name, user.role);
      return {
        id: user.id,
        email: user.email,
        role: user.role,
        church,
        user
      };

    } catch (error: any) {
      console.error('💥 Erreur connexion par nom:', error);
      throw error;
    }
  }

  static async signOut(): Promise<void> {
    try {
      console.log('🚪 Déconnexion My Church...');
      
      const currentUser = await DatabaseService.getCurrentUser();
      if (currentUser) {
        // Audit log
        try {
          await DatabaseService.createAuditLogEntry({
            church_id: currentUser.church_id,
            user_id: currentUser.id,
            action: 'LOGOUT',
            resource_type: 'User',
            resource_id: currentUser.id,
            details: { email: currentUser.email }
          });
        } catch (auditError) {
          console.log('⚠️ Erreur audit log lors de la déconnexion, mais on continue...');
        }
      }
      
      await DatabaseService.clearCurrentUser();
      console.log('✅ Déconnexion réussie');
      
      // Forcer le nettoyage complet
      return Promise.resolve();
    } catch (error: any) {
      console.error('💥 Erreur signOut:', error);
      // Ne pas throw l'erreur pour éviter de bloquer la déconnexion
      console.log('⚠️ Erreur lors de la déconnexion, mais on continue...');
      return Promise.resolve();
    }
  }

  static async getCurrentSession(): Promise<{ user: User; church: Church } | null> {
    try {
      const user = await DatabaseService.getCurrentUser();
      if (!user) return null;
      
      const church = await DatabaseService.getChurch(user.church_id);
      if (!church) return null;
      
      return { user, church };
    } catch (error) {
      return null;
    }
  }

  static onAuthStateChange(callback: (event: string, session: { user: User; church: Church } | null) => void) {
    // Pour un service d'authentification local, on vérifie immédiatement la session
    this.getCurrentSession().then(session => {
      if (session) {
        callback('SIGNED_IN', session);
      } else {
        callback('SIGNED_OUT', null);
      }
    });

    // Retourner un objet avec une méthode unsubscribe
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            console.log('Auth state change listener unsubscribed');
          }
        }
      }
    };
  }
}