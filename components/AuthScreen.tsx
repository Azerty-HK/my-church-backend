import 'react-native-get-random-values';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Church, Mail, Lock, Phone, MapPin, DollarSign, Users, Eye, EyeOff, Star } from 'lucide-react-native';
import { AuthService } from '../lib/auth';
import { DatabaseService } from '../lib/database';
import { ValidationService } from '../utils/validation';
import { getCurrencySymbol, getCurrencyName, SUPPORTED_CURRENCIES } from '../utils/currency';
import { PublicLinksView } from './PublicLinksView';
import { APP_NAME } from '../utils/constants';
import type { SignUpData } from '../types/database';

interface AuthScreenProps {
  onAuthSuccess: () => Promise<void>;
}

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'public'>('signin');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Champs de connexion
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [churchEmail, setChurchEmail] = useState('');
  const [userRole, setUserRole] = useState<'Admin' | 'Trésorier' | 'Secrétaire' | 'Lecteur'>('Admin');

  // Champs de connexion par nom
  const [signInFirstName, setSignInFirstName] = useState('');
  const [signInLastName, setSignInLastName] = useState('');
  
  // Champs d'inscription
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [churchName, setChurchName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [currency, setCurrency] = useState<'FC' | 'USD' | 'EURO'>('FC');
  const [initialAmount, setInitialAmount] = useState('');

  // États de validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isSignUp = mode === 'signup';

  const validateField = (field: string, value: string) => {
    let validation;
    
    switch (field) {
      case 'email':
        validation = ValidationService.validateEmail(value);
        break;
      case 'password':
        validation = ValidationService.validatePassword(value);
        break;
      case 'firstName':
      case 'lastName':
        validation = ValidationService.validateMemberName(value);
        break;
      case 'churchName':
        validation = ValidationService.validateChurchName(value);
        break;
      case 'churchEmail':
        validation = ValidationService.validateEmail(value);
        break;
      case 'phone':
        validation = ValidationService.validatePhone(value);
        break;
      case 'initialAmount':
        validation = ValidationService.validateInitialAmount(value);
        break;
      default:
        validation = { isValid: true };
    }
    
    setErrors(prev => ({
      ...prev,
      [field]: validation.isValid ? '' : (validation.error || 'Erreur de validation')
    }));
    
    return validation.isValid;
  };

  const validateAllFields = () => {
    const fieldsToValidate = isSignUp 
      ? ['email', 'password', 'firstName', 'lastName', 'churchName', 'initialAmount']
      : ['churchEmail', 'password'];
    
    let isValid = true;
    const newErrors: Record<string, string> = {};
    
    fieldsToValidate.forEach(field => {
      let value = '';
      switch (field) {
        case 'email': value = email; break;
        case 'password': value = password; break;
        case 'churchEmail': value = churchEmail; break;
        case 'firstName': value = firstName; break;
        case 'lastName': value = lastName; break;
        case 'churchName': value = churchName; break;
        case 'initialAmount': value = initialAmount; break;
      }
      
      const validation = field === 'email' ? ValidationService.validateEmail(value) :
                        field === 'password' ? ValidationService.validatePassword(value) :
                        field === 'firstName' || field === 'lastName' ? ValidationService.validateMemberName(value) :
                        field === 'churchName' ? ValidationService.validateChurchName(value) :
                        field === 'churchEmail' ? ValidationService.validateEmail(value) :
                        field === 'initialAmount' ? ValidationService.validateInitialAmount(value) :
                        { isValid: true };
      
      if (!validation.isValid) {
        newErrors[field] = validation.error || 'Erreur de validation';
        isValid = false;
      }
    });
    
    if (isSignUp && phone.trim()) {
      const phoneValidation = ValidationService.validatePhone(phone);
      if (!phoneValidation.isValid) {
        newErrors.phone = phoneValidation.error || 'Téléphone invalide';
        isValid = false;
      }
    }
    
    setErrors(newErrors);
    return isValid;
  };

  const handleSignIn = async () => {
    // Validation
    if (!signInFirstName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre prénom');
      return;
    }
    if (!signInLastName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre nom');
      return;
    }
    if (!churchEmail.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer l\'email de l\'église');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre mot de passe');
      return;
    }

    setLoading(true);
    try {
      console.log('🔐 Tentative de connexion par nom...');
      console.log('👤 Utilisateur:', signInFirstName, signInLastName, '- Rôle:', userRole);
      console.log('⛪ Église:', churchEmail);

      await AuthService.signInByName(
        signInFirstName.trim(),
        signInLastName.trim(),
        userRole,
        churchEmail.trim(),
        password
      );

      console.log('✅ Connexion réussie');
      await onAuthSuccess();
    } catch (error: any) {
      console.error('❌ Erreur connexion:', error);
      Alert.alert(
        'Erreur de connexion',
        error.message || 'Vérifiez vos identifiants et réessayez'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!validateAllFields()) {
      Alert.alert('Erreur de validation', 'Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    setLoading(true);
    try {
      // Convertir initialAmount en number proprement
      const cleanAmountString = initialAmount.toString().trim();
      const numericAmount = cleanAmountString
        .replace(/[^\d.,]/g, '') // Supprimer tout sauf chiffres, virgules, points
        .replace(',', '.'); // Remplacer virgule par point
      const finalAmount = parseFloat(numericAmount) || 0;
      
      const signUpData: SignUpData = {
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        churchName: churchName.trim(),
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        currency,
        initialAmount: finalAmount,
      };

      console.log('🚀 Tentative d\'inscription...');
      const result = await AuthService.signUp(signUpData);
      
      console.log('✅ Inscription réussie My Church!');
      
      // Redirection directe vers l'interface
      await onAuthSuccess();
    } catch (error: any) {
      console.error('❌ Erreur inscription:', error);
      
      if (error.message?.includes('email existe déjà')) {
        Alert.alert(
          'Email déjà utilisé',
          `L'email "${email}" est déjà associé à une église.\n\nVoulez-vous vous connecter à la place?`,
          [
            { text: 'Annuler', style: 'cancel' },
            { 
              text: 'Se connecter', 
              onPress: () => {
                setMode('signin');
                setChurchEmail(email);
                setUserRole('Admin');
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Erreur d\'inscription', 
          error.message || 'Une erreur est survenue lors de l\'inscription'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setChurchEmail('');
    setUserRole('Admin');
    setSignInFirstName('');
    setSignInLastName('');
    setFirstName('');
    setLastName('');
    setChurchName('');
    setAddress('');
    setPhone('');
    setCurrency('FC');
    setInitialAmount('');
    setErrors({});
    setShowPassword(false);
  };

  const switchMode = (newMode: 'signin' | 'signup' | 'public') => {
    resetForm();
    setMode(newMode);
  };

  if (mode === 'public') {
    return (
      <PublicLinksView 
        onBack={() => switchMode('signin')}
      />
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Church size={80} color="#3498db" />
            <View style={styles.logoGlow} />
          </View>
          <Text style={styles.title}>{APP_NAME}</Text>
          <Text style={styles.subtitle}>
            {isSignUp ? 'Créez votre église numérique' : 'Connectez-vous à votre église'}
          </Text>
          <View style={styles.signatureContainer}>
            <Star size={16} color="#f39c12" />
            <Text style={styles.signature}>Created by Henock Aduma</Text>
            <Star size={16} color="#f39c12" />
          </View>
        </View>

        <View style={styles.form}>
          {!isSignUp && (
            <>
              {/* Prénom et Nom pour connexion */}
              <View style={styles.nameRow}>
                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>Prénom *</Text>
                  <View style={styles.inputGroup}>
                    <Users size={20} color="#7f8c8d" />
                    <TextInput
                      style={styles.input}
                      placeholder="Votre prénom"
                      placeholderTextColor="#adb5bd"
                      value={signInFirstName}
                      onChangeText={setSignInFirstName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>Nom *</Text>
                  <View style={styles.inputGroup}>
                    <Users size={20} color="#7f8c8d" />
                    <TextInput
                      style={styles.input}
                      placeholder="Votre nom"
                      placeholderTextColor="#adb5bd"
                      value={signInLastName}
                      onChangeText={setSignInLastName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              </View>

              {/* Email de l'église */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email de l'église *</Text>
                <View style={[styles.inputGroup, errors.churchEmail && styles.inputGroupError]}>
                  <Church size={20} color="#7f8c8d" />
                  <TextInput
                    style={styles.input}
                    placeholder="eglise@exemple.com"
                    placeholderTextColor="#adb5bd"
                    value={churchEmail}
                    onChangeText={(text) => {
                      setChurchEmail(text);
                      if (errors.churchEmail) validateField('churchEmail', text);
                    }}
                    onBlur={() => validateField('churchEmail', churchEmail)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {errors.churchEmail ? <Text style={styles.errorText}>{errors.churchEmail}</Text> : null}
              </View>

              {/* Sélection du rôle utilisateur */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Votre rôle dans l'église *</Text>
                <Text style={styles.roleHelp}>
                  Sélectionnez votre fonction dans l'église
                </Text>
                <View style={styles.roleButtons}>
                  {(['Admin', 'Trésorier', 'Secrétaire', 'Lecteur'] as const).map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleButton,
                        userRole === role && styles.roleButtonActive
                      ]}
                      onPress={() => setUserRole(role)}
                    >
                      <Text style={[
                        styles.roleButtonText,
                        userRole === role && styles.roleButtonTextActive
                      ]}>
                        {role === 'Admin' ? '👑 Administrateur' :
                         role === 'Trésorier' ? '💰 Trésorier' :
                         role === 'Secrétaire' ? '📑 Secrétaire' :
                         '👀 Lecteur'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}

          {isSignUp && (
            <>
              {/* Email pour inscription */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email *</Text>
                <View style={[styles.inputGroup, errors.email && styles.inputGroupError]}>
                  <Mail size={20} color="#7f8c8d" />
                  <TextInput
                    style={styles.input}
                    placeholder="votre@email.com"
                    placeholderTextColor="#adb5bd"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (errors.email) validateField('email', text);
                    }}
                    onBlur={() => validateField('email', email)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
              </View>
            </>
          )}

          {/* Mot de passe */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Mot de passe *</Text>
            <View style={[styles.inputGroup, errors.password && styles.inputGroupError]}>
              <Lock size={20} color="#7f8c8d" />
              <TextInput
                style={styles.input}
                placeholder="Minimum 6 caractères"
                placeholderTextColor="#adb5bd"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) validateField('password', text);
                }}
                onBlur={() => validateField('password', password)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
              >
                {showPassword ? <EyeOff size={20} color="#7f8c8d" /> : <Eye size={20} color="#7f8c8d" />}
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>

          {isSignUp && (
            <>
              {/* Prénom et Nom */}
              <View style={styles.nameRow}>
                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>Prénom *</Text>
                  <View style={[styles.inputGroup, errors.firstName && styles.inputGroupError]}>
                    <Users size={20} color="#7f8c8d" />
                    <TextInput
                      style={styles.input}
                      placeholder="Votre prénom"
                      placeholderTextColor="#adb5bd"
                      value={firstName}
                      onChangeText={(text) => {
                        setFirstName(text);
                        if (errors.firstName) validateField('firstName', text);
                      }}
                      onBlur={() => validateField('firstName', firstName)}
                      autoCapitalize="words"
                    />
                  </View>
                  {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}
                </View>

                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>Nom *</Text>
                  <View style={[styles.inputGroup, errors.lastName && styles.inputGroupError]}>
                    <Users size={20} color="#7f8c8d" />
                    <TextInput
                      style={styles.input}
                      placeholder="Votre nom"
                      placeholderTextColor="#adb5bd"
                      value={lastName}
                      onChangeText={(text) => {
                        setLastName(text);
                        if (errors.lastName) validateField('lastName', text);
                      }}
                      onBlur={() => validateField('lastName', lastName)}
                      autoCapitalize="words"
                    />
                  </View>
                  {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}
                </View>
              </View>

              {/* Nom de l'église */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Nom de l'église *</Text>
                <View style={[styles.inputGroup, errors.churchName && styles.inputGroupError]}>
                  <Church size={20} color="#7f8c8d" />
                  <TextInput
                    style={styles.input}
                    placeholder="Église Évangélique..."
                    placeholderTextColor="#adb5bd"
                    value={churchName}
                    onChangeText={(text) => {
                      setChurchName(text);
                      if (errors.churchName) validateField('churchName', text);
                    }}
                    onBlur={() => validateField('churchName', churchName)}
                    autoCapitalize="words"
                  />
                </View>
                {errors.churchName ? <Text style={styles.errorText}>{errors.churchName}</Text> : null}
              </View>

              {/* Adresse */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Adresse (optionnel)</Text>
                <View style={styles.inputGroup}>
                  <MapPin size={20} color="#7f8c8d" />
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Adresse complète de l'église"
                    placeholderTextColor="#adb5bd"
                    value={address}
                    onChangeText={setAddress}
                    multiline
                    numberOfLines={2}
                  />
                </View>
              </View>

              {/* Téléphone */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Téléphone (optionnel)</Text>
                <View style={[styles.inputGroup, errors.phone && styles.inputGroupError]}>
                  <Phone size={20} color="#7f8c8d" />
                  <TextInput
                    style={styles.input}
                    placeholder="+243 XXX XXX XXX"
                    placeholderTextColor="#adb5bd"
                    value={phone}
                    onChangeText={(text) => {
                      setPhone(text);
                      if (errors.phone) validateField('phone', text);
                    }}
                    onBlur={() => validateField('phone', phone)}
                    keyboardType="phone-pad"
                  />
                </View>
                {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
              </View>

              {/* Sélection de devise */}
              <View style={styles.currencyContainer}>
                <Text style={styles.currencyLabel}>💰 Devise de l'église *</Text>
                <Text style={styles.currencyHelp}>
                  Toutes les transactions seront dans cette devise
                </Text>
                <View style={styles.currencyButtons}>
                  {SUPPORTED_CURRENCIES.map((curr) => (
                    <TouchableOpacity
                      key={curr.code}
                      style={[
                        styles.currencyButton,
                        currency === curr.code && styles.currencyButtonActive
                      ]}
                      onPress={() => setCurrency(curr.code as any)}
                    >
                      <Text style={[
                        styles.currencyButtonText,
                        currency === curr.code && styles.currencyButtonTextActive
                      ]}>
                        {curr.name}
                      </Text>
                      <Text style={[
                        styles.currencyButtonSymbol,
                        currency === curr.code && styles.currencyButtonTextActive
                      ]}>
                        ({curr.symbol})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Montant initial */}
              <View style={styles.amountContainer}>
                <Text style={styles.amountLabel}>
                  💵 Capital de départ (Caisse) *
                </Text>
                <Text style={styles.amountHelp}>
                  Ce montant sera votre solde initial de caisse en {getCurrencyName(currency)}
                </Text>
                <View style={[styles.inputGroup, styles.amountInputGroup, errors.initialAmount && styles.inputGroupError]}>
                  <DollarSign size={20} color="#7f8c8d" />
                  <TextInput
                    style={[styles.input, styles.amountInput]}
                    placeholder="0"
                    placeholderTextColor="#adb5bd"
                    value={initialAmount}
                    onChangeText={(text) => {
                      // Permettre seulement les chiffres, un point ou une virgule
                      let cleanText = text.replace(/[^0-9.,]/g, '');
                      
                      // S'assurer qu'il n'y a qu'un seul séparateur décimal
                      const separators = (cleanText.match(/[.,]/g) || []).length;
                      if (separators > 1) {
                        // Garder seulement le premier séparateur
                        const firstSeparatorIndex = cleanText.search(/[.,]/);
                        cleanText = cleanText.substring(0, firstSeparatorIndex + 1) + 
                                   cleanText.substring(firstSeparatorIndex + 1).replace(/[.,]/g, '');
                      }
                      
                      // Limiter à 2 décimales après le séparateur
                      const separatorIndex = cleanText.search(/[.,]/);
                      if (separatorIndex !== -1 && cleanText.length > separatorIndex + 3) {
                        cleanText = cleanText.substring(0, separatorIndex + 3);
                      }
                      
                      setInitialAmount(cleanText);
                      if (errors.initialAmount) validateField('initialAmount', cleanText);
                    }}
                    onBlur={() => validateField('initialAmount', initialAmount)}
                    keyboardType="numeric"
                  />
                  <View style={styles.currencyDisplay}>
                    <Text style={styles.currencyDisplayText}>
                      {getCurrencySymbol(currency)}
                    </Text>
                  </View>
                </View>
                {errors.initialAmount ? <Text style={styles.errorText}>{errors.initialAmount}</Text> : null}
              </View>
            </>
          )}

          {/* Bouton principal */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={isSignUp ? handleSignUp : handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.buttonText}>
                {isSignUp ? '🚀 Créer l\'église' : '🔐 Se connecter'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Basculer entre inscription/connexion */}
          <TouchableOpacity 
            style={styles.toggleButton} 
            onPress={() => switchMode(isSignUp ? 'signin' : 'signup')}
            disabled={loading}
          >
            <Text style={styles.toggleText}>
              {isSignUp 
                ? 'Déjà inscrit? Se connecter' 
                : 'Pas encore inscrit? Créer une église'
              }
            </Text>
          </TouchableOpacity>

          {/* Liens publics */}
          {!isSignUp && (
            <TouchableOpacity 
              style={styles.publicLinksButton} 
              onPress={() => switchMode('public')}
              disabled={loading}
            >
              <Users size={20} color="#3498db" />
              <Text style={styles.publicLinksText}>
                🌐 Voir les liens publics des églises
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Informations d'essai */}
        {isSignUp && (
          <View style={styles.trialInfo}>
            <Text style={styles.trialText}>
              🎭 Compte de démo disponible!
            </Text>
            <Text style={styles.trialSubtext}>
              Testez toutes les fonctionnalités avec des données pré-remplies
            </Text>
            <TouchableOpacity 
              style={styles.demoButton}
              onPress={async () => {
                try {
                  setLoading(true);
                  console.log('🎭 Connexion compte démo My Church...');
                  // Passer en mode connexion et pré-remplir les champs démo
                  setMode('signin');
                  setSignInFirstName('Admin');
                  setSignInLastName('Demo');
                  setChurchEmail('demo.mychurch.com');
                  setUserRole('Admin');
                  setPassword('demo123');

                  // Se connecter automatiquement
                  await AuthService.signInByName('Admin', 'Demo', 'Admin', 'demo.mychurch.com', 'demo123');
                  await onAuthSuccess();
                } catch (error: any) {
                  Alert.alert('Erreur démo', error.message);
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              <Text style={styles.demoButtonText}>
                🎭 Essayer le compte démo
              </Text>
            </TouchableOpacity>
            <View style={styles.featuresList}>
              <Text style={styles.featureItem}>✅ Gestion complète des membres avec QR Codes</Text>
              <Text style={styles.featureItem}>✅ Comptes rendus financiers caisse + banque</Text>
              <Text style={styles.featureItem}>✅ Rapports automatiques et archives</Text>
              <Text style={styles.featureItem}>✅ Système d'approbation des dépenses</Text>
              <Text style={styles.featureItem}>✅ Paiements mobiles intégrés</Text>
              <Text style={styles.featureItem}>✅ Messagerie interne sécurisée</Text>
              <Text style={styles.featureItem}>✅ Thèmes personnalisables</Text>
              <Text style={styles.featureItem}>✅ Compatible tous appareils</Text>
            </View>
          </View>
        )}

        <View style={styles.requiredNote}>
          <Text style={styles.requiredText}>* Champs obligatoires</Text>
        </View>

        {/* Signature */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {APP_NAME} - Gestion d'église moderne et complète
          </Text>
          <View style={styles.createdByContainer}>
            <Star size={20} color="#f39c12" />
            <Text style={styles.createdBy}>
              Created by Henock Aduma
            </Text>
            <Star size={20} color="#f39c12" />
          </View>
          <Text style={styles.version}>
            Version 4.0.0 - Base de données locale ultra-performante
          </Text>
          <Text style={styles.capacity}>
            🚀 Capacité: 600+ millions d'églises
          </Text>
          <Text style={styles.features}>
            🔑 API • 🔄 Updates • 📱 QR Codes • 💳 Paiements • 🏦 Multi-comptes • 👥 RBAC • 📊 Analytics
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  logoGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    backgroundColor: '#3498db',
    opacity: 0.1,
    borderRadius: 50,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 16,
  },
  signatureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#f39c12',
    gap: 8,
  },
  signature: {
    fontSize: 16,
    color: '#f39c12',
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
  },
  inputGroupError: {
    borderColor: '#e74c3c',
    backgroundColor: '#fdf2f2',
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#2c3e50',
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  passwordToggle: {
    padding: 4,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: 8,
    marginLeft: 4,
    fontWeight: '500',
  },
  nameRow: {
    flexDirection: 'row',
    gap: 16,
  },
  halfWidth: {
    flex: 1,
  },
  currencyContainer: {
    marginBottom: 24,
  },
  currencyLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
  },
  currencyHelp: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 16,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  currencyButtons: {
    gap: 12,
  },
  currencyButton: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#dee2e6',
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  currencyButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
    transform: [{ scale: 1.02 }],
  },
  currencyButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
  },
  currencyButtonSymbol: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 4,
  },
  currencyButtonTextActive: {
    color: 'white',
  },
  amountContainer: {
    marginBottom: 24,
  },
  amountLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
  },
  amountHelp: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 16,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  amountInputGroup: {
    marginBottom: 0,
  },
  amountInput: {
    flex: 1,
    textAlign: 'right',
    fontSize: 18,
    fontWeight: '600',
  },
  currencyDisplay: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginLeft: 12,
  },
  currencyDisplayText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    minWidth: 40,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#3498db',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7',
    shadowOpacity: 0,
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  toggleButton: {
    marginTop: 28,
    alignItems: 'center',
  },
  toggleText: {
    color: '#3498db',
    fontSize: 16,
    fontWeight: '600',
  },
  publicLinksButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#3498db',
    backgroundColor: '#f8f9fa',
    gap: 10,
  },
  publicLinksText: {
    color: '#3498db',
    fontSize: 16,
    fontWeight: '600',
  },
  trialInfo: {
    backgroundColor: '#e8f5e8',
    borderRadius: 20,
    padding: 28,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#27ae60',
  },
  trialText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 10,
    textAlign: 'center',
  },
  trialSubtext: {
    fontSize: 16,
    color: '#27ae60',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  featuresList: {
    alignSelf: 'stretch',
  },
  featureItem: {
    fontSize: 15,
    color: '#27ae60',
    marginBottom: 8,
    textAlign: 'left',
    fontWeight: '500',
    lineHeight: 22,
  },
  demoButton: {
    backgroundColor: '#9b59b6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#9b59b6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  demoButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  requiredNote: {
    alignItems: 'center',
    marginBottom: 24,
  },
  requiredText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 28,
    borderTopWidth: 2,
    borderTopColor: '#ecf0f1',
    gap: 8,
  },
  footerText: {
    fontSize: 18,
    color: '#2c3e50',
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  createdByContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  createdBy: {
    fontSize: 20,
    color: '#f39c12',
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  version: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 6,
  },
  capacity: {
    fontSize: 14,
    color: '#27ae60',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 6,
  },
  features: {
    fontSize: 12,
    color: '#3498db',
    textAlign: 'center',
    fontWeight: '500',
  },
  demoHelp: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  demoHelpText: {
    fontSize: 12,
    color: '#1976d2',
    textAlign: 'center',
    marginBottom: 2,
  },
  roleHelp: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 16,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  roleButtons: {
    gap: 12,
  },
  roleButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#dee2e6',
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  roleButtonTextActive: {
    color: 'white',
  },
});