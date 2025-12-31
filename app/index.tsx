import 'react-native-get-random-values';
import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Redirect } from 'expo-router';
import { SplashLoader } from '../components/SplashLoader';
import { SubscriptionGuard } from '../components/SubscriptionGuard';
import { useChurch } from '../contexts/ChurchContext';
import { AuthService } from '../lib/auth';
import { DatabaseService } from '../lib/database';

export default function IndexScreen() {
  const { church, loading: churchLoading, error: churchError, refreshChurch } = useChurch();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  /* -----------------------------
     INITIALISATION APPLICATION
  -------------------------------*/
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = useCallback(async () => {
    try {
      await DatabaseService.initialize();
      await checkAuthStatus();
    } catch (error) {
      console.error('❌ Erreur initialisation app:', error);
      setAuthLoading(false);
    }
  }, []);

  /* -----------------------------
     VERIFICATION AUTH
  -------------------------------*/
  const checkAuthStatus = async () => {
    try {
      const session = await AuthService.getCurrentSession();
      const isAuth = !!session?.user;

      setIsAuthenticated(isAuth);

      if (isAuth) {
        await refreshChurch();
      }
    } catch (error) {
      console.error('❌ Erreur vérification session:', error);
      setIsAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  };

  /* -----------------------------
     AUTH SUCCESS CALLBACK
  -------------------------------*/
  const handleAuthSuccess = async () => {
    setIsRedirecting(true);
    setIsAuthenticated(true);

    try {
      await refreshChurch();
    } catch (error) {
      console.error('❌ Erreur refresh church:', error);
    }

    setIsRedirecting(false);
  };

  /* -----------------------------
     UI LOADING PHASES
  -------------------------------*/
  if (showSplash) {
    return <SplashLoader onLoadingComplete={() => setShowSplash(false)} />;
  }

  // Si auth en cours, ou redirection en cours, ou chargement de l'église
  if (authLoading || isRedirecting || (isAuthenticated && churchLoading)) {
    return <SplashLoader onLoadingComplete={() => {}} />;
  }

  /* -----------------------------
     ERREUR CHURCH
  -------------------------------*/
  if (churchError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Erreur My Church: {churchError}</Text>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={async () => {
            try {
              await refreshChurch();
            } catch (e) {
              console.error('❌ Erreur retry:', e);
            }
          }}
        >
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* -----------------------------
     NON AUTHENTIFIÉ
  -------------------------------*/
  if (!isAuthenticated) {
    return <Redirect href="/welcome" />;
  }

  /* -----------------------------
     AUTHENTIFIÉ MAIS PAS D'ÉGLISE
  -------------------------------*/
  if (!church) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Aucune église trouvée pour votre compte</Text>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={async () => {
            await AuthService.signOut();
            setIsAuthenticated(false);
          }}
        >
          <Text style={styles.retryButtonText}>Se reconnecter</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* -----------------------------
     TOUT EST OK → REDIRECTION APP
  -------------------------------*/
  return (
    <SubscriptionGuard>
      <Redirect href="/(tabs)" />
    </SubscriptionGuard>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#e74c3c',
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
 