import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { useAppContext } from '../../context/AppContext';
import { login, getContexts } from '../../services/api';
import type { UserContext } from '../../services/types';
import InputField from '../../components/InputField';
import Button from '../../components/Button';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, radius, fonts } from '../../styles/theme';
import { SIZE } from '../../themes/sizes';
import EmailIcon from '../../assets/icons/email-icon-2.svg';
import LockIcon from '../../assets/icons/lock.svg';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'> & {
  onLogin: (contexts: UserContext[], isNewAccount: boolean) => void;
};

const LoginScreen: React.FC<Props> = ({ onLogin }) => {
  const { setTokens, setContexts } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await login(email.trim().toLowerCase(), password);
      if (!res.success) {
        setError(res.message || 'Login failed.');
        return;
      }
      await setTokens(res.data.accessToken, res.data.refreshToken);

      const ctxRes = await getContexts();
      if (!ctxRes.success) {
        onLogin([], false);
        return;
      }
      setContexts(ctxRes.data);

      if (ctxRes.data.length === 0) {
        await AsyncStorage.setItem('pendingClinicSetup', 'true');
        onLogin(ctxRes.data, true);
        return;
      }

      onLogin(ctxRes.data, false);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Login failed. Please check your credentials.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.flex}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoSection}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Header */}
          <View style={styles.headerSection}>
            <Text allowFontScaling={false} style={styles.title}>
              Login to Continue
            </Text>
            <Text allowFontScaling={false} style={styles.subtitle}>
              Enter your email address and password to login
            </Text>
          </View>

          {error ? (
            <Text allowFontScaling={false} style={styles.errorBanner}>
              {error}
            </Text>
          ) : null}

          {/* Fields */}
          <View style={styles.fieldsSection}>
            <InputField
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon={<EmailIcon width={SIZE(18)} height={SIZE(18)} />}
            />

            <InputField
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              leftIcon={<LockIcon width={SIZE(18)} height={SIZE(18)} />}
            />

            <TouchableOpacity style={styles.forgotRow}>
              <Text allowFontScaling={false} style={styles.forgotText}>
                Forgot password?
              </Text>
            </TouchableOpacity>

            <Button
              label="Login"
              onPress={handleLogin}
              loading={loading}
              fullWidth
              style={styles.loginBtn}
            />

            <Text allowFontScaling={false} style={styles.helpText}>
              Having trouble logging in?{' '}
              <Text allowFontScaling={false} style={styles.helpLink}>
                Contact Us
              </Text>
            </Text>
          </View>
        </ScrollView>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: SIZE(24),
    paddingBottom: SIZE(32),
  },
  logoSection: {
    alignItems: 'center',
  },
  logo: {
    width: SIZE(132.79),
    height: SIZE(44),
    marginTop: SIZE(91),
    marginBottom: SIZE(64),
  },
  headerSection: {
    alignItems: 'center',
  },
  title: {
    fontSize: SIZE(25),
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginBottom: SIZE(8),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: SIZE(14),
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: SIZE(20),
    textAlign: 'center',
    maxWidth: SIZE(230),
    marginBottom: SIZE(48),
  },
  errorBanner: {
    backgroundColor: colors.dangerLight,
    color: colors.danger,
    fontSize: SIZE(13),
    padding: SIZE(12),
    borderRadius: radius.md,
    marginBottom: SIZE(16),
  },
  fieldsSection: {
    marginBottom: SIZE(24),
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: -SIZE(8),
    marginBottom: SIZE(29),
  },
  forgotText: {
    fontSize: SIZE(11),
    fontFamily: fonts.medium,
    color: '#7E8695',
  },
  loginBtn: {
    borderRadius: radius.lg,
  },
  helpText: {
    fontSize: SIZE(14),
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: SIZE(40),
  },
  helpLink: {
    color: colors.primary,
    fontFamily: fonts.semiBold,
  },
});

export default LoginScreen;
