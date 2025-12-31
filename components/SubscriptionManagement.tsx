import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { X, CreditCard, Calendar, Crown, CircleCheck as CheckCircle, Clock, Star } from 'lucide-react-native';
import { SubscriptionService } from '../lib/subscription';
import { PaymentModal } from './PaymentModal';
import { useChurch } from '../contexts/ChurchContext';

interface SubscriptionManagementProps {
  visible: boolean;
  onClose: () => void;
}

export function SubscriptionManagement({ visible, onClose }: SubscriptionManagementProps) {
  const { church, refreshChurch } = useChurch();
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && church) {
      loadSubscriptionStatus();
    }
  }, [visible, church]);

  const loadSubscriptionStatus = async () => {
    if (!church) return;
    
    setLoading(true);
    try {
      const status = SubscriptionService.getSubscriptionStatus(church);
      setSubscriptionStatus(status);
    } catch (error) {
      console.error('❌ Erreur chargement statut abonnement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = (type: 'monthly' | 'yearly') => {
    setSelectedPlan(type);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async () => {
    try {
      await refreshChurch();
      setShowPaymentModal(false);
      await loadSubscriptionStatus();
      
      Alert.alert(
        '🎉 Abonnement activé !',
        `Votre abonnement ${selectedPlan === 'monthly' ? 'mensuel' : 'annuel'} My Church a été activé avec succès !`,
        [{ text: 'Parfait !' }]
      );
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour l\'abonnement');
    }
  };

  const getStatusIcon = () => {
    if (!subscriptionStatus) return <Clock size={48} color="#f39c12" />;
    
    if (subscriptionStatus.isActive) {
      return <CheckCircle size={48} color="#27ae60" />;
    } else {
      return <Clock size={48} color="#e74c3c" />;
    }
  };

  const getStatusColor = () => {
    if (!subscriptionStatus) return '#f39c12';
    return subscriptionStatus.isActive ? '#27ae60' : '#e74c3c';
  };

  const plans = SubscriptionService.PLANS.filter(plan => plan.type !== 'trial');

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#7f8c8d" />
            </TouchableOpacity>
            <Text style={styles.title}>💎 Gestion d'abonnement</Text>
            <View style={styles.headerSpacer} />
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3498db" />
              <Text style={styles.loadingText}>Chargement de l'abonnement...</Text>
            </View>
          ) : (
            <ScrollView style={styles.content}>
              {/* Statut actuel */}
              <View style={styles.statusSection}>
                <View style={styles.statusHeader}>
                  {getStatusIcon()}
                  <Text style={styles.statusTitle}>Statut de l'abonnement</Text>
                </View>
                
                {subscriptionStatus && (
                  <View style={styles.statusInfo}>
                    <Text style={[styles.statusMessage, { color: getStatusColor() }]}>
                      {subscriptionStatus.message}
                    </Text>
                    
                    {subscriptionStatus.daysRemaining > 0 && (
                      <Text style={styles.statusDays}>
                        ⏰ {subscriptionStatus.daysRemaining} jour{subscriptionStatus.daysRemaining > 1 ? 's' : ''} restant{subscriptionStatus.daysRemaining > 1 ? 's' : ''}
                      </Text>
                    )}
                    
                    <Text style={styles.statusType}>
                      📋 Type: {subscriptionStatus.type === 'trial' ? 'Essai gratuit' : 
                                subscriptionStatus.type === 'monthly' ? 'Mensuel' : 
                                subscriptionStatus.type === 'yearly' ? 'Annuel' : 'Aucun'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Plans d'abonnement */}
              <View style={styles.plansSection}>
                <Text style={styles.plansTitle}>💰 Plans d'abonnement disponibles</Text>
                
                {plans.map((plan) => (
                  <View 
                    key={plan.type}
                    style={[
                      styles.planCard,
                      plan.type === 'yearly' && styles.planCardRecommended
                    ]}
                  >
                    <View style={styles.planHeader}>
                      <Calendar size={24} color={plan.type === 'yearly' ? '#27ae60' : '#3498db'} />
                      <View style={styles.planInfo}>
                        <Text style={styles.planName}>{plan.name}</Text>
                        <Text style={styles.planDuration}>{plan.duration}</Text>
                      </View>
                      {plan.type === 'yearly' && (
                        <View style={styles.recommendedBadge}>
                          <Crown size={16} color="#f39c12" />
                          <Text style={styles.recommendedText}>RECOMMANDÉ</Text>
                        </View>
                      )}
                    </View>
                    
                    <Text style={[
                      styles.planPrice,
                      { color: plan.type === 'yearly' ? '#27ae60' : '#3498db' }
                    ]}>
                      ${plan.price}
                    </Text>
                    
                    {plan.type === 'yearly' && (
                      <Text style={styles.planSavings}>
                        💰 Économisez $200 par an !
                      </Text>
                    )}

                    <View style={styles.planFeatures}>
                      {plan.features.map((feature, index) => (
                        <View key={index} style={styles.featureRow}>
                          <CheckCircle size={12} color="#27ae60" />
                          <Text style={styles.featureText}>{feature}</Text>
                        </View>
                      ))}
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.subscribeButton,
                        { backgroundColor: plan.type === 'yearly' ? '#27ae60' : '#3498db' }
                      ]}
                      onPress={() => handleSubscribe(plan.type as 'monthly' | 'yearly')}
                    >
                      <CreditCard size={20} color="white" />
                      <Text style={styles.subscribeButtonText}>
                        💳 S'abonner - ${plan.price}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Informations */}
              <View style={styles.infoSection}>
                <Text style={styles.infoTitle}>ℹ️ Informations importantes</Text>
                <View style={styles.infoList}>
                  <Text style={styles.infoItem}>
                    🔒 Paiements 100% sécurisés et simulés
                  </Text>
                  <Text style={styles.infoItem}>
                    📱 Support M-Pesa, Orange Money, Airtel Money, Afrimoney
                  </Text>
                  <Text style={styles.infoItem}>
                    🏦 Virements bancaires acceptés
                  </Text>
                  <Text style={styles.infoItem}>
                    ⚡ Activation instantanée après paiement
                  </Text>
                  <Text style={styles.infoItem}>
                    📞 Support client 24/7 inclus
                  </Text>
                  <Text style={styles.infoItem}>
                    🔄 Annulation possible à tout moment
                  </Text>
                </View>
              </View>

              {/* Signature */}
              <View style={styles.signature}>
                <Star size={16} color="#f39c12" />
                <Text style={styles.signatureText}>My Church - Created by Henock Aduma</Text>
                <Star size={16} color="#f39c12" />
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {church && (
        <PaymentModal
          visible={showPaymentModal}
          subscriptionType={selectedPlan}
          amount={SubscriptionService.getSubscriptionPrice(selectedPlan)}
          churchId={church.id}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerSpacer: {
    width: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 12,
  },
  statusInfo: {
    alignItems: 'center',
    gap: 8,
  },
  statusMessage: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusDays: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  statusType: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  plansSection: {
    marginBottom: 20,
  },
  plansTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
    textAlign: 'center',
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#ecf0f1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  planCardRecommended: {
    borderColor: '#27ae60',
    backgroundColor: '#f8fff8',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  planInfo: {
    flex: 1,
    marginLeft: 12,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  planDuration: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#f39c12',
  },
  planPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  planSavings: {
    fontSize: 14,
    color: '#27ae60',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 12,
  },
  planFeatures: {
    marginBottom: 16,
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 1,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  subscribeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  infoList: {
    gap: 8,
  },
  infoItem: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 20,
  },
  signature: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f39c12',
  },
  signatureText: {
    fontSize: 12,
    color: '#f39c12',
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
});