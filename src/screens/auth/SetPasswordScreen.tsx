import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { setPassword as setPasswordApi } from '../../services/api';
import InputField from '../../components/InputField';
import Button from '../../components/Button';
import { colors, typography, spacing, radius, fonts } from '../../styles/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'SetPassword'>;

const passwordRules = (password: string) => [
  { label: 'At least 8 characters', pass: password.length >= 8 },
  { label: 'One uppercase letter', pass: /[A-Z]/.test(password) },
  { label: 'One lowercase letter', pass: /[a-z]/.test(password) },
  { label: 'One number', pass: /[0-9]/.test(password) },
  {
    label: 'One special character (@$!%*?&#)',
    pass: /[@$!%*?&#]/.test(password),
  },
];

const SetPasswordScreen: React.FC<Props> = ({ route, navigation }) => {
  const token = route.params?.token ?? '';
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const rules = passwordRules(newPassword);
  const allRulesPass = rules.every(r => r.pass);
  const isValid = allRulesPass && newPassword === confirm;

  const handleSubmit = async () => {
    if (!isValid) return;
    if (!token) {
      setError(
        'Invalid or missing token. Please use the link sent to your email.',
      );
      return;
    }
    setLoading(true);
    setError('');
    try {
      await setPasswordApi(token, newPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Failed to set password. The link may have expired.',
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <View style={styles.centered}>
        <View style={styles.iconCircle}>
          <Text allowFontScaling={false} style={styles.iconText}>
            ⚠️
          </Text>
        </View>
        <Text allowFontScaling={false} style={styles.title}>
          Invalid Link
        </Text>
        <Text allowFontScaling={false} style={styles.subtitle}>
          This link is invalid or missing a token. Please use the link sent to
          your email.
        </Text>
        <Button
          label="Go to Login"
          onPress={() => navigation.navigate('Login')}
          style={styles.goBackBtn}
        />
      </View>
    );
  }

  if (success) {
    return (
      <View style={styles.centered}>
        <View style={[styles.iconCircle, styles.iconSuccess]}>
          <Text allowFontScaling={false} style={styles.iconText}>
            ✓
          </Text>
        </View>
        <Text allowFontScaling={false} style={styles.title}>
          Password Set!
        </Text>
        <Text allowFontScaling={false} style={styles.subtitle}>
          Your password has been created. You can now log in to your account.
        </Text>
        <Button
          label="Go to Login"
          onPress={() => navigation.navigate('Login')}
          style={styles.goBackBtn}
          fullWidth
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text allowFontScaling={false} style={styles.title}>
            Set Password
          </Text>
          <Text allowFontScaling={false} style={styles.subtitle}>
            Create a password for your account
          </Text>

          {error ? (
            <Text allowFontScaling={false} style={styles.errorBanner}>
              {error}
            </Text>
          ) : null}

          <InputField
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter password"
            secureTextEntry
          />

          {newPassword.length > 0 && (
            <View style={styles.rulesList}>
              {rules.map(r => (
                <Text
                  key={r.label}
                  style={[
                    styles.rule,
                    r.pass ? styles.rulePass : styles.ruleFail,
                  ]}
                >
                  {r.pass ? '✓' : '✗'} {r.label}
                </Text>
              ))}
            </View>
          )}

          <InputField
            label="Confirm Password"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Re-enter password"
            secureTextEntry
          />

          {confirm.length > 0 && newPassword !== confirm && (
            <Text allowFontScaling={false} style={styles.mismatch}>
              Passwords do not match
            </Text>
          )}

          <Button
            label={loading ? 'Setting...' : 'Set Password'}
            onPress={handleSubmit}
            loading={loading}
            disabled={!isValid}
            fullWidth
            style={styles.submitBtn}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.base,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.pageBg,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  title: {
    fontSize: typography.fontSize2xl,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSizeSm,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  errorBanner: {
    backgroundColor: colors.dangerLight,
    color: colors.danger,
    fontSize: typography.fontSizeSm,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.base,
  },
  rulesList: {
    marginBottom: spacing.base,
    paddingLeft: spacing.sm,
  },
  rule: {
    fontSize: typography.fontSizeXs,
    marginBottom: spacing.xs,
  },
  rulePass: {
    color: colors.success,
  },
  ruleFail: {
    color: colors.danger,
  },
  mismatch: {
    fontSize: typography.fontSizeXs,
    color: colors.danger,
    marginBottom: spacing.sm,
    marginTop: -spacing.sm,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
  goBackBtn: {
    marginTop: spacing.lg,
    minWidth: 200,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  iconSuccess: {
    backgroundColor: colors.successLight,
  },
  iconText: {
    fontSize: 32,
  },
});

export default SetPasswordScreen;
