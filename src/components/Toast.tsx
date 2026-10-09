import React, { useEffect } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { colors, typography, spacing, radius, fonts } from '../styles/theme'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose: () => void
  duration?: number
}

const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  onClose,
  duration = 3000,
}) => {
  const opacity = React.useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.delay(duration - 500),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onClose())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Animated.View style={[styles.container, styles[type], { opacity }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: spacing.base,
    right: spacing.base,
    padding: spacing.base,
    borderRadius: radius.md,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  success: {
    backgroundColor: colors.success,
  },
  error: {
    backgroundColor: colors.danger,
  },
  info: {
    backgroundColor: colors.textPrimary,
  },
  text: {
    color: colors.white,
    fontSize: typography.fontSizeSm,
    fontFamily: fonts.medium,
    textAlign: 'center',
  },
})

export default Toast
