import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native'
import { getPatients, createPatient, searchPatients } from '../../services/api'
import type { Patient } from '../../services/types'
import { colors, typography, spacing, radius } from '../../styles/theme'
import { SafeAreaView } from 'react-native-safe-area-context'
import Button from '../../components/Button'
import InputField from '../../components/InputField'

const GENDERS = ['Male', 'Female', 'Other']

const PatientsScreen: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [showModal, setShowModal] = useState(false)

  // New patient form
  const [form, setForm] = useState({
    name: '',
    phoneNumber: '',
    gender: 'Male',
    age: '',
  })
  const [formError, setFormError] = useState('')
  const [creating, setCreating] = useState(false)

  const getDobFromAge = (ageStr: string) => {
    const ageNum = parseInt(ageStr, 10)
    if (isNaN(ageNum) || ageNum <= 0 || ageNum > 130) {
      return '2000-01-01'
    }
    const year = new Date().getFullYear() - ageNum
    return `${year}-01-01`
  }

  const fetchPatients = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await getPatients()
      if (res.success) setPatients(res.data)
    } catch {}
    finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchPatients() }, [])

  const handleSearch = async (val: string) => {
    setSearch(val)
    if (!val.trim()) {
      fetchPatients()
      return
    }
    // Search by phone only when it looks like a phone number
    if (/^\d{5,}$/.test(val.trim())) {
      setSearching(true)
      try {
        const res = await searchPatients(val.trim())
        if (res.success) setPatients(res.data)
      } catch {}
      finally {
        setSearching(false)
      }
    } else {
      // Local name filter
      setPatients(prev =>
        prev.filter(p => p.name.toLowerCase().includes(val.toLowerCase()))
      )
    }
  }

  const handleCreate = async () => {
    if (!form.name.trim()) { setFormError('Name is required.'); return }
    if (!form.phoneNumber.trim()) { setFormError('Phone number is required.'); return }
    if (!form.age.trim()) { setFormError('Age is required.'); return }
    setFormError('')
    setCreating(true)
    try {
      const res = await createPatient({
        name: form.name.trim(),
        phoneNumber: form.phoneNumber.trim(),
        gender: form.gender,
        dateOfBirth: getDobFromAge(form.age.trim()),
      })
      if (res.success) {
        setPatients(prev => [res.data, ...prev])
        setShowModal(false)
        setForm({ name: '', phoneNumber: '', gender: 'Male', age: '' })
      }
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to create patient.')
    } finally {
      setCreating(false)
    }
  }

  const getAge = (dob: string) => {
    if (!dob) return ''
    const diff = Date.now() - new Date(dob).getTime()
    const years = Math.floor(diff / (365.25 * 24 * 3600 * 1000))
    if (years > 0) return `${years} yrs`
    const months = Math.floor(diff / (30.44 * 24 * 3600 * 1000))
    if (months > 0) return `${months} mo`
    return ''
  }

  const renderItem = ({ item }: { item: Patient }) => (
    <View style={styles.card}>
      <Image
        source={require('../../assets/images/user-profile.png')}
        style={styles.avatar}
      />
      <View style={styles.info}>
        <Text style={styles.patientName}>{item.name}</Text>
        <Text style={styles.meta}>
          {item.phoneNumber}  •  {item.gender}  •  {getAge(item.dateOfBirth)}
        </Text>
        <Text style={styles.refId}>{item.referenceId}</Text>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.safe}>
      {/* Search + Add */}
      <View style={styles.topRow}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={handleSearch}
          placeholder="Search by name or phone..."
          placeholderTextColor={colors.placeholder}
        />
        {searching && <ActivityIndicator size="small" color={colors.primary} style={styles.searchSpinner} />}
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowModal(true)}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : patients.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No patients found.</Text>
        </View>
      ) : (
        <FlatList
          data={patients}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchPatients(true)}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* Create Patient Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalFlex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Patient</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            {formError ? (
              <Text style={styles.formError}>{formError}</Text>
            ) : null}
            <InputField
              label="Full Name"
              value={form.name}
              onChangeText={v => setForm(f => ({ ...f, name: v }))}
              placeholder="Patient full name"
              autoCapitalize="words"
            />
            <InputField
              label="Phone Number"
              value={form.phoneNumber}
              onChangeText={v => setForm(f => ({ ...f, phoneNumber: v }))}
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
            />
            <View style={styles.genderRow}>
              <Text style={styles.fieldLabel}>Gender</Text>
              <View style={styles.genderOptions}>
                {GENDERS.map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.genderOption,
                      form.gender === g && styles.genderOptionActive,
                    ]}
                    onPress={() => setForm(f => ({ ...f, gender: g }))}
                  >
                    <Text
                      style={[
                        styles.genderOptionText,
                        form.gender === g && styles.genderOptionTextActive,
                      ]}
                    >
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <InputField
              label="Age (Years)"
              value={form.age}
              onChangeText={v => setForm(f => ({ ...f, age: v.replace(/\D/g, '').slice(0, 3) }))}
              placeholder="e.g. 28"
              keyboardType="numeric"
            />
            <Button
              label="Add Patient"
              onPress={handleCreate}
              loading={creating}
              fullWidth
              style={styles.submitBtn}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pageBg },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSizeSm,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchSpinner: { marginHorizontal: spacing.xs },
  addBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  addBtnText: { color: colors.white, fontWeight: typography.fontWeightSemibold, fontSize: typography.fontSizeSm },
  list: { padding: spacing.base, gap: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    marginRight: spacing.md,
  },
  info: { flex: 1 },
  patientName: { fontSize: typography.fontSizeBase, fontWeight: typography.fontWeightSemibold, color: colors.textPrimary },
  meta: { fontSize: typography.fontSizeXs, color: colors.textSecondary, marginTop: 2 },
  refId: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: typography.fontSizeBase, color: colors.textMuted },
  modalFlex: { flex: 1, backgroundColor: colors.white },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: typography.fontSizeLg, fontWeight: typography.fontWeightBold, color: colors.textPrimary },
  closeBtn: { fontSize: 20, color: colors.textSecondary, padding: spacing.xs },
  modalContent: { padding: spacing.base },
  formError: {
    backgroundColor: colors.dangerLight,
    color: colors.danger,
    fontSize: typography.fontSizeSm,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.base,
  },
  genderRow: { marginBottom: spacing.base },
  fieldLabel: { fontSize: typography.fontSizeSm, fontWeight: typography.fontWeightMedium, color: colors.textSecondary, marginBottom: spacing.xs },
  genderOptions: { flexDirection: 'row', gap: spacing.sm },
  genderOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
  },
  genderOptionActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  genderOptionText: { fontSize: typography.fontSizeSm, color: colors.textSecondary },
  genderOptionTextActive: { color: colors.primary, fontWeight: typography.fontWeightSemibold },
  submitBtn: { marginTop: spacing.sm },
})

export default PatientsScreen
