import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  TextInput,
  Alert,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../navigation/types'
import { getDoctors, deleteDoctor } from '../../services/api'
import type { AppointmentDoctor } from '../../services/types'
import { useAppContext } from '../../context/AppContext'
import { colors, typography, spacing, radius } from '../../styles/theme'
import { SafeAreaView } from 'react-native-safe-area-context'

type NavProp = NativeStackNavigationProp<RootStackParamList>

const DoctorsScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>()
  const { activeContext } = useAppContext()
  const [doctors, setDoctors] = useState<AppointmentDoctor[]>([])
  const [filtered, setFiltered] = useState<AppointmentDoctor[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')

  const fetchDoctors = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await getDoctors(activeContext?.medicalCenter.id)
      if (res.success) {
        setDoctors(res.data)
        setFiltered(res.data)
      }
    } catch {}
    finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchDoctors() }, [])

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(doctors)
      return
    }
    const q = search.toLowerCase()
    setFiltered(
      doctors.filter(
        d =>
          d.name.toLowerCase().includes(q) ||
          d.specialties.some(s => s.name.toLowerCase().includes(q))
      )
    )
  }, [search, doctors])

  const handleDelete = (doctor: AppointmentDoctor) => {
    Alert.alert(
      'Remove Doctor',
      `Remove ${doctor.name} from this clinic?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoctor(doctor.id)
              setDoctors(prev => prev.filter(d => d.id !== doctor.id))
            } catch {
              Alert.alert('Error', 'Failed to remove doctor.')
            }
          },
        },
      ]
    )
  }

  const renderItem = ({ item }: { item: AppointmentDoctor }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('DoctorProfile', { doctorId: item.id })}
      activeOpacity={0.8}
    >
      <Image
        source={item.profilePicture ? { uri: item.profilePicture } : require('../../assets/images/doctor-profile.png')}
        style={styles.avatar}
      />
      <View style={styles.info}>
        <Text style={styles.doctorName}>{item.name}</Text>
        <Text style={styles.specialty}>
          {item.specialties.map(s => s.name).join(', ') || 'General'}
        </Text>
        <Text style={styles.meta}>
          {item.yearsOfExperience} yrs exp  •  ₹{item.consultationFee}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.scheduleBtn}
        onPress={() =>
          navigation.navigate('DoctorSchedule', {
            doctorId: item.id,
            doctorName: item.name,
          })
        }
      >
        <Text style={styles.scheduleBtnText}>Schedule</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search doctors..."
          placeholderTextColor={colors.placeholder}
        />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            {search ? 'No doctors match your search.' : 'No doctors found.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchDoctors(true)}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageBg },
  searchRow: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSizeSm,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  list: { padding: spacing.base, gap: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: { width: 52, height: 52, borderRadius: radius.full, marginRight: spacing.md },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarLetter: {
    fontSize: typography.fontSizeLg,
    fontWeight: typography.fontWeightBold,
    color: colors.primary,
  },
  info: { flex: 1 },
  doctorName: {
    fontSize: typography.fontSizeBase,
    fontWeight: typography.fontWeightSemibold,
    color: colors.textPrimary,
  },
  specialty: { fontSize: typography.fontSizeXs, color: colors.textSecondary, marginTop: 2 },
  meta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  scheduleBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    marginLeft: spacing.sm,
  },
  scheduleBtnText: {
    fontSize: typography.fontSizeXs,
    color: colors.primary,
    fontWeight: typography.fontWeightSemibold,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: typography.fontSizeBase, color: colors.textMuted },
})

export default DoctorsScreen
