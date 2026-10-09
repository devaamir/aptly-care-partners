import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native'
import { useAppContext } from '../../context/AppContext'
import { getSubscriptionStatus, updateClinic } from '../../services/api'
import { colors, typography, spacing, radius, fonts } from '../../styles/theme'
import { SafeAreaView } from 'react-native-safe-area-context'
import Button from '../../components/Button'

interface Props {
  onSwitchProfile: () => void
}

const SettingsScreen: React.FC<Props> = ({ onSwitchProfile }) => {
  const { activeContext, activeDoctor, logout } = useAppContext()
  const [subLoading, setSubLoading] = useState(false)
  const [subStatus, setSubStatus] = useState<string | null>(null)
  const clinic = activeContext?.medicalCenter

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout()
          // Navigation handled by AppContext state change -> RootNavigator
        },
      },
    ])
  }

  const handleSubscriptionStatus = async () => {
    setSubLoading(true)
    try {
      const res = await getSubscriptionStatus()
      if (res.success) {
        setSubStatus(
          `Status: ${res.data.subscriptionStatus}\nTrial expires: ${new Date(res.data.trialExpiresAt).toLocaleDateString()}`
        )
      }
    } catch {
      setSubStatus('Failed to load subscription status.')
    } finally {
      setSubLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Clinic Profile */}
        {clinic && (
          <View style={styles.profileCard}>
            {clinic.profilePicture ? (
              <Image source={{ uri: clinic.profilePicture }} style={styles.clinicAvatar} />
            ) : (
              <View style={styles.clinicAvatarFallback}>
                <Text style={styles.clinicAvatarLetter}>
                  {clinic.name.charAt(0)}
                </Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.clinicName}>{clinic.name}</Text>
              <Text style={styles.clinicType}>{clinic.type}</Text>
              <Text style={styles.clinicContact}>
                📞 {clinic.phoneNumber}
              </Text>
              {clinic.emailAddress ? (
                <Text style={styles.clinicContact}>✉️ {clinic.emailAddress}</Text>
              ) : null}
              {clinic.address ? (
                <Text style={styles.clinicContact} numberOfLines={2}>
                  📍 {clinic.address}, {clinic.district}
                </Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Doctor Profile (if doctor role) */}
        {activeDoctor && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Doctor Account</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{activeDoctor.name}</Text>
            </View>
            {activeDoctor.emailAddress ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{activeDoctor.emailAddress}</Text>
              </View>
            ) : null}
            {activeDoctor.phoneNumber ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{activeDoctor.phoneNumber}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Specialties */}
        {clinic?.specialties && clinic.specialties.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Specialties</Text>
            <View style={styles.specialtyChips}>
              {clinic.specialties.map(s => (
                <View key={s.id} style={styles.chip}>
                  <Text style={styles.chipText}>{s.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Subscription */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription</Text>
          {subStatus ? (
            <Text style={styles.subStatus}>{subStatus}</Text>
          ) : null}
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleSubscriptionStatus}
            disabled={subLoading}
          >
            <Text style={styles.actionLabel}>
              {subLoading ? 'Loading...' : 'Check Subscription Status'}
            </Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={onSwitchProfile}
          >
            <Text style={styles.actionLabel}>Switch Profile</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Clinic Info */}
        {clinic && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Clinic Details</Text>
            {[
              { label: 'Website', value: clinic.websiteUrl },
              { label: 'About', value: clinic.about },
              { label: 'Alt. Phone', value: clinic.alternatePhoneNumber },
              { label: 'State', value: clinic.state },
              { label: 'Country', value: clinic.country },
            ]
              .filter(r => r.value)
              .map(r => (
                <View style={styles.infoRow} key={r.label}>
                  <Text style={styles.infoLabel}>{r.label}</Text>
                  <Text style={styles.infoValue} numberOfLines={2}>{r.value}</Text>
                </View>
              ))}
          </View>
        )}

        <Button
          label="Logout"
          onPress={handleLogout}
          variant="danger"
          fullWidth
          style={styles.logoutBtn}
        />

        <Text style={styles.version}>Aptly Clinic v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageBg },
  content: { padding: spacing.base, paddingBottom: spacing['3xl'] },
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.base,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  clinicAvatar: { width: 64, height: 64, borderRadius: radius.full, marginRight: spacing.md },
  clinicAvatarFallback: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  clinicAvatarLetter: { fontSize: typography.fontSize2xl, fontFamily: fonts.bold, color: colors.primary },
  profileInfo: { flex: 1 },
  clinicName: { fontSize: typography.fontSizeLg, fontFamily: fonts.bold, color: colors.textPrimary },
  clinicType: { fontSize: typography.fontSizeXs, color: colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  clinicContact: { fontSize: typography.fontSizeXs, color: colors.textSecondary, marginTop: 4 },
  section: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: typography.fontSizeSm,
    fontFamily: fonts.semiBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: { fontSize: typography.fontSizeSm, color: colors.textSecondary },
  infoValue: { fontSize: typography.fontSizeSm, color: colors.textPrimary, fontFamily: fonts.medium, maxWidth: '60%', textAlign: 'right' },
  specialtyChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
  },
  chipText: { fontSize: typography.fontSizeXs, color: colors.primary, fontFamily: fonts.medium },
  subStatus: {
    fontSize: typography.fontSizeSm,
    color: colors.textSecondary,
    backgroundColor: colors.pageBg,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionLabel: { fontSize: typography.fontSizeBase, color: colors.textPrimary },
  actionArrow: { fontSize: 20, color: colors.textSecondary },
  logoutBtn: { marginTop: spacing.lg },
  version: {
    textAlign: 'center',
    fontSize: typography.fontSizeXs,
    color: colors.textMuted,
    marginTop: spacing.base,
  },
})

export default SettingsScreen
