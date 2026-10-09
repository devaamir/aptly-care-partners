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
import { colors, typography, spacing, radius, fonts } from '../../styles/theme'
import { SIZE } from '../../themes/sizes'
import {
  InstantPauseIcon,
  ScheduledPauseIcon,
  RightArrowIcon,
  SkipIcon,
} from '../../assets/icons'

const defaultDoctorAvatar = require('../../assets/images/doctor-profile.png')

const AVATAR_COLORS = [
  { bg: '#E8F0FE', text: '#4285F4' },
  { bg: '#E6F4EA', text: '#34A853' },
  { bg: '#FEF3E8', text: '#F57C00' },
  { bg: '#F3E8FE', text: '#9334EA' },
  { bg: '#E8F9FE', text: '#0288D1' },
  { bg: '#FCE8E8', text: '#E53935' },
]

const getInitials = (name: string) => {
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length === 0) return 'P'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const getAvatarColor = (name: string) => {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'done': return { label: 'Completed', dotColor: '#16A34A', textColor: '#16A34A', solid: false }
    case 'ongoing': return { label: 'Current', dotColor: colors.primary, textColor: colors.primary, solid: true }
    case 'skipped': return { label: 'Skipped', dotColor: '#F59E0B', textColor: '#D97706', solid: false }
    case 'cancelled': return { label: 'Cancelled', dotColor: '#EF4444', textColor: '#DC2626', solid: false }
    default: return { label: 'Waiting', dotColor: '#94A3B8', textColor: '#64748B', solid: false }
  }
}

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
  const activePauses = queueData.activePauses || []
  const isPaused = activePauses.length > 0

  const displayList = useMemo(
    () => [...queueData.appointments].sort((a, b) => a.tokenNumber - b.tokenNumber),
    [queueData.appointments]
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
    const isCancelled = item.tokenStatus === 'cancelled'
    const isPending = item.tokenStatus === 'pending'

    const initials = getInitials(item.patient.name)
    const avatarColor = getAvatarColor(item.patient.name)
    const tokenStr = String(item.tokenNumber).padStart(2, '0')
    const statusCfg = getStatusConfig(item.tokenStatus)
    const apptTime = item.createdAt ? formatTo12h(item.createdAt.slice(11, 16)) : '—'

    return (
      <View style={[
        styles.queueCard,
        isOngoing && styles.queueCardCurrent,
        isCancelled && styles.queueCardCancelled,
      ]}>
        {/* Left: token number + time */}
        <View style={styles.tokenCol}>
          <View style={[styles.tokenBox, isOngoing && styles.tokenBoxCurrent]}>
            <Text style={[styles.tokenNumText, isOngoing && styles.tokenNumTextCurrent]}>
              {tokenStr}
            </Text>
          </View>
          <Text style={styles.tokenTime}>{apptTime}</Text>
        </View>

        {/* Initials avatar */}
        <View style={[styles.initialsCircle, { backgroundColor: avatarColor.bg }]}>
          <Text style={[styles.initialsText, { color: avatarColor.text }]}>{initials}</Text>
        </View>

        {/* Patient name + phone */}
        <View style={styles.queueInfo}>
          <Text style={[styles.queuePatient, isCancelled && styles.queuePatientCancelled]} numberOfLines={1}>
            {item.patient.name}
          </Text>
          <Text style={styles.queuePhone} numberOfLines={1}>
            {item.patient.phoneNumber || '—'}
          </Text>
        </View>

        {/* Status + actions */}
        <View style={styles.queueActionsCol}>
          <View style={styles.statusRow}>
            <View style={[
              styles.statusDot,
              { backgroundColor: statusCfg.dotColor },
              statusCfg.solid && styles.statusDotSolid,
            ]} />
            <Text style={[styles.statusText, { color: statusCfg.textColor }]}>
              {statusCfg.label}
            </Text>
          </View>

          {isPending && (
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
            <TouchableOpacity
              style={[styles.miniBtn, styles.miniBtnDone]}
              onPress={() => handleStatusUpdate(item.id, 'done')}
              disabled={actionLoading === item.id}
              activeOpacity={0.8}
            >
              <Text style={[styles.miniBtnText, { color: colors.white }]}>Done ✓</Text>
            </TouchableOpacity>
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
                <Text style={[styles.miniBtnText, { color: colors.danger }]}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {isCancelled && (
            <TouchableOpacity
              style={[styles.miniBtn, styles.miniBtnReopen]}
              onPress={() => handleStatusUpdate(item.id, 'pending')}
              disabled={actionLoading === item.id}
              activeOpacity={0.8}
            >
              <Text style={styles.miniBtnReopenText}>Reopen</Text>
            </TouchableOpacity>
          )}

          {actionLoading === item.id && (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: SIZE(4) }} />
          )}
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* 1. Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Queue Management</Text>
      </View>

      {/* 2. Doctor Selector Tabs */}
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
                  <Text style={[styles.doctorTabText, isSelected && styles.doctorTabTextActive]} numberOfLines={1}>
                    Dr. {doc.name}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>
      )}

      {/* 4. Session Tab Strip */}
      {schedules.length > 0 && (
        <View style={styles.sessionTabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sessionTabBarContent}>
            {schedules.map(s => {
              const isActive = selectedSchedule?.id === s.id
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.sessionTab, isActive && styles.sessionTabActive]}
                  onPress={() => setSelectedSchedule(s)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.sessionTabText, isActive && styles.sessionTabTextActive]}>
                    {formatTo12h(s.startTime).toLowerCase()} – {formatTo12h(s.stopTime).toLowerCase()}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>
      )}

      {/* 5. Hero Card */}
      {currentDoctor && (
        <View style={styles.heroCard}>
          {/* Doctor row */}
          <View style={styles.heroTop}>
            <Image
              source={currentDoctor.profilePicture ? { uri: currentDoctor.profilePicture } : defaultDoctorAvatar}
              style={styles.heroAvatar}
            />
            <View style={styles.heroDoctorInfo}>
              <View style={styles.heroDoctorNameRow}>
                <Text style={styles.heroDoctorName} numberOfLines={1}>Dr. {currentDoctor.name}</Text>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDotGreen} />
                  <Text style={styles.liveBadgeText}>Live</Text>
                </View>
              </View>
              <Text style={styles.heroDoctorSpecialty} numberOfLines={1}>
                {currentDoctor.specialties && currentDoctor.specialties.length > 0
                  ? currentDoctor.specialties.join(', ')
                  : 'Physician'}
              </Text>
            </View>
          </View>

          {/* Action buttons row */}
          {selectedSchedule && (
            <View style={styles.heroBtnsRow}>
              <TouchableOpacity
                style={[styles.heroPill, isPaused && styles.heroPillActive]}
                onPress={() => handleQuickPause(15)}
                activeOpacity={0.8}
              >
                <InstantPauseIcon width={16} height={16} fill={isPaused ? colors.white : colors.textSecondary} />
                <Text style={[styles.heroPillText, isPaused && styles.heroPillTextActive]}>Instant Pause</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.heroPill}
                onPress={() => setShowPauseModal(true)}
                activeOpacity={0.8}
              >
                <ScheduledPauseIcon width={16} height={16} fill={colors.textSecondary} />
                <Text style={styles.heroPillText}>Scheduled Pause</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.heroPill}
                onPress={() => ongoingAppts.length > 0 && handleStatusUpdate(ongoingAppts[0].id, 'skipped')}
                activeOpacity={0.8}
              >
                <Text style={styles.heroPillText}>Skip</Text>
                <SkipIcon width={16} height={16} fill={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Next Token CTA */}
          {selectedSchedule && pendingAppts.length > 0 && (
            <TouchableOpacity style={styles.nextTokenBtn} onPress={handleNextToken} activeOpacity={0.85}>
              <Text style={styles.nextTokenText}>Next Token</Text>
              <RightArrowIcon width={16} height={16} fill={colors.white} />
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

      {/* Queue Patient List */}
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
            {'All patients have been consulted or no appointments booked yet.'}
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
    backgroundColor: colors.pageBg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZE(24),
  },
  loadingText: {
    marginTop: SIZE(8),
    color: colors.textSecondary,
    fontSize: SIZE(13),
    fontFamily: fonts.regular,
  },
  emptyCircle: {
    width: SIZE(80),
    height: SIZE(80),
    borderRadius: SIZE(40),
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZE(16),
  },
  emptyIcon: { fontSize: SIZE(36) },
  emptyTitle: {
    fontSize: SIZE(18),
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: SIZE(13),
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: SIZE(4),
    paddingHorizontal: SIZE(24),
    lineHeight: SIZE(20),
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZE(16),
    paddingTop: SIZE(12),
    paddingBottom: SIZE(12),
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF0',
  },
  headerTitle: {
    fontSize: SIZE(22),
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },

  // Doctor Tabs
  doctorTabsWrap: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF0',
  },
  doctorTabsContent: {
    paddingHorizontal: SIZE(16),
    paddingVertical: SIZE(8),
    gap: SIZE(8),
  },
  doctorTab: {
    paddingVertical: SIZE(7),
    paddingHorizontal: SIZE(12),
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#D0D5DD',
  },
  doctorTabActive: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  doctorTabText: {
    fontSize: SIZE(13),
    color: colors.textSecondary,
    fontFamily: fonts.medium,
  },
  doctorTabTextActive: {
    color: colors.primary,
    fontFamily: fonts.semiBold,
  },

  // Session Tab Strip
  sessionTabBar: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF0',
  },
  sessionTabBarContent: {
    paddingHorizontal: SIZE(16),
    gap: SIZE(20),
  },
  sessionTab: {
    paddingVertical: SIZE(10),
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  sessionTabActive: {
    borderBottomColor: '#FF7B63',
  },
  sessionTabText: {
    fontSize: SIZE(13),
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  sessionTabTextActive: {
    fontFamily: fonts.semiBold,
    color: '#FF7B63',
  },

  // Hero Section
  heroCard: {
    backgroundColor: colors.white,
    paddingHorizontal: SIZE(16),
    paddingTop: SIZE(16),
    paddingBottom: SIZE(16),
    gap: SIZE(12),
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF0',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE(12),
  },
  heroAvatar: {
    width: SIZE(46),
    height: SIZE(46),
    borderRadius: SIZE(23),
  },
  heroDoctorInfo: { flex: 1 },
  heroDoctorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE(8),
    flexWrap: 'nowrap',
  },
  heroDoctorName: {
    fontSize: SIZE(16),
    fontFamily: fonts.regular,
    color: '#0A0A0A',
    flexShrink: 1,
  },
  heroDoctorSpecialty: {
    fontSize: SIZE(11),
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    marginTop: SIZE(2),
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE(5),
    backgroundColor: '#ECFDF3',
    paddingHorizontal: SIZE(10),
    paddingVertical: SIZE(4),
    borderRadius: radius.full,
  },
  liveDotGreen: {
    width: SIZE(7),
    height: SIZE(7),
    borderRadius: SIZE(4),
    backgroundColor: '#16A34A',
  },
  liveBadgeText: {
    fontSize: SIZE(13),
    fontFamily: fonts.semiBold,
    color: '#16A34A',
  },
  heroBtnsRow: {
    flexDirection: 'row',
    gap: SIZE(8),
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE(5),
    paddingVertical: SIZE(8),
    paddingHorizontal: SIZE(14),
    borderRadius: radius.md,
    backgroundColor: '#F1F2F4',
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  heroPillActive: {},
  heroPillText: {
    fontSize: SIZE(13),
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  heroPillTextActive: {
    color: colors.white,
    fontFamily: fonts.semiBold,
  },
  nextTokenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZE(8),
    paddingVertical: SIZE(14),
    borderRadius: radius.md,
    backgroundColor: '#16A34A',
  },
  nextTokenText: {
    fontSize: SIZE(15),
    fontFamily: fonts.bold,
    color: colors.white,
  },

  // Pause Banner
  pauseBanner: {
    marginHorizontal: SIZE(16),
    marginTop: SIZE(8),
    backgroundColor: '#FFF7EC',
    borderRadius: radius.md,
    paddingHorizontal: SIZE(16),
    paddingVertical: SIZE(8),
    borderWidth: 1,
    borderColor: '#FED7AA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pauseItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE(4),
    flex: 1,
  },
  pauseText: {
    fontSize: SIZE(11),
    color: '#B54708',
    fontFamily: fonts.medium,
  },
  resumeBtn: {
    backgroundColor: '#F79009',
    paddingHorizontal: SIZE(12),
    paddingVertical: SIZE(5),
    borderRadius: radius.sm,
  },
  resumeBtnText: {
    fontSize: SIZE(11),
    color: colors.white,
    fontFamily: fonts.bold,
  },

  // Queue List
  queueList: {
    paddingHorizontal: SIZE(16),
    paddingTop: SIZE(8),
    paddingBottom: SIZE(32),
    gap: SIZE(8),
  },
  queueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingVertical: SIZE(14),
    paddingHorizontal: SIZE(16),
    borderWidth: 1,
    borderColor: '#E8ECF2',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    gap: SIZE(10),
  },
  queueCardCurrent: {
    borderColor: colors.primary,
    backgroundColor: '#F5F9FF',
  },
  queueCardCancelled: {
    borderColor: '#FECACA',
    backgroundColor: '#FFFBFB',
    opacity: 0.85,
  },

  // Token column
  tokenCol: {
    alignItems: 'center',
    gap: SIZE(4),
    minWidth: SIZE(38),
  },
  tokenBox: {
    width: SIZE(38),
    height: SIZE(38),
    borderRadius: radius.md,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenBoxCurrent: {
    backgroundColor: colors.primary,
  },
  tokenNumText: {
    fontSize: SIZE(13),
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  tokenNumTextCurrent: {
    color: colors.white,
  },
  tokenTime: {
    fontSize: SIZE(10),
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },

  // Initials avatar
  initialsCircle: {
    width: SIZE(36),
    height: SIZE(36),
    borderRadius: SIZE(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: SIZE(13),
    fontFamily: fonts.bold,
  },

  // Patient info
  queueInfo: {
    flex: 1,
  },
  queuePatient: {
    fontSize: SIZE(13),
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
  },
  queuePatientCancelled: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  queuePhone: {
    fontSize: SIZE(11),
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    marginTop: SIZE(2),
  },

  // Status column
  queueActionsCol: {
    alignItems: 'flex-end',
    gap: SIZE(6),
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE(5),
  },
  statusDot: {
    width: SIZE(7),
    height: SIZE(7),
    borderRadius: SIZE(4),
  },
  statusDotSolid: {
    width: SIZE(9),
    height: SIZE(9),
    borderRadius: SIZE(5),
  },
  statusText: {
    fontSize: SIZE(11),
    fontFamily: fonts.semiBold,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: SIZE(5),
  },
  miniBtn: {
    paddingVertical: SIZE(4),
    paddingHorizontal: SIZE(10),
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
    fontSize: SIZE(11),
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  miniBtnText: {
    fontSize: SIZE(11),
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },

  // Pause Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZE(20),
  },
  modalCard: {
    width: '100%',
    maxWidth: SIZE(380),
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: SIZE(24),
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE(12),
    marginBottom: SIZE(16),
  },
  modalIconWrap: {
    width: SIZE(44),
    height: SIZE(44),
    borderRadius: SIZE(22),
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: SIZE(18),
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: SIZE(11),
    color: colors.textSecondary,
    marginTop: SIZE(2),
  },
  modalSectionLabel: {
    fontSize: SIZE(10),
    fontFamily: fonts.bold,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: SIZE(4),
  },
  quickPauseRow: {
    flexDirection: 'row',
    gap: SIZE(8),
    marginBottom: SIZE(16),
  },
  quickPauseBtn: {
    flex: 1,
    paddingVertical: SIZE(10),
    backgroundColor: '#FFF7EC',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
  },
  quickPauseBtnText: {
    fontSize: SIZE(13),
    color: '#D97706',
    fontFamily: fonts.bold,
  },
  modalInput: {
    height: SIZE(46),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.md,
    paddingHorizontal: SIZE(12),
    fontSize: SIZE(15),
    color: colors.textPrimary,
    marginBottom: SIZE(20),
    backgroundColor: '#F8FAFC',
  },
  modalActions: {
    flexDirection: 'row',
    gap: SIZE(8),
    justifyContent: 'flex-end',
  },
  modalCancelBtn: {
    paddingVertical: SIZE(10),
    paddingHorizontal: SIZE(20),
    borderRadius: radius.md,
    backgroundColor: '#F1F5F9',
  },
  modalCancelText: {
    fontSize: SIZE(13),
    color: colors.textSecondary,
    fontFamily: fonts.semiBold,
  },
  modalSubmitBtn: {
    backgroundColor: '#D97706',
    paddingVertical: SIZE(10),
    paddingHorizontal: SIZE(24),
    borderRadius: radius.md,
  },
  modalSubmitText: {
    fontSize: SIZE(13),
    color: colors.white,
    fontFamily: fonts.bold,
  },
})

export default QueueScreen
