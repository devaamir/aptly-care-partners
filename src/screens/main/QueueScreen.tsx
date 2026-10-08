import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image,
  ScrollView,
  Modal,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  getDoctors,
  getDoctorSchedule,
  getAppointments,
  subscribeQueue,
  updateAppointmentStatus,
  pauseSchedule,
  cancelSchedulePause,
} from '../../services/api'
import type {
  QueueSSEData,
  QueueAppointment,
  DoctorSchedule,
} from '../../services/types'
import { useAppContext } from '../../context/AppContext'
import Badge, { tokenStatusVariant } from '../../components/Badge'
import { colors, typography, spacing, radius } from '../../styles/theme'
import {
  ReloadIcon,
  SearchIcon,
  InstantPauseIcon,
  ClockBlueIcon,
  RightArrowIcon,
} from '../../assets/icons'

const defaultDoctorAvatar = require('../../assets/images/doctor-profile.png')
const defaultUserAvatar = require('../../assets/images/user-profile.png')

interface QueueDoctor {
  id: string
  name: string
  profilePicture?: string | null
  specialties?: string[]
}

const getTodayDateStr = () => {
  try {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  } catch {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
}

const formatTo12h = (timeStr?: string) => {
  if (!timeStr) return '—'
  try {
    const [h, m] = timeStr.slice(0, 5).split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
  } catch {
    return timeStr
  }
}

const formatPatientSubtitle = (patient?: { gender?: string; dateOfBirth?: string; phoneNumber?: string }) => {
  if (!patient) return 'Patient'
  const parts: string[] = []
  if (patient.gender) {
    parts.push(patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1).toLowerCase())
  }
  if (patient.dateOfBirth) {
    const dob = new Date(patient.dateOfBirth)
    if (!isNaN(dob.getTime())) {
      const now = new Date()
      let age = now.getFullYear() - dob.getFullYear()
      const m = now.getMonth() - dob.getMonth()
      if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--
      if (age >= 0 && age < 130) parts.push(`${age} yrs`)
    }
  }
  if (patient.phoneNumber) {
    parts.push(patient.phoneNumber)
  }
  return parts.length > 0 ? parts.join(' • ') : 'No additional info'
}

type FilterTab = 'all' | 'ongoing' | 'pending' | 'done' | 'cancelled'

