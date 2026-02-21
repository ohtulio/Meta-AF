import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import Colors from "@/constants/colors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "flame", selected: "flame.fill" }} />
        <Label>Leito</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="operational">
        <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <Label>Operacional</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="people">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>Pessoas</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tasks">
        <Icon sf={{ default: "checklist", selected: "checklist.checked" }} />
        <Label>Tarefas</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="inventory">
        <Icon sf={{ default: "shippingbox", selected: "shippingbox.fill" }} />
        <Label>Estoque</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.dark.primary,
        tabBarInactiveTintColor: Colors.dark.tabIconDefault,
        tabBarStyle: {
          position: "absolute" as const,
          backgroundColor: isIOS ? "transparent" : Colors.dark.surface,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: Colors.dark.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: Colors.dark.surface },
              ]}
            />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Leito",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flame" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="operational"
        options={{
          title: "Operacional",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="people"
        options={{
          title: "Pessoas",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tarefas",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkbox" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Estoque",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
