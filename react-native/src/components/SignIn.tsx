import type { MFARequiredResult } from "@hellojohn/js";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { isMFARequiredResult } from "../types";
import { useAuth } from "../hooks/useAuth";

export interface SignInProps {
  onSuccess?: () => void;
  onMFARequired?: (result: MFARequiredResult) => void;
  title?: string;
  submitLabel?: string;
}

export function SignIn({
  onSuccess,
  onMFARequired,
  title = "Sign in",
  submitLabel = "Sign in"
}: SignInProps) {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit(): Promise<void> {
    if (!email || !password) {
      setLocalError("Please enter email and password.");
      return;
    }

    setLocalError(null);
    try {
      const result = await login(email, password);
      if (isMFARequiredResult(result)) {
        onMFARequired?.(result);
        return;
      }
      onSuccess?.();
    } catch (error: unknown) {
      setLocalError(error instanceof Error ? error.message : "Sign in failed");
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!isLoading}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!isLoading}
        />

        {localError ? <Text style={styles.error}>{localError}</Text> : null}

        <TouchableOpacity
          style={[styles.button, isLoading ? styles.buttonDisabled : null]}
          onPress={() => {
            void handleSubmit();
          }}
          disabled={isLoading}
        >
          {isLoading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>{submitLabel}</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    padding: 20
  },
  title: {
    fontSize: 24,
    fontWeight: "600"
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff"
  },
  error: {
    color: "#b91c1c",
    fontSize: 13
  },
  button: {
    marginTop: 4,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#111827"
  },
  buttonDisabled: {
    opacity: 0.65
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600"
  }
});
