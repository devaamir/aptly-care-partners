// Auth
export interface RegisterResponse {
  success: boolean
  message: string
  data: {
    expiresAt: string
    resendWaitTime: number
    token?: string
  }
}

export interface LoginResponse {
  success: boolean
  message: string
  data: {
    accessToken: string
    refreshToken: string
    user: {
      id: string
      name: string
      phoneNumber: string
      emailAddress: string
      createdAt: string
      updatedAt: string
      role: string
      medicalCenterId: string
    }
    context: {
      role: string
      medicalCenterId: string | null
    }
    hasMultipleContexts: boolean
  }
}

// Appointments
export interface Speciality { id: string; name: string; description: string; icon: string; createdAt: string; updatedAt: string }
export interface Qualification { id: string; name: string; createdAt: string; updatedAt: string }
export interface MedicalSystem { id: string; name: string; description: string; createdAt: string; updatedAt: string }
export interface AppointmentDoctor {
  id: string; name: string; referenceId: string; phoneNumber: string; emailAddress: string; yearsOfExperience: number
  advanceBookingLimit: number; estimateConsultationTime: number; latitude: number; longitude: number
  address: string; district: string; state: string; country: string; about: string
  consultationFee: number; profilePicture: string; createdAt: string; updatedAt: string
  specialties: Speciality[]; medicalSystem: MedicalSystem; qualifications: Qualification[]
}
export interface AppointmentPatient {
  id: string; name: string; referenceId: string; phoneNumber: string
  gender: string; dateOfBirth: string; createdAt: string; updatedAt: string; deletedAt: null | string
}
export interface AppointmentUser { id: string; name: string; phoneNumber: string; emailAddress: string; createdAt: string; updatedAt: string }
export interface AppointmentSchedule {
  id: string; dayOfWeek: string; startTime: string; stopTime: string
  tokenLimit: number; createdAt: string; updatedAt: string
}
export interface Appointment {
  id: string; referenceId: string; tokenNumber: number; appointmentDate: string
  tokenStatus: string; creatorRole: string; cancellerRole: string; createdAt: string; updatedAt: string
  doctor: AppointmentDoctor; patient: AppointmentPatient
  creator: AppointmentUser; canceller: AppointmentUser
  schedule: AppointmentSchedule
}
export interface Pagination {
  totalItems: number; totalPages: number; currentPage: number; limit: number; hasNextPage: boolean
}
export interface AppointmentsResponse { success: boolean; data: Appointment[]; pagination: Pagination }

// Auth Contexts
export interface MedicalCenterCreator { id: string; name: string; phoneNumber: string; emailAddress: string; createdAt: string; updatedAt: string }
export interface MedicalCenterCreatorManager { id: string; name: string; referenceId: string; emailAddress: string; phoneNumber: string; createdAt: string; updatedAt: string; deletedAt: string | null }

export interface UserMedicalCenter {
  id: string; name: string; type: string; phoneNumber: string; emailAddress: string
  latitude: number; longitude: number; address: string; district: string; state: string
  country: string; about: string; alternatePhoneNumber: string; websiteUrl: string
  profilePicture: string; createdAt: string; updatedAt: string
  creator: MedicalCenterCreator
  creatorManager: MedicalCenterCreatorManager | null
  specialties: Speciality[]
  medicalSystem?: MedicalSystem
}
export interface UserContext { role: string; medicalCenter: UserMedicalCenter }
export interface ContextsResponse { success: boolean; data: UserContext[] }

// Switch Context
export interface SwitchContextResponse {
  success: boolean
  message: string
  data: {
    accessToken: string
    refreshToken: string
    medicalCenter: UserMedicalCenter & { isVerified: boolean; deletedAt: string | null }
    doctor: { id: string; name: string; referenceId: string; phoneNumber: string; emailAddress: string; profilePicture: string; isVerified: boolean; deletedAt: string | null } | null
  }
}

// Patients
export interface Patient {
  id: string; name: string; referenceId: string; phoneNumber: string
  gender: string; dateOfBirth: string; createdAt: string; updatedAt: string; deletedAt: null | string
  creator: AppointmentUser; creatorRole: string
}
export interface PatientsResponse { success: boolean; data: Patient[] }
export interface PatientSearchResponse { success: boolean; data: Patient[] }
export interface CreatePatientRequest { name: string; phoneNumber: string; gender: string; dateOfBirth: string }
export interface CreatePatientResponse { success: boolean; message: string; data: Patient }

// Create Appointment
export interface CreateAppointmentRequest {
  appointmentDate: string
  doctorScheduleId: string
  patientId: string
}
export interface CreatedAppointment {
  id: string; referenceId: string; tokenNumber: number; appointmentDate: string
  tokenStatus: string; creatorRole: string; cancellerRole: string; createdAt: string; updatedAt: string
  doctor: AppointmentDoctor; patient: AppointmentPatient
  creator: AppointmentUser; canceller: AppointmentUser
  schedule: AppointmentSchedule & { deletedAt: null | string }
  medicalCenter: UserMedicalCenter & { isVerified: boolean; deletedAt: null | string }
}
export interface CreateAppointmentResponse { success: boolean; data: CreatedAppointment }

