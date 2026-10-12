import { SIZE } from '../themes/sizes';

export const colors = {
  primary: '#418EFD',
  primaryLight: '#EAF3FF',
  primaryHover: '#2d7ef0',
  background: '#ffffff',
  pageBg: '#F4F6FA',
  textPrimary: '#1C1E22',
  textSecondary: '#636A79',
  textMuted: '#7E8695',
  border: '#E0E2E6',
  borderHover: '#94a3b8',
  accent: '#418EFD',
  accentBg: '#EAF3FF',
  inputBg: '#F8F9FB',
  placeholder: '#7E8695',
  checkboxBorder: '#A0A5B1',
  white: '#ffffff',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  success: '#22C55E',
  successLight: '#DCFCE7',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  cardBg: '#ffffff',
  shadow: 'rgba(0, 0, 0, 0.06)',
}

export const fonts = {
  extraLight: 'Manrope-ExtraLight',
  light: 'Manrope-Light',
  regular: 'Manrope-Regular',
  medium: 'Manrope-Medium',
  semiBold: 'Manrope-SemiBold',
  bold: 'Manrope-Bold',
  extraBold: 'Manrope-ExtraBold',
}

export const typography = {
  fontSizeXs: SIZE(11),
  fontSizeSm: SIZE(13),
  fontSizeBase: SIZE(15),
  fontSizeMd: SIZE(16),
  fontSizeLg: SIZE(18),
  fontSizeXl: SIZE(20),
  fontSize2xl: SIZE(24),
  fontSize3xl: SIZE(28),
  fontWeightNormal: '400' as const,
  fontWeightMedium: '500' as const,
  fontWeightSemibold: '600' as const,
  fontWeightBold: '700' as const,
}

export const spacing = {
  xs: SIZE(4),
  sm: SIZE(8),
  md: SIZE(12),
  base: SIZE(16),
  lg: SIZE(20),
  xl: SIZE(24),
  '2xl': SIZE(32),
  '3xl': SIZE(40),
  '4xl': SIZE(48),
}

export const radius = {
  sm: SIZE(6),
  md: SIZE(10),
  lg: SIZE(14),
  xl: SIZE(18),
  full: 999,
}
