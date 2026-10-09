import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, typography, spacing, radius, fonts } from '../styles/theme'

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'default'

interface BadgeProps {
  label: string
  variant?: BadgeVariant
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: colors.successLight, text: colors.success },
  danger: { bg: colors.dangerLight, text: colors.danger },
  warning: { bg: colors.warningLight, text: colors.warning },
  info: { bg: colors.primaryLight, text: colors.primary },
  default: { bg: '#F1F3F5', text: colors.textSecondary },
}

export const tokenStatusVariant = (status: string): BadgeVariant => {
  switch (status) {
    case 'done': return 'success'
    case 'cancelled': case 'skipped': return 'danger'
    case 'ongoing': return 'warning'
    case 'pending': return 'info'
    default: return 'default'
  }
}

const Badge: React.FC<BadgeProps> = ({ label, variant = 'default' }) => {
  const v = variantStyles[variant]
  return (
    <View style={[styles.container, { backgroundColor: v.bg }]}>
      <Text style={[styles.text, { color: v.text }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: typography.fontSizeXs,
    fontFamily: fonts.semiBold,
    textTransform: 'capitalize',
  },
})

export default Badge
