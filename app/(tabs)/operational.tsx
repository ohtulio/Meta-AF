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
import { operationalStorage, leitoStorage } from "@/lib/storage";
import type { OperationalRecord } from "@/lib/types";

const C = Colors.dark;

export default function OperationalScreen() {
  const insets = useSafeAreaInsets();
  const [records, setRecords] = useState<OperationalRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const r = await operationalStorage.getAll();
    setRecords(r);
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
    Alert.alert("Excluir Registro", "Deseja excluir este registro?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          await operationalStorage.delete(id);
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          loadData();
        },
      },
    ]);
  };

  const handleNewCalc = async () => {
    const allLeitos = await leitoStorage.getAll();
    const appliedLeitos = allLeitos.filter((l) => l.status === "applied");
    if (appliedLeitos.length === 0) {
      Alert.alert(
        "Sem Leito Aplicado",
        "Voce precisa ter ao menos um leito com status 'Aplicado' para realizar calculos."
      );
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/operational-calc");
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

  const renderItem = ({ item }: { item: OperationalRecord }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="calculator" size={18} color={C.accent} />
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.leitoSnapshot.name}
          </Text>
        </View>
        <Pressable onPress={() => handleDelete(item.id)} hitSlop={8}>
          <Ionicons name="trash-outline" size={18} color={C.danger} />
        </Pressable>
      </View>

      <Text style={styles.cardDate}>{formatDate(item.date)}</Text>

      <View style={styles.resultsGrid}>
        <View style={styles.resultItem}>
          <Text style={styles.resultLabel}>Gusa/carga</Text>
          <Text style={styles.resultValue}>
            {item.results.gusaPerCharge.toFixed(1)} kg
          </Text>
        </View>
        <View style={styles.resultItem}>
          <Text style={styles.resultLabel}>Massa Escoria</Text>
          <Text style={styles.resultValue}>
            {item.results.slagMass.toFixed(2)}
          </Text>
        </View>
        <View style={styles.resultItem}>
          <Text style={styles.resultLabel}>Calcario</Text>
          <Text
            style={[
              styles.resultValue,
              {
                color:
                  item.results.limestoneAdjust < 0
                    ? C.success
                    : item.results.limestoneAdjust > 0
                    ? C.danger
                    : C.text,
              },
            ]}
          >
            {item.results.limestoneAdjust > 0 ? "+" : ""}
            {item.results.limestoneAdjust.toFixed(1)} kg
          </Text>
        </View>
        <View style={styles.resultItem}>
          <Text style={styles.resultLabel}>Bauxita</Text>
          <Text style={[styles.resultValue, { color: C.warning }]}>
            +{item.results.bauxiteAdjust.toFixed(1)} kg
          </Text>
        </View>
        <View style={styles.resultItem}>
          <Text style={styles.resultLabel}>Coke Rate</Text>
          <Text style={styles.resultValue}>
            {item.results.cokeRate.toFixed(2)}
          </Text>
        </View>
        <View style={styles.resultItem}>
          <Text style={styles.resultLabel}>Ajuste Fator</Text>
          <Text
            style={[
              styles.resultValue,
              {
                color:
                  item.results.fuelAdjust > 0
                    ? C.success
                    : item.results.fuelAdjust < 0
                    ? C.danger
                    : C.text,
              },
            ]}
          >
            {item.results.fuelAdjust > 0 ? "+" : ""}
            {item.results.fuelAdjust.toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Operacional</Text>
        <Pressable
          onPress={handleNewCalc}
          style={({ pressed }) => [
            styles.addBtn,
            pressed && { opacity: 0.8 },
          ]}
        >
          <Ionicons name="calculator" size={22} color="#fff" />
        </Pressable>
      </View>

      <FlatList
        data={records}
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
            <Ionicons name="analytics-outline" size={48} color={C.textMuted} />
            <Text style={styles.emptyTitle}>Nenhum calculo realizado</Text>
            <Text style={styles.emptyText}>
              Selecione um leito aplicado e insira analises para calcular
              correcoes
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
    backgroundColor: C.accent,
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
    marginBottom: 4,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
    flex: 1,
  },
  cardDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
    marginBottom: 12,
  },
  resultsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  resultItem: {
    backgroundColor: C.surfaceElevated,
    borderRadius: 10,
    padding: 10,
    width: "48%" as any,
    minWidth: 140,
    flexGrow: 1,
  },
  resultLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    marginBottom: 2,
  },
  resultValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: C.text,
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
