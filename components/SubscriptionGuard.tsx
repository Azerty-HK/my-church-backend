import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { SubscriptionExpiredModal } from './SubscriptionExpiredModal';
import { SubscriptionService } from '../lib/subscription';
import { useChurch } from '../contexts/ChurchContext';

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { church, loading: churchLoading } = useChurch();
  const [hasAccess, setHasAccess] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);

  useEffect(() => {
    if (church && !churchLoading) {
      checkAccess();
    }
  }, [church, churchLoading]);

  const checkAccess = async () => {
    if (!church) {
      setLoading(false);
      return;
    }

    try {
      console.log('🔒 Vérification accès abonnement My Church...');
      
      const access = await SubscriptionService.checkAccess(church.id);
      const status = SubscriptionService.getSubscriptionStatus(church);
      
      console.log('📊 Statut abonnement My Church:', status);
      
      setHasAccess(access);
      setSubscriptionStatus(status);
      
      // Afficher le modal si l'abonnement est expiré
      if (status.isExpired) {
        console.log('⚠️ Accès refusé My Church - abonnement expiré');
        setShowModal(true);
      } else {
        console.log('✅ Accès autorisé My Church');
        setShowModal(false);
      }
    } catch (error) {
      console.error('❌ Erreur vérification abonnement My Church:', error);
      setHasAccess(false);
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionRenewed = () => {
    console.log('🔄 Abonnement My Church renouvelé, vérification accès...');
    checkAccess();
  };

  if (loading || churchLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Vérification de l'abonnement My Church...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {children}
      <SubscriptionExpiredModal
        visible={showModal}
        subscriptionStatus={subscriptionStatus}
        onClose={() => setShowModal(false)}
        onRenewed={handleSubscriptionRenewed}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
  },
});