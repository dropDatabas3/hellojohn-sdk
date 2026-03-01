import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../hooks/useAuth";

export interface UserButtonProps {
  signInLabel?: string;
  signOutLabel?: string;
}

function getInitial(value: string | undefined): string {
  if (!value || value.length === 0) {
    return "?";
  }
  return value[0].toUpperCase();
}

export function UserButton({
  signInLabel = "Sign in",
  signOutLabel = "Sign out"
}: UserButtonProps) {
  const { isAuthenticated, user, logout, loginWithRedirect } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <Pressable
        style={styles.signInButton}
        onPress={() => {
          void loginWithRedirect();
        }}
      >
        <Text style={styles.signInText}>{signInLabel}</Text>
      </Pressable>
    );
  }

  const fallbackName = user.name || user.email || user.sub;

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitial(fallbackName)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.email}>{user.email || "Unknown user"}</Text>
        {user.name ? <Text style={styles.name}>{user.name}</Text> : null}
      </View>
      <Pressable
        style={styles.signOutButton}
        onPress={() => {
          void logout();
        }}
      >
        <Text style={styles.signOutText}>{signOutLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center"
  },
  avatarText: {
    color: "#ffffff",
    fontWeight: "700"
  },
  info: {
    flex: 1
  },
  email: {
    color: "#111827",
    fontWeight: "600"
  },
  name: {
    color: "#4b5563",
    fontSize: 12
  },
  signInButton: {
    borderRadius: 8,
    backgroundColor: "#111827",
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: "flex-start"
  },
  signInText: {
    color: "#ffffff",
    fontWeight: "600"
  },
  signOutButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 8,
    paddingHorizontal: 10
  },
  signOutText: {
    color: "#111827",
    fontWeight: "600",
    fontSize: 12
  }
});
