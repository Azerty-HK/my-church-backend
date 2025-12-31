import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Link as LinkIcon, Church } from 'lucide-react-native';
import { router } from 'expo-router';
import { AuthService } from '../lib/auth';
import { PublicChurchSearch } from '../components/PublicChurchSearch';
import { colors, spacing, borderRadius } from '../lib/designSystem';
import { LogoComponent } from '../components/LogoComponent';

export default function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPublicLinks, setShowPublicLinks] = useState(false);

  // Connexion
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [churchEmail, setChurchEmail] = useState('');
  const [role, setRole] = useState<'Admin' | 'Trésorier' | 'Secrétaire' | 'Lecteur'>('Admin');
  const [password, setPassword] = useState('');

  // Inscription
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupFirstName, setSignupFirstName] = useState('');
  const [signupLastName, setSignupLastName] = useState('');
  const [churchName, setChurchName] = useState('');
  const [currency, setCurrency] = useState<'FC' | 'USD' | 'EURO'>('FC');
  const [initialAmount, setInitialAmount] = useState('');

  const isSignIn = mode === 'signin';

  const handleSignIn = async () => {
    if (!firstName || !lastName || !churchEmail || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      await AuthService.signInByName(
        firstName.trim(),
        lastName.trim(),
        role,
        churchEmail.trim(),
        password
      );

      // Attendre un peu pour que la session soit bien établie
      await new Promise(resolve => setTimeout(resolve, 500));

      router.replace('/');
    } catch (error: any) {
      Alert.alert('Erreur de connexion', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!signupEmail || !signupPassword || !signupFirstName || !signupLastName || !churchName || !initialAmount) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      await AuthService.signUp({
        email: signupEmail.trim(),
        password: signupPassword,
        firstName: signupFirstName.trim(),
        lastName: signupLastName.trim(),
        churchName: churchName.trim(),
        currency: currency,
        initialAmount: parseFloat(initialAmount) || 0,
      });

      // Attendre un peu pour que la session soit bien établie
      await new Promise(resolve => setTimeout(resolve, 500));

      router.replace('/');
    } catch (error: any) {
      Alert.alert('Erreur d\'inscription', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#1e88e5', '#e53935']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <LogoComponent size={100} showText={false} />
        <Text style={styles.headerTitle}>myChurch</Text>
        <Text style={styles.headerSubtitle}>
          {isSignIn ? 'Connectez-vous à votre église' : 'Créez votre église'}
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, isSignIn && styles.tabActive]}
              onPress={() => setMode('signin')}
            >
              <Text style={[styles.tabText, isSignIn && styles.tabTextActive]}>
                Connexion
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, !isSignIn && styles.tabActive]}
              onPress={() => setMode('signup')}
            >
              <Text style={[styles.tabText, !isSignIn && styles.tabTextActive]}>
                Inscription
              </Text>
            </TouchableOpacity>
          </View>

          {isSignIn ? (
            <View style={styles.form}>
              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Prénom</Text>
                  <View style={styles.inputContainer}>
                    <User size={20} color={colors.textSecondary} />
                    <TextInput
                      style={styles.input}
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="Votre prénom"
                      placeholderTextColor={colors.textLight}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <View style={styles.halfInput}>
                  <Text style={styles.label}>Nom</Text>
                  <View style={styles.inputContainer}>
                    <User size={20} color={colors.textSecondary} />
                    <TextInput
                      style={styles.input}
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Votre nom"
                      placeholderTextColor={colors.textLight}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              </View>

              <Text style={styles.label}>Email de l'église</Text>
              <View style={styles.inputContainer}>
                <Mail size={20} color={colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={churchEmail}
                  onChangeText={setChurchEmail}
                  placeholder="eglise@exemple.com"
                  placeholderTextColor={colors.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <Text style={styles.label}>Rôle</Text>
              <View style={styles.roleButtons}>
                {(['Admin', 'Trésorier', 'Secrétaire', 'Lecteur'] as const).map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleButton, role === r && styles.roleButtonActive]}
                    onPress={() => setRole(r)}
                  >
                    <Text style={[styles.roleButtonText, role === r && styles.roleButtonTextActive]}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Mot de passe</Text>
              <View style={styles.inputContainer}>
                <Lock size={20} color={colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textLight}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <EyeOff size={20} color={colors.textSecondary} />
                  ) : (
                    <Eye size={20} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSignIn}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.submitButtonText}>Se connecter</Text>
                    <ArrowRight size={20} color="#ffffff" />
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.publicLinksButton}
                onPress={() => setShowPublicLinks(true)}
              >
                <LinkIcon size={18} color={colors.primary} />
                <Text style={styles.publicLinksButtonText}>Voir les liens publics de mon église</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Prénom</Text>
                  <View style={styles.inputContainer}>
                    <User size={20} color={colors.textSecondary} />
                    <TextInput
                      style={styles.input}
                      value={signupFirstName}
                      onChangeText={setSignupFirstName}
                      placeholder="Votre prénom"
                      placeholderTextColor={colors.textLight}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <View style={styles.halfInput}>
                  <Text style={styles.label}>Nom</Text>
                  <View style={styles.inputContainer}>
                    <User size={20} color={colors.textSecondary} />
                    <TextInput
                      style={styles.input}
                      value={signupLastName}
                      onChangeText={setSignupLastName}
                      placeholder="Votre nom"
                      placeholderTextColor={colors.textLight}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              </View>

              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <Mail size={20} color={colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={signupEmail}
                  onChangeText={setSignupEmail}
                  placeholder="votre@email.com"
                  placeholderTextColor={colors.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <Text style={styles.label}>Nom de l'église</Text>
              <View style={styles.inputContainer}>
                <Church size={20} color={colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={churchName}
                  onChangeText={setChurchName}
                  placeholder="Église Évangélique..."
                  placeholderTextColor={colors.textLight}
                  autoCapitalize="words"
                />
              </View>

              <Text style={styles.label}>Devise de l'église</Text>
              <View style={styles.currencyButtons}>
                {(['FC', 'USD', 'EURO'] as const).map((curr) => (
                  <TouchableOpacity
                    key={curr}
                    style={[styles.currencyButton, currency === curr && styles.currencyButtonActive]}
                    onPress={() => setCurrency(curr)}
                  >
                    <Text style={[styles.currencyButtonText, currency === curr && styles.currencyButtonTextActive]}>
                      {curr === 'FC' ? 'Franc Congolais (FC)' : curr === 'USD' ? 'Dollar US ($)' : 'Euro (€)'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Capital de départ ({currency})</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>{currency === 'FC' ? 'FC' : currency === 'USD' ? '$' : '€'}</Text>
                <TextInput
                  style={styles.input}
                  value={initialAmount}
                  onChangeText={setInitialAmount}
                  placeholder="0"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                />
              </View>

              <Text style={styles.label}>Mot de passe</Text>
              <View style={styles.inputContainer}>
                <Lock size={20} color={colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={signupPassword}
                  onChangeText={setSignupPassword}
                  placeholder="Minimum 6 caractères"
                  placeholderTextColor={colors.textLight}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <EyeOff size={20} color={colors.textSecondary} />
                  ) : (
                    <Eye size={20} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSignUp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.submitButtonText}>Créer l'église</Text>
                    <ArrowRight size={20} color="#ffffff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.footer}>Created by Henock Aduma</Text>
      </ScrollView>

      <PublicChurchSearch
        visible={showPublicLinks}
        onClose={() => setShowPublicLinks(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  headerLogo: {
    width: 100,
    height: 100,
    marginBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: 4,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  form: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  currencySymbol: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  roleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  roleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
  },
  roleButtonActive: {
    backgroundColor: `${colors.primary}15`,
    borderColor: colors.primary,
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  roleButtonTextActive: {
    color: colors.primary,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  publicLinksButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.primary}10`,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  publicLinksButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  currencyButtons: {
    gap: spacing.sm,
  },
  currencyButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
  },
  currencyButtonActive: {
    backgroundColor: `${colors.primary}15`,
    borderColor: colors.primary,
  },
  currencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  currencyButtonTextActive: {
    color: colors.primary,
  },
  footer: {
    textAlign: 'center',
    marginTop: spacing.xl,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
