import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  TextInput,
  Alert,
  Platform,
  Modal,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { peopleStorage } from "@/lib/storage";
import type { Person, PresenceStatus } from "@/lib/types";

const C = Colors.dark;

const STATUS_OPTIONS: { value: PresenceStatus; label: string; color: string }[] = [
  { value: "presente", label: "Presente", color: C.success },
  { value: "falta", label: "Falta", color: C.danger },
  { value: "afastado", label: "Afastado", color: C.warning },
  { value: "suspenso", label: "Suspenso", color: "#9333EA" },
];

export default function PeopleScreen() {
  const insets = useSafeAreaInsets();
  const [people, setPeople] = useState<Person[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<PresenceStatus>("presente");
  const [observation, setObservation] = useState("");

  const loadData = useCallback(async () => {
    const data = await peopleStorage.getAll();
    setPeople(data);
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

  const resetForm = () => {
    setName("");
    setRole("");
    setStatus("presente");
    setObservation("");
    setEditingPerson(null);
  };

  const openForm = (person?: Person) => {
    if (person) {
      setEditingPerson(person);
      setName(person.name);
      setRole(person.role);
      setStatus(person.status);
      setObservation(person.observation);
    } else {
      resetForm();
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Erro", "Informe o nome do funcionario");
      return;
    }
    if (editingPerson) {
      await peopleStorage.update({
        ...editingPerson,
        name: name.trim(),
        role: role.trim(),
        status,
        observation: observation.trim(),
        date: new Date().toISOString(),
      });
    } else {
      await peopleStorage.save({
        name: name.trim(),
        role: role.trim(),
        status,
        observation: observation.trim(),
        date: new Date().toISOString(),
      });
    }
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowForm(false);
    resetForm();
    loadData();
  };

  const handleDelete = (id: string) => {
    Alert.alert("Excluir", "Excluir este funcionario?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          await peopleStorage.delete(id);
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          loadData();
        },
      },
    ]);
  };

  const getStatusInfo = (s: PresenceStatus) =>
    STATUS_OPTIONS.find((o) => o.value === s) || STATUS_OPTIONS[0];

  const renderItem = ({ item }: { item: Person }) => {
    const si = getStatusInfo(item.status);
    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && { opacity: 0.85 },
        ]}
        onPress={() => openForm(item)}
      >
        <View style={styles.cardRow}>
          <View style={[styles.statusDot, { backgroundColor: si.color }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.personName}>{item.name}</Text>
            <Text style={styles.personRole}>{item.role || "Sem funcao"}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: si.color + "22" }]}>
            <Text style={[styles.statusText, { color: si.color }]}>
              {si.label}
            </Text>
          </View>
          <Pressable onPress={() => handleDelete(item.id)} hitSlop={8} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={18} color={C.danger} />
          </Pressable>
        </View>
        {item.observation ? (
          <Text style={styles.observation} numberOfLines={2}>
            {item.observation}
          </Text>
        ) : null}
      </Pressable>
    );
  };

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pessoas</Text>
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            openForm();
          }}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      </View>

      <FlatList
        data={people}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={C.textMuted} />
            <Text style={styles.emptyTitle}>Nenhum funcionario</Text>
            <Text style={styles.emptyText}>Adicione funcionarios para controlar presenca</Text>
          </View>
        }
      />

      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingPerson ? "Editar Pessoa" : "Nova Pessoa"}
              </Text>
              <Pressable onPress={() => { setShowForm(false); resetForm(); }} hitSlop={8}>
                <Ionicons name="close" size={24} color={C.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Nome</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Nome do funcionario"
                placeholderTextColor={C.textMuted}
              />

              <Text style={styles.inputLabel}>Funcao</Text>
              <TextInput
                style={styles.input}
                value={role}
                onChangeText={setRole}
                placeholder="Ex: Operador, Mecanico"
                placeholderTextColor={C.textMuted}
              />

              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.statusPicker}>
                {STATUS_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => setStatus(opt.value)}
                    style={[
                      styles.statusOption,
                      status === opt.value && {
                        backgroundColor: opt.color + "33",
                        borderColor: opt.color,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        status === opt.value && { color: opt.color },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.inputLabel}>Observacao</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                value={observation}
                onChangeText={setObservation}
                placeholder="Observacoes"
                placeholderTextColor={C.textMuted}
                multiline
              />

              <Pressable
                onPress={handleSave}
                style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.8 }]}
              >
                <Text style={styles.saveBtnText}>Salvar</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: C.text },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { paddingHorizontal: 16, gap: 10 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  personName: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: C.text },
  personRole: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textSecondary },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  observation: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    marginTop: 8,
    marginLeft: 20,
  },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: C.textSecondary, marginTop: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.textMuted, textAlign: "center", paddingHorizontal: 40 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: C.text },
  modalBody: { padding: 20 },
  inputLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: C.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: C.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: C.text,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  statusPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceElevated,
  },
  statusOptionText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: C.textSecondary,
  },
  saveBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
});
