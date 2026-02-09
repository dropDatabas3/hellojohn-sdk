export interface Locale {
  signIn: {
    title: string
    subtitle: string
    emailLabel: string
    emailPlaceholder: string
    passwordLabel: string
    submitButton: string
    submitting: string
    forgotPasswordLink: string
    noAccountText: string
    signUpLink: string
    socialDivider: string
    socialButtonPrefix: string
    verificationNeeded: string
    verificationResent: string
    resendVerification: string
    resending: string
  }
  signUp: {
    title: string
    subtitle: string
    nameLabel: string
    namePlaceholder: string
    emailLabel: string
    emailPlaceholder: string
    passwordLabel: string
    passwordPlaceholder: string
    confirmPasswordLabel: string
    confirmPasswordPlaceholder: string
    submitButton: string
    continueButton: string
    processing: string
    registering: string
    backButton: string
    hasAccountText: string
    signInLink: string
    stepIndicator: string
    additionalInfo: string
    passwordMinLength: string
    passwordMismatch: string
    verifyEmailTitle: string
    verifyEmailMessage: string
    verifyEmailResent: string
    verifyEmailNotReceived: string
    verifyEmailResend: string
    verifyEmailResending: string
    verifyEmailBack: string
    successTitle: string
    successMessage: string
    successAction: string
  }
  forgotPassword: {
    title: string
    subtitle: string
    emailLabel: string
    emailPlaceholder: string
    submitButton: string
    submitting: string
    backToSignIn: string
    rememberedPassword: string
    signInLink: string
    successTitle: string
    successMessage: string
    successHint: string
    successAction: string
    emailRequired: string
  }
  resetPassword: {
    title: string
    subtitle: string
    newPasswordLabel: string
    newPasswordPlaceholder: string
    confirmPasswordLabel: string
    confirmPasswordPlaceholder: string
    submitButton: string
    submitting: string
    rememberedPassword: string
    signInLink: string
    successTitle: string
    successMessage: string
    successAction: string
    invalidTokenTitle: string
    invalidTokenMessage: string
    invalidTokenAction: string
    passwordRequired: string
    passwordMinLength: string
    passwordMismatch: string
  }
  emailVerification: {
    title: string
    subtitle: string
    resendButton: string
    resending: string
    cooldown: string
    resendSuccess: string
    backToSignIn: string
  }
  completeProfile: {
    title: string
    subtitle: string
    submitButton: string
    submitting: string
  }
  mfa: {
    challengeTitle: string
    challengeSubtitle: string
    codeLabel: string
    codePlaceholder: string
    submitButton: string
    verifying: string
    useRecoveryCode: string
    useAuthenticator: string
    setupTitle: string
    setupSubtitle: string
    scanQRCode: string
    manualEntry: string
    verifyButton: string
    recoveryCodesTitle: string
    recoveryCodesSubtitle: string
    copyButton: string
    copied: string
    doneButton: string
    cancelButton: string
  }
  userButton: {
    manageAccount: string
    signOut: string
  }
  userProfile: {
    title: string
    personalInfo: string
    security: string
    nameLabel: string
    emailLabel: string
    saveButton: string
    saving: string
    changePassword: string
    enableMFA: string
    disableMFA: string
  }
  errors: {
    invalidCredentials: string
    emailNotVerified: string
    userDisabled: string
    networkError: string
    mfaRequired: string
    mfaInvalidCode: string
    passwordTooWeak: string
    emailAlreadyExists: string
    invalidEmail: string
    requiredField: string
    passwordMismatch: string
    unknownError: string
    clientConfigError: string
    profileSaveError: string
    resetError: string
    forgotError: string
    resendError: string
    registerError: string
  }
  common: {
    loading: string
    or: string
    email: string
    password: string
    show: string
    hide: string
  }
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}