// Doctors
export interface DoctorsResponse { success: boolean; data: AppointmentDoctor[] }
export interface DoctorMedicalCenter extends UserMedicalCenter {
  isVerified: boolean
  schedules: AppointmentSchedule[]
}
export interface DoctorDetail {
  id: string; name: string; referenceId: string; phoneNumber: string; emailAddress: string
  yearsOfExperience: number; advanceBookingLimit: number; estimateConsultationTime: number
  latitude: number; longitude: number; address: string; district: string; state: string
  country: string; about: string; consultationFee: number; profilePicture: string
  createdAt: string; updatedAt: string
  specialties: Speciality[]; medicalSystem: MedicalSystem; qualifications: Qualification[]
  medicalCenters: DoctorMedicalCenter[]
}
export interface GetDoctorResponse { success: boolean; data: DoctorDetail }
export interface SpecialtiesResponse { success: boolean; data: Speciality[] }
export interface MedicalSystemsResponse { success: boolean; data: MedicalSystem[] }
export interface QualificationsResponse { success: boolean; data: Qualification[] }

export interface UpdateScheduleRequest {
  toAdd: { dayOfWeek: string; startTime: string; stopTime: string; tokenLimit: number }[]
  toUpdate: { id: string; startTime: string; stopTime: string; tokenLimit: number }[]
  toRemove: string[]
  force: boolean
}
export interface UpdateScheduleResponse { success: boolean; data: AppointmentSchedule[] }
export interface CreateDoctorRequest {
  phoneNumber: string
  emailAddress?: string
  about?: string
  consultationFee?: number
  yearsOfExperience: number
  advanceBookingLimit?: number
  estimateConsultationTime?: number
  latitude?: number
  longitude?: number
  address?: string
  district?: string
  state?: string
  country?: string
  profilePicture?: string
  medicalSystemId: string
  qualificationIds: string[]
  specialtyIds: string[]
}
export interface CreateDoctorResponse { success: boolean; data: AppointmentDoctor }

export interface UpdateDoctorRequest {
  name?: string
  emailAddress?: string
  about?: string
  consultationFee?: number
  yearsOfExperience?: number
  advanceBookingLimit?: number
  estimateConsultationTime?: number
  medicalSystemId?: string
  qualificationIds?: string[]
  specialtyIds?: string[]
}

// Doctor Schedule
export interface DoctorSchedule {
  id: string; dayOfWeek: string; startTime: string; stopTime: string
  tokenLimit: number; createdAt: string; updatedAt: string; deletedAt: null | string; remainingTokenCount: number
}
export interface DoctorScheduleResponse { success: boolean; data: DoctorSchedule[] }

// Queue SSE
export interface QueueAppointment {
  id: string
  tokenNumber: number
  tokenStatus: string
  createdAt: string
  updatedAt: string
  patient: { name: string; phoneNumber: string; gender: string; dateOfBirth: string }
  doctor: { estimateConsultationTime: number }
}
export interface ActivePause {
  id: string; date: string; startTime: string; stopTime: string
  status: string; createdAt: string; updatedAt: string
}
export interface PauseScheduleResponse { success: boolean; data: ActivePause }
export interface QueueSSEData {
  appointments: QueueAppointment[]
  activePauses: ActivePause[]
}

// Doctors List (public search)
export interface DoctorListMedicalCenterSchedule {
  id: string; dayOfWeek: string; startTime: string; stopTime: string
  tokenLimit: number; createdAt: string; updatedAt: string; deletedAt: null | string
}
export interface DoctorListMedicalCenter {
  id: string; name: string; type: string; phoneNumber: string; emailAddress: string
  latitude: number; longitude: number; address: string; district: string; state: string
  country: string; about: string; alternatePhoneNumber: string; websiteUrl: string
  profilePicture: string; isVerified: boolean; createdAt: string; updatedAt: string; deletedAt: null | string
  distanceInMeters: number; nextSchedule: DoctorListMedicalCenterSchedule | null
}
export interface DoctorListItem {
  id: string; name: string; referenceId: string; phoneNumber: string; emailAddress: string
  yearsOfExperience: number; advanceBookingLimit: number; estimateConsultationTime: number
  latitude: number; longitude: number; address: string; district: string; state: string
  country: string; about: string; consultationFee: number; profilePicture: string
  createdAt: string; updatedAt: string; deletedAt: null | string
  specialties: Speciality[]; medicalCenters: DoctorListMedicalCenter[]
  medicalSystem: MedicalSystem; qualifications: Qualification[]
}
export interface DoctorsListResponse { success: boolean; data: DoctorListItem[]; pagination: Pagination }

// Create Clinic
export interface ClinicData {
  id: string; name: string; type: string; phoneNumber: string; emailAddress: string
  latitude: number; longitude: number; address: string; district: string; state: string
  country: string; about: string; alternatePhoneNumber: string; websiteUrl: string
  profilePicture: string; isVerified: boolean; createdAt: string; updatedAt: string
  specialties: Speciality[]; medicalSystem: MedicalSystem
}
export interface CreateClinicResponse { success: boolean; data: ClinicData }

// Dashboard
export interface DashboardData {
  todayAppointmentCounts: { confirmedCount: number; cancelledCount: number }
  monthlyAppointments: {
    currentCount: number
    previousCount: number
    growthPercentage: number
  }
  patients: {
    currentCount: number
    previousCount: number
    growthPercentage: number
  }
  yearlyAppointments: {
    month: string
    confirmedCount: number
    cancelledCount: number
  }[]
  todayDoctors: {
    id: string
    name: string
    profilePicture: string | null
    specialties: { id: string; name: string }[]
    schedules: {
      id: string
      dayOfWeek: string
      startTime: string
      stopTime: string
    }[]
  }[]
  todayAppointments: {
    id: string
    patient: { id: string; name: string }
    doctor: { id: string; name: string }
  }[]
}
