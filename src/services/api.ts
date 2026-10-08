import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventSourcePolyfill } from 'event-source-polyfill';
import type {
  LoginResponse,
  AppointmentsResponse,
  ContextsResponse,
  SwitchContextResponse,
  DoctorScheduleResponse,
  DoctorsResponse,
  GetDoctorResponse,
  SpecialtiesResponse,
  MedicalSystemsResponse,
  QualificationsResponse,
  CreateDoctorResponse,
  PatientsResponse,
  QueueSSEData,
  DoctorsListResponse,
  PatientSearchResponse,
  CreateAppointmentRequest,
  CreateAppointmentResponse,
  CreatePatientRequest,
  CreatePatientResponse,
  UpdateScheduleRequest,
  UpdateScheduleResponse,
  UpdateDoctorRequest,
  CreateDoctorRequest,
  PauseScheduleResponse,
  CreateClinicResponse,
  DashboardData,
  ClinicData,
} from './types';

export * from './types';

// ─── Base URL ────────────────────────────────────────────────────────────────
// Replace with your actual API base URL or load from a config/env file
// const BASE_URL = 'https://aptly-server.onrender.com/api' //dev
const BASE_URL = 'https://api.aptly.care/api'; //prod

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: attach access token ────────────────────────────────
client.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor: auto refresh token on 401 ────────────────────────
client.interceptors.response.use(
  res => res,
  async error => {
    const original = error.config;
    const isAuthEndpoint =
      original?.url?.includes('/auth/login') ||
      original?.url?.includes('/auth/refresh-token');

    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        const { data } = await axios.post(`${BASE_URL}/auth/refresh-token`, {
          refreshToken,
        });
        await AsyncStorage.setItem('accessToken', data.data.accessToken);
        await AsyncStorage.setItem('refreshToken', data.data.refreshToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return client(original);
      } catch {
        await AsyncStorage.multiRemove([
          'accessToken',
          'refreshToken',
          'pendingClinicSetup',
          'selectedRole',
          'selectedClinic',
          'activeDoctor',
          'selectedContextId',
        ]);
        // Navigation to auth is handled by AppContext listener
      }
    }
    return Promise.reject(error);
  },
);

const api = {
  get: <T>(endpoint: string) => client.get<T>(endpoint).then(r => r.data),
  post: <T>(endpoint: string, body: unknown) =>
    client.post<T>(endpoint, body).then(r => r.data),
  put: <T>(endpoint: string, body: unknown) =>
    client.put<T>(endpoint, body).then(r => r.data),
  patch: <T>(endpoint: string, body: unknown) =>
    client.patch<T>(endpoint, body).then(r => r.data),
  delete: <T>(endpoint: string) => client.delete<T>(endpoint).then(r => r.data),
};

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const login = (emailAddress: string, password: string) =>
  api.post<LoginResponse>('/auth/login', { emailAddress, password });

export const getContexts = () => api.get<ContextsResponse>('/auth/contexts');

export const switchContext = async (role: string, medicalCenterId: string) => {
  const refreshToken = await AsyncStorage.getItem('refreshToken');
  return api.post<SwitchContextResponse>('/auth/switch-context', {
    role,
    medicalCenterId,
    refreshToken,
  });
};

export const setPassword = (token: string, password: string) =>
  api.post<{ success: boolean }>('/auth/set-password', { token, password });

// ─── Appointments ─────────────────────────────────────────────────────────────
export const getAppointments = (page = 1, limit = 20) =>
  api.get<AppointmentsResponse>(
    `/appointments/medical-center?page=${page}&limit=${limit}`,
  );

export const createAppointment = (body: CreateAppointmentRequest) =>
  api.post<CreateAppointmentResponse>('/appointments', body);

export const updateAppointmentStatus = (
  appointmentId: string,
  tokenStatus: 'pending' | 'done' | 'cancelled' | 'skipped' | 'ongoing',
) =>
  api.patch<{ success: boolean }>(`/appointments/${appointmentId}/status`, {
    tokenStatus,
  });

// ─── Patients ─────────────────────────────────────────────────────────────────
export const getPatients = () => api.get<PatientsResponse>('/patients');

export const searchPatients = (phoneNumber: string) =>
  api.get<PatientSearchResponse>(
    `/patients?phoneNumber=${encodeURIComponent(phoneNumber)}`,
  );

export const createPatient = (body: CreatePatientRequest) =>
  api.post<CreatePatientResponse>('/patients', body);

// ─── Doctors ──────────────────────────────────────────────────────────────────
export const getDoctors = (medicalCenterId?: string) =>
  api.get<DoctorsResponse>(
    `/doctors/medical-center${
      medicalCenterId ? `?medicalCenterId=${medicalCenterId}` : ''
    }`,
  );

