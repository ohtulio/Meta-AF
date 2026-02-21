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
import { inventoryStorage, configStorage } from "@/lib/storage";
import type { InventoryItem, InventoryStatus, AppConfig } from "@/lib/types";
import { DEFAULT_INVENTORY_STATUSES } from "@/lib/types";

const C = Colors.dark;

const PRESET_COLORS = [
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#3B82F6",
  "#9333EA",
  "#EC4899",
  "#14B8A6",
  "#8B5CF6",
];

export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [statuses, setStatuses] = useState<InventoryStatus[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showStatusManager, setShowStatusManager] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [name, setName] = useState("");
  const [lot, setLot] = useState("");
  const [invStatus, setInvStatus] = useState<InventoryStatus | null>(null);
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");

  const [statusFormVisible, setStatusFormVisible] = useState(false);
  const [editingStatus, setEditingStatus] = useState<InventoryStatus | null>(null);
  const [statusName, setStatusName] = useState("");
  const [statusColor, setStatusColor] = useState(PRESET_COLORS[0]);

  const loadStatuses = useCallback(async () => {
    let config = await configStorage.get();
    if (!config) {
      config = {
        inventoryStatuses: DEFAULT_INVENTORY_STATUSES,
        blendTolerance: 0.5,
      };
      await configStorage.save(config);
    }
    setStatuses(config.inventoryStatuses);
    return config.inventoryStatuses;
  }, []);

  const loadData = useCallback(async () => {
    const [data] = await Promise.all([inventoryStorage.getAll(), loadStatuses()]);
    setItems(data);
  }, [loadStatuses]);

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

  const saveStatusesToConfig = async (newStatuses: InventoryStatus[]) => {
    const config = await configStorage.get();
    const updated: AppConfig = {
      inventoryStatuses: newStatuses,
      blendTolerance: config?.blendTolerance ?? 0.5,
    };
    await configStorage.save(updated);
    setStatuses(newStatuses);
  };

  const resetForm = () => {
    setName("");
    setLot("");
    setInvStatus(statuses.length > 0 ? statuses[0] : null);
    setDescription("");
    setQuantity("");
    setEditingItem(null);
  };

  const openForm = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setName(item.name);
      setLot(item.lot);
      setInvStatus(item.status);
      setDescription(item.description);
      setQuantity(String(item.quantity));
    } else {
      setName("");
      setLot("");
      setInvStatus(statuses.length > 0 ? statuses[0] : null);
      setDescription("");
      setQuantity("");
      setEditingItem(null);
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Erro", "Informe o nome do material");
      return;
    }
    if (!invStatus) {
      Alert.alert("Erro", "Selecione um status");
      return;
    }
    const qty = parseFloat(quantity) || 0;
    if (editingItem) {
      await inventoryStorage.update({
        ...editingItem,
        name: name.trim(),
        lot: lot.trim(),
        status: invStatus,
        description: description.trim(),
        quantity: qty,
      });
    } else {
      await inventoryStorage.save({
        name: name.trim(),
        lot: lot.trim(),
        status: invStatus,
        description: description.trim(),
        quantity: qty,
      });
    }
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowForm(false);
    resetForm();
    loadData();
  };

  const handleDelete = (id: string) => {
    Alert.alert("Excluir", "Excluir este material?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          await inventoryStorage.delete(id);
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          loadData();
        },
      },
    ]);
  };

  const openStatusForm = (status?: InventoryStatus) => {
    if (status) {
      setEditingStatus(status);
      setStatusName(status.name);
      setStatusColor(status.color || PRESET_COLORS[0]);
    } else {
      setEditingStatus(null);
      setStatusName("");
      setStatusColor(PRESET_COLORS[0]);
    }
    setStatusFormVisible(true);
  };

  const handleSaveStatus = async () => {
    if (!statusName.trim()) {
      Alert.alert("Erro", "Informe o nome do status");
      return;
    }
    let newStatuses: InventoryStatus[];
    if (editingStatus) {
      newStatuses = statuses.map((s) =>
        s.id === editingStatus.id
          ? { ...s, name: statusName.trim(), color: statusColor }
          : s
      );
    } else {
      const newId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
      newStatuses = [
        ...statuses,
        { id: newId, name: statusName.trim(), color: statusColor },
      ];
    }
    await saveStatusesToConfig(newStatuses);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStatusFormVisible(false);
    setEditingStatus(null);
    setStatusName("");
    setStatusColor(PRESET_COLORS[0]);
  };

  const handleDeleteStatus = (status: InventoryStatus) => {
    const inUse = items.some((item) => item.status.id === status.id);
    if (inUse) {
      Alert.alert("Erro", "Este status esta sendo usado por itens do estoque. Remova ou altere o status dos itens antes de excluir.");
      return;
    }
    Alert.alert("Excluir Status", `Excluir o status "${status.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          const newStatuses = statuses.filter((s) => s.id !== status.id);
          await saveStatusesToConfig(newStatuses);
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const stColor = item.status.color || C.textMuted;
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
        onPress={() => openForm(item)}
      >
        <View style={styles.cardRow}>
          <Ionicons name="cube" size={20} color={C.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            {item.lot ? <Text style={styles.itemLot}>Lote: {item.lot}</Text> : null}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: stColor + "22" }]}>
            <Text style={[styles.statusText, { color: stColor }]}>{item.status.name}</Text>
          </View>
          <Pressable onPress={() => handleDelete(item.id)} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={C.danger} />
          </Pressable>
        </View>
        <View style={styles.qtyRow}>
          <Text style={styles.qtyLabel}>Quantidade:</Text>
          <Text style={styles.qtyValue}>{item.quantity}</Text>
        </View>
        {item.description ? (
          <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}
      </Pressable>
    );
  };

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Estoque</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowStatusManager(true);
            }}
            style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="settings-outline" size={22} color={C.textSecondary} />
          </Pressable>
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
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={48} color={C.textMuted} />
            <Text style={styles.emptyTitle}>Estoque vazio</Text>
            <Text style={styles.emptyText}>Adicione materiais para controlar o estoque</Text>
          </View>
        }
      />

      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItem ? "Editar Material" : "Novo Material"}
              </Text>
              <Pressable onPress={() => { setShowForm(false); resetForm(); }} hitSlop={8}>
                <Ionicons name="close" size={24} color={C.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Nome do Material</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ex: Minerio de ferro" placeholderTextColor={C.textMuted} />

              <Text style={styles.inputLabel}>Lote</Text>
              <TextInput style={styles.input} value={lot} onChangeText={setLot} placeholder="Numero do lote" placeholderTextColor={C.textMuted} />

              <Text style={styles.inputLabel}>Quantidade</Text>
              <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} placeholder="0" placeholderTextColor={C.textMuted} keyboardType="decimal-pad" />

              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.optionRow}>
                {statuses.map((s) => {
                  const selected = invStatus?.id === s.id;
                  const sColor = s.color || C.textMuted;
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => setInvStatus(s)}
                      style={[
                        styles.optionBtn,
                        selected && { backgroundColor: sColor + "33", borderColor: sColor },
                      ]}
                    >
                      <View style={[styles.colorDot, { backgroundColor: sColor }]} />
                      <Text style={[styles.optionText, selected && { color: sColor }]}>
                        {s.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Descricao</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Descricao do material"
                placeholderTextColor={C.textMuted}
                multiline
              />

              <Pressable onPress={handleSave} style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.8 }]}>
                <Text style={styles.saveBtnText}>Salvar</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showStatusManager} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gerenciar Status</Text>
              <Pressable onPress={() => setShowStatusManager(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={C.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {statuses.map((s) => {
                const sColor = s.color || C.textMuted;
                return (
                  <View key={s.id} style={styles.statusRow}>
                    <View style={[styles.statusColorIndicator, { backgroundColor: sColor }]} />
                    <Text style={styles.statusRowName}>{s.name}</Text>
                    <Pressable onPress={() => openStatusForm(s)} hitSlop={8} style={styles.statusAction}>
                      <Ionicons name="pencil-outline" size={18} color={C.accent} />
                    </Pressable>
                    <Pressable onPress={() => handleDeleteStatus(s)} hitSlop={8} style={styles.statusAction}>
                      <Ionicons name="trash-outline" size={18} color={C.danger} />
                    </Pressable>
                  </View>
                );
              })}

              {statuses.length === 0 && (
                <Text style={styles.emptyStatusText}>Nenhum status cadastrado</Text>
              )}

              <Pressable
                onPress={() => openStatusForm()}
                style={({ pressed }) => [styles.addStatusBtn, pressed && { opacity: 0.8 }]}
              >
                <Ionicons name="add-circle-outline" size={20} color={C.primary} />
                <Text style={styles.addStatusText}>Adicionar Status</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={statusFormVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.statusFormContainer, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingStatus ? "Editar Status" : "Novo Status"}
              </Text>
              <Pressable onPress={() => { setStatusFormVisible(false); setEditingStatus(null); }} hitSlop={8}>
                <Ionicons name="close" size={24} color={C.text} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Nome</Text>
              <TextInput
                style={styles.input}
                value={statusName}
                onChangeText={setStatusName}
                placeholder="Nome do status"
                placeholderTextColor={C.textMuted}
              />

              <Text style={styles.inputLabel}>Cor</Text>
              <View style={styles.colorGrid}>
                {PRESET_COLORS.map((color) => (
                  <Pressable
                    key={color}
                    onPress={() => setStatusColor(color)}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      statusColor === color && styles.colorOptionSelected,
                    ]}
                  >
                    {statusColor === color && (
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    )}
                  </Pressable>
                ))}
              </View>

              <View style={styles.colorPreview}>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {statusName || "Preview"}
                  </Text>
                </View>
              </View>

              <Pressable onPress={handleSaveStatus} style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.8 }]}>
                <Text style={styles.saveBtnText}>Salvar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 16,
  },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: C.text },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
    backgroundColor: C.surfaceElevated,
  },
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
  itemName: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: C.text },
  itemLot: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textSecondary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, marginLeft: 30 },
  qtyLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textSecondary },
  qtyValue: { fontSize: 16, fontFamily: "Inter_700Bold", color: C.text },
  itemDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textMuted, marginTop: 6, marginLeft: 30 },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: C.textSecondary, marginTop: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.textMuted, textAlign: "center", paddingHorizontal: 40 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalContainer: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "85%" },
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
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceElevated,
  },
  optionText: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.textSecondary },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  saveBtn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 24, marginBottom: 16 },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  statusRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.borderLight,
  },
  statusColorIndicator: { width: 16, height: 16, borderRadius: 8 },
  statusRowName: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", color: C.text },
  statusAction: { padding: 4 },
  emptyStatusText: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.textMuted, textAlign: "center", paddingVertical: 20 },
  addStatusBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    marginTop: 16, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: C.primary, borderStyle: "dashed",
  },
  addStatusText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.primary },
  statusFormContainer: {
    backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 4 },
  colorOption: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  colorOptionSelected: {
    borderWidth: 3, borderColor: "#fff",
  },
  colorPreview: { alignItems: "center", marginTop: 20 },
});
