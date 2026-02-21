import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { authStorage } from "@/lib/auth";

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function extractDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const theme = Colors.dark;

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const handlePhoneChange = (text: string) => {
    setPhone(formatPhone(text));
  };

  const handleLogin = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const digits = extractDigits(phone);
    if (digits.length < 10) {
      Alert.alert("Telefone invalido", "Digite um numero com pelo menos 10 digitos.");
      return;
    }

    setIsLoading(true);
    try {
      await authStorage.setPhone(digits);
      router.replace("/(tabs)");
    } catch {
      Alert.alert("Erro", "Nao foi possivel salvar. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.container, { paddingTop: topInset + 40 }]}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="flame" size={72} color={theme.primary} />
          </View>

          <Text style={styles.title}>Alto Forno</Text>
          <Text style={styles.subtitle}>Sistema de Suporte Metalurgico</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Telefone</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="call-outline"
                size={20}
                color={theme.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="(11) 99999-9999"
                placeholderTextColor={theme.textMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={handlePhoneChange}
                maxLength={16}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {isLoading ? "Entrando..." : "Entrar"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.footer, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 16 }]}>
          <Text style={styles.footerText}>v1.0 - Alto Forno</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const theme = Colors.dark;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: theme.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.background,
    justifyContent: "space-between",
  },
  content: {
    paddingHorizontal: 32,
    alignItems: "center",
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 36,
    color: theme.text,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: theme.textMuted,
    marginBottom: 48,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 24,
  },
  inputLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 18,
    color: theme.text,
    paddingVertical: 16,
  },
  button: {
    width: "100%",
    backgroundColor: theme.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: "#FFFFFF",
  },
  footer: {
    alignItems: "center",
    paddingTop: 16,
  },
  footerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: theme.textMuted,
  },
});
