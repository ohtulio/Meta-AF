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
import { taskStorage } from "@/lib/storage";
import type { Task, TaskPriority, TaskStatus } from "@/lib/types";

const C = Colors.dark;

const PRIORITY_MAP: Record<TaskPriority, { label: string; color: string }> = {
  baixa: { label: "Baixa", color: C.success },
  media: { label: "Media", color: C.warning },
  alta: { label: "Alta", color: C.danger },
};

const STATUS_MAP: Record<TaskStatus, { label: string; color: string; icon: string }> = {
  pendente: { label: "Pendente", color: C.textMuted, icon: "ellipse-outline" },
  andamento: { label: "Andamento", color: C.accent, icon: "time-outline" },
  concluida: { label: "Concluida", color: C.success, icon: "checkmark-circle" },
};

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sector, setSector] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("media");
  const [taskStatus, setTaskStatus] = useState<TaskStatus>("pendente");
  const [responsible, setResponsible] = useState("");

  const loadData = useCallback(async () => {
    const data = await taskStorage.getAll();
    setTasks(data);
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
    setTitle("");
    setDescription("");
    setSector("");
    setPriority("media");
    setTaskStatus("pendente");
    setResponsible("");
    setEditingTask(null);
  };

  const openForm = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setTitle(task.title);
      setDescription(task.description);
      setSector(task.sector);
      setPriority(task.priority);
      setTaskStatus(task.status);
      setResponsible(task.responsible);
    } else {
      resetForm();
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Erro", "Informe o titulo da tarefa");
      return;
    }
    if (editingTask) {
      await taskStorage.update({
        ...editingTask,
        title: title.trim(),
        description: description.trim(),
        sector: sector.trim(),
        priority,
        status: taskStatus,
        responsible: responsible.trim(),
      });
    } else {
      await taskStorage.save({
        title: title.trim(),
        description: description.trim(),
        sector: sector.trim(),
        priority,
        status: taskStatus,
        responsible: responsible.trim(),
        createdAt: new Date().toISOString(),
      });
    }
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowForm(false);
    resetForm();
    loadData();
  };

  const handleToggleStatus = async (task: Task) => {
    const nextStatus: Record<TaskStatus, TaskStatus> = {
      pendente: "andamento",
      andamento: "concluida",
      concluida: "pendente",
    };
    await taskStorage.update({ ...task, status: nextStatus[task.status] });
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadData();
  };

  const handleDelete = (id: string) => {
    Alert.alert("Excluir", "Excluir esta tarefa?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          await taskStorage.delete(id);
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          loadData();
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Task }) => {
    const pri = PRIORITY_MAP[item.priority];
    const sta = STATUS_MAP[item.status];
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
        onPress={() => openForm(item)}
      >
        <View style={styles.cardRow}>
          <Pressable onPress={() => handleToggleStatus(item)} hitSlop={8}>
            <Ionicons name={sta.icon as any} size={24} color={sta.color} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.taskTitle,
                item.status === "concluida" && styles.taskDone,
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {item.responsible ? (
              <Text style={styles.taskResponsible}>{item.responsible}</Text>
            ) : null}
          </View>
          <View style={[styles.priBadge, { backgroundColor: pri.color + "22" }]}>
            <Text style={[styles.priText, { color: pri.color }]}>{pri.label}</Text>
          </View>
          <Pressable onPress={() => handleDelete(item.id)} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={C.danger} />
          </Pressable>
        </View>
        {item.description ? (
          <Text style={styles.taskDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        {item.sector ? (
          <View style={styles.sectorRow}>
            <Ionicons name="business-outline" size={12} color={C.textMuted} />
            <Text style={styles.sectorText}>{item.sector}</Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tarefas</Text>
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
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkbox-outline" size={48} color={C.textMuted} />
            <Text style={styles.emptyTitle}>Nenhuma tarefa</Text>
            <Text style={styles.emptyText}>Crie tarefas operacionais para sua equipe</Text>
          </View>
        }
      />

      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTask ? "Editar Tarefa" : "Nova Tarefa"}
              </Text>
              <Pressable onPress={() => { setShowForm(false); resetForm(); }} hitSlop={8}>
                <Ionicons name="close" size={24} color={C.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Titulo</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Titulo da tarefa"
                placeholderTextColor={C.textMuted}
              />

              <Text style={styles.inputLabel}>Descricao</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Descricao detalhada"
                placeholderTextColor={C.textMuted}
                multiline
              />

              <Text style={styles.inputLabel}>Setor</Text>
              <TextInput
                style={styles.input}
                value={sector}
                onChangeText={setSector}
                placeholder="Ex: Manutencao, Producao"
                placeholderTextColor={C.textMuted}
              />

              <Text style={styles.inputLabel}>Responsavel</Text>
              <TextInput
                style={styles.input}
                value={responsible}
                onChangeText={setResponsible}
                placeholder="Nome do responsavel"
                placeholderTextColor={C.textMuted}
              />

              <Text style={styles.inputLabel}>Prioridade</Text>
              <View style={styles.optionRow}>
                {(Object.keys(PRIORITY_MAP) as TaskPriority[]).map((k) => (
                  <Pressable
                    key={k}
                    onPress={() => setPriority(k)}
                    style={[
                      styles.optionBtn,
                      priority === k && {
                        backgroundColor: PRIORITY_MAP[k].color + "33",
                        borderColor: PRIORITY_MAP[k].color,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        priority === k && { color: PRIORITY_MAP[k].color },
                      ]}
                    >
                      {PRIORITY_MAP[k].label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.optionRow}>
                {(Object.keys(STATUS_MAP) as TaskStatus[]).map((k) => (
                  <Pressable
                    key={k}
                    onPress={() => setTaskStatus(k)}
                    style={[
                      styles.optionBtn,
                      taskStatus === k && {
                        backgroundColor: STATUS_MAP[k].color + "33",
                        borderColor: STATUS_MAP[k].color,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        taskStatus === k && { color: STATUS_MAP[k].color },
                      ]}
                    >
                      {STATUS_MAP[k].label}
                    </Text>
                  </Pressable>
                ))}
              </View>

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
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.primary, alignItems: "center", justifyContent: "center",
  },
  list: { paddingHorizontal: 16, gap: 10 },
  card: {
    backgroundColor: C.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.borderLight,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  taskTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: C.text },
  taskDone: { textDecorationLine: "line-through" as const, color: C.textMuted },
  taskResponsible: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textSecondary },
  priBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  taskDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textMuted, marginTop: 8, marginLeft: 34 },
  sectorRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, marginLeft: 34 },
  sectorText: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textMuted },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: C.textSecondary, marginTop: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.textMuted, textAlign: "center", paddingHorizontal: 40 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalContainer: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "90%" },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 20, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: C.text },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.textSecondary, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: C.surfaceElevated, borderRadius: 12, padding: 14,
    fontSize: 15, fontFamily: "Inter_400Regular", color: C.text,
    borderWidth: 1, borderColor: C.borderLight,
  },
  optionRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  optionBtn: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceElevated,
  },
  optionText: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.textSecondary },
  saveBtn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 24, marginBottom: 16 },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
});
