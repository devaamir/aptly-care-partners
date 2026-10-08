import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NavigationProp } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAppContext } from '../../context/AppContext'
import { getDashboard } from '../../services/api'
import type { DashboardData } from '../../services/types'
import {
  NotificationIcon,
  ClockBlueIcon,
  GrowIcon,
  UpArrowGreenIcon,
  DownArrowRedIcon,
  RightArrowIcon,
  QueueManagementIcon,
  AppointmentBlueIcon,
  PatientsBlueIcon,
  DoctorsIcon,
  SettingsIcon,
} from '../../assets/icons'
import { colors, typography, spacing, radius } from '../../styles/theme'

const doctorProfileImg = require('../../assets/images/doctor-profile.png')
const userProfileImg = require('../../assets/images/user-profile.png')

type DashboardNavProp = NavigationProp<any>

const formatNum = (n: number) => {
  if (!n && n !== 0) return '0'
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : `${n}`
}

const to12h = (t?: string) => {
  if (!t) return '—'
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

const getDoctorStatus = (startTime?: string, stopTime?: string): { label: string; isLive: boolean } => {
  if (!startTime || !stopTime) return { label: 'Scheduled', isLive: false }
  const now = new Date()
  const cur = now.getHours() * 60 + now.getMinutes()

  const [sh, sm] = startTime.slice(0, 5).split(':').map(Number)
  const [eh, em] = stopTime.slice(0, 5).split(':').map(Number)
  const start = sh * 60 + sm
  const end = eh * 60 + em

  if (cur >= start && cur <= end) {
    return { label: 'Live Now', isLive: true }
  }
  if (cur < start) {
    return { label: 'Upcoming', isLive: false }
  }
  return { label: 'Completed', isLive: false }
}

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<DashboardNavProp>()
  const { activeContext, activeDoctor } = useAppContext()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const isDoctor = activeContext?.role === 'doctor'

  const fetchDashboard = async (isRefresh = false) => {
    if (!activeContext?.medicalCenter.id) return
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const res = await getDashboard(activeContext.medicalCenter.id)
      if (res.success) setData(res.data)
    } catch {
      setError('Failed to load dashboard data.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [activeContext?.medicalCenter.id])

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  const clinicName = activeContext?.medicalCenter.name ?? 'Clinic'
  const doctorName = activeDoctor?.name

  const avatarUri = isDoctor
    ? (activeDoctor?.profilePicture || activeContext?.medicalCenter.profilePicture)
    : activeContext?.medicalCenter.profilePicture

  const avatarLetter = (
    isDoctor && doctorName
      ? doctorName.charAt(0)
      : clinicName.charAt(0)
  ).toUpperCase()

  const confirmedToday = data?.todayAppointmentCounts.confirmedCount ?? 0
  const cancelledToday = data?.todayAppointmentCounts.cancelledCount ?? 0
  const totalToday = confirmedToday + cancelledToday

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* ─── Top Header (White bg, no container) ─── */}
      <View style={styles.header}>
        <Text style={styles.clinicName} numberOfLines={1}>
          {clinicName}
        </Text>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <NotificationIcon width={18} height={18} fill={colors.textPrimary} color={colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerActionBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            onPress={() => navigation.navigate('Settings')}
          >
            <SettingsIcon width={18} height={18} stroke={colors.textPrimary} color={colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileBtn}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Profile"
            onPress={() => navigation.navigate('Settings')}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : isDoctor ? (
              <Image source={doctorProfileImg} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarLetter}>{avatarLetter}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchDashboard(true)}
            tintColor={colors.primary}
          />
        }
      >

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ─── Today's Live Pulse Hero Card ─── */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroLiveBadge}>
              <View style={styles.pulsingDot} />
              <Text style={styles.heroLiveText}>TODAY'S OPERATIONS</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Queue')}
              activeOpacity={0.7}
              style={styles.heroActionBtn}
            >
              <Text style={styles.heroActionText}>Live Queue</Text>
              <RightArrowIcon width={12} height={12} stroke={colors.white} color={colors.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{confirmedToday}</Text>
              <Text style={styles.heroStatLabel}>Confirmed</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{totalToday}</Text>
              <Text style={styles.heroStatLabel}>Total Booked</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatValue, styles.heroStatCancelled]}>{cancelledToday}</Text>
              <Text style={styles.heroStatLabel}>Cancelled</Text>
            </View>
          </View>
        </View>

        {/* ─── Quick Shortcuts ─── */}
        <View style={styles.shortcutsRow}>
          <TouchableOpacity
            style={styles.shortcutCard}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Queue')}
          >
            <View style={[styles.shortcutIconWrap, { backgroundColor: '#EAF3FF' }]}>
              <QueueManagementIcon width={18} height={18} stroke={colors.primary} color={colors.primary} />
            </View>
            <Text style={styles.shortcutLabel}>Live Queue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutCard}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Appointments')}
          >
            <View style={[styles.shortcutIconWrap, { backgroundColor: '#ECFDF5' }]}>
              <AppointmentBlueIcon width={18} height={18} stroke="#059669" color="#059669" />
            </View>
            <Text style={styles.shortcutLabel}>Appointments</Text>
          </TouchableOpacity>

          {!isDoctor && (
            <TouchableOpacity
              style={styles.shortcutCard}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Doctors')}
            >
              <View style={[styles.shortcutIconWrap, { backgroundColor: '#F3E8FF' }]}>
                <DoctorsIcon width={18} height={18} stroke="#7C3AED" color="#7C3AED" />
              </View>
              <Text style={styles.shortcutLabel}>Doctors</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.shortcutCard}
            activeOpacity={0.7}
            onPress={() => navigation.navigate(isDoctor ? 'Appointments' : 'Patients')}
          >
            <View style={[styles.shortcutIconWrap, { backgroundColor: '#FFFBEB' }]}>
              <PatientsBlueIcon width={18} height={18} stroke="#D97706" color="#D97706" />
            </View>
            <Text style={styles.shortcutLabel}>{isDoctor ? 'Schedule' : 'Patients'}</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Analytics & Growth Metrics ─── */}
        {data && (
          <View style={styles.metricsSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Overview & Performance</Text>
              <Text style={styles.sectionSubtext}>Current Month</Text>
            </View>

            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <View style={styles.metricCardHeader}>
                  <Text style={styles.metricCardLabel}>Monthly Visits</Text>
                  <View style={[styles.metricIconWrap, { backgroundColor: '#EAF3FF' }]}>
                    <AppointmentBlueIcon width={15} height={15} stroke={colors.primary} color={colors.primary} />
                  </View>
                </View>
                <Text style={styles.metricCardValue}>
                  {formatNum(data.monthlyAppointments.currentCount)}
                </Text>
                <View style={styles.metricTrendRow}>
                  <View
                    style={[
                      styles.trendBadge,
                      data.monthlyAppointments.growthPercentage >= 0 ? styles.trendPositive : styles.trendNegative,
                    ]}
                  >
                    {data.monthlyAppointments.growthPercentage >= 0 ? (
                      <UpArrowGreenIcon width={10} height={10} style={{ marginRight: 2 }} />
                    ) : (
                      <DownArrowRedIcon width={10} height={10} style={{ marginRight: 2 }} />
                    )}
                    <Text
                      style={[
                        styles.trendText,
                        data.monthlyAppointments.growthPercentage >= 0 ? styles.trendTextPositive : styles.trendTextNegative,
                      ]}
                    >
                      {Math.abs(data.monthlyAppointments.growthPercentage).toFixed(0)}%
                    </Text>
                  </View>
                  <Text style={styles.metricSub}>vs last mo</Text>
                </View>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.metricCardHeader}>
                  <Text style={styles.metricCardLabel}>Total Patients</Text>
                  <View style={[styles.metricIconWrap, { backgroundColor: '#FEF3C7' }]}>
                    <PatientsBlueIcon width={15} height={15} stroke="#D97706" color="#D97706" />
                  </View>
                </View>
                <Text style={styles.metricCardValue}>
                  {formatNum(data.patients.currentCount)}
                </Text>
                <View style={styles.metricTrendRow}>
                  <View
                    style={[
                      styles.trendBadge,
                      data.patients.growthPercentage >= 0 ? styles.trendPositive : styles.trendNegative,
                    ]}
                  >
                    {data.patients.growthPercentage >= 0 ? (
                      <UpArrowGreenIcon width={10} height={10} style={{ marginRight: 2 }} />
                    ) : (
                      <DownArrowRedIcon width={10} height={10} style={{ marginRight: 2 }} />
                    )}
                    <Text
                      style={[
                        styles.trendText,
                        data.patients.growthPercentage >= 0 ? styles.trendTextPositive : styles.trendTextNegative,
                      ]}
                    >
                      {Math.abs(data.patients.growthPercentage).toFixed(0)}%
                    </Text>
                  </View>
                  <Text style={styles.metricSub}>growth</Text>
                </View>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.metricCardHeader}>
                  <Text style={styles.metricCardLabel}>Doctors on Duty</Text>
                  <View style={[styles.metricIconWrap, { backgroundColor: '#F3E8FF' }]}>
                    <DoctorsIcon width={15} height={15} stroke="#7C3AED" color="#7C3AED" />
                  </View>
                </View>
                <Text style={styles.metricCardValue}>
                  {data.todayDoctors.length}
                </Text>
                <View style={styles.metricTrendRow}>
                  <Text style={styles.metricNote}>active today</Text>
                </View>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.metricCardHeader}>
                  <Text style={styles.metricCardLabel}>Estimated Revenue</Text>
                  <View style={[styles.metricIconWrap, { backgroundColor: '#DCFCE7' }]}>
                    <GrowIcon width={15} height={15} />
                  </View>
                </View>
                <Text style={styles.metricCardValue}>₹0</Text>
                <View style={styles.metricTrendRow}>
                  <Text style={styles.metricNote}>this month</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ─── Doctors on Duty Today ─── */}
        {data && (
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.titleWithBadge}>
                <Text style={styles.sectionTitle}>Doctors on Duty</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{data.todayDoctors.length}</Text>
                </View>
              </View>
              {!isDoctor && data.todayDoctors.length > 0 && (
                <TouchableOpacity onPress={() => navigation.navigate('Doctors')}>
                  <Text style={styles.seeAllText}>View All</Text>
                </TouchableOpacity>
              )}
            </View>

            {data.todayDoctors.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No doctors scheduled today</Text>
                <Text style={styles.emptySubtitle}>Schedules configured in management will appear here.</Text>
              </View>
            ) : (
              data.todayDoctors.map((doc, idx) => {
                const schedule = doc.schedules[0]
                const status = getDoctorStatus(schedule?.startTime, schedule?.stopTime)
                const specialtyName = doc.specialties[0]?.name || 'General Practitioner'

                return (
                  <View
                    key={doc.id}
                    style={[
                      styles.doctorCard,
                      idx === data.todayDoctors.length - 1 && styles.doctorCardLast,
                    ]}
                  >
                    <View style={styles.doctorAvatarContainer}>
                      <Image
                        source={doc.profilePicture ? { uri: doc.profilePicture } : doctorProfileImg}
                        style={styles.doctorAvatarImg}
                      />
                      <View
                        style={[
                          styles.doctorStatusIndicator,
                          status.isLive ? styles.indicatorLive : styles.indicatorIdle,
                        ]}
                      />
                    </View>

                    <View style={styles.doctorInfoCol}>
                      <Text style={styles.doctorNameText} numberOfLines={1}>
                        {doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`}
                      </Text>
                      <Text style={styles.doctorSpecialtyText} numberOfLines={1}>
                        {specialtyName}
                      </Text>
                      {schedule && (
                        <View style={styles.doctorTimeRow}>
                          <ClockBlueIcon width={12} height={12} stroke={colors.textMuted} color={colors.textMuted} />
                          <Text style={styles.doctorTimeText}>
                            {to12h(schedule.startTime)} – {to12h(schedule.stopTime)}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.doctorStatusCol}>
                      <View
                        style={[
                          styles.doctorStatusPill,
                          status.isLive ? styles.pillLive : styles.pillScheduled,
                        ]}
                      >
                        <Text
                          style={[
                            styles.doctorStatusPillText,
                            status.isLive ? styles.pillTextLive : styles.pillTextScheduled,
                          ]}
                        >
                          {status.label}
                        </Text>
                      </View>
                    </View>
                  </View>
                )
              })
            )}
          </View>
        )}

        {/* ─── Today's Appointments List ─── */}
        {data && (
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.titleWithBadge}>
                <Text style={styles.sectionTitle}>Today's Appointments</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{data.todayAppointments.length}</Text>
                </View>
              </View>
              {data.todayAppointments.length > 0 && (
                <TouchableOpacity onPress={() => navigation.navigate('Appointments')}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              )}
            </View>

            {data.todayAppointments.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No appointments booked for today</Text>
                <Text style={styles.emptySubtitle}>New bookings will reflect here in real-time.</Text>
              </View>
            ) : (
              data.todayAppointments.slice(0, 5).map((appt, idx) => (
                <TouchableOpacity
                  key={appt.id}
                  style={[
                    styles.apptRowItem,
                    idx === Math.min(data.todayAppointments.length, 5) - 1 && styles.apptRowLast,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('Appointments')}
                >
                  <View style={styles.patientAvatarContainer}>
                    <Image source={userProfileImg} style={styles.patientAvatarImg} />
                  </View>

                  <View style={styles.apptDetailsCol}>
                    <Text style={styles.apptPatientName} numberOfLines={1}>
                      {appt.patient.name}
                    </Text>
                    <Text style={styles.apptDoctorName} numberOfLines={1}>
                      Dr. {appt.doctor.name}
                    </Text>
                  </View>

                  <View style={styles.apptRightCol}>
                    <View style={styles.apptStatusTag}>
                      <Text style={styles.apptStatusText}>Confirmed</Text>
                    </View>
                    <RightArrowIcon width={14} height={14} stroke={colors.textMuted} color={colors.textMuted} />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scroll: {
    flex: 1,
    backgroundColor: '#F7F8FC',
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing['4xl'],
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F8FC',
  },

  /* ─── Top Header (White bg, no container) ─── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  clinicName: {
    fontSize: typography.fontSizeXl,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    flex: 1,
    marginRight: spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F9FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBtn: {
    marginLeft: 2,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  avatarLetter: {
    fontSize: typography.fontSizeBase,
    fontWeight: '700',
    color: colors.primary,
  },

  /* ─── Hero Card ─── */
  heroCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: '#334155',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  heroLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34D399',
    marginRight: 6,
  },
  heroLiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.6,
  },
  heroActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  heroActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.white,
    marginRight: 4,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  heroStatValue: {
    fontSize: typography.fontSize2xl,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.5,
  },
  heroStatCancelled: {
    color: '#F87171',
  },
  heroStatLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 2,
  },

  /* ─── Quick Shortcuts ─── */
  shortcutsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: spacing.base,
  },
  shortcutCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  shortcutIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  shortcutLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  /* ─── Metrics Grid ─── */
  metricsSection: {
    marginBottom: spacing.base,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '48.5%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metricCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
  },
  metricIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricCardValue: {
    fontSize: typography.fontSize2xl,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  metricTrendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
  },
  trendPositive: {
    backgroundColor: '#DCFCE7',
  },
  trendNegative: {
    backgroundColor: '#FEE2E2',
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
  },
  trendTextPositive: {
    color: '#15803D',
  },
  trendTextNegative: {
    color: '#B91C1C',
  },
  metricSub: {
    fontSize: 10,
    color: colors.textMuted,
  },
  metricNote: {
    fontSize: 11,
    color: colors.textMuted,
  },

  /* ─── Card Section (Doctors & Appointments) ─── */
  cardSection: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: typography.fontSizeMd,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  sectionSubtext: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
  },
  countBadge: {
    backgroundColor: '#F1F4F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginLeft: 8,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },

  /* ─── Doctor Row ─── */
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  doctorCardLast: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },
  doctorAvatarContainer: {
    position: 'relative',
    marginRight: 10,
  },
  doctorAvatarImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  doctorAvatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EDF4FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorAvatarLetter: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  doctorStatusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  indicatorLive: {
    backgroundColor: '#22C55E',
  },
  indicatorIdle: {
    backgroundColor: '#94A3B8',
  },
  doctorInfoCol: {
    flex: 1,
    paddingRight: 8,
  },
  doctorNameText: {
    fontSize: typography.fontSizeSm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  doctorSpecialtyText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  doctorTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  doctorTimeText: {
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 4,
  },
  doctorStatusCol: {
    alignItems: 'flex-end',
  },
  doctorStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  pillLive: {
    backgroundColor: '#DCFCE7',
  },
  pillScheduled: {
    backgroundColor: '#F1F4F9',
  },
  doctorStatusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  pillTextLive: {
    color: '#15803D',
  },
  pillTextScheduled: {
    color: colors.textMuted,
  },

  /* ─── Appointments Row ─── */
  apptRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  apptRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },
  patientAvatarContainer: {
    marginRight: 10,
  },
  patientAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  apptDetailsCol: {
    flex: 1,
    paddingRight: 8,
  },
  apptPatientName: {
    fontSize: typography.fontSizeSm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  apptDoctorName: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  apptRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  apptStatusTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  apptStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#15803D',
  },

  /* ─── Empty Card ─── */
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.fontSizeSm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },

  /* ─── Error Box ─── */
  errorBox: {
    backgroundColor: colors.dangerLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.fontSizeSm,
  },
})

export default DashboardScreen
