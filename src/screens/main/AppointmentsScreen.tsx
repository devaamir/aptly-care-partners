import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useAppContext } from '../../context/AppContext';
import {
  getAppointments,
  updateAppointmentStatus,
  getDoctors,
  getDoctorSchedule,
  searchPatients,
  createPatient,
  createAppointment,
} from '../../services/api';
import type {
  Appointment,
  AppointmentDoctor,
  DoctorSchedule,
  Patient,
  CreatedAppointment,
} from '../../services/types';
import Badge, { tokenStatusVariant } from '../../components/Badge';
import { colors, typography, spacing, radius, fonts } from '../../styles/theme';
import { SIZE } from '../../themes/sizes';
import {
  SearchIcon,
  CalendarIcon,
  ClockBlueIcon,
  AppointmentIcon,
  AddIconWhite,
  ArrowDownIcon,
  TickIcon,
} from '../../assets/icons';

const doctorProfileImg = require('../../assets/images/doctor-profile.png');
const userProfileImg = require('../../assets/images/user-profile.png');

type DateFilterType = 'Today' | 'Tomorrow' | 'This Week' | 'Date Range' | 'All';

const DATE_TABS: Array<{ id: DateFilterType; label: string }> = [
  { id: 'Today', label: 'Today' },
  { id: 'Tomorrow', label: 'Tomorrow' },
  { id: 'This Week', label: 'This Week' },
  { id: 'Date Range', label: 'Date Range' },
  { id: 'All', label: 'All' },
];

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Ongoing', value: 'ongoing' },
  { label: 'Done', value: 'done' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Skipped', value: 'skipped' },
];

const GENDER_OPTIONS: Array<'Male' | 'Female' | 'Other'> = [
  'Male',
  'Female',
  'Other',
];

