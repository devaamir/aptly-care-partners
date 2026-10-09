import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  createBottomTabNavigator,
  BottomTabNavigationOptions,
  BottomTabBarButtonProps,
} from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SvgProps } from 'react-native-svg';

import { useAppContext } from '../context/AppContext';
import { colors, typography, fonts } from '../styles/theme';
import { SIZE } from '../themes/sizes';

import DashboardIcon from '../assets/icons/dashboard-icon.svg';
import DashboardSelectedIcon from '../assets/icons/dashboard-selected.svg';
import AppointmentIcon from '../assets/icons/appointment-icon.svg';
import AppointmentSelected from '../assets/icons/appointment-selected.svg';
import QueueIcon from '../assets/icons/quemanagment-icon.svg';
import DoctorsIcon from '../assets/icons/doctors-icon.svg';
import DoctorsSelected from '../assets/icons/doctors-selected.svg';
import PatientsIcon from '../assets/icons/patients-icon.svg';

import type {
  RootStackParamList,
  AuthStackParamList,
  MainTabParamList,
  DoctorTabParamList,
  ManagerStackParamList,
  DoctorStackParamList,
} from './types';
import type { UserContext } from '../services/types';

// Screens
import LoginScreen from '../screens/auth/LoginScreen';
import SetPasswordScreen from '../screens/auth/SetPasswordScreen';
import SelectProfileScreen from '../screens/main/SelectProfileScreen';
import DashboardScreen from '../screens/main/DashboardScreen';
import AppointmentsScreen from '../screens/main/AppointmentsScreen';
import QueueScreen from '../screens/main/QueueScreen';
import DoctorsScreen from '../screens/main/DoctorsScreen';
import PatientsScreen from '../screens/main/PatientsScreen';
import SettingsScreen from '../screens/main/SettingsScreen';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const DoctorTab = createBottomTabNavigator<DoctorTabParamList>();
const ManagerStack = createNativeStackNavigator<ManagerStackParamList>();
const DoctorStack = createNativeStackNavigator<DoctorStackParamList>();

// ─── Tab Icon Component & Options ─────────────────────────────────────────────
const ICON_SIZE = SIZE(24);

interface TabIconProps {
  Icon: React.FC<SvgProps>;
  focused?: boolean;
  color: string;
}

function TabIcon({ Icon, color }: TabIconProps) {
  return (
    <View style={styles.tabIconWrapper}>
      <Icon width={ICON_SIZE} height={ICON_SIZE} stroke={color} color={color} />
    </View>
  );
}

function TabBarButton(props: BottomTabBarButtonProps) {
  const focused = Boolean(
    (props as any)['aria-selected'] ?? props.accessibilityState?.selected,
  );
  return (
    <Pressable
      {...props}
      style={[
        props.style,
        styles.tabBarButton,
        focused && styles.tabBarButtonActive,
      ]}
    />
  );
}

function useTabScreenOptions(): BottomTabNavigationOptions {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(
    insets.bottom,
    Platform.OS === 'ios' ? 28 : 16,
  );
  const tabHeight = 62 + bottomPadding;

  return {
    tabBarActiveTintColor: '#2879E4',
    tabBarInactiveTintColor: colors.textMuted,
    tabBarStyle: {
      backgroundColor: colors.white,
      borderTopColor: colors.border,
      borderTopWidth: 1,
      height: tabHeight,
      paddingTop: 0,
      paddingBottom: bottomPadding,
      paddingHorizontal: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 8,
    },
    tabBarLabelStyle: {
      fontSize: typography.fontSizeXs,
      fontFamily: fonts.medium,
      marginTop: 2,
    },
    tabBarItemStyle: {
      paddingVertical: 2,
    },
    tabBarButton: props => <TabBarButton {...props} />,
    headerShown: false,
  };
}

// ─── Manager Tabs ─────────────────────────────────────────────────────────────
function ManagerTabs() {
  const tabScreenOptions = useTabScreenOptions();
  return (
    <MainTab.Navigator screenOptions={tabScreenOptions}>
      <MainTab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              Icon={focused ? DashboardSelectedIcon : DashboardIcon}
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <MainTab.Screen
        name="Appointments"
        component={AppointmentsScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              Icon={focused ? AppointmentSelected : AppointmentIcon}
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <MainTab.Screen
        name="Queue"
        component={QueueScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon Icon={QueueIcon} focused={focused} color={color} />
          ),
        }}
      />
      <MainTab.Screen
        name="Doctors"
        component={DoctorsScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              Icon={focused ? DoctorsSelected : DoctorsIcon}
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <MainTab.Screen
        name="Patients"
        component={PatientsScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
    </MainTab.Navigator>
  );
}

// ─── Doctor Tabs ──────────────────────────────────────────────────────────────
function DoctorTabs() {
  const tabScreenOptions = useTabScreenOptions();
  return (
    <DoctorTab.Navigator screenOptions={tabScreenOptions}>
      <DoctorTab.Screen
        name="DoctorDashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              Icon={focused ? DashboardSelectedIcon : DashboardIcon}
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <DoctorTab.Screen
        name="Queue"
        component={QueueScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon Icon={QueueIcon} focused={focused} color={color} />
          ),
        }}
      />
      <DoctorTab.Screen
        name="Appointments"
        component={AppointmentsScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon Icon={AppointmentIcon} focused={focused} color={color} />
          ),
        }}
      />
    </DoctorTab.Navigator>
  );
}

