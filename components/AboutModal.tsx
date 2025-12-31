import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { X, Star, CreditCard, Smartphone, DollarSign } from 'lucide-react-native';
import { APP_NAME } from '../utils/constants';
import { LogoComponent } from './LogoComponent';

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AboutModal({ visible, onClose }: AboutModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#7f8c8d" />
          </TouchableOpacity>
          <Text style={styles.title}>À propos</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content}>
          {/* Logo et description */}
          <View style={styles.logoSection}>
            <LogoComponent size={120} showText={false} />
            <Text style={styles.appName}>{APP_NAME}</Text>
            <Text style={styles.version}>Version 5.0</Text>
          </View>

          {/* Description de l'application */}
          <View style={styles.section}>
            
            <Text style={styles.description}>
              Solution complète de gestion d'église moderne. Gérez vos membres, finances, 
              événements et rapports avec une interface intuitive adaptée à chaque rôle.
            </Text>
          </View>

          {/* Tarifs d'abonnement */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💰 Tarifs d'abonnement</Text>
            
            <View style={styles.pricingCards}>
              <View style={styles.pricingCard}>
                <Text style={styles.planType}>Mensuel</Text>
                <Text style={styles.planPrice}>$100</Text>
                <Text style={styles.planDuration}>par mois</Text>
                <View style={styles.planFeatures}>
                  <Text style={styles.planFeature}>✅ Toutes les fonctionnalités</Text>
                  <Text style={styles.planFeature}>✅ Support 24/7</Text>
                  <Text style={styles.planFeature}>✅ Rapports illimités</Text>
                </View>
              </View>

              <View style={[styles.pricingCard, styles.recommendedCard]}>
                <View style={styles.recommendedBadge}>
                  <Star size={12} color="#f39c12" />
                  <Text style={styles.recommendedText}>RECOMMANDÉ</Text>
                </View>
                <Text style={styles.planType}>Annuel</Text>
                <Text style={[styles.planPrice, { color: '#27ae60' }]}>$1000</Text>
                <Text style={styles.planDuration}>par an</Text>
                <Text style={styles.planSavings}>Économie de $200 par an</Text>
                <View style={styles.planFeatures}>
                  <Text style={styles.planFeature}>✅ Toutes les fonctionnalités</Text>
                  <Text style={styles.planFeature}>✅ Support prioritaire</Text>
                  <Text style={styles.planFeature}>✅ API personnalisée</Text>
                </View>
              </View>
            </View>
            
            <Text style={styles.trialNote}>
              🎁 Essai gratuit de 30 jours inclus pour toutes les nouvelles églises
            </Text>
          </View>

          {/* Moyens de paiement */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💳 Moyens de paiement</Text>
            
            <View style={styles.paymentMethods}>
              <View style={styles.paymentCategory}>
                <Text style={styles.paymentCategoryTitle}>📱 Paiement mobile</Text>
                <View style={styles.paymentMethodsList}>
                  <View style={styles.paymentMethod}>
                    <Smartphone size={16} color="#3498db" />
                    <Text style={styles.paymentMethodText}>M-Pesa</Text>
                  </View>
                  <View style={styles.paymentMethod}>
                    <Smartphone size={16} color="#ff6b35" />
                    <Text style={styles.paymentMethodText}>Orange Money</Text>
                  </View>
                  <View style={styles.paymentMethod}>
                    <Smartphone size={16} color="#e74c3c" />
                    <Text style={styles.paymentMethodText}>Airtel Money</Text>
                  </View>
                  <View style={styles.paymentMethod}>
                    <Smartphone size={16} color="#27ae60" />
                    <Text style={styles.paymentMethodText}>Afrimoney</Text>
                  </View>
                </View>
              </View>

              <View style={styles.paymentCategory}>
                <Text style={styles.paymentCategoryTitle}>🏦 Paiement bancaire</Text>
                <View style={styles.paymentMethodsList}>
                  <View style={styles.paymentMethod}>
                    <CreditCard size={16} color="#2c3e50" />
                    <Text style={styles.paymentMethodText}>Virement bancaire</Text>
                  </View>
                  <View style={styles.paymentMethod}>
                    <CreditCard size={16} color="#9b59b6" />
                    <Text style={styles.paymentMethodText}>Carte bancaire</Text>
                  </View>
                </View>
              </View>
            </View>
            
            <Text style={styles.paymentNote}>
              🔒 Tous les paiements sont sécurisés et traités instantanément
            </Text>
          </View>

          {/* Fonctionnalités principales */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✨ Fonctionnalités principales</Text>
            
            <View style={styles.featuresList}>
              <Text style={styles.featureItem}>👥 Gestion complète des membres avec QR Codes</Text>
              <Text style={styles.featureItem}>💰 Suivi financier caisse + banque en temps réel</Text>
              <Text style={styles.featureItem}>📊 Rapports automatiques et exports PDF/Word</Text>
              <Text style={styles.featureItem}>🔐 Système de permissions par rôle (RBAC)</Text>
              <Text style={styles.featureItem}>📅 Gestion des événements et présences</Text>
              <Text style={styles.featureItem}>💬 Messagerie interne sécurisée</Text>
              <Text style={styles.featureItem}>🎨 Thèmes personnalisables</Text>
              <Text style={styles.featureItem}>📱 Compatible mobile, tablette et ordinateur</Text>
            </View>
          </View>

          {/* Contact */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📞 Support client</Text>
            <Text style={styles.contactText}>
              Notre équipe de support est disponible 24/7 pour vous accompagner dans l'utilisation de {APP_NAME}.
            </Text>
            <Text style={styles.contactText}>
              📧 Support technique et commercial disponible
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
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
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#34495e',
    lineHeight: 24,
    textAlign: 'justify',
  },
  pricingCards: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  pricingCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#ecf0f1',
    position: 'relative',
  },
  recommendedCard: {
    backgroundColor: '#e8f5e8',
    borderColor: '#27ae60',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -8,
    left: '50%',
    transform: [{ translateX: -40 }],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f39c12',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  recommendedText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
  planType: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#2c3e50',
  },
  planPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
    color: '#3498db',
  },
  planDuration: {
    fontSize: 12,
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
  planFeature: {
    fontSize: 11,
    color: '#2c3e50',
    textAlign: 'center',
  },
  trialNote: {
    fontSize: 14,
    color: '#27ae60',
    textAlign: 'center',
    fontWeight: '600',
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
  },
  paymentMethods: {
    gap: 16,
  },
  paymentCategory: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  paymentCategoryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  paymentMethodsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  paymentMethodText: {
    fontSize: 12,
    color: '#2c3e50',
  },
  paymentNote: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 20,
  },
  contactText: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 20,
    marginBottom: 8,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  aboutLogo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  version: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 8,
  },
});