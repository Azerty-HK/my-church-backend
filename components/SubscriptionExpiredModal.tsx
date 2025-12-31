import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CreditCard, Calendar, X, CircleCheck as CheckCircle, Clock, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { SubscriptionService } from '../lib/subscription';
import { PaymentModal } from './PaymentModal';
import { useChurch } from '../contexts/ChurchContext';
import { APP_NAME, ERROR_MESSAGES } from '../utils/constants';

interface SubscriptionExpiredModalProps {
  visible: boolean;
  subscriptionStatus?: any;
  onClose: () => void;
  onRenewed: () => void;
}

export function SubscriptionExpiredModal({ 
  visible, 
  subscriptionStatus,
  onClose, 
  onRenewed 
}: SubscriptionExpiredModalProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const { church, refreshChurch } = useChurch();

  const handlePlanSelect = (type: 'monthly' | 'yearly') => {
    setSelectedPlan(type);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async () => {
    try {
      await refreshChurch();
      setShowPaymentModal(false);
      
      Alert.alert(
        'Abonnement activé ! 🎉',
        `Votre abonnement ${selectedPlan === 'monthly' ? 'mensuel' : 'annuel'} ${APP_NAME} a été activé avec succès !`,
        [{ text: 'Parfait !', onPress: () => {
          onRenewed();
          onClose();
        }}]
      );
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour l\'abonnement');
    }
  };

  const getStatusIcon = () => {
    if (!subscriptionStatus) return <AlertTriangle size={48} color="#f39c12" />;
    
    switch (subscriptionStatus.type) {
      case 'trial':
        return subscriptionStatus.isActive 
          ? <Clock size={48} color="#f39c12" />
          : <AlertTriangle size={48} color="#e74c3c" />;
      default:
        return <CreditCard size={48} color="#e74c3c" />;
    }
  };

  const getStatusMessage = () => {
    if (!subscriptionStatus) return 'Statut d\'abonnement inconnu';
    
    if (subscriptionStatus.isExpired) {
      return ERROR_MESSAGES.SUBSCRIPTION_EXPIRED;
    }
    
    if (subscriptionStatus.type === 'trial') {
      return subscriptionStatus.isActive
        ? `Votre essai gratuit expire dans ${subscriptionStatus.daysRemaining} jour${subscriptionStatus.daysRemaining > 1 ? 's' : ''}`
        : 'Votre essai gratuit a expiré';
    }
    
    return subscriptionStatus.message;
  };

  const plans = SubscriptionService.PLANS.filter(plan => plan.type !== 'trial');

  return (
    <>
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {!subscriptionStatus?.isExpired && (
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            )}
            
            <View style={styles.header}>
              {getStatusIcon()}
              <Text style={styles.title}>
                {subscriptionStatus?.type === 'trial' && subscriptionStatus?.isActive
                  ? 'Essai gratuit bientôt terminé'
                  : 'Abonnement requis'
                }
              </Text>
              <Text style={styles.subtitle}>
                {getStatusMessage()}
              </Text>
              <Text style={styles.appName}>
                {APP_NAME}
              </Text>
            </View>

            <View style={styles.plans}>
              {plans.map((plan) => (
                <TouchableOpacity
                  key={plan.type}
                  style={[
                    styles.plan,
                    plan.type === 'yearly' && styles.planRecommended,
                  ]}
                  onPress={() => handlePlanSelect(plan.type as 'monthly' | 'yearly')}
                >
                  <View style={styles.planHeader}>
                    <Calendar size={24} color={plan.type === 'yearly' ? '#27ae60' : '#3498db'} />
                    {plan.type === 'yearly' && (
                      <View style={styles.recommendedBadge}>
                        <Text style={styles.recommendedText}>RECOMMANDÉ</Text>
                      </View>
                    )}
                  </View>
                  
                  <Text style={styles.planTitle}>{plan.name}</Text>
                  <Text style={[
                    styles.planPrice,
                    { color: plan.type === 'yearly' ? '#27ae60' : '#3498db' }
                  ]}>
                    ${plan.price}
                  </Text>
                  <Text style={styles.planDuration}>{plan.duration}</Text>
                  
                  {plan.type === 'yearly' && (
                    <Text style={styles.planSavings}>Économisez $260 par an</Text>
                  )}

                  <View style={styles.planFeatures}>
                    {plan.features.slice(0, 3).map((feature, index) => (
                      <View key={index} style={styles.featureRow}>
                        <CheckCircle size={12} color="#27ae60" />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                💳 Paiement sécurisé • 🔒 Données protégées • 📞 Support 24/7
              </Text>
              <Text style={styles.footerApp}>
                {APP_NAME} - Created by Henock Aduma
              </Text>
            </View>
          </View>
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 450,
    maxHeight: '90%',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 8,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  appName: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: 'bold',
  },
  plans: {
    padding: 20,
    gap: 16,
  },
  plan: {
    borderWidth: 2,
    borderColor: '#ecf0f1',
    borderRadius: 12,
    padding: 20,
    backgroundColor: '#f8f9fa',
    position: 'relative',
  },
  planRecommended: {
    borderColor: '#27ae60',
    backgroundColor: '#e8f5e8',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recommendedBadge: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  planPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  planDuration: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 8,
  },
  planSavings: {
    fontSize: 12,
    color: '#27ae60',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 12,
  },
  planFeatures: {
    gap: 6,
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
  footer: {
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#adb5bd',
    textAlign: 'center',
  },
  footerApp: {
    fontSize: 10,
    color: '#bdc3c7',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});