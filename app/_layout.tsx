import { QueryClientProvider } from "@tanstack/react-query";
import { Redirect, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { authStorage } from "@/lib/auth";
import { queryClient } from "@/lib/query-client";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <>
      <Stack screenOptions={{ headerBackTitle: "Voltar" }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen
          name="leito-form"
          options={{
            headerShown: false,
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="operational-calc"
          options={{
            headerShown: false,
            presentation: "modal",
          }}
        />
      </Stack>
      {!isLoggedIn && <Redirect href="/login" />}
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const loggedIn = await authStorage.isLoggedIn();
      setIsLoggedIn(loggedIn);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (fontsLoaded && isLoggedIn !== null) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoggedIn]);

  if (!fontsLoaded || isLoggedIn === null) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView>
          <KeyboardProvider>
            <RootLayoutNav isLoggedIn={isLoggedIn} />
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