// ─── Manager Navigator (Tabs + Settings Stack) ────────────────────────────────
function ManagerNavigator({
  onSwitchProfile,
}: {
  onSwitchProfile: () => void;
}) {
  return (
    <ManagerStack.Navigator>
      <ManagerStack.Screen
        name="ManagerTabs"
        component={ManagerTabs}
        options={{ headerShown: false }}
      />
      <ManagerStack.Screen
        name="Settings"
        options={{
          headerShown: true,
          title: 'Settings',
          headerStyle: { backgroundColor: colors.white },
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
        }}
      >
        {() => <SettingsScreen onSwitchProfile={onSwitchProfile} />}
      </ManagerStack.Screen>
    </ManagerStack.Navigator>
  );
}

// ─── Doctor Navigator (Tabs + Settings Stack) ─────────────────────────────────
function DoctorNavigator({ onSwitchProfile }: { onSwitchProfile: () => void }) {
  return (
    <DoctorStack.Navigator>
      <DoctorStack.Screen
        name="DoctorTabs"
        component={DoctorTabs}
        options={{ headerShown: false }}
      />
      <DoctorStack.Screen
        name="Settings"
        options={{
          headerShown: true,
          title: 'Settings',
          headerStyle: { backgroundColor: colors.white },
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
        }}
      >
        {() => <SettingsScreen onSwitchProfile={onSwitchProfile} />}
      </DoctorStack.Screen>
    </DoctorStack.Navigator>
  );
}

// ─── Auth Navigator ────────────────────────────────────────────────────────────
function AuthNavigator({
  onLogin,
}: {
  onLogin: (contexts: UserContext[], isNew: boolean) => void;
}) {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login">
        {props => <LoginScreen {...props} onLogin={onLogin} />}
      </AuthStack.Screen>
      <AuthStack.Screen
        name="SetPassword"
        component={SetPasswordScreen}
        options={{ headerShown: true, title: 'Set Password' }}
      />
    </AuthStack.Navigator>
  );
}

// ─── Root Navigator ────────────────────────────────────────────────────────────
type AppScreen = 'auth' | 'select-profile' | 'create-clinic' | 'main';

export default function RootNavigator() {
  const { isInitialized, accessToken, activeContext, logout } = useAppContext();
  const [screen, setScreen] = useState<AppScreen | null>(null);

  // Determine initial screen after context rehydrated
  React.useEffect(() => {
    if (!isInitialized) return;
    const init = async () => {
      if (!accessToken) {
        setScreen('auth');
        return;
      }
      const pending = await AsyncStorage.getItem('pendingClinicSetup');
      if (pending === 'true') {
        setScreen('create-clinic');
        return;
      }
      if (activeContext) {
        setScreen('main');
      } else {
        setScreen('select-profile');
      }
    };
    init();
  }, [isInitialized, accessToken]);

  // Listen for logout (accessToken becomes null while screen is 'main')
  React.useEffect(() => {
    if (isInitialized && !accessToken && screen !== 'auth') {
      setScreen('auth');
    }
  }, [accessToken]);

  if (!isInitialized || screen === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const handleLogin = async (_contexts: UserContext[], isNew: boolean) => {
    if (isNew) {
      await AsyncStorage.setItem('pendingClinicSetup', 'true');
      setScreen('create-clinic');
    } else if (activeContext) {
      setScreen('main');
    } else {
      setScreen('select-profile');
    }
  };

  const handleProfileSelected = () => setScreen('main');
  const handleSwitchProfile = () => setScreen('select-profile');

  const isDoctor = activeContext?.role === 'doctor';

  return (
    <NavigationContainer>
      {screen === 'auth' && <AuthNavigator onLogin={handleLogin} />}
      {screen === 'select-profile' && (
        <SelectProfileScreen
          onSelect={handleProfileSelected}
          onBack={async () => {
            await logout();
            setScreen('auth');
          }}
        />
      )}
      {screen === 'create-clinic' && (
        // Placeholder — CreateClinic screen will be built next
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
      {screen === 'main' &&
        (isDoctor ? (
          <DoctorNavigator onSwitchProfile={handleSwitchProfile} />
        ) : (
          <ManagerNavigator onSwitchProfile={handleSwitchProfile} />
        ))}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapper: {
    width: SIZE(24),
    height: SIZE(24),
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBarButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    borderTopWidth: 2.5,
    borderTopColor: 'transparent',
    marginTop: -1,
    paddingTop: 8,
  },
  tabBarButtonActive: {
    borderTopColor: '#2879E4',
  },
});