const QueueScreen: React.FC = () => {
  const { activeContext, activeDoctor } = useAppContext()
  const isDoctor = activeContext?.role?.toLowerCase() === 'doctor'
  const medicalCenterId = activeContext?.medicalCenter?.id

  // Doctor state
  const [doctors, setDoctors] = useState<QueueDoctor[]>([])
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null)
  const [loadingDoctors, setLoadingDoctors] = useState(true)

  // Schedules state
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([])
  const [selectedSchedule, setSelectedSchedule] = useState<DoctorSchedule | null>(null)
  const [loadingSchedules, setLoadingSchedules] = useState(false)

  // Queue state
  const [queueData, setQueueData] = useState<QueueSSEData>({
    appointments: [],
    activePauses: [],
  })
  const [loadingQueue, setLoadingQueue] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [connected, setConnected] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [activeFilterTab, setActiveFilterTab] = useState<FilterTab>('all')

  // Pause modal state
  const [showPauseModal, setShowPauseModal] = useState(false)
  const [customStopTime, setCustomStopTime] = useState('')
  const [pauseSubmitting, setPauseSubmitting] = useState(false)

  const sseRef = useRef<EventSource | null>(null)

  // 1. Fetch / Initialize Doctors
  useEffect(() => {
    if (isDoctor && activeDoctor) {
      const doc: QueueDoctor = {
        id: activeDoctor.id,
        name: activeDoctor.name,
        profilePicture: activeDoctor.profilePicture ?? null,
      }
      setDoctors([doc])
      setSelectedDoctorId(doc.id)
      setLoadingDoctors(false)
      return
    }

    if (!medicalCenterId) {
      setLoadingDoctors(false)
      return
    }

    setLoadingDoctors(true)
    getDoctors(medicalCenterId)
      .then(res => {
        if (res.success && res.data && res.data.length > 0) {
          const mapped: QueueDoctor[] = res.data.map(d => ({
            id: d.id,
            name: d.name,
            profilePicture: d.profilePicture ?? null,
            specialties: d.specialties?.map(s => s.name) || [],
          }))
          setDoctors(mapped)
          setSelectedDoctorId(mapped[0].id)
        } else {
          setDoctors([])
          setSelectedDoctorId(null)
        }
      })
      .catch(() => {
        setDoctors([])
        setSelectedDoctorId(null)
      })
      .finally(() => {
        setLoadingDoctors(false)
      })
  }, [isDoctor, activeDoctor, medicalCenterId])

  // Current selected doctor
  const currentDoctor = useMemo(() => {
    return doctors.find(d => d.id === selectedDoctorId) || doctors[0] || null
  }, [doctors, selectedDoctorId])

  // 2. Fetch Doctor Schedules for Today
  const fetchSchedules = useCallback(async (docId: string) => {
    if (!docId || !medicalCenterId) {
      setSchedules([])
      setSelectedSchedule(null)
      return
    }

    setLoadingSchedules(true)
    const today = getTodayDateStr()

    try {
      const res = await getDoctorSchedule(docId, today, medicalCenterId)
      if (res.success && Array.isArray(res.data)) {
        setSchedules(res.data)
        if (res.data.length > 0) {
          setSelectedSchedule(res.data[0])
        } else {
          setSelectedSchedule(null)
        }
      } else {
        setSchedules([])
        setSelectedSchedule(null)
      }
    } catch {
      setSchedules([])
      setSelectedSchedule(null)
    } finally {
      setLoadingSchedules(false)
    }
  }, [medicalCenterId])

  useEffect(() => {
    if (selectedDoctorId) {
      fetchSchedules(selectedDoctorId)
    } else {
      setSchedules([])
      setSelectedSchedule(null)
    }
  }, [selectedDoctorId, fetchSchedules])

  // 3. Fetch initial queue appointments via REST API (fail-safe)
  const fetchQueueAppointments = useCallback(async (scheduleId: string, docId: string) => {
    const today = getTodayDateStr()
    try {
      const res = await getAppointments(1, 100)
      if (res.success && Array.isArray(res.data)) {
        const filtered = res.data.filter(a => {
          const isDoc = a.doctor?.id === docId
          const isSched = !scheduleId || a.schedule?.id === scheduleId
          const aptDate = a.appointmentDate ? a.appointmentDate.split('T')[0] : ''
          const isToday = !aptDate || aptDate === today
          return isDoc && isSched && isToday
        })

        const mapped: QueueAppointment[] = filtered
          .map(a => ({
            id: a.id,
            tokenNumber: a.tokenNumber,
            tokenStatus: a.tokenStatus,
            createdAt: a.appointmentDate || new Date().toISOString(),
            updatedAt: a.appointmentDate || new Date().toISOString(),
            patient: {
              name: a.patient?.name || 'Unknown Patient',
              phoneNumber: a.patient?.phoneNumber || '',
              gender: a.patient?.gender || '',
              dateOfBirth: a.patient?.dateOfBirth || '',
            },
            doctor: {
              estimateConsultationTime: a.doctor?.estimateConsultationTime || 10,
            },
          }))
          .sort((a, b) => a.tokenNumber - b.tokenNumber)

        setQueueData(prev => ({
          ...prev,
          appointments: mapped,
        }))
      }
    } catch {
      // Retain existing data gracefully
    }
  }, [])

  // 4. Subscribe SSE & fetch REST data for active schedule
  useEffect(() => {
    if (!selectedSchedule || !currentDoctor) {
      setQueueData({ appointments: [], activePauses: [] })
      setConnected(false)
      return
    }

    if (sseRef.current) {
      try {
        sseRef.current.close()
      } catch {}
      sseRef.current = null
    }

    setConnected(false)
    setLoadingQueue(true)

    // Initial REST load
    fetchQueueAppointments(selectedSchedule.id, currentDoctor.id)
      .finally(() => setLoadingQueue(false))

    // Subscribe SSE
    subscribeQueue(
      selectedSchedule.id,
      data => {
        if (data && Array.isArray(data.appointments)) {
          const sortedAppointments = [...data.appointments].sort(
            (a, b) => a.tokenNumber - b.tokenNumber
          )
          setQueueData({
            ...data,
            appointments: sortedAppointments,
          })
          setConnected(true)
          setLoadingQueue(false)
        }
      },
      () => {
        setConnected(false)
      }
    )
      .then(es => {
        sseRef.current = es
      })
      .catch(() => {
        setConnected(false)
      })

    return () => {
      if (sseRef.current) {
        try {
          sseRef.current.close()
        } catch {}
        sseRef.current = null
      }
    }
  }, [selectedSchedule?.id, currentDoctor?.id, fetchQueueAppointments])

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    if (selectedDoctorId) {
      await fetchSchedules(selectedDoctorId)
    }
    if (selectedSchedule && currentDoctor) {
      await fetchQueueAppointments(selectedSchedule.id, currentDoctor.id)
    }
    setRefreshing(false)
  }, [selectedDoctorId, fetchSchedules, selectedSchedule, currentDoctor, fetchQueueAppointments])

  // Status updates
  const handleStatusUpdate = async (
    id: string,
    status: 'pending' | 'done' | 'cancelled' | 'skipped' | 'ongoing'
  ) => {
    setActionLoading(id)
    // Optimistic UI update
    setQueueData(prev => ({
      ...prev,
      appointments: prev.appointments.map(a =>
        a.id === id ? { ...a, tokenStatus: status } : a
      ),
    }))

    try {
      await updateAppointmentStatus(id, status)
    } catch {
      if (selectedSchedule && currentDoctor) {
        fetchQueueAppointments(selectedSchedule.id, currentDoctor.id)
      }
    } finally {
      setActionLoading(null)
    }
  }

  // Confirmation to cancel appointment
  const handleCancelConfirm = (id: string, tokenNumber: number) => {
    Alert.alert(
      'Cancel Token',
      `Are you sure you want to cancel token #${tokenNumber}?`,
      [
        { text: 'No, Keep', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => handleStatusUpdate(id, 'cancelled'),
        },
      ]
    )
  }

  // Next Token quick action
  const handleNextToken = async () => {
    const ongoing = queueData.appointments.find(a => a.tokenStatus === 'ongoing')
    const nextPending = queueData.appointments.find(a => a.tokenStatus === 'pending')

    if (ongoing) {
      setActionLoading(ongoing.id)
      try {
        await updateAppointmentStatus(ongoing.id, 'done')
        if (nextPending) {
          await updateAppointmentStatus(nextPending.id, 'ongoing')
        }
        if (selectedSchedule && currentDoctor) {
          fetchQueueAppointments(selectedSchedule.id, currentDoctor.id)
        }
      } catch {}
      finally {
        setActionLoading(null)
      }
    } else if (nextPending) {
      handleStatusUpdate(nextPending.id, 'ongoing')
    }
  }

  // Pause schedule handling
  const handlePauseSubmit = async (stopTime: string) => {
    if (!selectedSchedule || !stopTime) return
    const today = getTodayDateStr()
    const nowTime = new Date().toTimeString().slice(0, 5)

    setPauseSubmitting(true)
    try {
      const res = await pauseSchedule(selectedSchedule.id, {
        date: today,
        startTime: nowTime,
        stopTime,
      })
      if (res.success && res.data) {
        setQueueData(prev => ({
          ...prev,
          activePauses: [...(prev.activePauses || []), res.data],
        }))
      }
      setShowPauseModal(false)
      setCustomStopTime('')
    } catch {
      Alert.alert('Error', 'Failed to pause schedule. Please try again.')
    } finally {
      setPauseSubmitting(false)
    }
  }

  const handleQuickPause = (minutes: number) => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + minutes)
    const stopTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    handlePauseSubmit(stopTime)
  }

  const handleCancelPause = async (pauseId: string) => {
    try {
      await cancelSchedulePause(pauseId)
      setQueueData(prev => ({
        ...prev,
        activePauses: prev.activePauses.filter(p => p.id !== pauseId),
      }))
    } catch {
      Alert.alert('Error', 'Failed to resume schedule.')
    }
  }

  // Filtered Appointments sorted by tokenNumber ascending (First on top)
  const ongoingAppts = useMemo(
    () =>
      queueData.appointments
        .filter(a => a.tokenStatus === 'ongoing')
        .sort((a, b) => a.tokenNumber - b.tokenNumber),
    [queueData.appointments]
  )
  const pendingAppts = useMemo(
    () =>
      queueData.appointments
        .filter(a => a.tokenStatus === 'pending')
        .sort((a, b) => a.tokenNumber - b.tokenNumber),
    [queueData.appointments]
  )
  const doneAppts = useMemo(
    () =>
      queueData.appointments
        .filter(a => a.tokenStatus === 'done' || a.tokenStatus === 'skipped')
        .sort((a, b) => a.tokenNumber - b.tokenNumber),
    [queueData.appointments]
  )
  const cancelledAppts = useMemo(
    () =>
      queueData.appointments
        .filter(a => a.tokenStatus === 'cancelled')
        .sort((a, b) => a.tokenNumber - b.tokenNumber),
    [queueData.appointments]
  )

  const activePauses = queueData.activePauses || []
  const isPaused = activePauses.length > 0

  const displayList = useMemo(() => {
    let list: QueueAppointment[] = []

    if (activeFilterTab === 'all') {
      list = [...queueData.appointments].sort((a, b) => a.tokenNumber - b.tokenNumber)
    } else if (activeFilterTab === 'ongoing') {
      list = ongoingAppts
    } else if (activeFilterTab === 'pending') {
      list = pendingAppts
    } else if (activeFilterTab === 'done') {
      list = doneAppts
    } else if (activeFilterTab === 'cancelled') {
      list = cancelledAppts
    }

    if (!searchQuery.trim()) return list
    const q = searchQuery.toLowerCase().trim()
    return list.filter(
      a =>
        a.patient.name.toLowerCase().includes(q) ||
        a.patient.phoneNumber.includes(q) ||
        String(a.tokenNumber).includes(q)
    )
  }, [ongoingAppts, pendingAppts, doneAppts, cancelledAppts, activeFilterTab, searchQuery])

  const statFilterCards = useMemo(
    () => [
      {
        id: 'all' as FilterTab,
        label: 'All',
        count: queueData.appointments.length,
        color: colors.primary,
        dotColor: colors.primary,
        activeBorder: colors.primary,
        activeBg: '#EFF6FF',
      },
      {
        id: 'pending' as FilterTab,
        label: 'Waiting',
        count: pendingAppts.length,
        color: '#2563EB',
        dotColor: '#2563EB',
        activeBorder: '#2563EB',
        activeBg: '#EFF6FF',
      },
      {
        id: 'ongoing' as FilterTab,
        label: 'In Consult',
        count: ongoingAppts.length,
        color: '#D97706',
        dotColor: '#F59E0B',
        activeBorder: '#F59E0B',
        activeBg: '#FFFBEB',
      },
      {
        id: 'done' as FilterTab,
        label: 'Completed',
        count: doneAppts.length,
        color: '#15803D',
        dotColor: '#16A34A',
        activeBorder: '#16A34A',
        activeBg: '#F0FDF4',
      },
      {
        id: 'cancelled' as FilterTab,
        label: 'Cancelled',
        count: cancelledAppts.length,
        color: '#DC2626',
        dotColor: '#EF4444',
        activeBorder: '#EF4444',
        activeBg: '#FEF2F2',
      },
    ],
    [
      queueData.appointments.length,
      pendingAppts.length,
      ongoingAppts.length,
      doneAppts.length,
      cancelledAppts.length,
    ]
  )

  // RENDER: Loading Doctors
  if (loadingDoctors) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading doctors...</Text>
        </View>
      </SafeAreaView>
    )
  }

  // RENDER: No Doctors in Clinic
  if (doctors.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🩺</Text>
          <Text style={styles.emptyTitle}>No Doctors Available</Text>
          <Text style={styles.emptySubtitle}>
            No active doctors registered for this medical center.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  const renderQueueItem = ({ item }: { item: QueueAppointment }) => {
    const isOngoing = item.tokenStatus === 'ongoing'
    const isSkipped = item.tokenStatus === 'skipped'
    const isDone = item.tokenStatus === 'done'
    const isCancelled = item.tokenStatus === 'cancelled'

    return (
      <View
        style={[
          styles.queueCard,
          isOngoing && styles.queueCardOngoing,
          isCancelled && styles.queueCardCancelled,
        ]}
      >
        {/* Left: Token Number Pill Badge */}
        <View style={styles.tokenCol}>
          <View
            style={[
              styles.tokenBox,
              isOngoing && styles.tokenBoxOngoing,
              isDone && styles.tokenBoxDone,
              isSkipped && styles.tokenBoxSkipped,
              isCancelled && styles.tokenBoxCancelled,
            ]}
          >
            <Text
              style={[
                styles.tokenNum,
                isOngoing && styles.tokenNumOngoing,
                isDone && styles.tokenNumDone,
                isSkipped && styles.tokenNumSkipped,
                isCancelled && styles.tokenNumCancelled,
              ]}
            >
              #{item.tokenNumber}
            </Text>
          </View>
        </View>

        {/* Middle: Patient Details */}
        <View style={styles.queueInfo}>
          <View style={styles.patientRow}>
            <Image source={defaultUserAvatar} style={styles.patientMiniAvatar} />
            <Text
              style={[
                styles.queuePatient,
                isCancelled && styles.queuePatientCancelled,
              ]}
              numberOfLines={1}
            >
              {item.patient.name}
            </Text>
          </View>
          <Text style={styles.queueMeta} numberOfLines={1}>
            {formatPatientSubtitle(item.patient)}
          </Text>

          {isOngoing && (
            <View style={styles.ongoingBadgeWrap}>
              <View style={styles.pulsingDot} />
              <Text style={styles.ongoingLabel}>In Consultation</Text>
            </View>
          )}

          {isCancelled && (
            <Text style={styles.cancelledLabel}>✕ Cancelled</Text>
          )}
        </View>

        {/* Right: Badge & Actions */}
        <View style={styles.queueActionsCol}>
          <Badge label={item.tokenStatus} variant={tokenStatusVariant(item.tokenStatus)} />

          {item.tokenStatus === 'pending' && (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.miniBtn}
                onPress={() => handleStatusUpdate(item.id, 'ongoing')}
                disabled={actionLoading === item.id}
                activeOpacity={0.8}
              >
                <Text style={styles.miniBtnText}>Start</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.miniBtn, styles.miniBtnSkip]}
                onPress={() => handleStatusUpdate(item.id, 'skipped')}
                disabled={actionLoading === item.id}
                activeOpacity={0.8}
              >
                <Text style={[styles.miniBtnText, { color: colors.warning }]}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.miniBtn, styles.miniBtnCancel]}
                onPress={() => handleCancelConfirm(item.id, item.tokenNumber)}
                disabled={actionLoading === item.id}
                activeOpacity={0.8}
              >
                <Text style={[styles.miniBtnText, { color: colors.danger }]}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {isOngoing && (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.miniBtn, styles.miniBtnDone]}
                onPress={() => handleStatusUpdate(item.id, 'done')}
                disabled={actionLoading === item.id}
                activeOpacity={0.8}
              >
                <Text style={[styles.miniBtnText, { color: colors.white }]}>Done ✓</Text>
              </TouchableOpacity>
            </View>
          )}

          {isSkipped && (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.miniBtn}
                onPress={() => handleStatusUpdate(item.id, 'ongoing')}
                disabled={actionLoading === item.id}
                activeOpacity={0.8}
              >
                <Text style={styles.miniBtnText}>Resume</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.miniBtn, styles.miniBtnCancel]}
                onPress={() => handleCancelConfirm(item.id, item.tokenNumber)}
                disabled={actionLoading === item.id}
                activeOpacity={0.8}
              >
                <Text style={[styles.miniBtnText, { color: colors.danger }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {isCancelled && (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.miniBtn, styles.miniBtnReopen]}
                onPress={() => handleStatusUpdate(item.id, 'pending')}
                disabled={actionLoading === item.id}
                activeOpacity={0.8}
              >
                <Text style={styles.miniBtnReopenText}>Reopen</Text>
              </TouchableOpacity>
            </View>
          )}

          {actionLoading === item.id && (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 4 }} />
          )}
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* 1. Header Bar with Title, Live Badge, Search & Reload */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Queue Management</Text>
          <View style={[styles.liveChip, connected ? styles.liveChipActive : styles.liveChipInactive]}>
            <View style={[styles.liveDot, connected ? styles.liveDotActive : styles.liveDotInactive]} />
            <Text style={[styles.liveChipText, connected ? styles.liveChipTextActive : styles.liveChipTextInactive]}>
              {connected ? 'LIVE' : 'SYNCING'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.iconBtn, showSearch && styles.iconBtnActive]}
            onPress={() => setShowSearch(prev => !prev)}
            activeOpacity={0.7}
          >
            <SearchIcon width={17} height={17} fill={showSearch ? colors.primary : colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onRefresh}
            disabled={refreshing}
            activeOpacity={0.7}
          >
            <ReloadIcon width={17} height={17} fill={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Search Bar Dropdown */}
      {showSearch && (
        <View style={styles.searchBarWrap}>
          <SearchIcon width={16} height={16} fill={colors.placeholder} style={styles.searchIconInside} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, token (#) or phone..."
            placeholderTextColor={colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
              <Text style={styles.searchClearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 3. Doctor Selector Pills (Parity with Web Clinic Managers) */}
      {doctors.length > 1 && (
        <View style={styles.doctorTabsWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.doctorTabsContent}
          >
            {doctors.map(doc => {
              const isSelected = doc.id === selectedDoctorId
              return (
                <TouchableOpacity
                  key={doc.id}
                  style={[styles.doctorTab, isSelected && styles.doctorTabActive]}
                  onPress={() => setSelectedDoctorId(doc.id)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={
                      doc.profilePicture
                        ? { uri: doc.profilePicture }
                        : defaultDoctorAvatar
                    }
                    style={styles.doctorTabAvatar}
                  />
                  <Text
                    style={[
                      styles.doctorTabText,
                      isSelected && styles.doctorTabTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    Dr. {doc.name}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>
      )}

      {/* 4. Active Doctor & Session Hero Card */}
      {currentDoctor && (
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Image
              source={
                currentDoctor.profilePicture
                  ? { uri: currentDoctor.profilePicture }
                  : defaultDoctorAvatar
              }
              style={styles.heroAvatar}
            />

            <View style={styles.heroDoctorInfo}>
              <Text style={styles.heroDoctorName} numberOfLines={1}>
                Dr. {currentDoctor.name}
              </Text>
              <Text style={styles.heroDoctorSpecialty} numberOfLines={1}>
                {currentDoctor.specialties && currentDoctor.specialties.length > 0
                  ? currentDoctor.specialties.join(', ')
                  : 'Physician'}
              </Text>

              {selectedSchedule && (
                <View style={styles.heroTimeRow}>
                  <ClockBlueIcon width={13} height={13} stroke={colors.primary} />
                  <Text style={styles.heroTimeText}>
                    {formatTo12h(selectedSchedule.startTime)} – {formatTo12h(selectedSchedule.stopTime)}
                  </Text>
                </View>
              )}
            </View>

            {/* Pause / Resume Button */}
            {selectedSchedule && (
              <TouchableOpacity
                style={[styles.heroPauseBtn, isPaused && styles.heroPauseBtnActive]}
                onPress={() => setShowPauseModal(true)}
                activeOpacity={0.8}
              >
                <InstantPauseIcon width={14} height={14} fill={isPaused ? colors.white : colors.warning} />
                <Text style={[styles.heroPauseText, isPaused && styles.heroPauseTextActive]}>
                  {isPaused ? 'Paused' : 'Pause'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Multiple Schedule Session Tabs */}
          {schedules.length > 1 && (
            <View style={styles.sessionsRow}>
              {schedules.map((s, idx) => {
                const isSelected = selectedSchedule?.id === s.id
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.sessionChip, isSelected && styles.sessionChipActive]}
                    onPress={() => setSelectedSchedule(s)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.sessionChipText, isSelected && styles.sessionChipTextActive]}>
                      Session {idx + 1}: {formatTo12h(s.startTime)} – {formatTo12h(s.stopTime)}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}

          {/* Prominent Quick Action Button: Next Token / Start Now */}
          {selectedSchedule && pendingAppts.length > 0 && (
            <TouchableOpacity
              style={[
                styles.quickCtaBtn,
                ongoingAppts.length > 0 ? styles.quickCtaNext : styles.quickCtaStart,
              ]}
              onPress={handleNextToken}
              activeOpacity={0.85}
            >
              <Text style={styles.quickCtaText}>
                {ongoingAppts.length > 0
                  ? `Next Token (${pendingAppts[0]?.tokenNumber ? `#${pendingAppts[0].tokenNumber}` : 'Next'})`
                  : `Start Consultation (#${pendingAppts[0]?.tokenNumber || '1'})`}
              </Text>
              <RightArrowIcon width={14} height={14} fill={colors.white} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 5. Active Pauses Banner */}
      {activePauses.length > 0 && (
        <View style={styles.pauseBanner}>
          <View style={styles.pauseItemLeft}>
            <InstantPauseIcon width={16} height={16} fill={colors.warning} />
            <Text style={styles.pauseText}>
              Queue paused until {formatTo12h(activePauses[0].stopTime)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.resumeBtn}
            onPress={() => handleCancelPause(activePauses[0].id)}
            activeOpacity={0.8}
          >
            <Text style={styles.resumeBtnText}>Resume Queue</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 6. Interactive Summary Stat Filter Cards */}
      {selectedSchedule && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsStripContent}
          style={styles.statsStripScroll}
        >
          {statFilterCards.map(card => {
            const isActive = activeFilterTab === card.id
            return (
              <TouchableOpacity
                key={card.id}
                style={[
                  styles.statCard,
                  isActive
                    ? { borderColor: card.activeBorder, backgroundColor: card.activeBg, borderWidth: 2 }
                    : styles.statCardInactive,
                ]}
                onPress={() => setActiveFilterTab(card.id)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.statValue,
                    { color: isActive ? card.color : colors.textPrimary },
                  ]}
                >
                  {card.count}
                </Text>
                <View style={styles.statLabelRow}>
                  <View style={[styles.statDot, { backgroundColor: card.dotColor }]} />
                  <Text
                    style={[
                      styles.statLabel,
                      isActive && { color: card.color, fontWeight: typography.fontWeightBold },
                    ]}
                    numberOfLines={1}
                  >
                    {card.label}
                  </Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}

      {/* Section Title Header */}
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleWrap}>
          <Text style={styles.sectionTitle}>
            {activeFilterTab === 'all'
              ? 'Patients in Queue'
              : `${statFilterCards.find(c => c.id === activeFilterTab)?.label || ''} Patients`}
          </Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{displayList.length}</Text>
          </View>
        </View>
      </View>

      {/* 8. Main Queue Patient List */}
      {loadingSchedules ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading schedules...</Text>
        </View>
      ) : schedules.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.centered}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.emptyCircle}>
            <Text style={styles.emptyIcon}>📅</Text>
          </View>
          <Text style={styles.emptyTitle}>No Schedule Today</Text>
          <Text style={styles.emptySubtitle}>
            {currentDoctor?.name
              ? `Dr. ${currentDoctor.name} has no consultation sessions scheduled for today.`
              : 'No doctor schedule found for today.'}
          </Text>
        </ScrollView>
      ) : loadingQueue && displayList.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Syncing queue data...</Text>
        </View>
      ) : displayList.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.centered}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.emptyCircle}>
            <Text style={styles.emptyIcon}>🎉</Text>
          </View>
          <Text style={styles.emptyTitle}>Queue is Empty</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? 'No appointments matched your search query.'
              : activeFilterTab !== 'all'
              ? `No ${activeFilterTab} appointments in this session.`
              : 'All patients have been consulted or no appointments booked yet.'}
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={displayList}
          keyExtractor={item => item.id}
          renderItem={renderQueueItem}
          contentContainerStyle={styles.queueList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* 9. Sleek Pause Modal */}
      <Modal
        visible={showPauseModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPauseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <InstantPauseIcon width={20} height={20} fill={colors.warning} />
              </View>
              <View>
                <Text style={styles.modalTitle}>Pause Consultation</Text>
                <Text style={styles.modalSubtitle}>Patients in queue will be notified</Text>
              </View>
            </View>

            <Text style={styles.modalSectionLabel}>QUICK PAUSE</Text>
            <View style={styles.quickPauseRow}>
              {[15, 30, 45, 60].map(mins => (
                <TouchableOpacity
                  key={mins}
                  style={styles.quickPauseBtn}
                  onPress={() => handleQuickPause(mins)}
                  disabled={pauseSubmitting}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickPauseBtnText}>+{mins}m</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalSectionLabel}>OR CUSTOM STOP TIME</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 14:30"
              placeholderTextColor={colors.placeholder}
              value={customStopTime}
              onChangeText={setCustomStopTime}
              keyboardType="numbers-and-punctuation"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowPauseModal(false)}
                disabled={pauseSubmitting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, !customStopTime && { opacity: 0.6 }]}
                onPress={() => handlePauseSubmit(customStopTime)}
                disabled={!customStopTime || pauseSubmitting}
                activeOpacity={0.85}
              >
                {pauseSubmitting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.modalSubmitText}>Confirm Pause</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: typography.fontSizeSm,
  },
  emptyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: typography.fontSizeLg,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: typography.fontSizeSm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xl,
    lineHeight: 20,
  },

  // 1. Header Bar
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F4',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.fontSizeLg,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    gap: 5,
  },
  liveChipActive: {
    backgroundColor: '#ECFDF3',
  },
  liveChipInactive: {
    backgroundColor: '#FEF3C7',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveDotActive: {
    backgroundColor: colors.success,
  },
  liveDotInactive: {
    backgroundColor: colors.warning,
  },
  liveChipText: {
    fontSize: 10,
    fontWeight: typography.fontWeightBold,
    letterSpacing: 0.5,
  },
  liveChipTextActive: {
    color: '#027A48',
  },
  liveChipTextInactive: {
    color: '#B54708',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F4F6F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8ECF2',
  },
  iconBtnActive: {
    backgroundColor: '#EAF3FF',
    borderColor: colors.primary,
  },

  // 2. Search Dropdown
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F4',
  },
  searchIconInside: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    height: 38,
    fontSize: typography.fontSizeSm,
    color: colors.textPrimary,
  },
  searchClearBtn: {
    paddingHorizontal: spacing.xs,
  },
  searchClearText: {
    fontSize: typography.fontSizeXs,
    color: colors.primary,
    fontWeight: typography.fontWeightSemibold,
  },

  // 3. Doctor Selector Tabs
  doctorTabsWrap: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F4',
  },
  doctorTabsContent: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  doctorTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: '#F4F6FA',
    borderWidth: 1,
    borderColor: '#E2E6EE',
  },
  doctorTabActive: {
    backgroundColor: '#EAF3FF',
    borderColor: colors.primary,
  },
  doctorTabAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  doctorTabText: {
    fontSize: typography.fontSizeXs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeightMedium,
  },
  doctorTabTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeightBold,
  },

  // 4. Hero Card
  heroCard: {
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: '#E5E9F0',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: spacing.sm,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.md,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  heroDoctorInfo: {
    flex: 1,
  },
  heroDoctorName: {
    fontSize: typography.fontSizeMd,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
  },
  heroDoctorSpecialty: {
    fontSize: typography.fontSizeXs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  heroTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  heroTimeText: {
    fontSize: typography.fontSizeXs,
    color: colors.primary,
    fontWeight: typography.fontWeightMedium,
  },
  heroPauseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  heroPauseBtnActive: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
  heroPauseText: {
    fontSize: typography.fontSizeXs,
    color: colors.warning,
    fontWeight: typography.fontWeightBold,
  },
  heroPauseTextActive: {
    color: colors.white,
  },
  sessionsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: '#F0F2F6',
    paddingTop: spacing.xs,
  },
  sessionChip: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: '#F4F6F9',
  },
  sessionChipActive: {
    backgroundColor: '#EAF3FF',
  },
  sessionChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.fontWeightMedium,
  },
  sessionChipTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeightBold,
  },
  quickCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 10,
    borderRadius: radius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickCtaStart: {
    backgroundColor: colors.primary,
  },
  quickCtaNext: {
    backgroundColor: '#16A34A',
  },
  quickCtaText: {
    fontSize: typography.fontSizeSm,
    fontWeight: typography.fontWeightBold,
    color: colors.white,
  },

  // 5. Pause Banner
  pauseBanner: {
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
    backgroundColor: '#FFF7EC',
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: '#FED7AA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pauseItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  pauseText: {
    fontSize: typography.fontSizeXs,
    color: '#B54708',
    fontWeight: typography.fontWeightMedium,
  },
  resumeBtn: {
    backgroundColor: '#F79009',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  resumeBtnText: {
    fontSize: typography.fontSizeXs,
    color: colors.white,
    fontWeight: typography.fontWeightBold,
  },

  // 6. Interactive Summary Stat Filter Cards
  statsStripScroll: {
    marginTop: spacing.sm,
  },
  statsStripContent: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: 2,
  },
  statCard: {
    minWidth: 78,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  statCardInactive: {
    borderColor: '#E8ECF2',
    backgroundColor: colors.white,
  },
  statValue: {
    fontSize: 17,
    fontWeight: typography.fontWeightBold,
    lineHeight: 22,
    marginBottom: 4,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.fontWeightMedium,
  },

  // Section Title Header
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSizeBase,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
  },
  countBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeightBold,
    color: colors.textSecondary,
  },

  // 8. Queue List & Cards
  queueList: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
    paddingBottom: spacing['2xl'],
    gap: spacing.sm,
  },
  queueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: '#E8ECF2',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  queueCardOngoing: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFDF9',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.12,
  },
  queueCardCancelled: {
    borderColor: '#FECACA',
    backgroundColor: '#FFFBFB',
    opacity: 0.9,
  },
  tokenCol: {
    marginRight: spacing.md,
  },
  tokenBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  tokenBoxOngoing: {
    backgroundColor: '#F59E0B',
    borderColor: '#D97706',
  },
  tokenBoxDone: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  tokenBoxSkipped: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  tokenBoxCancelled: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  tokenNum: {
    fontSize: typography.fontSizeBase,
    fontWeight: typography.fontWeightBold,
    color: colors.primary,
  },
  tokenNumOngoing: {
    color: colors.white,
  },
  tokenNumDone: {
    color: '#15803D',
  },
  tokenNumSkipped: {
    color: '#D97706',
  },
  tokenNumCancelled: {
    color: '#DC2626',
  },
  queueInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  patientMiniAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  queuePatient: {
    fontSize: typography.fontSizeBase,
    fontWeight: typography.fontWeightSemibold,
    color: colors.textPrimary,
    flex: 1,
  },
  queuePatientCancelled: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  queueMeta: {
    fontSize: typography.fontSizeXs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ongoingBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D97706',
  },
  ongoingLabel: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: typography.fontWeightBold,
  },
  cancelledLabel: {
    fontSize: 11,
    color: colors.danger,
    fontWeight: typography.fontWeightMedium,
    marginTop: 2,
  },
  queueActionsCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  miniBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
  },
  miniBtnSkip: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  miniBtnDone: {
    backgroundColor: '#16A34A',
    borderColor: '#15803D',
  },
  miniBtnCancel: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  miniBtnReopen: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  miniBtnReopenText: {
    fontSize: 11,
    fontWeight: typography.fontWeightBold,
    color: colors.primary,
  },
  miniBtnText: {
    fontSize: 11,
    fontWeight: typography.fontWeightBold,
    color: colors.primary,
  },

  // 9. Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.base,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: typography.fontSizeLg,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: typography.fontSizeXs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalSectionLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeightBold,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  quickPauseRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  quickPauseBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#FFF7EC',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
  },
  quickPauseBtnText: {
    fontSize: typography.fontSizeSm,
    color: '#D97706',
    fontWeight: typography.fontWeightBold,
  },
  modalInput: {
    height: 46,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.fontSizeBase,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    backgroundColor: '#F8FAFC',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: '#F1F5F9',
  },
  modalCancelText: {
    fontSize: typography.fontSizeSm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeightSemibold,
  },
  modalSubmitBtn: {
    backgroundColor: '#D97706',
    paddingVertical: 10,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
  modalSubmitText: {
    fontSize: typography.fontSizeSm,
    color: colors.white,
    fontWeight: typography.fontWeightBold,
  },
})

export default QueueScreen