export const getDoctorsList = (
  params: { search?: string; page?: number; limit?: number } = {},
) => {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.page != null) query.set('page', String(params.page));
  if (params.limit != null) query.set('limit', String(params.limit));
  const qs = query.toString();
  return api.get<DoctorsListResponse>(`/doctors${qs ? `?${qs}` : ''}`);
};

export const getDoctor = (id: string) =>
  api.get<GetDoctorResponse>(`/doctors/${id}`);

export const createDoctor = (body: CreateDoctorRequest | FormData) =>
  body instanceof FormData
    ? client
        .post<CreateDoctorResponse>('/doctors', body, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then(r => r.data)
    : api.post<CreateDoctorResponse>('/doctors', body);

export const updateDoctor = (
  doctorId: string,
  body: UpdateDoctorRequest | FormData,
) =>
  body instanceof FormData
    ? client
        .patch<CreateDoctorResponse>(`/doctors/${doctorId}`, body, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then(r => r.data)
    : api.patch<CreateDoctorResponse>(`/doctors/${doctorId}`, body);

export const deleteDoctor = (doctorId: string) =>
  client
    .delete<{ success: boolean }>(`/doctors/${doctorId}/medical-center`, {
      data: {},
    })
    .then(r => r.data);

// ─── Doctor Schedule ──────────────────────────────────────────────────────────
export const getDoctorSchedule = (
  doctorId: string,
  date: string,
  medicalCenterId: string,
) =>
  api.get<DoctorScheduleResponse>(
    `/doctors/${doctorId}/schedule?date=${date}&medicalCenterId=${medicalCenterId}`,
  );

export const updateDoctorSchedule = (
  doctorId: string,
  body: UpdateScheduleRequest,
) => api.post<UpdateScheduleResponse>(`/doctors/${doctorId}/schedule`, body);

// ─── Metadata ─────────────────────────────────────────────────────────────────
export const getSpecialties = () =>
  api.get<SpecialtiesResponse>('/metadata/specialties');

export const getMedicalSystems = () =>
  api.get<MedicalSystemsResponse>('/metadata/medical-systems');

export const getQualifications = () =>
  api.get<QualificationsResponse>('/metadata/qualifications');

// ─── Schedule Pauses ──────────────────────────────────────────────────────────
export const pauseSchedule = (
  scheduleId: string,
  body: { date: string; startTime: string; stopTime: string },
) =>
  api.post<PauseScheduleResponse>(
    `/doctors/schedules/${scheduleId}/pause`,
    body,
  );

export const cancelSchedulePause = (pauseId: string) =>
  api.patch<PauseScheduleResponse>(
    `/doctors/schedules/pauses/${pauseId}/cancel`,
    {},
  );

// ─── Clinic ───────────────────────────────────────────────────────────────────
export const createClinic = (body: FormData) =>
  client
    .post<CreateClinicResponse>('/clinics', body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then(r => r.data);

export const updateClinic = (body: FormData) =>
  client
    .patch<{ success: boolean; data: ClinicData }>('/clinics/me', body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then(r => r.data);

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const getDashboard = (medicalCenterId: string) =>
  api.get<{ success: boolean; data: DashboardData }>(
    `/ui/dashboard?medicalCenterId=${medicalCenterId}`,
  );

// ─── Subscription ─────────────────────────────────────────────────────────────
export const createSubscriptionCheckout = (plan: 'monthly' | 'annually') =>
  api.post<{ success: boolean; data: { checkoutUrl: string } }>(
    '/subscriptions/checkout',
    { plan },
  );

export const getSubscriptionStatus = () =>
  api.get<{
    success: boolean;
    data: { trialExpiresAt: string; subscriptionStatus: string };
  }>('/subscriptions/status');

// ─── SSE Queue ────────────────────────────────────────────────────────────────
export const createSSE = async (
  endpoint: string,
  onMessage: (data: unknown) => void,
  onError?: (e: Event) => void,
): Promise<EventSource> => {
  const token = await AsyncStorage.getItem('accessToken');
  const base = BASE_URL.replace(/\/$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${base}${path}`;
  try {
    const es = new EventSourcePolyfill(url, {
      headers: { Authorization: `Bearer ${token}` },
    }) as unknown as EventSource;
    es.onmessage = e => {
      try {
        onMessage(JSON.parse((e as MessageEvent).data));
      } catch {
        onMessage((e as MessageEvent).data);
      }
    };
    if (onError) es.onerror = onError;
    return es;
  } catch (err) {
    if (onError) onError(err as unknown as Event);
    return {
      close: () => {},
    } as unknown as EventSource;
  }
};

export const subscribeQueue = async (
  doctorScheduleId: string,
  onData: (data: QueueSSEData) => void,
  onError?: (e: Event) => void,
): Promise<EventSource> =>
  createSSE(
    `/appointments/queue?doctorScheduleId=${doctorScheduleId}`,
    onData as (d: unknown) => void,
    onError,
  );
