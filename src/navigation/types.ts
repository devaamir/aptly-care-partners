export type AuthStackParamList = {
  Login: undefined
  SetPassword: { token: string }
}

export type MainTabParamList = {
  Dashboard: undefined
  Appointments: undefined
  Queue: undefined
  Doctors: undefined
  Patients: undefined
}

export type DoctorTabParamList = {
  DoctorDashboard: undefined
  Queue: undefined
  Appointments: undefined
}

export type ManagerStackParamList = {
  ManagerTabs: undefined
  Settings: undefined
}

export type DoctorStackParamList = {
  DoctorTabs: undefined
  Settings: undefined
}

export type RootStackParamList = {
  Auth: undefined
  SelectProfile: undefined
  CreateClinic: undefined
  MainTabs: undefined
  DoctorTabs: undefined
  // Doctor sub-screens pushed on stack
  DoctorProfile: { doctorId: string }
  DoctorSchedule: { doctorId: string; doctorName: string }
}
