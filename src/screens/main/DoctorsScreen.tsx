import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { getDoctors } from '../../services/api';
import type { AppointmentDoctor } from '../../services/types';
import { useAppContext } from '../../context/AppContext';
import { colors, radius, fonts } from '../../styles/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SIZE } from '../../themes/sizes';
import { SearchIcon, DoctorsIcon } from '../../assets/icons';

const doctorProfileImg = require('../../assets/images/doctor-profile.png');

const DoctorsScreen: React.FC = () => {
  const { activeContext } = useAppContext();
  const [doctors, setDoctors] = useState<AppointmentDoctor[]>([]);
  const [filtered, setFiltered] = useState<AppointmentDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchDoctors = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await getDoctors(activeContext?.medicalCenter.id);
      if (res.success) {
        setDoctors(res.data);
        setFiltered(res.data);
      }
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(doctors);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(
      doctors.filter(
        d =>
          d.name.toLowerCase().includes(q) ||
          d.specialties.some(s => s.name.toLowerCase().includes(q)),
      ),
    );
  }, [search, doctors]);

  const renderItem = ({ item }: { item: AppointmentDoctor }) => (
    <View style={styles.card}>
      <Image
        source={
          item.profilePicture ? { uri: item.profilePicture } : doctorProfileImg
        }
        style={styles.avatar}
      />

      <View style={styles.info}>
        <Text
          allowFontScaling={false}
          style={styles.doctorName}
          numberOfLines={1}
        >
          {item.name.startsWith('Dr.') ? item.name : `Dr. ${item.name}`}
        </Text>
        <Text
          allowFontScaling={false}
          style={styles.specialty}
          numberOfLines={1}
        >
          {item.specialties.map(s => s.name).join(', ') || 'General Medicine'}
        </Text>
        <View style={styles.metaRow}>
          <Text allowFontScaling={false} style={styles.metaText}>
            {item.yearsOfExperience} yrs exp
          </Text>
          <View style={styles.metaDot} />
          <Text allowFontScaling={false} style={styles.metaText}>
            ₹{item.consultationFee}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text allowFontScaling={false} style={styles.headerTitle}>
          Doctors
        </Text>
        <View style={styles.countBadge}>
          <Text allowFontScaling={false} style={styles.countBadgeText}>
            {doctors.length}
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <SearchIcon
            width={SIZE(16)}
            height={SIZE(16)}
            stroke={colors.textMuted}
          />
          <TextInput
            allowFontScaling={false}
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search doctors or specialty..."
            placeholderTextColor={colors.placeholder}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text allowFontScaling={false} style={styles.clearText}>
                ✕
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text allowFontScaling={false} style={styles.loadingText}>
            Loading doctors...
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIconCircle}>
            <DoctorsIcon
              width={SIZE(28)}
              height={SIZE(28)}
              stroke={colors.textMuted}
            />
          </View>
          <Text allowFontScaling={false} style={styles.emptyTitle}>
            {search ? 'No doctors found' : 'No doctors yet'}
          </Text>
          <Text allowFontScaling={false} style={styles.emptySubtitle}>
            {search
              ? 'Try adjusting your search query.'
              : 'Doctors assigned to this clinic will appear here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchDoctors(true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: SIZE(22),
    paddingTop: SIZE(12),
    paddingBottom: SIZE(12),
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF0',
    gap: SIZE(8),
  },
  headerTitle: {
    fontSize: SIZE(22),
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  countBadge: {
    backgroundColor: '#F1F4F9',
    paddingHorizontal: SIZE(8),
    paddingVertical: SIZE(2),
    borderRadius: radius.full,
  },
  countBadgeText: {
    fontSize: SIZE(11),
    fontFamily: fonts.bold,
    color: colors.textSecondary,
  },
  searchContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: SIZE(16),
    paddingTop: SIZE(10),
    paddingBottom: SIZE(10),
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF0',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: SIZE(10),
    paddingHorizontal: SIZE(12),
    height: SIZE(42),
    borderWidth: 1,
    borderColor: '#EAECF0',
    gap: SIZE(8),
  },
  searchInput: {
    flex: 1,
    fontSize: SIZE(13),
    fontFamily: fonts.regular,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  clearText: {
    fontSize: SIZE(13),
    fontFamily: fonts.bold,
    color: colors.textMuted,
    padding: SIZE(2),
  },
  list: {
    padding: SIZE(16),
    gap: SIZE(12),
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: SIZE(14),
    borderWidth: 1,
    borderColor: '#EAECF0',
    padding: SIZE(14),
    gap: SIZE(12),
  },
  avatar: {
    width: SIZE(48),
    height: SIZE(48),
    borderRadius: SIZE(24),
    borderWidth: 1,
    borderColor: '#EAECF0',
    backgroundColor: '#EDF4FE',
  },
  info: {
    flex: 1,
    gap: SIZE(6),
  },
  doctorName: {
    fontSize: SIZE(14),
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
  },
  specialty: {
    fontSize: SIZE(12),
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE(6),
  },
  metaText: {
    fontSize: SIZE(11),
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  metaDot: {
    width: SIZE(3),
    height: SIZE(3),
    borderRadius: SIZE(2),
    backgroundColor: colors.textMuted,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZE(24),
  },
  loadingText: {
    fontSize: SIZE(13),
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: SIZE(10),
  },
  emptyIconCircle: {
    width: SIZE(60),
    height: SIZE(60),
    borderRadius: SIZE(30),
    backgroundColor: '#EAECF0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZE(12),
  },
  emptyTitle: {
    fontSize: SIZE(16),
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginBottom: SIZE(4),
  },
  emptySubtitle: {
    fontSize: SIZE(13),
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: SIZE(18),
  },
});

export default DoctorsScreen;
