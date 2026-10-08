import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SafeAreaView } from 'react-native-safe-area-context'
import { getContexts, switchContext } from '../../services/api'
import type { UserContext } from '../../services/types'
import { useAppContext } from '../../context/AppContext'
import { colors, typography, spacing, radius } from '../../styles/theme'
import ArrowLeftIcon from '../../assets/icons/arrow-left.svg'
import WarningRedIcon from '../../assets/icons/warning-red.svg'
import RightArrowIcon from '../../assets/icons/right-arrow.svg'

interface Props {
  onSelect: () => void
  onBack: () => void
}

const SelectProfileScreen: React.FC<Props> = ({ onSelect, onBack }) => {
  const { setTokens, setContexts: storeContexts, setActiveContext, setActiveDoctor } = useAppContext()
  const [contexts, setContexts] = useState<UserContext[]>([])
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState<string | null>(null)
  const [failedId, setFailedId] = useState<string | null>(null)

  useEffect(() => {
    getContexts()
      .then(res => {
        if (res.success) {
          setContexts(res.data)
          storeContexts(res.data)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSelect = async (ctx: UserContext) => {
    setSwitching(ctx.medicalCenter.id)
    setFailedId(null)
    try {
      const res = await switchContext(ctx.role, ctx.medicalCenter.id)
      if (res.success) {
        await setTokens(res.data.accessToken, res.data.refreshToken)
        await setActiveContext({ role: ctx.role, medicalCenter: res.data.medicalCenter })
        await setActiveDoctor(res.data.doctor)
        await AsyncStorage.setItem('selectedContextId', ctx.medicalCenter.id)
        onSelect()
      } else {
        setFailedId(ctx.medicalCenter.id)
      }
    } catch {
      setFailedId(ctx.medicalCenter.id)
    } finally {
      setSwitching(null)
    }
  }

  const roleLabel = (role: string) => {
    if (role === 'clinic-manager') return 'Clinic Manager'
    if (role === 'doctor') return 'Doctor'
    return role
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Card */}
        <View style={styles.card}>
          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <ArrowLeftIcon width={16} height={16} fill={colors.primary} />
            <Text style={styles.backText}>Back to Login</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Select Profile</Text>
          <Text style={styles.subtitle}>Choose a clinic profile to continue</Text>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : contexts.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No profiles found.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {contexts.map((ctx, i) => (
                <View key={i}>
                  <TouchableOpacity
                    style={[
                      styles.profileCard,
                      switching === ctx.medicalCenter.id && styles.cardDisabled,
                      failedId === ctx.medicalCenter.id && styles.cardError,
                    ]}
                    onPress={() => handleSelect(ctx)}
                    disabled={switching !== null}
                    activeOpacity={0.75}
                  >
                    {/* Avatar */}
                    {ctx.medicalCenter.profilePicture ? (
                      <Image
                        source={{ uri: ctx.medicalCenter.profilePicture }}
                        style={styles.avatar}
                      />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarLetter}>
                          {ctx.medicalCenter.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}

                    {/* Info */}
                    <View style={styles.info}>
                      <Text style={styles.clinicName} numberOfLines={1}>
                        {ctx.medicalCenter.name}
                      </Text>
                      <View style={styles.rolePill}>
                        <Text style={styles.roleText}>{roleLabel(ctx.role)}</Text>
                      </View>
                    </View>

                    {/* Right side */}
                    {switching === ctx.medicalCenter.id ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <RightArrowIcon width={18} height={18} fill={colors.textMuted} />
                    )}
                  </TouchableOpacity>

                  {/* Error banner */}
                  {failedId === ctx.medicalCenter.id && (
                    <View style={styles.errorBanner}>
                      <WarningRedIcon width={14} height={14} />
                      <Text style={styles.errorText}>
                        Couldn't switch to this profile. Please try again.
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing['2xl'],
  },
  logo: {
    width: 160,
    height: 52,
    marginBottom: spacing['2xl'],
  },
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: spacing.xl,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
  },
  backText: {
    fontSize: typography.fontSizeSm,
    fontWeight: typography.fontWeightSemibold,
    color: colors.primary,
    marginLeft: spacing.xs,
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
  list: {
    gap: spacing.sm,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  cardError: {
    borderColor: colors.danger,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: typography.fontSizeLg,
    fontWeight: typography.fontWeightBold,
    color: colors.primary,
  },
  info: {
    flex: 1,
    gap: spacing.xs,
  },
  clinicName: {
    fontSize: typography.fontSizeBase,
    fontWeight: typography.fontWeightSemibold,
    color: colors.textPrimary,
  },
  rolePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  roleText: {
    fontSize: typography.fontSizeXs,
    fontWeight: typography.fontWeightMedium,
    color: colors.primary,
    textTransform: 'capitalize',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    backgroundColor: colors.dangerLight,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#FFCCC9',
  },
  errorText: {
    flex: 1,
    fontSize: typography.fontSizeXs,
    color: colors.danger,
    fontWeight: typography.fontWeightSemibold,
  },
  centered: {
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.fontSizeBase,
    color: colors.textMuted,
  },
})

export default SelectProfileScreen