const to12h = (t?: string) => {
  if (!t) return '—';
  const [h, m] = t.slice(0, 5).split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const formatShortDate = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTomorrowStr = () => {
  const d = new Date(Date.now() + 86400000);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getWeekEndStr = () => {
  const d = new Date(Date.now() + 6 * 86400000);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getPatientSubtitle = (patient?: Appointment['patient']) => {
  if (!patient) return 'Patient';
  const parts: string[] = [];
  if (patient.gender) {
    parts.push(
      patient.gender.charAt(0).toUpperCase() +
        patient.gender.slice(1).toLowerCase(),
    );
  }
  if (patient.dateOfBirth) {
    const dob = new Date(patient.dateOfBirth);
    if (!isNaN(dob.getTime())) {
      const now = new Date();
      let age = now.getFullYear() - dob.getFullYear();
      const m = now.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
      if (age > 0 && age < 130) {
        parts.push(`${age} yrs`);
      } else if (age === 0) {
        const months =
          (now.getFullYear() - dob.getFullYear()) * 12 +
          (now.getMonth() - dob.getMonth());
        if (months > 0) {
          parts.push(`${months} mo`);
        }
      }
    }
  }
  if (patient.phoneNumber) {
    parts.push(patient.phoneNumber);
  }
  return parts.length > 0 ? parts.join(' • ') : 'No additional info';
};

const getAgeFromDob = (dob?: string) => {
  if (!dob) return '';
  const d = new Date(dob);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  if (age > 0 && age < 130) return `${age} yrs`;
  if (age === 0) {
    const months =
      (now.getFullYear() - d.getFullYear()) * 12 +
      (now.getMonth() - d.getMonth());
    if (months > 0) return `${months} mo`;
  }
  return '';
};

const getDobFromAge = (ageStr: string) => {
  const ageNum = parseInt(ageStr, 10);
  if (isNaN(ageNum) || ageNum < 0 || ageNum > 130) {
    return '2000-01-01';
  }
  const year = new Date().getFullYear() - ageNum;
  return `${year}-01-01`;
};

const AppointmentsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { activeContext, activeDoctor } = useAppContext();
  const isDoctor = activeContext?.role?.toLowerCase() === 'doctor';

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filtered, setFiltered] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Filters: Date Filter (Today, Tomorrow, This Week, Date Range, All)
  const [dateFilter, setDateFilter] = useState<DateFilterType>('Today');
  const [rangeStart, setRangeStart] = useState<string>('');
  const [rangeEnd, setRangeEnd] = useState<string>('');
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [customStartInput, setCustomStartInput] = useState('');
  const [customEndInput, setCustomEndInput] = useState('');

  // Secondary Filter: Status
  const [statusFilter, setStatusFilter] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Search
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Add Appointment Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [createdAppointment, setCreatedAppointment] =
    useState<CreatedAppointment | null>(null);

  // Booking Form State
  const [clinicDoctors, setClinicDoctors] = useState<AppointmentDoctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [selectedBookingDate, setSelectedBookingDate] = useState<string>(
    getTodayStr(),
  );
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // Patient Booking Fields
  const [phone, setPhone] = useState('');
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [foundPatient, setFoundPatient] = useState<Patient | null>(null);
  const [patientName, setPatientName] = useState('');
  const [patientGender, setPatientGender] = useState<
    'Male' | 'Female' | 'Other'
  >('Male');
  const [patientAge, setPatientAge] = useState('');

  // Upcoming 14 days for quick date selection
  const upcomingBookingDates = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(now.getTime() + i * 86400000);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const iso = `${y}-${m}-${day}`;
      const weekday =
        i === 0
          ? 'Today'
          : i === 1
          ? 'Tmrw'
          : d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = d.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
      });
      list.push({ iso, weekday, monthDay });
    }
    return list;
  }, []);

  const fetchAppointments = useCallback(async (pg = 1, refresh = false) => {
    if (refresh) setRefreshing(true);
    else if (pg === 1) setLoading(true);

    try {
      const res = await getAppointments(pg, 20);
      if (res.success) {
        const newItems = res.data;
        setAppointments(prev => (pg === 1 ? newItems : [...prev, ...newItems]));
        setHasMore(res.pagination.hasNextPage);
        setPage(pg);
      }
    } catch {
      // handled
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments(1);
  }, [fetchAppointments]);

  // Tab counts based on appointment dates
  const dateCounts = useMemo(() => {
    const today = getTodayStr();
    const tomorrow = getTomorrowStr();
    const weekEnd = getWeekEndStr();

    let todayCount = 0;
    let tomorrowCount = 0;
    let weekCount = 0;
    let rangeCount = 0;

    appointments.forEach(a => {
      const aptDate = a.appointmentDate ? a.appointmentDate.split('T')[0] : '';
      if (aptDate === today) todayCount++;
      if (aptDate === tomorrow) tomorrowCount++;
      if (aptDate >= today && aptDate <= weekEnd) weekCount++;
      if (
        rangeStart &&
        rangeEnd &&
        aptDate >= rangeStart &&
        aptDate <= rangeEnd
      )
        rangeCount++;
    });

    return {
      Today: todayCount,
      Tomorrow: tomorrowCount,
      'This Week': weekCount,
      'Date Range': rangeCount,
      All: appointments.length,
    };
  }, [appointments, rangeStart, rangeEnd]);

  // Filter Appointments by Date, Status & Search
  useEffect(() => {
    const today = getTodayStr();
    const tomorrow = getTomorrowStr();
    const weekEnd = getWeekEndStr();

    let list = appointments.filter(a => {
      const aptDate = a.appointmentDate ? a.appointmentDate.split('T')[0] : '';

      // Date filtering
      if (dateFilter === 'Today' && aptDate !== today) return false;
      if (dateFilter === 'Tomorrow' && aptDate !== tomorrow) return false;
      if (dateFilter === 'This Week' && (aptDate < today || aptDate > weekEnd))
        return false;
      if (
        dateFilter === 'Date Range' &&
        rangeStart &&
        rangeEnd &&
        (aptDate < rangeStart || aptDate > rangeEnd)
      ) {
        return false;
      }

      // Status filtering
      if (
        statusFilter &&
        a.tokenStatus?.toLowerCase() !== statusFilter.toLowerCase()
      ) {
        return false;
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesPatient = a.patient?.name?.toLowerCase().includes(q);
        const matchesDoctor = a.doctor?.name?.toLowerCase().includes(q);
        const matchesRef = a.referenceId?.toLowerCase().includes(q);
        const matchesToken = String(a.tokenNumber).includes(q);
        if (!matchesPatient && !matchesDoctor && !matchesRef && !matchesToken)
          return false;
      }

      return true;
    });

    // Order: First one on top (date ascending, session time ascending, tokenNumber ascending #1, #2, #3...)
    list.sort((a, b) => {
      const dateA = a.appointmentDate ? a.appointmentDate.split('T')[0] : '';
      const dateB = b.appointmentDate ? b.appointmentDate.split('T')[0] : '';
      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }

      const timeA = a.schedule?.startTime || '';
      const timeB = b.schedule?.startTime || '';
      if (timeA !== timeB) {
        return timeA.localeCompare(timeB);
      }

      const tokenA = a.tokenNumber ?? 0;
      const tokenB = b.tokenNumber ?? 0;
      if (tokenA !== tokenB) {
        return tokenA - tokenB;
      }

      const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return createdA - createdB;
    });

    setFiltered(list);
  }, [appointments, dateFilter, rangeStart, rangeEnd, statusFilter, search]);

  // Select Date Tab
  const handleSelectDateTab = (tabId: DateFilterType) => {
    if (tabId === 'Date Range') {
      if (!rangeStart || !rangeEnd) {
        setCustomStartInput(getTodayStr());
        setCustomEndInput(getWeekEndStr());
        setShowRangeModal(true);
        return;
      }
      setDateFilter('Date Range');
    } else {
      setDateFilter(tabId);
    }
  };

  // Apply Range from Modal
  const handleApplyRange = () => {
    if (customStartInput.trim() && customEndInput.trim()) {
      setRangeStart(customStartInput.trim());
      setRangeEnd(customEndInput.trim());
      setDateFilter('Date Range');
      setShowRangeModal(false);
    }
  };

  // Preset Date Ranges
  const handlePresetRange = (days: number) => {
    const start = getTodayStr();
    const d = new Date(Date.now() + (days - 1) * 86400000);
    const end = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(d.getDate()).padStart(2, '0')}`;
    setCustomStartInput(start);
    setCustomEndInput(end);
    setRangeStart(start);
    setRangeEnd(end);
    setDateFilter('Date Range');
    setShowRangeModal(false);
  };

  // Load Schedules for Selected Doctor & Booking Date
  const loadDoctorSchedules = useCallback(
    async (docId: string, dt: string) => {
      const medId = activeContext?.medicalCenter.id;
      if (!docId || !dt || !medId) return;
      setLoadingSchedules(true);
      setSelectedScheduleId('');
      try {
        const res = await getDoctorSchedule(docId, dt, medId);
        if (res.success && res.data) {
          setSchedules(res.data);
          const firstAvailable = res.data.find(s => {
            if (s.remainingTokenCount <= 0) return false;
            const [h, m] = s.stopTime.split(':').map(Number);
            const stop = new Date();
            stop.setHours(h, m, 0, 0);
            return !(dt === getTodayStr() && new Date() > stop);
          });
          if (firstAvailable) {
            setSelectedScheduleId(firstAvailable.id);
          } else if (res.data.length > 0) {
            setSelectedScheduleId(res.data[0].id);
          }
        } else {
          setSchedules([]);
        }
      } catch {
        setSchedules([]);
      } finally {
        setLoadingSchedules(false);
      }
    },
    [activeContext?.medicalCenter.id],
  );

  // Reset Booking Form
  const resetBookingForm = (keepDoctorAndDate = false) => {
    setBookingError('');
    setCreatedAppointment(null);
    setPhone('');
    setPatientName('');
    setPatientAge('');
    setFoundPatient(null);
    if (!keepDoctorAndDate) {
      setSelectedBookingDate(getTodayStr());
    }
  };

  // Open Booking Modal
  const handleOpenBookingModal = async () => {
    resetBookingForm();
    setShowBookingModal(true);

    try {
      const res = await getDoctors(activeContext?.medicalCenter.id);
      if (res.success && res.data.length > 0) {
        setClinicDoctors(res.data);
        const docId =
          isDoctor && activeDoctor ? activeDoctor.id : res.data[0].id;
        setSelectedDoctorId(docId);
        loadDoctorSchedules(docId, selectedBookingDate);
      }
    } catch {
      // silent
    }
  };

  // Booking: Doctor changed
  const handleSelectDoctor = (docId: string) => {
    setSelectedDoctorId(docId);
    loadDoctorSchedules(docId, selectedBookingDate);
  };

  // Booking: Date changed
  const handleSelectBookingDate = (dt: string) => {
    setSelectedBookingDate(dt);
    if (selectedDoctorId) {
      loadDoctorSchedules(selectedDoctorId, dt);
    }
  };

  // Booking: Phone lookup
  const handlePhoneChange = async (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 10);
    setPhone(cleaned);
    if (cleaned.length === 10) {
      setSearchingPatient(true);
      try {
        const res = await searchPatients(cleaned);
        if (res.success && res.data.length > 0) {
          const p = res.data[0];
          setFoundPatient(p);
          setPatientName(p.name);
          if (
            p.gender === 'Male' ||
            p.gender === 'Female' ||
            p.gender === 'Other'
          ) {
            setPatientGender(p.gender);
          }
          if (p.dateOfBirth) {
            const ageStr = getAgeFromDob(p.dateOfBirth).replace(' yrs', '');
            setPatientAge(ageStr);
          }
        } else {
          setFoundPatient(null);
        }
      } catch {
        setFoundPatient(null);
      } finally {
        setSearchingPatient(false);
      }
    } else {
      setFoundPatient(null);
    }
  };

  // Booking: Submit
  const handleBookAppointment = async () => {
    if (!selectedDoctorId) {
      setBookingError('Please select a doctor.');
      return;
    }
    if (!selectedScheduleId) {
      setBookingError('Please choose a consultation session slot.');
      return;
    }

    const selectedSchedule = schedules.find(s => s.id === selectedScheduleId);
    if (!selectedSchedule) {
      setBookingError('Please choose a consultation session slot.');
      return;
    }
    if (selectedSchedule.remainingTokenCount <= 0) {
      setBookingError(
        'No tokens left for this session. Please select another slot.',
      );
      return;
    }
    const [h, m] = selectedSchedule.stopTime.split(':').map(Number);
    const stopTimeDate = new Date();
    stopTimeDate.setHours(h, m, 0, 0);
    if (selectedBookingDate === getTodayStr() && new Date() > stopTimeDate) {
      setBookingError(
        'This session has already ended for today. Please pick an upcoming date or session.',
      );
      return;
    }

    if (!phone.trim() || phone.trim().length !== 10) {
      setBookingError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!patientName.trim()) {
      setBookingError('Please enter the patient full name.');
      return;
    }
    if (!foundPatient && !patientAge.trim()) {
      setBookingError('Please enter the patient age.');
      return;
    }

    setBookingError('');
    setBookingLoading(true);

    try {
      let patientId = foundPatient?.id;
      if (!patientId) {
        const pRes = await createPatient({
          name: patientName.trim(),
          phoneNumber: phone.trim(),
          gender: patientGender.toLowerCase() as 'male' | 'female' | 'other',
          dateOfBirth: getDobFromAge(patientAge),
        });
        if (!pRes.success) {
          setBookingError(pRes.message || 'Failed to create patient record.');
          setBookingLoading(false);
          return;
        }
        patientId = pRes.data.id;
      }

      const apptRes = await createAppointment({
        appointmentDate: selectedBookingDate,
        doctorScheduleId: selectedScheduleId,
        patientId,
      });

      if (apptRes.success) {
        setCreatedAppointment(apptRes.data);
        fetchAppointments(1, true);
      } else {
        setBookingError('Failed to create appointment.');
      }
    } catch (err: any) {
      const respData = err?.response?.data;
      const rawMsg =
        respData?.message ||
        respData?.error ||
        err?.message ||
        'Failed to book appointment.';
      const detailedMsg = Array.isArray(rawMsg)
        ? rawMsg.join(', ')
        : typeof rawMsg === 'object'
        ? JSON.stringify(rawMsg)
        : String(rawMsg);
      setBookingError(detailedMsg);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleStatusUpdate = async (
    id: string,
    status: 'pending' | 'done' | 'cancelled' | 'skipped' | 'ongoing',
  ) => {
    setActionLoading(id);
    try {
      await updateAppointmentStatus(id, status);
      setAppointments(prev =>
        prev.map(a => (a.id === id ? { ...a, tokenStatus: status } : a)),
      );
      if (status === 'done' || status === 'cancelled' || status === 'skipped') {
        setExpandedCardId(prev => (prev === id ? null : prev));
      }
    } catch {
      // error handled gracefully
    } finally {
      setActionLoading(null);
    }
  };

  const renderItem = ({ item }: { item: Appointment }) => {
    const isPending = item.tokenStatus === 'pending';
    const isOngoing = item.tokenStatus === 'ongoing';
    const isItemLoading = actionLoading === item.id;
    const isExpanded = expandedCardId === item.id;

    return (
      <TouchableOpacity
        style={[styles.card, isExpanded && styles.cardExpanded]}
        activeOpacity={0.8}
        onPress={() =>
          setExpandedCardId(prev => (prev === item.id ? null : item.id))
        }
      >
        {/* Card Header (Basic Details: Token #, Name, Doctor, Date) */}
        <View style={styles.cardHeader}>
          <View style={styles.avatarWrap}>
            <Image source={userProfileImg} style={styles.patientAvatar} />
            <View style={styles.tokenBadge}>
              <Text style={styles.tokenBadgeText}>#{item.tokenNumber}</Text>
            </View>
          </View>

          <View style={styles.patientMetaCol}>
            <View style={styles.patientNameRow}>
              <Text style={styles.patientName} numberOfLines={1}>
                {item.patient?.name || 'Unnamed Patient'}
              </Text>
            </View>
            <View style={styles.basicMetaRow}>
              <Text style={styles.basicDoctorText} numberOfLines={1}>
                Dr. {item.doctor?.name || 'General Physician'}
              </Text>
              <View style={styles.metaDot} />
              <View style={styles.basicDateRow}>
                <CalendarIcon
                  width={SIZE(11)}
                  height={SIZE(11)}
                  stroke={colors.textMuted}
                />
                <Text style={styles.basicDateText}>
                  {formatDate(item.appointmentDate)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.headerRightCol}>
            <Badge
              label={item.tokenStatus}
              variant={tokenStatusVariant(item.tokenStatus)}
            />
            <View
              style={[
                styles.chevronWrap,
                { transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] },
              ]}
            >
              <ArrowDownIcon
                width={SIZE(12)}
                height={SIZE(12)}
                stroke={colors.textMuted}
              />
            </View>
          </View>
        </View>

        {/* Expanded Details: only shown when card is expanded */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.infoBox}>
              {/* Patient Additional Info */}
              <View style={styles.expandedRow}>
                <Text style={styles.infoLabel}>Patient Details</Text>
                <Text style={styles.expandedPatientText}>
                  {getPatientSubtitle(item.patient)}
                </Text>
              </View>

              <View style={styles.infoDivider} />

              {/* Doctor Row with Specialty */}
              <View style={styles.doctorRow}>
                <Text style={styles.infoLabel}>Doctor</Text>
                <Text style={styles.doctorValue} numberOfLines={1}>
                  Dr. {item.doctor?.name || 'General Physician'}
                  {item.doctor?.specialties?.[0]?.name ? (
                    <Text style={styles.specialtyTag}>
                      {' '}
                      • {item.doctor.specialties[0].name}
                    </Text>
                  ) : null}
                </Text>
              </View>

              <View style={styles.infoDivider} />

              {/* Schedule / Time Row */}
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <ClockBlueIcon
                    width={SIZE(13)}
                    height={SIZE(13)}
                    stroke={colors.textSecondary}
                  />
                  <Text style={styles.metaText}>
                    {to12h(item.schedule?.startTime)} -{' '}
                    {to12h(item.schedule?.stopTime)}
                  </Text>
                </View>

                {item.referenceId ? (
                  <>
                    <View style={styles.metaDot} />
                    <Text style={styles.refText}>Ref #{item.referenceId}</Text>
                  </>
                ) : null}
              </View>
            </View>

            {/* Action Buttons */}
            {isPending && (
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionCancel]}
                  onPress={() => handleStatusUpdate(item.id, 'cancelled')}
                  disabled={isItemLoading}
                  activeOpacity={0.7}
                >
                  {isItemLoading ? (
                    <ActivityIndicator size="small" color={colors.danger} />
                  ) : (
                    <Text style={styles.actionCancelText}>
                      Cancel Consultation
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {isOngoing && (
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionDone]}
                  onPress={() => handleStatusUpdate(item.id, 'done')}
                  disabled={isItemLoading}
                  activeOpacity={0.7}
                >
                  {isItemLoading ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.actionDoneText}>Mark Complete</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionSkip]}
                  onPress={() => handleStatusUpdate(item.id, 'skipped')}
                  disabled={isItemLoading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionSkipText}>Skip Token</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Flat White Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerTitle}>Appointments</Text>
        </View>
      </View>

      {/* Search Bar + Status Filter Pill */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <SearchIcon
              width={SIZE(16)}
              height={SIZE(16)}
              stroke={colors.textMuted}
            />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search patient, doctor, token..."
              placeholderTextColor={colors.placeholder}
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearch('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.statusFilterBtn,
              !!statusFilter && styles.statusFilterBtnActive,
            ]}
            onPress={() => setShowStatusModal(true)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.statusFilterBtnText,
                !!statusFilter && styles.statusFilterBtnTextActive,
              ]}
            >
              {statusFilter
                ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)
                : 'Status'}
            </Text>
            <ArrowDownIcon
              width={SIZE(12)}
              height={SIZE(12)}
              stroke={statusFilter ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Single Line Date Filter Tabs (Today, Tomorrow, This Week, Date Range, All) */}
      <View style={styles.filterTabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {DATE_TABS.map(tab => {
            const isActive = dateFilter === tab.id;
            const count = dateCounts[tab.id];

            const isCustomRange =
              tab.id === 'Date Range' && rangeStart && rangeEnd;
            const displayLabel = isCustomRange
              ? `${formatShortDate(rangeStart)} – ${formatShortDate(rangeEnd)}`
              : tab.label;

            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => handleSelectDateTab(tab.id)}
                activeOpacity={0.7}
              >
                {tab.id === 'Date Range' && (
                  <CalendarIcon
                    width={SIZE(13)}
                    height={SIZE(13)}
                    stroke={isActive ? colors.white : colors.textSecondary}
                  />
                )}
                <Text
                  style={[
                    styles.filterTabText,
                    isActive && styles.filterTabTextActive,
                  ]}
                >
                  {displayLabel}
                </Text>
                <View
                  style={[
                    styles.filterTabCount,
                    isActive && styles.filterTabCountActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterTabCountText,
                      isActive && styles.filterTabCountTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Appointment Cards List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading appointments...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIconCircle}>
            <AppointmentIcon
              width={SIZE(28)}
              height={SIZE(28)}
              stroke={colors.textMuted}
            />
          </View>
          <Text style={styles.emptyTitle}>No appointments found</Text>
          <Text style={styles.emptySubtitle}>
            {search || statusFilter || dateFilter !== 'Today'
              ? 'Try adjusting your date selection, search query, or status filter.'
              : 'There are no appointments registered for today.'}
          </Text>
          {(search || statusFilter || dateFilter !== 'Today') && (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                setSearch('');
                setStatusFilter('');
                setDateFilter('Today');
                setRangeStart('');
                setRangeEnd('');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.resetButtonText}>Reset to Today</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          extraData={expandedCardId}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchAppointments(1, true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          onEndReached={() => {
            if (hasMore && !loading) fetchAppointments(page + 1);
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            hasMore ? (
              <View style={styles.listFooter}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (
              <View style={styles.listFooter}>
                <Text style={styles.listFooterText}>End of appointments</Text>
              </View>
            )
          }
        />
      )}

      {/* Date Range Selection Modal */}
      <Modal
        visible={showRangeModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowRangeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.rangeDialogBox}>
            <View style={styles.dialogHeader}>
              <View>
                <Text style={styles.dialogTitle}>Select Date Range</Text>
                <Text style={styles.dialogSubtitle}>
                  Filter appointments across days
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowRangeModal(false)}
                style={styles.dialogCloseBtn}
              >
                <Text style={styles.dialogCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Presets */}
            <Text style={styles.presetLabel}>Quick Presets</Text>
            <View style={styles.presetsRow}>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => handlePresetRange(7)}
              >
                <Text style={styles.presetChipText}>Next 7 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => handlePresetRange(14)}
              >
                <Text style={styles.presetChipText}>Next 14 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => handlePresetRange(30)}
              >
                <Text style={styles.presetChipText}>Next 30 Days</Text>
              </TouchableOpacity>
            </View>

            {/* Manual Date Inputs */}
            <View style={styles.customDateInputsRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>From Date</Text>
                <TextInput
                  style={styles.modalInput}
                  value={customStartInput}
                  onChangeText={setCustomStartInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.placeholder}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>To Date</Text>
                <TextInput
                  style={styles.modalInput}
                  value={customEndInput}
                  onChangeText={setCustomEndInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.placeholder}
                />
              </View>
            </View>

            <View style={styles.dialogButtonsRow}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setShowRangeModal(false)}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogApplyBtn}
                onPress={handleApplyRange}
              >
                <Text style={styles.dialogApplyText}>Apply Range</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Status Selection Modal */}
      <Modal
        visible={showStatusModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowStatusModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStatusModal(false)}
        >
          <View style={styles.statusDialogBox}>
            <Text style={styles.dialogTitle}>Filter by Status</Text>
            <View style={styles.statusOptionsList}>
              {STATUS_OPTIONS.map(opt => {
                const isSelected = statusFilter === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.statusOptionRow,
                      isSelected && styles.statusOptionRowActive,
                    ]}
                    onPress={() => {
                      setStatusFilter(opt.value);
                      setShowStatusModal(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.statusOptionLabel,
                        isSelected && styles.statusOptionLabelActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && (
                      <TickIcon
                        width={SIZE(14)}
                        height={SIZE(14)}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Restyled New Appointment Bottom Sheet Modal */}
      <Modal
        visible={showBookingModal}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => {
          setShowBookingModal(false);
          resetBookingForm();
        }}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            activeOpacity={1}
            onPress={() => {
              setShowBookingModal(false);
              resetBookingForm();
            }}
          />

          <KeyboardAvoidingView
            style={styles.sheetContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {/* Sheet Drag Handle */}
            <View style={styles.sheetHandleWrap}>
              <View style={styles.sheetHandle} />
            </View>

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {createdAppointment
                    ? 'Appointment Booked'
                    : 'Schedule Appointment'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {createdAppointment
                    ? 'Consultation token generated successfully'
                    : 'Assign patient token and doctor session'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowBookingModal(false);
                  resetBookingForm();
                }}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {createdAppointment ? (
              /* Booking Confirmation Screen */
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.confirmationScroll}
                showsVerticalScrollIndicator={false}
              >
                {/* Token Hero Card */}
                <View style={styles.tokenHeroCard}>
                  <Text style={styles.tokenHeroLabel}>TOKEN NUMBER</Text>
                  <Text style={styles.tokenHeroNumber}>
                    #{createdAppointment.tokenNumber}
                  </Text>
                  <View style={styles.tokenHeroBadge}>
                    <Text style={styles.tokenHeroBadgeText}>
                      Booked & Confirmed
                    </Text>
                  </View>
                </View>

                {/* Patient Card */}
                <View style={styles.confirmSectionCard}>
                  <Text style={styles.confirmSectionTitle}>
                    PATIENT DETAILS
                  </Text>
                  <View style={styles.confirmProfileRow}>
                    <Image
                      source={userProfileImg}
                      style={styles.confirmProfileAvatar}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.confirmProfileName}>
                        {createdAppointment.patient?.name || 'Patient'}
                      </Text>
                      <Text style={styles.confirmProfileMeta}>
                        +91 {createdAppointment.patient?.phoneNumber || phone} •{' '}
                        {createdAppointment.patient?.gender || patientGender}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Doctor Card */}
                <View style={styles.confirmSectionCard}>
                  <Text style={styles.confirmSectionTitle}>
                    ASSIGNED DOCTOR
                  </Text>
                  <View style={styles.confirmProfileRow}>
                    <Image
                      source={doctorProfileImg}
                      style={styles.confirmProfileAvatar}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.confirmProfileName}>
                        Dr. {createdAppointment.doctor?.name || 'Doctor'}
                      </Text>
                      <Text style={styles.confirmProfileMeta}>
                        {createdAppointment.doctor?.specialties?.[0]?.name ||
                          'Specialist Consultant'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Booking Summary Box */}
                <View style={styles.confirmDetailsBox}>
                  <View style={styles.confirmDetailRow}>
                    <Text style={styles.confirmDetailLabel}>
                      Appointment Date
                    </Text>
                    <Text style={styles.confirmDetailValue}>
                      {formatDate(createdAppointment.appointmentDate)}
                    </Text>
                  </View>
                  <View style={styles.confirmDetailDivider} />
                  <View style={styles.confirmDetailRow}>
                    <Text style={styles.confirmDetailLabel}>Session Time</Text>
                    <Text style={styles.confirmDetailValue}>
                      {to12h(createdAppointment.schedule?.startTime)} –{' '}
                      {to12h(createdAppointment.schedule?.stopTime)}
                    </Text>
                  </View>
                  <View style={styles.confirmDetailDivider} />
                  <View style={styles.confirmDetailRow}>
                    <Text style={styles.confirmDetailLabel}>Reference ID</Text>
                    <Text style={styles.confirmDetailValue}>
                      #{createdAppointment.referenceId}
                    </Text>
                  </View>
                </View>

                {/* Bottom Done / Book Next Buttons */}
                <View
                  style={[
                    styles.confirmActionsRow,
                    { paddingBottom: Math.max(insets.bottom, 16) },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.bookAnotherBtn}
                    onPress={() => resetBookingForm(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.bookAnotherBtnText}>Book Another</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.confirmDoneBtn}
                    onPress={() => {
                      setShowBookingModal(false);
                      resetBookingForm();
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.confirmDoneBtnText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              /* Booking Form */
              <View style={{ flex: 1 }}>
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={styles.modalScroll}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {bookingError ? (
                    <View style={styles.errorBanner}>
                      <Text style={styles.errorText}>{bookingError}</Text>
                    </View>
                  ) : null}

                  {/* 1. Patient Information */}
                  <View style={styles.formCard}>
                    <View style={styles.formCardHeader}>
                      <View style={styles.stepNumBadge}>
                        <Text style={styles.stepNumText}>1</Text>
                      </View>
                      <Text style={styles.formCardTitle}>
                        Patient Information
                      </Text>
                    </View>

                    <Text style={styles.inputLabel}>
                      Mobile Number{' '}
                      <Text style={styles.requiredAsterisk}>*</Text>
                    </Text>
                    <View style={styles.phoneInputWrap}>
                      <View style={styles.phonePrefixBox}>
                        <Text style={styles.phonePrefixText}>+91</Text>
                      </View>
                      <TextInput
                        style={styles.phoneInput}
                        value={phone}
                        onChangeText={handlePhoneChange}
                        placeholder="10-digit mobile number"
                        placeholderTextColor={colors.placeholder}
                        keyboardType="phone-pad"
                        maxLength={10}
                      />
                      {searchingPatient ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.primary}
                          style={styles.inputSpinner}
                        />
                      ) : phone.length > 0 ? (
                        <TouchableOpacity
                          style={styles.inputClearBtn}
                          onPress={() => {
                            setPhone('');
                            setFoundPatient(null);
                            setPatientName('');
                            setPatientAge('');
                          }}
                        >
                          <Text style={styles.clearSearchText}>✕</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {/* Matched Patient Card */}
                    {foundPatient ? (
                      <View style={styles.matchedPatientCard}>
                        <Image
                          source={userProfileImg}
                          style={styles.matchedPatientAvatar}
                        />
                        <View style={{ flex: 1 }}>
                          <View style={styles.matchedHeaderRow}>
                            <Text style={styles.matchedPatientName}>
                              {foundPatient.name}
                            </Text>
                            <View style={styles.matchedTag}>
                              <Text style={styles.matchedTagText}>
                                Existing Patient
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.matchedPatientMeta}>
                            {foundPatient.gender}
                            {getAgeFromDob(foundPatient.dateOfBirth)
                              ? `  •  ${getAgeFromDob(
                                  foundPatient.dateOfBirth,
                                )}`
                              : ''}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <>
                        <Text
                          style={[styles.inputLabel, { marginTop: SIZE(12) }]}
                        >
                          Patient Full Name{' '}
                          <Text style={styles.requiredAsterisk}>*</Text>
                        </Text>
                        <TextInput
                          style={styles.modalInput}
                          value={patientName}
                          onChangeText={setPatientName}
                          placeholder="Enter full name"
                          placeholderTextColor={colors.placeholder}
                        />

                        <Text
                          style={[styles.inputLabel, { marginTop: SIZE(12) }]}
                        >
                          Gender
                        </Text>
                        <View style={styles.genderRow}>
                          {GENDER_OPTIONS.map(g => (
                            <TouchableOpacity
                              key={g}
                              style={[
                                styles.genderChip,
                                patientGender === g && styles.genderChipActive,
                              ]}
                              onPress={() => setPatientGender(g)}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.genderChipText,
                                  patientGender === g &&
                                    styles.genderChipTextActive,
                                ]}
                              >
                                {g}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        <Text
                          style={[styles.inputLabel, { marginTop: SIZE(12) }]}
                        >
                          Age
                        </Text>
                        <TextInput
                          style={styles.modalInput}
                          value={patientAge}
                          onChangeText={t =>
                            setPatientAge(t.replace(/\D/g, '').slice(0, 3))
                          }
                          placeholder="Enter age (e.g. 28)"
                          placeholderTextColor={colors.placeholder}
                          keyboardType="numeric"
                          maxLength={3}
                        />
                      </>
                    )}
                  </View>

                  {/* 2. Doctor Assign */}
                  <View style={styles.formCard}>
                    <View style={styles.formCardHeader}>
                      <View style={styles.stepNumBadge}>
                        <Text style={styles.stepNumText}>2</Text>
                      </View>
                      <Text style={styles.formCardTitle}>Assigned Doctor</Text>
                    </View>

                    {isDoctor && activeDoctor ? (
                      <View style={styles.doctorSingleCard}>
                        <Image
                          source={doctorProfileImg}
                          style={styles.doctorCardAvatar}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.doctorCardName}>
                            Dr. {activeDoctor.name}
                          </Text>
                          <Text style={styles.doctorCardSpecialty}>
                            Consultant • Current Duty
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.doctorScrollRow}
                      >
                        {clinicDoctors.map(doc => {
                          const isSelected = selectedDoctorId === doc.id;
                          return (
                            <TouchableOpacity
                              key={doc.id}
                              style={[
                                styles.doctorSelectCard,
                                isSelected && styles.doctorSelectCardActive,
                              ]}
                              onPress={() => handleSelectDoctor(doc.id)}
                              activeOpacity={0.7}
                            >
                              <Image
                                source={doctorProfileImg}
                                style={styles.doctorSelectAvatar}
                              />
                              <Text
                                style={[
                                  styles.doctorSelectName,
                                  isSelected && styles.doctorSelectNameActive,
                                ]}
                                numberOfLines={1}
                              >
                                Dr. {doc.name}
                              </Text>
                              <Text
                                style={[
                                  styles.doctorSelectSpecialty,
                                  isSelected &&
                                    styles.doctorSelectSpecialtyActive,
                                ]}
                                numberOfLines={1}
                              >
                                {doc.specialties?.[0]?.name || 'Physician'}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>

                  {/* 3. Date Selection */}
                  <View style={styles.formCard}>
                    <View style={styles.formCardHeader}>
                      <View style={styles.stepNumBadge}>
                        <Text style={styles.stepNumText}>3</Text>
                      </View>
                      <Text style={styles.formCardTitle}>
                        Consultation Date
                      </Text>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.dateScrollRow}
                    >
                      {upcomingBookingDates.map(item => {
                        const isSelected = selectedBookingDate === item.iso;
                        return (
                          <TouchableOpacity
                            key={item.iso}
                            style={[
                              styles.dateSelectCard,
                              isSelected && styles.dateSelectCardActive,
                            ]}
                            onPress={() => handleSelectBookingDate(item.iso)}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.dateSelectWeekday,
                                isSelected && styles.dateSelectWeekdayActive,
                              ]}
                            >
                              {item.weekday}
                            </Text>
                            <Text
                              style={[
                                styles.dateSelectDay,
                                isSelected && styles.dateSelectDayActive,
                              ]}
                            >
                              {item.monthDay}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* 4. Consultation Session & Tokens */}
                  <View style={styles.formCard}>
                    <View style={styles.formCardHeader}>
                      <View style={styles.stepNumBadge}>
                        <Text style={styles.stepNumText}>4</Text>
                      </View>
                      <Text style={styles.formCardTitle}>
                        Available Session
                      </Text>
                    </View>

                    {loadingSchedules ? (
                      <View style={styles.loadingSchedulesBox}>
                        <ActivityIndicator
                          size="small"
                          color={colors.primary}
                        />
                        <Text style={styles.loadingSchedulesText}>
                          Checking session token availability...
                        </Text>
                      </View>
                    ) : schedules.length === 0 ? (
                      <View style={styles.noSchedulesBox}>
                        <Text style={styles.noSchedulesText}>
                          No active consultation sessions scheduled for this
                          doctor on the selected date.
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.schedulesGrid}>
                        {schedules.map(sch => {
                          const isSelected = selectedScheduleId === sch.id;
                          const [h, m] = sch.stopTime.split(':').map(Number);
                          const stop = new Date();
                          stop.setHours(h, m, 0, 0);
                          const isExpired =
                            selectedBookingDate === getTodayStr() &&
                            new Date() > stop;
                          const hasTokens = sch.remainingTokenCount > 0;
                          const isAvailable = hasTokens && !isExpired;

                          return (
                            <TouchableOpacity
                              key={sch.id}
                              style={[
                                styles.scheduleCard,
                                isSelected && styles.scheduleCardActive,
                                !isAvailable && styles.scheduleCardDisabled,
                              ]}
                              onPress={() =>
                                isAvailable && setSelectedScheduleId(sch.id)
                              }
                              disabled={!isAvailable}
                              activeOpacity={0.7}
                            >
                              <View style={styles.scheduleCardTop}>
                                <View style={styles.scheduleTimeRow}>
                                  <ClockBlueIcon
                                    width={SIZE(14)}
                                    height={SIZE(14)}
                                    stroke={
                                      isSelected
                                        ? colors.primary
                                        : colors.textSecondary
                                    }
                                  />
                                  <Text
                                    style={[
                                      styles.scheduleTimeText,
                                      isSelected &&
                                        styles.scheduleTimeTextActive,
                                    ]}
                                  >
                                    {to12h(sch.startTime)} –{' '}
                                    {to12h(sch.stopTime)}
                                  </Text>
                                </View>

                                <View
                                  style={[
                                    styles.tokenPill,
                                    isExpired
                                      ? styles.tokenPillFull
                                      : sch.remainingTokenCount > 5
                                      ? styles.tokenPillSuccess
                                      : sch.remainingTokenCount > 0
                                      ? styles.tokenPillWarning
                                      : styles.tokenPillFull,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.tokenPillText,
                                      isExpired
                                        ? styles.tokenPillTextFull
                                        : sch.remainingTokenCount > 5
                                        ? styles.tokenPillTextSuccess
                                        : sch.remainingTokenCount > 0
                                        ? styles.tokenPillTextWarning
                                        : styles.tokenPillTextFull,
                                    ]}
                                  >
                                    {isExpired
                                      ? 'Time passed'
                                      : sch.remainingTokenCount > 0
                                      ? `${sch.remainingTokenCount} left`
                                      : 'Full'}
                                  </Text>
                                </View>
                              </View>

                              <Text style={styles.scheduleSubText}>
                                Session Token Limit: {sch.tokenLimit} tokens
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </ScrollView>

                {/* Bottom Sticky Action Button */}
                <View
                  style={[
                    styles.modalStickyFooter,
                    { paddingBottom: Math.max(insets.bottom, 14) },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.bookSubmitBtn,
                      bookingLoading && styles.bookSubmitBtnDisabled,
                    ]}
                    onPress={handleBookAppointment}
                    disabled={bookingLoading}
                    activeOpacity={0.8}
                  >
                    {bookingLoading ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Text style={styles.bookSubmitBtnText}>
                        Confirm & Book Appointment
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleOpenBookingModal}
        activeOpacity={0.85}
      >
        <AddIconWhite width={24} height={24} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  // Header Bar
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: SIZE(22),
    paddingTop: SIZE(12),
    paddingBottom: SIZE(12),
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF0',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  fab: {
    position: 'absolute',
    bottom: SIZE(28),
    right: SIZE(20),
    width: SIZE(56),
    height: SIZE(56),
    borderRadius: SIZE(28),
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 8,
  },
  headerSubtitle: {
    fontSize: SIZE(13),
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: SIZE(4),
  },
  // Search
  searchContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: SIZE(16),
    paddingTop: SIZE(10),
    paddingBottom: SIZE(8),
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE(8),
  },
  searchBox: {
    flex: 1,
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
  clearSearchText: {
    fontSize: SIZE(13),
    color: colors.textMuted,
    fontFamily: fonts.bold,
    padding: SIZE(2),
  },
  statusFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: SIZE(42),
    paddingHorizontal: SIZE(12),
    borderRadius: SIZE(10),
    borderWidth: 1,
    borderColor: '#EAECF0',
    backgroundColor: colors.inputBg,
    gap: SIZE(6),
  },
  statusFilterBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  statusFilterBtnText: {
    fontSize: SIZE(12),
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  statusFilterBtnTextActive: {
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  // Date Filter Tabs
  filterTabsContainer: {
    backgroundColor: colors.white,
    paddingTop: SIZE(6),
    paddingBottom: SIZE(10),
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF0',
  },
  filterScrollContent: {
    paddingHorizontal: SIZE(16),
    gap: SIZE(8),
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZE(6),
    paddingHorizontal: SIZE(12),
    borderRadius: radius.full,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: '#EAECF0',
    gap: SIZE(6),
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: {
    fontSize: SIZE(12),
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: colors.white,
    fontFamily: fonts.bold,
  },
  filterTabCount: {
    backgroundColor: '#EAECF0',
    paddingHorizontal: SIZE(6),
    paddingVertical: SIZE(1),
    borderRadius: radius.full,
  },
  filterTabCountActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  filterTabCountText: {
    fontSize: SIZE(11),
    fontFamily: fonts.bold,
    color: colors.textSecondary,
  },
  filterTabCountTextActive: {
    color: colors.white,
  },
  // List
  listContainer: {
    padding: SIZE(16),
    gap: SIZE(12),
  },
  // Appointment Card
  card: {
    backgroundColor: colors.white,
    borderRadius: SIZE(14),
    borderWidth: 1,
    borderColor: '#EAECF0',
    padding: SIZE(14),
  },
  cardExpanded: {
    borderColor: colors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE(12),
  },
  avatarWrap: {
    position: 'relative',
  },
  patientAvatar: {
    width: SIZE(44),
    height: SIZE(44),
    borderRadius: SIZE(22),
    borderWidth: 1,
    borderColor: '#EAECF0',
  },
  tokenBadge: {
    position: 'absolute',
    bottom: -SIZE(4),
    right: -SIZE(4),
    backgroundColor: '#1E293B',
    borderRadius: SIZE(6),
    paddingHorizontal: SIZE(4),
    paddingVertical: SIZE(1),
    borderWidth: 1,
    borderColor: colors.white,
  },
  tokenBadgeText: {
    fontSize: SIZE(9),
    fontFamily: fonts.bold,
    color: colors.white,
  },
  patientMetaCol: {
    flex: 1,
    justifyContent: 'center',
  },
  patientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE(6),
  },
  patientName: {
    fontSize: SIZE(15),
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  patientDetails: {
    fontSize: SIZE(12),
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: SIZE(2),
  },
  basicMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE(6),
    marginTop: SIZE(4),
    flexWrap: 'wrap',
  },
  basicDoctorText: {
    fontSize: SIZE(12),
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    maxWidth: SIZE(130),
  },
  basicDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE(4),
  },
  basicDateText: {
    fontSize: SIZE(11),
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  headerRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE(6),
  },
  chevronWrap: {
    width: SIZE(18),
    height: SIZE(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedContent: {
    marginTop: SIZE(4),
  },
  expandedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expandedPatientText: {
    fontSize: SIZE(12),
    fontFamily: fonts.medium,
    color: colors.textPrimary,
  },
  // Info Box
  infoBox: {
    marginTop: SIZE(12),
    backgroundColor: colors.pageBg,
    borderRadius: SIZE(10),
    borderWidth: 1,
    borderColor: '#EAECF0',
    padding: SIZE(10),
    gap: SIZE(8),
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: SIZE(11),
    fontFamily: fonts.medium,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  doctorValue: {
    fontSize: SIZE(13),
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
  },
  specialtyTag: {
    fontSize: SIZE(12),
    fontFamily: fonts.regular,
    color: colors.primary,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#EAECF0',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SIZE(6),
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE(4),
  },
  metaText: {
    fontSize: SIZE(12),
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  metaDot: {
    width: SIZE(3),
    height: SIZE(3),
    borderRadius: SIZE(2),
    backgroundColor: colors.textMuted,
  },
  refText: {
    fontSize: SIZE(11),
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  // Action Buttons
  actionsRow: {
    flexDirection: 'row',
    gap: SIZE(8),
    marginTop: SIZE(12),
    paddingTop: SIZE(10),
    borderTopWidth: 1,
    borderTopColor: '#F1F4F9',
  },
  actionBtn: {
    flex: 1,
    paddingVertical: SIZE(9),
    borderRadius: SIZE(8),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  actionOngoing: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  actionOngoingText: {
    fontSize: SIZE(12),
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  actionCancel: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FECACA',
  },
  actionCancelText: {
    fontSize: SIZE(12),
    fontFamily: fonts.bold,
    color: colors.danger,
  },
  actionDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  actionDoneText: {
    fontSize: SIZE(12),
    fontFamily: fonts.bold,
    color: colors.white,
  },
  actionSkip: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  actionSkipText: {
    fontSize: SIZE(12),
    fontFamily: fonts.bold,
    color: '#D97706',
  },
  // Centered & Empty States
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
    marginBottom: SIZE(16),
    maxWidth: SIZE(240),
  },
  resetButton: {
    paddingVertical: SIZE(8),
    paddingHorizontal: SIZE(16),
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  resetButtonText: {
    fontSize: SIZE(13),
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
  listFooter: {
    paddingVertical: SIZE(12),
    alignItems: 'center',
  },
  listFooterText: {
    fontSize: SIZE(12),
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  // Range & Status Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZE(16),
  },
  rangeDialogBox: {
    backgroundColor: colors.white,
    borderRadius: SIZE(16),
    borderWidth: 1,
    borderColor: '#EAECF0',
    padding: SIZE(16),
    width: '100%',
    maxWidth: SIZE(380),
    gap: SIZE(12),
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dialogTitle: {
    fontSize: SIZE(16),
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  dialogSubtitle: {
    fontSize: SIZE(12),
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: SIZE(2),
  },
  dialogCloseBtn: {
    width: SIZE(28),
    height: SIZE(28),
    borderRadius: SIZE(14),
    backgroundColor: '#F1F4F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogCloseText: {
    fontSize: SIZE(13),
    fontFamily: fonts.bold,
    color: colors.textSecondary,
  },
  presetLabel: {
    fontSize: SIZE(11),
    fontFamily: fonts.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: SIZE(4),
  },
  presetsRow: {
    flexDirection: 'row',
    gap: SIZE(6),
  },
  presetChip: {
    flex: 1,
    paddingVertical: SIZE(7),
    alignItems: 'center',
    borderRadius: SIZE(8),
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: '#EAECF0',
  },
  presetChipText: {
    fontSize: SIZE(11),
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  customDateInputsRow: {
    flexDirection: 'row',
    gap: SIZE(8),
    marginTop: SIZE(4),
  },
  dialogButtonsRow: {
    flexDirection: 'row',
    gap: SIZE(8),
    marginTop: SIZE(8),
  },
  dialogCancelBtn: {
    flex: 1,
    paddingVertical: SIZE(10),
    borderRadius: SIZE(8),
    borderWidth: 1,
    borderColor: '#EAECF0',
    alignItems: 'center',
  },
  dialogCancelText: {
    fontSize: SIZE(13),
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  dialogApplyBtn: {
    flex: 1,
    paddingVertical: SIZE(10),
    borderRadius: SIZE(8),
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  dialogApplyText: {
    fontSize: SIZE(13),
    fontFamily: fonts.bold,
    color: colors.white,
  },
  statusDialogBox: {
    backgroundColor: colors.white,
    borderRadius: SIZE(16),
    borderWidth: 1,
    borderColor: '#EAECF0',
    padding: SIZE(16),
    width: '100%',
    maxWidth: SIZE(320),
    gap: SIZE(10),
  },
  statusOptionsList: {
    gap: SIZE(4),
  },
  statusOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SIZE(10),
    paddingHorizontal: SIZE(12),
    borderRadius: SIZE(8),
  },
  statusOptionRowActive: {
    backgroundColor: colors.primaryLight,
  },
  statusOptionLabel: {
    fontSize: SIZE(13),
    fontFamily: fonts.medium,
    color: colors.textPrimary,
  },
  statusOptionLabelActive: {
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  // Bottom Sheet Container & Overlay
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    height: '88%',
    backgroundColor: colors.pageBg,
    borderTopLeftRadius: SIZE(20),
    borderTopRightRadius: SIZE(20),
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#EAECF0',
    overflow: 'hidden',
  },
  sheetHandleWrap: {
    alignItems: 'center',
    paddingTop: SIZE(8),
    paddingBottom: SIZE(4),
    backgroundColor: colors.white,
  },
  sheetHandle: {
    width: SIZE(38),
    height: SIZE(4),
    borderRadius: SIZE(2),
    backgroundColor: '#CBD5E1',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZE(16),
    paddingTop: SIZE(4),
    paddingBottom: SIZE(12),
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF0',
  },
  modalTitle: {
    fontSize: SIZE(18),
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: SIZE(12),
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: SIZE(2),
  },
  modalCloseBtn: {
    width: SIZE(32),
    height: SIZE(32),
    borderRadius: SIZE(16),
    backgroundColor: '#F1F4F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: SIZE(14),
    fontFamily: fonts.bold,
    color: colors.textSecondary,
  },
  modalScroll: {
    padding: SIZE(16),
    paddingBottom: SIZE(24),
    gap: SIZE(14),
  },
  errorBanner: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: SIZE(10),
    padding: SIZE(12),
  },
  errorText: {
    fontSize: SIZE(12),
    fontFamily: fonts.medium,
    color: colors.danger,
  },
  // Form Cards
  formCard: {
    backgroundColor: colors.white,
    borderRadius: SIZE(14),
    borderWidth: 1,
    borderColor: '#EAECF0',
    padding: SIZE(14),
  },
  formCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE(8),
    marginBottom: SIZE(12),
  },
  stepNumBadge: {
    width: SIZE(22),
    height: SIZE(22),
    borderRadius: SIZE(11),
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: '#D0E3FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontSize: SIZE(11),
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  formCardTitle: {
    fontSize: SIZE(14),
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  inputLabel: {
    fontSize: SIZE(12),
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    marginBottom: SIZE(6),
  },
  requiredAsterisk: {
    color: colors.danger,
  },
  phoneInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: SIZE(10),
    borderWidth: 1,
    borderColor: '#EAECF0',
    overflow: 'hidden',
  },
  phonePrefixBox: {
    backgroundColor: '#F1F4F9',
    paddingHorizontal: SIZE(12),
    paddingVertical: SIZE(11),
    borderRightWidth: 1,
    borderRightColor: '#EAECF0',
  },
  phonePrefixText: {
    fontSize: SIZE(13),
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: SIZE(12),
    paddingVertical: SIZE(10),
    fontSize: SIZE(13),
    fontFamily: fonts.regular,
    color: colors.textPrimary,
  },
  inputSpinner: {
    marginRight: SIZE(12),
  },
  inputClearBtn: {
    paddingHorizontal: SIZE(12),
    paddingVertical: SIZE(8),
  },
  modalInput: {
    backgroundColor: colors.inputBg,
    borderRadius: SIZE(10),
    borderWidth: 1,
    borderColor: '#EAECF0',
    paddingHorizontal: SIZE(12),
    paddingVertical: SIZE(10),
    fontSize: SIZE(13),
    fontFamily: fonts.regular,
    color: colors.textPrimary,
  },
  matchedPatientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: SIZE(10),
    padding: SIZE(10),
    marginTop: SIZE(10),
    gap: SIZE(10),
  },
  matchedPatientAvatar: {
    width: SIZE(38),
    height: SIZE(38),
    borderRadius: SIZE(19),
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  matchedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SIZE(6),
  },
  matchedPatientName: {
    fontSize: SIZE(13),
    fontFamily: fonts.bold,
    color: '#065F46',
  },
  matchedTag: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: SIZE(6),
    paddingVertical: SIZE(2),
    borderRadius: SIZE(4),
  },
  matchedTagText: {
    fontSize: SIZE(10),
    fontFamily: fonts.bold,
    color: '#047857',
  },
  matchedPatientMeta: {
    fontSize: SIZE(11),
    fontFamily: fonts.regular,
    color: '#047857',
    marginTop: SIZE(2),
  },
  genderRow: {
    flexDirection: 'row',
    gap: SIZE(8),
  },
  genderChip: {
    flex: 1,
    paddingVertical: SIZE(9),
    alignItems: 'center',
    borderRadius: SIZE(8),
    borderWidth: 1,
    borderColor: '#EAECF0',
    backgroundColor: colors.inputBg,
  },
  genderChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  genderChipText: {
    fontSize: SIZE(12),
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  genderChipTextActive: {
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  // Doctor Selection in Modal
  doctorSingleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: SIZE(10),
    borderWidth: 1,
    borderColor: '#EAECF0',
    padding: SIZE(10),
    gap: SIZE(10),
  },
  doctorCardAvatar: {
    width: SIZE(40),
    height: SIZE(40),
    borderRadius: SIZE(20),
    borderWidth: 1,
    borderColor: '#EAECF0',
  },
  doctorCardName: {
    fontSize: SIZE(14),
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  doctorCardSpecialty: {
    fontSize: SIZE(12),
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: SIZE(2),
  },
  doctorScrollRow: {
    gap: SIZE(10),
    paddingVertical: SIZE(2),
  },
  doctorSelectCard: {
    backgroundColor: colors.inputBg,
    borderRadius: SIZE(12),
    borderWidth: 1,
    borderColor: '#EAECF0',
    padding: SIZE(10),
    alignItems: 'center',
    width: SIZE(120),
  },
  doctorSelectCardActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  doctorSelectAvatar: {
    width: SIZE(44),
    height: SIZE(44),
    borderRadius: SIZE(22),
    marginBottom: SIZE(6),
    borderWidth: 1,
    borderColor: '#EAECF0',
  },
  doctorSelectName: {
    fontSize: SIZE(12),
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  doctorSelectNameActive: {
    color: colors.primary,
  },
  doctorSelectSpecialty: {
    fontSize: SIZE(10),
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: SIZE(2),
    textAlign: 'center',
  },
  doctorSelectSpecialtyActive: {
    color: colors.primary,
  },
  // Date Selection in Modal
  dateScrollRow: {
    gap: SIZE(8),
    paddingVertical: SIZE(2),
  },
  dateSelectCard: {
    backgroundColor: colors.inputBg,
    borderRadius: SIZE(10),
    borderWidth: 1,
    borderColor: '#EAECF0',
    paddingVertical: SIZE(10),
    paddingHorizontal: SIZE(12),
    alignItems: 'center',
    minWidth: SIZE(70),
  },
  dateSelectCardActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  dateSelectWeekday: {
    fontSize: SIZE(11),
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  dateSelectWeekdayActive: {
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  dateSelectDay: {
    fontSize: SIZE(12),
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginTop: SIZE(4),
  },
  dateSelectDayActive: {
    color: colors.primary,
  },
  // Session Selection in Modal
  loadingSchedulesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE(8),
    padding: SIZE(14),
    backgroundColor: colors.inputBg,
    borderRadius: SIZE(10),
    borderWidth: 1,
    borderColor: '#EAECF0',
  },
  loadingSchedulesText: {
    fontSize: SIZE(12),
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  noSchedulesBox: {
    padding: SIZE(14),
    backgroundColor: colors.inputBg,
    borderRadius: SIZE(10),
    borderWidth: 1,
    borderColor: '#EAECF0',
  },
  noSchedulesText: {
    fontSize: SIZE(12),
    fontFamily: fonts.regular,
    color: colors.textMuted,
    lineHeight: SIZE(18),
  },
  schedulesGrid: {
    gap: SIZE(8),
  },
  scheduleCard: {
    backgroundColor: colors.inputBg,
    borderRadius: SIZE(10),
    borderWidth: 1,
    borderColor: '#EAECF0',
    padding: SIZE(12),
    gap: SIZE(6),
  },
  scheduleCardActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  scheduleCardDisabled: {
    opacity: 0.5,
  },
  scheduleCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scheduleTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE(6),
  },
  scheduleTimeText: {
    fontSize: SIZE(13),
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  scheduleTimeTextActive: {
    color: colors.primary,
  },
  tokenPill: {
    paddingHorizontal: SIZE(8),
    paddingVertical: SIZE(3),
    borderRadius: radius.full,
  },
  tokenPillText: {
    fontSize: SIZE(10),
    fontFamily: fonts.bold,
  },
  tokenPillSuccess: {
    backgroundColor: colors.successLight,
  },
  tokenPillTextSuccess: {
    fontSize: SIZE(10),
    fontFamily: fonts.bold,
    color: colors.success,
  },
  tokenPillWarning: {
    backgroundColor: colors.warningLight,
  },
  tokenPillTextWarning: {
    fontSize: SIZE(10),
    fontFamily: fonts.bold,
    color: '#D97706',
  },
  tokenPillFull: {
    backgroundColor: colors.dangerLight,
  },
  tokenPillTextFull: {
    fontSize: SIZE(10),
    fontFamily: fonts.bold,
    color: colors.danger,
  },
  scheduleSubText: {
    fontSize: SIZE(11),
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  // Bottom Sticky Bar
  modalStickyFooter: {
    backgroundColor: colors.white,
    paddingHorizontal: SIZE(16),
    paddingVertical: SIZE(12),
    borderTopWidth: 1,
    borderTopColor: '#EAECF0',
  },
  bookSubmitBtn: {
    backgroundColor: colors.primary,
    borderRadius: SIZE(10),
    paddingVertical: SIZE(13),
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookSubmitBtnDisabled: {
    opacity: 0.6,
  },
  bookSubmitBtnText: {
    color: colors.white,
    fontSize: SIZE(14),
    fontFamily: fonts.bold,
  },
  // Confirmation Screen Styles
  confirmationScroll: {
    padding: SIZE(16),
    paddingBottom: SIZE(40),
    gap: SIZE(14),
  },
  tokenHeroCard: {
    backgroundColor: colors.white,
    borderRadius: SIZE(18),
    borderWidth: 1,
    borderColor: '#EAECF0',
    paddingVertical: SIZE(24),
    paddingHorizontal: SIZE(16),
    alignItems: 'center',
    gap: SIZE(8),
  },
  tokenHeroLabel: {
    fontSize: SIZE(11),
    fontFamily: fonts.bold,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  tokenHeroNumber: {
    fontSize: SIZE(48),
    fontFamily: fonts.bold,
    color: colors.primary,
    letterSpacing: -1,
  },
  tokenHeroBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: SIZE(10),
    paddingVertical: SIZE(4),
    borderRadius: radius.full,
  },
  tokenHeroBadgeText: {
    fontSize: SIZE(11),
    fontFamily: fonts.bold,
    color: colors.success,
  },
  confirmSectionCard: {
    backgroundColor: colors.white,
    borderRadius: SIZE(14),
    borderWidth: 1,
    borderColor: '#EAECF0',
    padding: SIZE(14),
    gap: SIZE(10),
  },
  confirmSectionTitle: {
    fontSize: SIZE(11),
    fontFamily: fonts.bold,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  confirmProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZE(12),
  },
  confirmProfileAvatar: {
    width: SIZE(44),
    height: SIZE(44),
    borderRadius: SIZE(22),
    borderWidth: 1,
    borderColor: '#EAECF0',
  },
  confirmProfileName: {
    fontSize: SIZE(15),
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  confirmProfileMeta: {
    fontSize: SIZE(12),
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: SIZE(2),
  },
  confirmDetailsBox: {
    backgroundColor: colors.white,
    borderRadius: SIZE(14),
    borderWidth: 1,
    borderColor: '#EAECF0',
    padding: SIZE(14),
    gap: SIZE(10),
  },
  confirmDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  confirmDetailLabel: {
    fontSize: SIZE(12),
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  confirmDetailValue: {
    fontSize: SIZE(13),
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  confirmDetailDivider: {
    height: 1,
    backgroundColor: '#F1F4F9',
  },
  confirmActionsRow: {
    flexDirection: 'row',
    gap: SIZE(10),
    marginTop: SIZE(8),
  },
  bookAnotherBtn: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: SIZE(10),
    borderWidth: 1,
    borderColor: '#EAECF0',
    paddingVertical: SIZE(13),
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookAnotherBtnText: {
    fontSize: SIZE(13),
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  confirmDoneBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: SIZE(10),
    paddingVertical: SIZE(13),
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDoneBtnText: {
    fontSize: SIZE(13),
    fontFamily: fonts.bold,
    color: colors.white,
  },
});

export default AppointmentsScreen;
