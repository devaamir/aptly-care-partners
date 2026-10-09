import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '../../context/AppContext';
import { colors, fonts } from '../../styles/theme';
import { SIZE } from '../../themes/sizes';
import {
  PhoneIcon,
  EmailIcon,
  BuildingIcon,
  RightArrowIcon,
} from '../../assets/icons';
import LocationIcon from '../../assets/icons/location-icon.svg';

interface Props {
  onSwitchProfile: () => void;
}

const SettingsScreen: React.FC<Props> = ({ onSwitchProfile }) => {
  const { activeContext, activeDoctor, logout } = useAppContext();
  const clinic = activeContext?.medicalCenter;

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Clinic / Doctor Profile Card */}
        {clinic && (
          <View style={styles.profileCard}>
            {clinic.profilePicture ? (
              <Image source={{ uri: clinic.profilePicture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text allowFontScaling={false} style={styles.avatarLetter}>
                  {clinic.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text allowFontScaling={false} style={styles.profileName} numberOfLines={1}>
                {clinic.name}
              </Text>
              {clinic.type ? (
                <View style={styles.typeBadge}>
                  <Text allowFontScaling={false} style={styles.typeBadgeText}>
                    {clinic.type}
                  </Text>
                </View>
              ) : null}
              <View style={styles.contactRows}>
                {clinic.phoneNumber ? (
                  <View style={styles.contactRow}>
                    <PhoneIcon width={SIZE(13)} height={SIZE(13)} color={colors.textMuted} />
                    <Text allowFontScaling={false} style={styles.contactText}>
                      {clinic.phoneNumber}
                    </Text>
                  </View>
                ) : null}
                {clinic.emailAddress ? (
                  <View style={styles.contactRow}>
                    <EmailIcon width={SIZE(13)} height={SIZE(13)} color={colors.textMuted} />
                    <Text allowFontScaling={false} style={styles.contactText} numberOfLines={1}>
                      {clinic.emailAddress}
                    </Text>
                  </View>
                ) : null}
                {clinic.address ? (
                  <View style={styles.contactRow}>
                    <LocationIcon width={SIZE(13)} height={SIZE(13)} color={colors.textMuted} />
                    <Text allowFontScaling={false} style={styles.contactText} numberOfLines={2}>
                      {clinic.address}{clinic.district ? `, ${clinic.district}` : ''}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        )}

        {/* Doctor Account */}
        {activeDoctor && (
          <View style={styles.section}>
            <Text allowFontScaling={false} style={styles.sectionTitle}>
              Doctor Account
            </Text>
            {[
              { label: 'Name', value: activeDoctor.name },
              { label: 'Email', value: activeDoctor.emailAddress },
              { label: 'Phone', value: activeDoctor.phoneNumber },
            ]
              .filter(r => r.value)
              .map((r, i, arr) => (
                <View
                  key={r.label}
                  style={[styles.infoRow, i === arr.length - 1 && styles.infoRowLast]}
                >
                  <Text allowFontScaling={false} style={styles.infoLabel}>
                    {r.label}
                  </Text>
                  <Text allowFontScaling={false} style={styles.infoValue} numberOfLines={1}>
                    {r.value}
                  </Text>
                </View>
              ))}
          </View>
        )}

        {/* Specialties */}
        {clinic?.specialties && clinic.specialties.length > 0 && (
          <View style={styles.section}>
            <Text allowFontScaling={false} style={styles.sectionTitle}>
              Specialties
            </Text>
            <View style={styles.chipsRow}>
              {clinic.specialties.map(s => (
                <View key={s.id} style={styles.chip}>
                  <Text allowFontScaling={false} style={styles.chipText}>
                    {s.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Clinic Details */}
        {clinic && (
          <View style={styles.section}>
            <Text allowFontScaling={false} style={styles.sectionTitle}>
              Clinic Details
            </Text>
            {[
              { label: 'Website', value: clinic.websiteUrl },
              { label: 'About', value: clinic.about },
              { label: 'Alt. Phone', value: clinic.alternatePhoneNumber },
              { label: 'State', value: clinic.state },
              { label: 'Country', value: clinic.country },
            ]
              .filter(r => r.value)
              .map((r, i, arr) => (
                <View
                  key={r.label}
                  style={[styles.infoRow, i === arr.length - 1 && styles.infoRowLast]}
                >
                  <Text allowFontScaling={false} style={styles.infoLabel}>
                    {r.label}
                  </Text>
                  <Text
                    allowFontScaling={false}
                    style={styles.infoValue}
                    numberOfLines={2}
                  >
                    {r.value}
                  </Text>
                </View>
              ))}
          </View>
        )}

        {/* Account */}
        <View style={styles.section}>
          <Text allowFontScaling={false} style={styles.sectionTitle}>
            Account
          </Text>
          <TouchableOpacity
            style={[styles.actionRow, styles.actionRowLast]}
            onPress={onSwitchProfile}
            activeOpacity={0.7}
          >
            <BuildingIcon width={SIZE(18)} height={SIZE(18)} stroke={colors.textSecondary} />
            <Text allowFontScaling={false} style={styles.actionLabel}>
              Switch Profile
            </Text>
            <RightArrowIcon width={SIZE(16)} height={SIZE(16)} stroke={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text allowFontScaling={false} style={styles.logoutText}>
            Logout
          </Text>
        </TouchableOpacity>

        <Text allowFontScaling={false} style={styles.version}>
          Aptly Clinic v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  content: {
    padding: SIZE(16),
    paddingBottom: SIZE(40),
  },
  // Profile card
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: SIZE(14),
    padding: SIZE(16),
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZE(14),
    marginBottom: SIZE(10),
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: SIZE(64),
    height: SIZE(64),
    borderRadius: SIZE(32),
  },
  avatarFallback: {
    width: SIZE(64),
    height: SIZE(64),
    borderRadius: SIZE(32),
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: SIZE(24),
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  profileInfo: {
    flex: 1,
    gap: SIZE(4),
  },
  profileName: {
    fontSize: SIZE(16),
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: SIZE(999),
    paddingHorizontal: SIZE(10),
    paddingVertical: SIZE(2),
  },
  typeBadgeText: {
    fontSize: SIZE(11),
    fontFamily: fonts.medium,
    color: colors.primary,
    textTransform: 'capitalize',
  },
  contactRows: {
    gap: SIZE(4),
    marginTop: SIZE(4),
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE(6),
  },
  contactText: {
    flex: 1,
    fontSize: SIZE(12),
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  // Section card
  section: {
    backgroundColor: colors.white,
    borderRadius: SIZE(14),
    paddingHorizontal: SIZE(16),
    paddingTop: SIZE(14),
    paddingBottom: SIZE(6),
    marginBottom: SIZE(10),
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: SIZE(11),
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: SIZE(10),
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SIZE(10),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoRowLast: {
    borderBottomWidth: 0,
    marginBottom: SIZE(6),
  },
  infoLabel: {
    fontSize: SIZE(13),
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: SIZE(13),
    fontFamily: fonts.medium,
    color: colors.textPrimary,
    maxWidth: '55%',
    textAlign: 'right',
  },
  // Chips
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZE(8),
    paddingBottom: SIZE(8),
  },
  chip: {
    paddingVertical: SIZE(4),
    paddingHorizontal: SIZE(12),
    backgroundColor: colors.primaryLight,
    borderRadius: SIZE(999),
  },
  chipText: {
    fontSize: SIZE(12),
    fontFamily: fonts.medium,
    color: colors.primary,
  },
  // Action rows
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE(12),
    paddingVertical: SIZE(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionRowLast: {
    borderBottomWidth: 0,
    marginBottom: SIZE(4),
  },
  actionLabel: {
    flex: 1,
    fontSize: SIZE(14),
    fontFamily: fonts.medium,
    color: colors.textPrimary,
  },
  // Logout
  logoutBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: SIZE(14),
    paddingVertical: SIZE(15),
    alignItems: 'center',
    marginTop: SIZE(6),
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: {
    fontSize: SIZE(15),
    fontFamily: fonts.semiBold,
    color: colors.danger,
  },
  version: {
    textAlign: 'center',
    fontSize: SIZE(11),
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: SIZE(16),
  },
});

export default SettingsScreen;
