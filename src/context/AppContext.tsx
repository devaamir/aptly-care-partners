import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type FC,
  type ReactNode,
} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type {
  UserContext,
  UserMedicalCenter,
  Speciality,
  MedicalSystem,
  Qualification,
  SwitchContextResponse,
} from '../services/types'
import { getSpecialties, getMedicalSystems, getQualifications } from '../services/api'

interface AuthUser {
  id: string
  name: string
  phoneNumber: string
  emailAddress: string
  role: string
  medicalCenterId: string
}

type ActiveDoctor = SwitchContextResponse['data']['doctor']

interface AppContextValue {
  user: AuthUser | null
  setUser: (u: AuthUser | null) => void
  accessToken: string | null
  refreshToken: string | null
  setTokens: (access: string, refresh: string) => Promise<void>
  contexts: UserContext[]
  setContexts: (c: UserContext[]) => void
  activeContext: UserContext | null
  setActiveContext: (c: UserContext) => Promise<void>
  activeDoctor: ActiveDoctor
  setActiveDoctor: (d: ActiveDoctor) => Promise<void>
  logout: () => Promise<void>
  specialties: Speciality[]
  medicalSystems: MedicalSystem[]
  qualifications: Qualification[]
  isInitialized: boolean
}

const AppContext = createContext<AppContextValue>(null!)

export const AppProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [contexts, setContexts] = useState<UserContext[]>([])
  const [activeContext, setActiveContextState] = useState<UserContext | null>(null)
  const [activeDoctor, setActiveDoctorState] = useState<ActiveDoctor>(null)
  const [specialties, setSpecialties] = useState<Speciality[]>([])
  const [medicalSystems, setMedicalSystems] = useState<MedicalSystem[]>([])
  const [qualifications, setQualifications] = useState<Qualification[]>([])

  // Rehydrate from AsyncStorage on mount
  useEffect(() => {
    const rehydrate = async () => {
      try {
        const [
          storedAccess,
          storedRefresh,
          storedClinic,
          storedRole,
          storedDoctor,
        ] = await AsyncStorage.multiGet([
          'accessToken',
          'refreshToken',
          'selectedClinic',
          'selectedRole',
          'activeDoctor',
        ])

        const access = storedAccess[1]
        const refresh = storedRefresh[1]
        const clinicJson = storedClinic[1]
        const role = storedRole[1]
        const doctorJson = storedDoctor[1]

        if (access) setAccessToken(access)
        if (refresh) setRefreshToken(refresh)
        if (clinicJson && role) {
          try {
            const mc = JSON.parse(clinicJson) as UserMedicalCenter
            setActiveContextState({ role, medicalCenter: mc })
          } catch {}
        }
        if (doctorJson) {
          try {
            setActiveDoctorState(JSON.parse(doctorJson))
          } catch {}
        }
      } finally {
        setIsInitialized(true)
      }
    }
    rehydrate()
  }, [])

  // Load metadata when we have a token
  useEffect(() => {
    if (!accessToken) return
    getSpecialties().then(r => { if (r.success) setSpecialties(r.data) }).catch(() => {})
    getMedicalSystems().then(r => { if (r.success) setMedicalSystems(r.data) }).catch(() => {})
    getQualifications().then(r => { if (r.success) setQualifications(r.data) }).catch(() => {})
  }, [accessToken])

  const setTokens = async (access: string, refresh: string) => {
    setAccessToken(access)
    setRefreshToken(refresh)
    await AsyncStorage.multiSet([
      ['accessToken', access],
      ['refreshToken', refresh],
    ])
  }

  const setActiveContext = async (ctx: UserContext) => {
    setActiveContextState(ctx)
    await AsyncStorage.multiSet([
      ['selectedRole', ctx.role],
      ['selectedClinic', JSON.stringify(ctx.medicalCenter)],
    ])
  }

  const setActiveDoctor = async (d: ActiveDoctor) => {
    setActiveDoctorState(d)
    if (d) {
      await AsyncStorage.setItem('activeDoctor', JSON.stringify(d))
    } else {
      await AsyncStorage.removeItem('activeDoctor')
    }
  }

  const logout = async () => {
    setUser(null)
    setAccessToken(null)
    setRefreshToken(null)
    setContexts([])
    setSpecialties([])
    setMedicalSystems([])
    setQualifications([])
    setActiveContextState(null)
    setActiveDoctorState(null)
    await AsyncStorage.multiRemove([
      'accessToken',
      'refreshToken',
      'selectedRole',
      'selectedClinic',
      'activeDoctor',
      'selectedContextId',
      'pendingClinicSetup',
    ])
  }

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        accessToken,
        refreshToken,
        setTokens,
        contexts,
        setContexts,
        activeContext,
        setActiveContext,
        activeDoctor,
        setActiveDoctor,
        logout,
        specialties,
        medicalSystems,
        qualifications,
        isInitialized,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => useContext(AppContext)
