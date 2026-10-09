import React, { useEffect, useState } from 'react';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Rect,
} from 'react-native-svg';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '../../context/AppContext';
import { getDashboard } from '../../services/api';
import type { DashboardData } from '../../services/types';
import {
  NotificationIcon,
  ClockBlueIcon,
  GrowIcon,
  UpArrowGreenIcon,
  DownArrowRedIcon,
  RightArrowIcon,
  AppointmentBlueIcon,
  PatientsBlueIcon,
  DoctorsIcon,
  AvatarIcon,
  CalendarIcon,
} from '../../assets/icons';
import { colors, typography, spacing, radius, fonts } from '../../styles/theme';
import { SIZE } from '../../themes/sizes';

const doctorProfileImg = require('../../assets/images/doctor-profile.png');
const logoImg = require('../../assets/images/logo.png');

type DashboardNavProp = NavigationProp<any>;

const formatNum = (n: number) => {
  if (!n && n !== 0) return '0';
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : `${n}`;
};

const to12h = (t?: string) => {
  if (!t) return '—';
  const [h, m] = t.slice(0, 5).split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
};

const getDoctorStatus = (
  startTime?: string,
  stopTime?: string,
): { label: string; isLive: boolean } => {
  if (!startTime || !stopTime) return { label: 'Upcoming', isLive: false };
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = startTime.slice(0, 5).split(':').map(Number);
  const [eh, em] = stopTime.slice(0, 5).split(':').map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  if (cur >= start && cur <= end) return { label: 'Live Now', isLive: true };
  if (cur < start) return { label: 'Upcoming', isLive: false };
  return { label: 'Completed', isLive: false };
};

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<DashboardNavProp>();
  const { activeContext, activeDoctor } = useAppContext();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const isDoctor = activeContext?.role === 'doctor';

  const fetchDashboard = async (isRefresh = false) => {
    if (!activeContext?.medicalCenter.id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const res = await getDashboard(activeContext.medicalCenter.id);
      if (res.success) setData(res.data);
    } catch {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [activeContext?.medicalCenter.id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const clinicName = activeContext?.medicalCenter.name ?? 'Clinic';
  const doctorName = activeDoctor?.name;
  const avatarUri = isDoctor
    ? activeDoctor?.profilePicture ||
      activeContext?.medicalCenter.profilePicture
    : activeContext?.medicalCenter.profilePicture;

  const confirmedToday = data?.todayAppointmentCounts.confirmedCount ?? 0;
  const cancelledToday = data?.todayAppointmentCounts.cancelledCount ?? 0;
  const totalToday = confirmedToday + cancelledToday;

  return (
    <View style={styles.screenRoot}>
      {/* ─── Full-screen SVG gradient background ─── */}
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgLinearGradient id="screenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <Stop offset="100%" stopColor="#F5F5F6" stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#screenGrad)" />
      </Svg>

      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* ─── Top Header ─── */}
        <View style={styles.header}>
          {/* Logo */}
          <View style={styles.logoWrap}>
            <Image
              source={logoImg}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>

          {/* Right actions */}
          <View style={styles.headerActions}>
            {/* Notification bell */}
            <TouchableOpacity
              style={styles.iconCircle}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <NotificationIcon
                width={SIZE(29)}
                height={SIZE(28)}
                color={colors.textPrimary}
              />
              <View style={styles.notifDot} />
            </TouchableOpacity>

            {/* Profile avatar */}
            <TouchableOpacity
              style={styles.iconCircle}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Settings')}
              accessibilityRole="button"
              accessibilityLabel="Profile"
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <AvatarIcon
                  width={SIZE(18)}
                  height={SIZE(18)}
                  color={colors.textMuted}
                />
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
              <Text allowFontScaling={false} style={styles.errorText}>
                {error}
              </Text>
            </View>
          ) : null}

          {/* ─── Today's Operations Hero Card ─── */}
          <View style={styles.heroCard}>
            {/* SVG gradient background */}
            <Svg style={StyleSheet.absoluteFill}>
              <Defs>
                <SvgLinearGradient
                  id="heroGrad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <Stop offset="0%" stopColor="#C8DFF8" stopOpacity="1" />
                  <Stop offset="50%" stopColor="#E4F0FC" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#D0E8FA" stopOpacity="1" />
                </SvgLinearGradient>
              </Defs>
              <Rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="url(#heroGrad)"
                rx={SIZE(18)}
              />
            </Svg>

            <View style={styles.heroTopRow}>
              <View style={styles.heroLiveBadge}>
                <View style={styles.pulsingDot} />
                <Text allowFontScaling={false} style={styles.heroLiveText}>
                  TODAY'S OPERATIONS
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('Queue')}
                activeOpacity={0.7}
                style={styles.heroActionBtn}
              >
                <Text allowFontScaling={false} style={styles.heroActionText}>
                  Live Queue
                </Text>
                <RightArrowIcon
                  width={SIZE(10)}
                  height={SIZE(10)}
                  stroke={colors.textPrimary}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatItem}>
                <Text allowFontScaling={false} style={styles.heroStatValue}>
                  {confirmedToday}
                </Text>
                <Text allowFontScaling={false} style={styles.heroStatLabel}>
                  Confirmed
                </Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStatItem}>
                <Text allowFontScaling={false} style={styles.heroStatValue}>
                  {totalToday}
                </Text>
                <Text allowFontScaling={false} style={styles.heroStatLabel}>
                  Total Booked
                </Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStatItem}>
                <Text
                  allowFontScaling={false}
                  style={[styles.heroStatValue, styles.heroStatCancelled]}
                >
                  {cancelledToday}
                </Text>
                <Text allowFontScaling={false} style={styles.heroStatLabel}>
                  Cancelled
                </Text>
              </View>
            </View>
          </View>

          {/* ─── Overview & Performance ─── */}
          {data && (
            <View style={styles.metricsSection}>
              <View style={styles.sectionHeaderRow}>
                <Text allowFontScaling={false} style={styles.sectionTitle}>
                  Overview & Performance
                </Text>
                <Text allowFontScaling={false} style={styles.sectionSubtext}>
                  Current Month
                </Text>
              </View>

              <View style={styles.metricsGrid}>
                {/* Monthly Visits */}
                <View style={styles.metricCard}>
                  <View style={styles.metricCardHeader}>
                    <Text
                      allowFontScaling={false}
                      style={styles.metricCardLabel}
                    >
                      Monthly Visits
                    </Text>
                    <View
                      style={[
                        styles.metricIconWrap,
                        { backgroundColor: '#E8F1FF' },
                      ]}
                    >
                      <CalendarIcon
                        width={SIZE(14)}
                        height={SIZE(14)}
                        stroke={colors.primary}
                        color={colors.primary}
                      />
                    </View>
                  </View>
                  <Text allowFontScaling={false} style={styles.metricCardValue}>
                    {formatNum(data.monthlyAppointments.currentCount)}
                  </Text>
                  <View style={styles.metricTrendRow}>
                    <View
                      style={[
                        styles.trendBadge,
                        data.monthlyAppointments.growthPercentage >= 0
                          ? styles.trendNegative
                          : styles.trendNegative,
                      ]}
                    >
                      {data.monthlyAppointments.growthPercentage >= 0 ? (
                        <DownArrowRedIcon
                          width={SIZE(8)}
                          height={SIZE(8)}
                          style={{ marginRight: 2 }}
                        />
                      ) : (
                        <DownArrowRedIcon
                          width={SIZE(8)}
                          height={SIZE(8)}
                          style={{ marginRight: 2 }}
                        />
                      )}
                      <Text
                        style={[styles.trendText, styles.trendTextNegative]}
                      >
                        {Math.abs(
                          data.monthlyAppointments.growthPercentage,
                        ).toFixed(0)}
                        %
                      </Text>
                    </View>
                    <Text allowFontScaling={false} style={styles.metricSub}>
                      {' '}
                      vs last mo
                    </Text>
                  </View>
                </View>

                {/* Total Patients */}
                <View style={styles.metricCard}>
                  <View style={styles.metricCardHeader}>
                    <Text
                      allowFontScaling={false}
                      style={styles.metricCardLabel}
                    >
                      Total Patients
                    </Text>
                    <View
                      style={[
                        styles.metricIconWrap,
                        { backgroundColor: '#FFF3E0' },
                      ]}
                    >
                      <PatientsBlueIcon
                        width={SIZE(14)}
                        height={SIZE(14)}
                        stroke="#F59E0B"
                        color="#F59E0B"
                      />
                    </View>
                  </View>
                  <Text allowFontScaling={false} style={styles.metricCardValue}>
                    {formatNum(data.patients.currentCount)}
                  </Text>
                  <View style={styles.metricTrendRow}>
                    <View
                      style={[
                        styles.trendBadge,
                        data.patients.growthPercentage >= 0
                          ? styles.trendPositive
                          : styles.trendNegative,
                      ]}
                    >
                      {data.patients.growthPercentage >= 0 ? (
                        <UpArrowGreenIcon
                          width={SIZE(8)}
                          height={SIZE(8)}
                          style={{ marginRight: 2 }}
                        />
                      ) : (
                        <DownArrowRedIcon
                          width={SIZE(8)}
                          height={SIZE(8)}
                          style={{ marginRight: 2 }}
                        />
                      )}
                      <Text
                        style={[
                          styles.trendText,
                          data.patients.growthPercentage >= 0
                            ? styles.trendTextPositive
                            : styles.trendTextNegative,
                        ]}
                      >
                        {Math.abs(data.patients.growthPercentage).toFixed(0)}%
                      </Text>
                    </View>
                    <Text allowFontScaling={false} style={styles.metricSub}>
                      {' '}
                      growth
                    </Text>
                  </View>
                </View>

                {/* Doctors on Duty */}
                <View style={styles.metricCard}>
                  <View style={styles.metricCardHeader}>
                    <Text
                      allowFontScaling={false}
                      style={styles.metricCardLabel}
                    >
                      Doctors on Duty
                    </Text>
                    <View
                      style={[
                        styles.metricIconWrap,
                        { backgroundColor: '#F0EEFF' },
                      ]}
                    >
                      <DoctorsIcon
                        width={SIZE(14)}
                        height={SIZE(14)}
                        stroke="#7C3AED"
                        color="#7C3AED"
                      />
                    </View>
                  </View>
                  <Text allowFontScaling={false} style={styles.metricCardValue}>
                    {data.todayDoctors.length}
                  </Text>
                  <View style={styles.metricTrendRow}>
                    <Text allowFontScaling={false} style={styles.metricNote}>
                      active today
                    </Text>
                  </View>
                </View>

                {/* Estimated Revenue */}
                <View style={styles.metricCard}>
                  <View style={styles.metricCardHeader}>
                    <Text
                      allowFontScaling={false}
                      style={styles.metricCardLabel}
                    >
                      Estimated Revenue
                    </Text>
                    <View
                      style={[
                        styles.metricIconWrap,
                        { backgroundColor: '#E6F9F0' },
                      ]}
                    >
                      <GrowIcon width={SIZE(14)} height={SIZE(14)} />
                    </View>
                  </View>
                  <Text allowFontScaling={false} style={styles.metricCardValue}>
                    ₹0
                  </Text>
                  <View style={styles.metricTrendRow}>
                    <Text allowFontScaling={false} style={styles.metricNote}>
                      this month
                    </Text>
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
                  <Text allowFontScaling={false} style={styles.sectionTitle}>
                    Doctors on Duty
                  </Text>
                  <View style={styles.countBadge}>
                    <Text
                      allowFontScaling={false}
                      style={styles.countBadgeText}
                    >
                      {data.todayDoctors.length}
                    </Text>
                  </View>
                </View>
                {!isDoctor && data.todayDoctors.length > 0 && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Doctors')}
                  >
                    <Text allowFontScaling={false} style={styles.viewAllText}>
                      View All
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {data.todayDoctors.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text allowFontScaling={false} style={styles.emptyTitle}>
                    No doctors scheduled today
                  </Text>
                  <Text allowFontScaling={false} style={styles.emptySubtitle}>
                    Schedules configured in management will appear here.
                  </Text>
                </View>
              ) : (
                data.todayDoctors.map((doc, idx) => {
                  const schedule = doc.schedules[0];
                  const status = getDoctorStatus(
                    schedule?.startTime,
                    schedule?.stopTime,
                  );
                  const specialtyName =
                    doc.specialties[0]?.name || 'General Medicine';

                  return (
                    <View
                      key={doc.id}
                      style={[
                        styles.doctorRow,
                        idx === data.todayDoctors.length - 1 &&
                          styles.doctorRowLast,
                      ]}
                    >
                      {/* Avatar */}
                      <Image
                        source={
                          doc.profilePicture
                            ? { uri: doc.profilePicture }
                            : doctorProfileImg
                        }
                        style={styles.doctorAvatarImg}
                      />

                      {/* Info */}
                      <View style={styles.doctorInfoCol}>
                        <Text
                          allowFontScaling={false}
                          style={styles.doctorNameText}
                          numberOfLines={1}
                        >
                          {doc.name.startsWith('Dr.')
                            ? doc.name
                            : `Dr. ${doc.name}`}
                        </Text>
                        <Text
                          style={styles.doctorSpecialtyText}
                          numberOfLines={1}
                        >
                          {specialtyName}
                        </Text>
                        {schedule && (
                          <View style={styles.doctorTimeRow}>
                            <ClockBlueIcon
                              width={SIZE(11)}
                              height={SIZE(11)}
                              stroke={colors.textMuted}
                              color={colors.textMuted}
                            />
                            <Text
                              allowFontScaling={false}
                              style={styles.doctorTimeText}
                            >
                              {to12h(schedule.startTime)} –{' '}
                              {to12h(schedule.stopTime)}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Status pill */}
                      <View
                        style={[
                          styles.statusPill,
                          status.isLive ? styles.pillLive : styles.pillUpcoming,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            status.isLive
                              ? styles.pillTextLive
                              : styles.pillTextUpcoming,
                          ]}
                        >
                          {status.label}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* ─── Today's Appointments ─── */}
          {data && data.todayAppointments.length > 0 && (
            <View style={styles.cardSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.titleWithBadge}>
                  <Text allowFontScaling={false} style={styles.sectionTitle}>
                    Today's Appointments
                  </Text>
                  <View style={styles.countBadge}>
                    <Text
                      allowFontScaling={false}
                      style={styles.countBadgeText}
                    >
                      {data.todayAppointments.length}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Appointments')}
                >
                  <Text allowFontScaling={false} style={styles.viewAllText}>
                    See All
                  </Text>
                </TouchableOpacity>
              </View>

              {data.todayAppointments.slice(0, 5).map((appt, idx) => (
                <TouchableOpacity
                  key={appt.id}
                  style={[
                    styles.apptRow,
                    idx === Math.min(data.todayAppointments.length, 5) - 1 &&
                      styles.apptRowLast,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('Appointments')}
                >
                  <View style={styles.apptAvatarPlaceholder}>
                    <Text
                      allowFontScaling={false}
                      style={styles.apptAvatarLetter}
                    >
                      {appt.patient.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.apptDetailsCol}>
                    <Text
                      allowFontScaling={false}
                      style={styles.apptPatientName}
                      numberOfLines={1}
                    >
                      {appt.patient.name}
                    </Text>
                    <Text
                      allowFontScaling={false}
                      style={styles.apptDoctorName}
                      numberOfLines={1}
                    >
                      Dr. {appt.doctor.name}
                    </Text>
                  </View>
                  <View style={styles.apptRightCol}>
                    <View style={styles.apptStatusTag}>
                      <Text
                        allowFontScaling={false}
                        style={styles.apptStatusText}
                      >
                        Confirmed
                      </Text>
                    </View>
                    <RightArrowIcon
                      width={SIZE(12)}
                      height={SIZE(12)}
                      stroke={colors.textMuted}
                      color={colors.textMuted}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    paddingHorizontal: SIZE(22),
    paddingTop: SIZE(16),
    paddingBottom: SIZE(48),
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pageBg,
  },

  /* ─── Header ─── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    paddingHorizontal: SIZE(22),
    paddingVertical: SIZE(12),
  },
  logoWrap: {
    flex: 1,
  },
  logoImg: {
    width: SIZE(138.72),
    height: SIZE(34),
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE(9),
  },
  iconCircle: {
    width: SIZE(29),
    height: SIZE(28),
    // borderRadius: SIZE(14),
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: SIZE(0),
    right: SIZE(0),
    width: SIZE(17),
    height: SIZE(17),
    borderRadius: SIZE(9),
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  avatarImage: {
    width: SIZE(28),
    height: SIZE(28),
    borderRadius: SIZE(14),
  },

  /* ─── Hero Card (LinearGradient) ─── */
  heroCard: {
    borderRadius: SIZE(18),
    padding: SIZE(14),
    marginBottom: SIZE(16),
    overflow: 'hidden',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZE(12),
  },
  heroLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulsingDot: {
    width: SIZE(8),
    height: SIZE(8),
    borderRadius: SIZE(4),
    backgroundColor: '#34D399',
    marginRight: SIZE(6),
  },
  heroLiveText: {
    fontSize: SIZE(10),
    fontFamily: fonts.bold,
    color: '#4A5568',
    letterSpacing: 0.5,
  },
  heroActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: SIZE(12),
    paddingVertical: SIZE(6),
    borderRadius: radius.full,
    gap: SIZE(4),
  },
  heroActionText: {
    fontSize: SIZE(11),
    fontFamily: fonts.semiBold,
    color: colors.white,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: SIZE(14),
    paddingVertical: SIZE(14),
    paddingHorizontal: SIZE(8),
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroDivider: {
    width: 1,
    height: SIZE(28),
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  heroStatValue: {
    fontSize: SIZE(24),
    fontFamily: fonts.bold,
    color: colors.white,
    letterSpacing: -0.5,
  },
  heroStatCancelled: {
    color: '#F87171',
  },
  heroStatLabel: {
    fontSize: SIZE(10),
    fontFamily: fonts.medium,
    color: '#94A3B8',
    marginTop: SIZE(2),
  },

  /* ─── Metrics ─── */
  metricsSection: {
    marginBottom: SIZE(16),
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZE(12),
  },
  sectionTitle: {
    fontSize: SIZE(16),
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  sectionSubtext: {
    fontSize: SIZE(11),
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZE(10),
  },
  metricCard: {
    width: '48.2%',
    backgroundColor: colors.white,
    borderRadius: SIZE(14),
    padding: SIZE(14),
    borderWidth: 1,
    borderColor: '#EAECF0',
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZE(8),
  },
  metricCardLabel: {
    fontSize: SIZE(11),
    fontFamily: fonts.semiBold,
    color: colors.textSecondary,
    flex: 1,
    paddingRight: SIZE(4),
  },
  metricIconWrap: {
    width: SIZE(30),
    height: SIZE(30),
    borderRadius: SIZE(15),
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricCardValue: {
    fontSize: SIZE(24),
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: SIZE(6),
  },
  metricTrendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZE(5),
    paddingVertical: SIZE(2),
    borderRadius: SIZE(4),
  },
  trendPositive: {
    backgroundColor: '#DCFCE7',
  },
  trendNegative: {
    backgroundColor: '#FEE2E2',
  },
  trendText: {
    fontSize: SIZE(10),
    fontFamily: fonts.bold,
  },
  trendTextPositive: {
    color: '#15803D',
  },
  trendTextNegative: {
    color: '#B91C1C',
  },
  metricSub: {
    fontSize: SIZE(10),
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  metricNote: {
    fontSize: SIZE(11),
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },

  /* ─── Card Section ─── */
  cardSection: {
    backgroundColor: colors.white,
    borderRadius: SIZE(18),
    padding: SIZE(16),
    marginBottom: SIZE(16),
    borderWidth: 1,
    borderColor: '#EAECF0',
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countBadge: {
    backgroundColor: '#F1F4F9',
    paddingHorizontal: SIZE(8),
    paddingVertical: SIZE(2),
    borderRadius: radius.full,
    marginLeft: SIZE(8),
  },
  countBadgeText: {
    fontSize: SIZE(11),
    fontFamily: fonts.bold,
    color: colors.textSecondary,
  },
  viewAllText: {
    fontSize: SIZE(12),
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },

  /* ─── Doctor Row ─── */
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZE(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  doctorRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  doctorAvatarImg: {
    width: SIZE(44),
    height: SIZE(44),
    borderRadius: SIZE(22),
    marginRight: SIZE(10),
    backgroundColor: '#EDF4FE',
  },
  doctorInfoCol: {
    flex: 1,
    paddingRight: SIZE(8),
    gap: SIZE(2),
  },
  doctorNameText: {
    fontSize: SIZE(13),
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
  },
  doctorSpecialtyText: {
    fontSize: SIZE(11),
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  doctorTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE(4),
    marginTop: SIZE(2),
  },
  doctorTimeText: {
    fontSize: SIZE(11),
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  statusPill: {
    paddingHorizontal: SIZE(10),
    paddingVertical: SIZE(4),
    borderRadius: radius.full,
  },
  pillLive: {
    backgroundColor: '#DCFCE7',
  },
  pillUpcoming: {
    backgroundColor: '#F1F4F9',
  },
  statusPillText: {
    fontSize: SIZE(11),
    fontFamily: fonts.semiBold,
  },
  pillTextLive: {
    color: '#15803D',
  },
  pillTextUpcoming: {
    color: colors.textMuted,
  },

  /* ─── Appointment Row ─── */
  apptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZE(10),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  apptRowLast: {
    borderBottomWidth: 0,
  },
  apptAvatarPlaceholder: {
    width: SIZE(36),
    height: SIZE(36),
    borderRadius: SIZE(18),
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZE(10),
  },
  apptAvatarLetter: {
    fontSize: SIZE(14),
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  apptDetailsCol: {
    flex: 1,
    paddingRight: SIZE(8),
  },
  apptPatientName: {
    fontSize: SIZE(13),
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
  },
  apptDoctorName: {
    fontSize: SIZE(11),
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: SIZE(2),
  },
  apptRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE(6),
  },
  apptStatusTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: SIZE(8),
    paddingVertical: SIZE(3),
    borderRadius: SIZE(6),
  },
  apptStatusText: {
    fontSize: SIZE(10),
    fontFamily: fonts.semiBold,
    color: '#15803D',
  },

  /* ─── Empty State ─── */
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZE(24),
  },
  emptyTitle: {
    fontSize: SIZE(13),
    fontFamily: fonts.semiBold,
    color: colors.textSecondary,
    marginBottom: SIZE(4),
  },
  emptySubtitle: {
    fontSize: SIZE(11),
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
  },

  /* ─── Error Box ─── */
  errorBox: {
    backgroundColor: colors.dangerLight,
    borderRadius: radius.md,
    padding: SIZE(12),
    marginBottom: SIZE(16),
  },
  errorText: {
    color: colors.danger,
    fontSize: SIZE(13),
    fontFamily: fonts.regular,
  },
});

export default DashboardScreen;
