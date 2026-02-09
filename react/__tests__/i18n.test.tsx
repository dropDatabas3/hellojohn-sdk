import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderHook } from '@testing-library/react'
import { useI18n, t, I18nProvider, en, es } from '../src/i18n'
import type { Locale } from '../src/i18n'

describe('i18n', () => {
  describe('default locale', () => {
    it('returns English locale by default when no provider is set', () => {
      const { result } = renderHook(() => useI18n())

      expect(result.current.signIn.title).toBe('Sign In')
      expect(result.current.signUp.title).toBe('Create Account')
      expect(result.current.common.loading).toBe('Loading...')
    })

    it('useI18n returns a complete Locale object with all sections', () => {
      const { result } = renderHook(() => useI18n())

      expect(result.current).toHaveProperty('signIn')
      expect(result.current).toHaveProperty('signUp')
      expect(result.current).toHaveProperty('forgotPassword')
      expect(result.current).toHaveProperty('resetPassword')
      expect(result.current).toHaveProperty('emailVerification')
      expect(result.current).toHaveProperty('completeProfile')
      expect(result.current).toHaveProperty('mfa')
      expect(result.current).toHaveProperty('userButton')
      expect(result.current).toHaveProperty('userProfile')
      expect(result.current).toHaveProperty('errors')
      expect(result.current).toHaveProperty('common')
    })
  })

  describe('t() template function', () => {
    it('interpolates {{key}} placeholders with provided values', () => {
      const result = t('Step {{step}} of {{total}}', { step: 2, total: 5 })
      expect(result).toBe('Step 2 of 5')
    })

    it('returns original string when no placeholders are present', () => {
      const result = t('Hello World')
      expect(result).toBe('Hello World')
    })

    it('returns original string when values parameter is undefined', () => {
      const result = t('Step {{step}} of {{total}}')
      expect(result).toBe('Step {{step}} of {{total}}')
    })

    it('handles missing values gracefully by keeping the placeholder', () => {
      const result = t('Hello {{name}}, your role is {{role}}', { name: 'Alice' })
      expect(result).toBe('Hello Alice, your role is {{role}}')
    })

    it('interpolates numeric values correctly', () => {
      const result = t('Resend in {{seconds}}s', { seconds: 30 })
      expect(result).toBe('Resend in 30s')
    })

    it('handles multiple identical placeholders', () => {
      const result = t('{{a}} and {{a}}', { a: 'X' })
      expect(result).toBe('X and X')
    })

    it('handles empty string values', () => {
      const result = t('Hello {{name}}!', { name: '' })
      expect(result).toBe('Hello !')
    })
  })

  describe('I18nProvider', () => {
    it('provides English locale when locale="en"', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <I18nProvider locale="en">{children}</I18nProvider>
      )

      const { result } = renderHook(() => useI18n(), { wrapper })

      expect(result.current.signIn.title).toBe('Sign In')
      expect(result.current.signIn.submitButton).toBe('Sign In')
    })

    it('provides Spanish locale when locale="es"', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <I18nProvider locale="es">{children}</I18nProvider>
      )

      const { result } = renderHook(() => useI18n(), { wrapper })

      expect(result.current.signIn.title).toBe('Iniciar Sesión')
      expect(result.current.signUp.title).toBe('Crear Cuenta')
      expect(result.current.common.loading).toBe('Cargando...')
    })

    it('falls back to English for unknown locale strings', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <I18nProvider locale="fr">{children}</I18nProvider>
      )

      const { result } = renderHook(() => useI18n(), { wrapper })

      expect(result.current.signIn.title).toBe('Sign In')
    })

    it('accepts a custom Locale object directly', () => {
      const customLocale: Locale = {
        ...en,
        signIn: {
          ...en.signIn,
          title: 'Custom Sign In',
        },
      }

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <I18nProvider locale={customLocale}>{children}</I18nProvider>
      )

      const { result } = renderHook(() => useI18n(), { wrapper })

      expect(result.current.signIn.title).toBe('Custom Sign In')
      expect(result.current.signUp.title).toBe('Create Account')
    })

    it('applies partial overrides on top of base locale', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <I18nProvider
          locale="en"
          overrides={{
            signIn: {
              title: 'Log In',
              submitButton: 'Go!',
            },
          }}
        >
          {children}
        </I18nProvider>
      )

      const { result } = renderHook(() => useI18n(), { wrapper })

      expect(result.current.signIn.title).toBe('Log In')
      expect(result.current.signIn.submitButton).toBe('Go!')
      // Non-overridden keys remain from base
      expect(result.current.signIn.emailLabel).toBe('Email')
      expect(result.current.signUp.title).toBe('Create Account')
    })
  })

  describe('Spanish locale completeness', () => {
    it('has all top-level keys matching English locale', () => {
      const enKeys = Object.keys(en).sort()
      const esKeys = Object.keys(es).sort()

      expect(esKeys).toEqual(enKeys)
    })

    it('has all signIn keys matching English locale', () => {
      const enKeys = Object.keys(en.signIn).sort()
      const esKeys = Object.keys(es.signIn).sort()

      expect(esKeys).toEqual(enKeys)
    })

    it('has all errors keys matching English locale', () => {
      const enKeys = Object.keys(en.errors).sort()
      const esKeys = Object.keys(es.errors).sort()

      expect(esKeys).toEqual(enKeys)
    })

    it('has no empty string values in Spanish locale', () => {
      function checkNoEmpty(obj: Record<string, any>, path: string) {
        for (const key in obj) {
          const val = obj[key]
          if (typeof val === 'string') {
            expect(val.length, `${path}.${key} should not be empty`).toBeGreaterThan(0)
          } else if (typeof val === 'object' && val !== null) {
            checkNoEmpty(val, `${path}.${key}`)
          }
        }
      }
      checkNoEmpty(es, 'es')
    })
  })
})
