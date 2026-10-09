import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getContexts, switchContext } from '../../services/api';
import type { UserContext } from '../../services/types';
import { useAppContext } from '../../context/AppContext';
import { colors, fonts, radius } from '../../styles/theme';
import { SIZE } from '../../themes/sizes';
import RightArrowIcon from '../../assets/icons/right-arrow-grey.svg';
import WarningRedIcon from '../../assets/icons/warning-red.svg';
import LocationIcon from '../../assets/icons/location-icon.svg';

interface Props {
  onSelect: () => void;
  onBack: () => void;
}

const SelectProfileScreen: React.FC<Props> = ({ onSelect }) => {
  const {
    setTokens,
    setContexts: storeContexts,
    setActiveContext,
    setActiveDoctor,
  } = useAppContext();
  const [contexts, setContexts] = useState<UserContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);

  useEffect(() => {
    getContexts()
      .then(res => {
        if (res.success) {
          setContexts(res.data);
          storeContexts(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (ctx: UserContext) => {
    setSwitching(ctx.medicalCenter.id);
    setFailedId(null);
    try {
      const res = await switchContext(ctx.role, ctx.medicalCenter.id);
      if (res.success) {
        await setTokens(res.data.accessToken, res.data.refreshToken);
        await setActiveContext({
          role: ctx.role,
          medicalCenter: res.data.medicalCenter,
        });
        await setActiveDoctor(res.data.doctor);
        await AsyncStorage.setItem('selectedContextId', ctx.medicalCenter.id);
        onSelect();
      } else {
        setFailedId(ctx.medicalCenter.id);
      }
    } catch {
      setFailedId(ctx.medicalCenter.id);
    } finally {
      setSwitching(null);
    }
  };

  const isDoctor = (role: string) => role === 'doctor';

  const specialtiesLine = (ctx: UserContext) => {
    const parts: string[] = [];
    if (ctx.medicalCenter.type) parts.push(ctx.medicalCenter.type);
    if (ctx.medicalCenter.medicalSystem?.name)
      parts.push(ctx.medicalCenter.medicalSystem.name);
    return parts.join(' • ');
  };

  const locationLine = (ctx: UserContext) => {
    const parts: string[] = [];
    if (ctx.medicalCenter.district) parts.push(ctx.medicalCenter.district);
    if (ctx.medicalCenter.state) parts.push(ctx.medicalCenter.state);
    return parts.join(', ');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text allowFontScaling={false} style={styles.title}>
          Select Your Profile
        </Text>
        <Text allowFontScaling={false} style={styles.subtitle}>
          Enter your email address and password to login
        </Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : contexts.length === 0 ? (
          <View style={styles.centered}>
            <Text allowFontScaling={false} style={styles.emptyText}>
              No profiles found.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {contexts.map((ctx, i) => (
              <View key={i}>
                <TouchableOpacity
                  style={[
                    styles.card,
                    switching === ctx.medicalCenter.id && styles.cardDisabled,
                    failedId === ctx.medicalCenter.id && styles.cardError,
                  ]}
                  onPress={() => handleSelect(ctx)}
                  disabled={switching !== null}
                  activeOpacity={0.75}
                >
                  {isDoctor(ctx.role) ? (
                    <>
                      {ctx.medicalCenter.profilePicture ? (
                        <Image
                          source={{ uri: ctx.medicalCenter.profilePicture }}
                          style={styles.doctorAvatar}
                        />
                      ) : (
                        <View style={styles.doctorAvatarFallback}>
                          <Text
                            allowFontScaling={false}
                            style={styles.avatarLetter}
                          >
                            {ctx.medicalCenter.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.info}>
                        <Text
                          allowFontScaling={false}
                          style={styles.clinicName}
                          numberOfLines={1}
                        >
                          {ctx.medicalCenter.name}
                        </Text>
                        <Text
                          allowFontScaling={false}
                          style={styles.doctorSubtitle}
                        >
                          Your Profile
                        </Text>
                      </View>
                    </>
                  ) : (
                    <>
                      {ctx.medicalCenter.profilePicture ? (
                        <Image
                          source={{ uri: ctx.medicalCenter.profilePicture }}
                          style={styles.clinicImage}
                        />
                      ) : (
                        <View style={styles.clinicImageFallback}>
                          <Text
                            allowFontScaling={false}
                            style={styles.avatarLetter}
                          >
                            {ctx.medicalCenter.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.info}>
                        <Text
                          allowFontScaling={false}
                          style={styles.clinicName}
                          numberOfLines={1}
                        >
                          {ctx.medicalCenter.name}
                        </Text>
                        {specialtiesLine(ctx) ? (
                          <Text
                            style={styles.specialtiesText}
                            numberOfLines={1}
                          >
                            {specialtiesLine(ctx)}
                          </Text>
                        ) : null}
                        {locationLine(ctx) ? (
                          <View style={styles.locationRow}>
                            <LocationIcon width={SIZE(12)} height={SIZE(12)} />
                            <Text
                              allowFontScaling={false}
                              style={styles.locationText}
                              numberOfLines={1}
                            >
                              {locationLine(ctx)}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </>
                  )}

                  {switching === ctx.medicalCenter.id ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <RightArrowIcon width={SIZE(18)} height={SIZE(18)} />
                  )}
                </TouchableOpacity>

                {failedId === ctx.medicalCenter.id && (
                  <View style={styles.errorBanner}>
                    <WarningRedIcon width={SIZE(14)} height={SIZE(14)} />
                    <Text allowFontScaling={false} style={styles.errorText}>
                      Couldn't switch to this profile. Please try again.
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SIZE(22),
    paddingTop: SIZE(48),
    paddingBottom: SIZE(32),
  },
  title: {
    fontSize: SIZE(24),
    fontFamily: fonts.bold,
    color: '#1C1E22',
    marginBottom: SIZE(6),
  },
  subtitle: {
    fontSize: SIZE(14),
    fontFamily: fonts.regular,
    color: '#636A79',
    marginBottom: SIZE(35),
  },
  list: {
    gap: SIZE(12),
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE(12),
    paddingHorizontal: SIZE(6),
    paddingVertical: SIZE(6),
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: SIZE(14),
    backgroundColor: colors.white,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  cardError: {
    borderColor: colors.danger,
  },
  clinicImage: {
    width: SIZE(69),
    height: SIZE(69),
    borderRadius: SIZE(10),
  },
  clinicImageFallback: {
    width: SIZE(69),
    height: SIZE(69),
    borderRadius: SIZE(10),
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorAvatar: {
    width: SIZE(48),
    height: SIZE(48),
    borderRadius: SIZE(24),
  },
  doctorAvatarFallback: {
    width: SIZE(48),
    height: SIZE(48),
    borderRadius: SIZE(24),
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: SIZE(18),
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  info: {
    flex: 1,
    gap: SIZE(3),
  },
  clinicName: {
    fontSize: SIZE(14),
    fontFamily: fonts.semiBold,
    color: '#1C1E22',
  },
  specialtiesText: {
    fontSize: SIZE(12),
    fontFamily: fonts.regular,
    color: '#494F5A',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE(4),
  },
  locationText: {
    flex: 1,
    fontSize: SIZE(12),
    fontFamily: fonts.regular,
    color: '#494F5A',
  },
  doctorSubtitle: {
    fontSize: SIZE(12),
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE(6),
    marginTop: SIZE(6),
    backgroundColor: colors.dangerLight,
    borderRadius: SIZE(10),
    padding: SIZE(10),
    borderWidth: 1,
    borderColor: '#FFCCC9',
  },
  errorText: {
    flex: 1,
    fontSize: SIZE(12),
    color: colors.danger,
    fontFamily: fonts.semiBold,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZE(48),
  },
  emptyText: {
    fontSize: SIZE(15),
    color: colors.textMuted,
    fontFamily: fonts.regular,
  },
});

export default SelectProfileScreen;
