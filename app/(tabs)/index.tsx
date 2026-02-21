import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  Alert,
  Platform,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { leitoStorage } from "@/lib/storage";
import type { LeitoDeFusao } from "@/lib/types";

const C = Colors.dark;

export default function LeitoScreen() {
  const insets = useSafeAreaInsets();
  const [leitos, setLeitos] = useState<LeitoDeFusao[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const data = await leitoStorage.getAll();
    setLeitos(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert("Excluir Leito", "Deseja realmente excluir este leito?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          await leitoStorage.delete(id);
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          loadData();
        },
      },
    ]);
  };

  const handleDuplicate = async (id: string) => {
    await leitoStorage.duplicate(id);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    loadData();
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderItem = ({ item }: { item: LeitoDeFusao }) => (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
      ]}
      onPress={() =>
        router.push({ pathname: "/leito-form", params: { id: item.id } })
      }
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="flame" size={18} color={C.primary} />
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
        <View style={styles.badgesRow}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  item.status === "applied"
                    ? C.success + "22"
                    : C.warning + "22",
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    item.status === "applied" ? C.success : C.warning,
                },
              ]}
            >
              {item.status === "applied" ? "Aplicado" : "Simulado"}
            </Text>
          </View>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>v{item.version}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>

      <View style={styles.cardStats}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Minerios</Text>
          <Text style={styles.statValue}>{item.ores.length}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Calcario</Text>
          <Text style={styles.statValue}>{item.limestone.weight} kg</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Coque</Text>
          <Text style={styles.statValue}>{item.fuel.cokeWeight} kg</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Blend</Text>
          <Ionicons
            name={item.blendValidation?.isValid ? "checkmark-circle" : "warning"}
            size={18}
            color={item.blendValidation?.isValid ? C.success : C.warning}
          />
        </View>
      </View>

      <View style={styles.cardActions}>
        <Pressable
          onPress={() => handleDuplicate(item.id)}
          style={styles.actionBtn}
          hitSlop={8}
        >
          <Ionicons name="copy-outline" size={20} color={C.accent} />
        </Pressable>
        <Pressable
          onPress={() => handleDelete(item.id)}
          style={styles.actionBtn}
          hitSlop={8}
        >
          <Ionicons name="trash-outline" size={20} color={C.danger} />
        </Pressable>
      </View>
    </Pressable>
  );

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leitos de Fusao</Text>
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/leito-form");
          }}
          style={({ pressed }) => [
            styles.addBtn,
            pressed && { opacity: 0.8 },
          ]}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      </View>

      <FlatList
        data={leitos}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 100 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="flame-outline" size={48} color={C.textMuted} />
            <Text style={styles.emptyTitle}>Nenhum leito cadastrado</Text>
            <Text style={styles.emptyText}>
              Toque no + para criar seu primeiro leito de fusao
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase" as const,
  },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  versionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: C.surfaceElevated,
  },
  versionText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: C.textSecondary,
  },
  cardDate: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
    marginBottom: 12,
  },
  cardStats: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  stat: {
    flex: 1,
    backgroundColor: C.surfaceElevated,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: C.textSecondary,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
