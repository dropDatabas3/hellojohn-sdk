import React, { createContext, useContext } from "react"
import type { Locale, DeepPartial } from "./types"
import { en } from "./en"
import { es } from "./es"

export type { Locale, DeepPartial }
export { en, es }

const builtInLocales: Record<string, Locale> = { en, es }

const I18nContext = createContext<Locale>(en)

function deepMerge<T extends Record<string, any>>(base: T, overrides: DeepPartial<T>): T {
  const result = { ...base }
  for (const key in overrides) {
    const val = overrides[key]
    if (val && typeof val === "object" && !Array.isArray(val) && typeof base[key] === "object") {
      result[key] = deepMerge(base[key], val as any)
    } else if (val !== undefined) {
      (result as any)[key] = val
    }
  }
  return result
}

export interface I18nProviderProps {
  locale?: string | Locale
  overrides?: DeepPartial<Locale>
  children: React.ReactNode
}

export function I18nProvider({ locale = "en", overrides, children }: I18nProviderProps) {
  const base = typeof locale === "string" ? (builtInLocales[locale] || en) : locale
  const merged = overrides ? deepMerge(base, overrides) : base
  return React.createElement(I18nContext.Provider, { value: merged }, children)
}

export function useI18n(): Locale {
  return useContext(I18nContext)
}

/** Simple template interpolation: replaces {{key}} with values */
export function t(template: string, values?: Record<string, string | number>): string {
  if (!values) return template
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(values[key] ?? `{{${key}}}`))
}
