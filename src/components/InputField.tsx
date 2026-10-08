import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  type KeyboardTypeOptions,
  type ViewStyle,
} from 'react-native'
import { colors, typography, spacing, radius } from '../styles/theme'
import SecurityEyeIcon from '../assets/icons/security-eye.svg'

interface InputFieldProps {
  label?: string
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  secureTextEntry?: boolean
  keyboardType?: KeyboardTypeOptions
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  autoCorrect?: boolean
  editable?: boolean
  multiline?: boolean
  numberOfLines?: number
  error?: string
  style?: ViewStyle
  rightElement?: React.ReactNode
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = false,
  editable = true,
  multiline = false,
  numberOfLines = 1,
  error,
  style,
  rightElement,
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = secureTextEntry

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
        <TextInput
          style={[
            styles.input,
            multiline && styles.multiline,
            !editable && styles.disabled,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={isPassword && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          editable={editable}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : undefined}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(v => !v)}
            style={styles.eyeButton}
          >
            <SecurityEyeIcon
              width={20}
              height={20}
              fill={showPassword ? colors.primary : colors.textMuted}
            />
          </TouchableOpacity>
        )}
        {rightElement && !isPassword && (
          <View style={styles.rightElement}>{rightElement}</View>
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
  },
  label: {
    fontSize: typography.fontSizeSm,
    fontWeight: typography.fontWeightMedium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSizeBase,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
    minHeight: 46,
  },
  multiline: {
    minHeight: 90,
    paddingTop: spacing.md,
  },
  disabled: {
    color: colors.textSecondary,
  },
  inputError: {
    borderColor: colors.danger,
  },
  eyeButton: {
    paddingLeft: spacing.sm,
    paddingVertical: spacing.sm,
  },
  rightElement: {
    paddingLeft: spacing.sm,
  },
  errorText: {
    fontSize: typography.fontSizeXs,
    color: colors.danger,
    marginTop: spacing.xs,
  },
})

export default InputField
