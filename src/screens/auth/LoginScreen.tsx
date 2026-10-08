import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '../../navigation/types'
import { useAppContext } from '../../context/AppContext'
import { login, getContexts, switchContext } from '../../services/api'
import type { UserContext } from '../../services/types'
import InputField from '../../components/InputField'
import Button from '../../components/Button'
import Toast from '../../components/Toast'
import { colors, typography, spacing, radius } from '../../styles/theme'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'> & {
  onLogin: (contexts: UserContext[], isNewAccount: boolean) => void
}

const LoginScreen: React.FC<Props> = ({ onLogin }) => {
  const { setTokens, setContexts, setActiveContext, setActiveDoctor } = useAppContext()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await login(email.trim().toLowerCase(), password)
      if (!res.success) {
        setError(res.message || 'Login failed.')
        return
      }
      await setTokens(res.data.accessToken, res.data.refreshToken)

      // Fetch contexts
      const ctxRes = await getContexts()
      if (!ctxRes.success) {
        onLogin([], false)
        return
      }
      setContexts(ctxRes.data)

      if (ctxRes.data.length === 0) {
        // New account — needs to create a clinic
        await AsyncStorage.setItem('pendingClinicSetup', 'true')
        onLogin(ctxRes.data, true)
        return
      }

      if (ctxRes.data.length === 1) {
        // Auto switch single context
        const ctx = ctxRes.data[0]
        try {
          const switched = await switchContext(ctx.role, ctx.medicalCenter.id)
          if (switched.success) {
            await setTokens(switched.data.accessToken, switched.data.refreshToken)
            await setActiveContext({ role: ctx.role, medicalCenter: switched.data.medicalCenter })
            await setActiveDoctor(switched.data.doctor)
            await AsyncStorage.setItem('selectedContextId', ctx.medicalCenter.id)
            setToast(`Switched to "${ctx.medicalCenter.name}" automatically.`)
            setTimeout(() => onLogin(ctxRes.data, false), 1500)
            return
          }
        } catch {}
      }

      onLogin(ctxRes.data, false)
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Login failed. Please check your credentials.'
      )
    } finally {
      setLoading(false)
    }
  }

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
        {/* Logo / Branding */}
        <View style={styles.brandingRow}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Login to continue</Text>
          <Text style={styles.subtitle}>
            Enter your email address and password
          </Text>

          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          <InputField
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <InputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
          />

          <Button
            label="Login"
            onPress={handleLogin}
            loading={loading}
            fullWidth
            style={styles.loginBtn}
          />

          <Text style={styles.helpText}>
            Having trouble?{' '}
            <Text style={styles.helpLink}>Contact Support</Text>
          </Text>
        </View>
      </ScrollView>

      {toast && (
        <Toast message={toast} type="success" onClose={() => setToast(null)} />
      )}
    </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing['2xl'],
  },
  brandingRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
  },
  logo: {
    width: 180,
    height: 60,
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
    fontWeight: typography.fontWeightBold,
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
  loginBtn: {
    marginTop: spacing.sm,
  },
  helpText: {
    textAlign: 'center',
    fontSize: typography.fontSizeSm,
    color: colors.textSecondary,
    marginTop: spacing.base,
  },
  helpLink: {
    color: colors.primary,
    fontWeight: typography.fontWeightSemibold,
  },
})

export default LoginScreen
