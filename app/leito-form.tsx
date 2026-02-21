import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import Colors from "@/constants/colors";
import { leitoStorage } from "@/lib/storage";
import type {
  OreComposition,
  LeitoDeFusao,
  OreChemistry,
  LeitoChemistryAverage,
  BlendValidation,
} from "@/lib/types";

const C = Colors.dark;

const BLEND_TOLERANCE = 0.5;

function generateOreId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

const emptyOre = (): OreComposition => ({
  id: generateOreId(),
  name: "",
  blendPercentage: 0,
  chemistry: { fe: 0, sio2: 0, al2o3: 0, mn: 0, p: 0 },
});

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function parseNumericInput(value: string, min: number, max: number): number {
  const normalizedValue = value.replace(",", ".");
  const parsed = parseFloat(normalizedValue);
  if (isNaN(parsed)) return 0;
  const clamped = clamp(parsed, min, max);
  return parseFloat(clamped.toFixed(3));
}

function computeChemistryAverage(ores: OreComposition[]): LeitoChemistryAverage {
  const totalBlend = ores.reduce((sum, o) => sum + o.blendPercentage, 0);
  if (totalBlend === 0) return { fe: 0, sio2: 0, al2o3: 0, mn: 0, p: 0 };
  const keys: (keyof OreChemistry)[] = ["fe", "sio2", "al2o3", "mn", "p"];
  const avg: Record<string, number> = {};
  for (const key of keys) {
    avg[key] = ores.reduce((sum, o) => sum + o.chemistry[key] * o.blendPercentage, 0) / totalBlend;
  }
  return avg as LeitoChemistryAverage;
}

function computeBlendValidation(ores: OreComposition[]): BlendValidation {
  const totalPercentage = ores.reduce((sum, o) => sum + o.blendPercentage, 0);
  const isValid = Math.abs(totalPercentage - 100) <= BLEND_TOLERANCE;
  return { totalPercentage, isValid, tolerance: BLEND_TOLERANCE };
}

function getBlendBarColor(total: number): string {
  if (total >= 99.5 && total <= 100.5) return C.success;
  if ((total >= 95 && total < 99.5) || (total > 100.5 && total <= 105)) return C.warning;
  return C.danger;
}

export default function LeitoFormScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const [name, setName] = useState("");
  const [version, setVersion] = useState(1);
  const [status, setStatus] = useState<"simulated" | "applied">("simulated");
  const [ores, setOres] = useState<OreComposition[]>([emptyOre()]);
  const [limestoneWeight, setLimestoneWeight] = useState("");
  const [limestoneCaoYield, setLimestoneCaoYield] = useState("52");
  const [bauxiteWeight, setBauxiteWeight] = useState("");
  const [bauxiteAl2o3, setBauxiteAl2o3] = useState("45");
  const [operationalBase, setOperationalBase] = useState("");
  const [cokeWeight, setCokeWeight] = useState("");
  const [scrap, setScrap] = useState("");

  useEffect(() => {
    if (isEditing) {
      loadLeito();
    }
  }, [id]);

  const loadLeito = async () => {
    const all = await leitoStorage.getAll();
    const leito = all.find((l) => l.id === id);
    if (leito) {
      setName(leito.name);
      setVersion(leito.version);
      setStatus(leito.status);
      setOres(leito.ores.length > 0 ? leito.ores : [emptyOre()]);
      setLimestoneWeight(String(leito.limestone.weight));
      setLimestoneCaoYield(String(leito.limestone.caoYield));
      setBauxiteWeight(String(leito.bauxite.weight));
      setBauxiteAl2o3(String(leito.bauxite.al2o3Content));
      setOperationalBase(String(leito.fuel.operationalBase));
      setCokeWeight(String(leito.fuel.cokeWeight));
      setScrap(String(leito.scrap));
    }
  };

  const blendValidation = useMemo(() => computeBlendValidation(ores), [ores]);
  const chemistryAverage = useMemo(() => computeChemistryAverage(ores), [ores]);
  const blendBarColor = useMemo(() => getBlendBarColor(blendValidation.totalPercentage), [blendValidation.totalPercentage]);
  const blendBarWidth = useMemo(() => Math.min(blendValidation.totalPercentage, 110) / 110 * 100, [blendValidation.totalPercentage]);

  const updateOreName = (index: number, value: string) => {
    setOres((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], name: value };
      return updated;
    });
  };

  const updateOreBlend = (index: number, value: string) => {
    setOres((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        blendPercentage: parseNumericInput(value, 0, 100),
      };
      return updated;
    });
  };

  const updateOreChemistry = (index: number, field: keyof OreChemistry, value: string) => {
    setOres((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        chemistry: {
          ...updated[index].chemistry,
          [field]: parseNumericInput(value, 0, 100),
        },
      };
      return updated;
    });
  };

  const addOre = () => {
    setOres((prev) => [...prev, emptyOre()]);
  };

  const removeOre = (index: number) => {
    if (ores.length <= 1) return;
    setOres((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCapture = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled) {
      Alert.alert(
        "Imagem Capturada",
        "A funcionalidade de OCR para leitura automatica de tabelas sera implementada em uma versao futura. Por enquanto, insira os dados manualmente."
      );
    }
  };

  const handleGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled) {
      Alert.alert(
        "Imagem Selecionada",
        "A funcionalidade de OCR para leitura automatica de tabelas sera implementada em uma versao futura. Por enquanto, insira os dados manualmente."
      );
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Erro", "Informe o nome do leito");
      return;
    }

    const finalChemistryAverage = computeChemistryAverage(ores);
    const finalBlendValidation = computeBlendValidation(ores);

    const leitoData = {
      name: name.trim(),
      createdAt: new Date().toISOString(),
      status,
      ores,
      chemistryAverage: finalChemistryAverage,
      blendValidation: finalBlendValidation,
      limestone: {
        weight: parseNumericInput(limestoneWeight, 0, Infinity),
        caoYield: parseNumericInput(limestoneCaoYield, 0, 100),
      },
      bauxite: {
        weight: parseNumericInput(bauxiteWeight, 0, Infinity),
        al2o3Content: parseNumericInput(bauxiteAl2o3, 0, 100),
      },
      fuel: {
        operationalBase: parseNumericInput(operationalBase, 0, Infinity),
        cokeWeight: parseNumericInput(cokeWeight, 0, Infinity),
      },
      scrap: parseNumericInput(scrap, 0, Infinity),
    };

    if (isEditing) {
      await leitoStorage.update({ ...leitoData, id: id!, version } as LeitoDeFusao);
    } else {
      await leitoStorage.save(leitoData);
    }

    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={26} color={C.text} />
        </Pressable>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>
            {isEditing ? "Editar Leito" : "Novo Leito"}
          </Text>
          {isEditing && (
            <View style={styles.versionBadge}>
              <Text style={styles.versionBadgeText}>v{version}</Text>
            </View>
          )}
        </View>
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [styles.saveHeaderBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="checkmark" size={26} color={C.primary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.scanRow}>
          <Pressable
            onPress={handleCapture}
            style={({ pressed }) => [styles.scanBtn, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="camera" size={20} color={C.accent} />
            <Text style={styles.scanBtnText}>Capturar</Text>
          </Pressable>
          <Pressable
            onPress={handleGallery}
            style={({ pressed }) => [styles.scanBtn, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="images" size={20} color={C.accent} />
            <Text style={styles.scanBtnText}>Galeria</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Identificacao</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Nome do leito"
          placeholderTextColor={C.textMuted}
        />

        <Text style={styles.inputLabel}>Status</Text>
        <View style={styles.statusRow}>
          <Pressable
            onPress={() => setStatus("simulated")}
            style={[
              styles.statusBtn,
              status === "simulated" && { backgroundColor: C.warning + "33", borderColor: C.warning },
            ]}
          >
            <Text style={[styles.statusBtnText, status === "simulated" && { color: C.warning }]}>
              Simulado
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setStatus("applied")}
            style={[
              styles.statusBtn,
              status === "applied" && { backgroundColor: C.success + "33", borderColor: C.success },
            ]}
          >
            <Text style={[styles.statusBtnText, status === "applied" && { color: C.success }]}>
              Aplicado
            </Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Minerios</Text>
          <Pressable onPress={addOre} style={styles.addOreBtn}>
            <Ionicons name="add-circle" size={24} color={C.primary} />
          </Pressable>
        </View>

        {ores.map((ore, index) => (
          <View key={ore.id} style={styles.oreCard}>
            <View style={styles.oreHeader}>
              <Text style={styles.oreIndex}>Minerio {index + 1}</Text>
              {ores.length > 1 && (
                <Pressable onPress={() => removeOre(index)} hitSlop={8}>
                  <Ionicons name="close-circle" size={22} color={C.danger} />
                </Pressable>
              )}
            </View>
            <TextInput
              style={styles.input}
              value={ore.name}
              onChangeText={(v) => updateOreName(index, v)}
              placeholder="Nome do minerio"
              placeholderTextColor={C.textMuted}
            />
            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Text style={styles.fieldLabel}>% Leito</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={ore.blendPercentage ? String(ore.blendPercentage) : ""}
                  onChangeText={(v) => updateOreBlend(index, v)}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={C.textMuted}
                />
              </View>
              <View style={styles.fieldHalf}>
                <Text style={styles.fieldLabel}>Fe %</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={ore.chemistry.fe ? String(ore.chemistry.fe) : ""}
                  onChangeText={(v) => updateOreChemistry(index, "fe", v)}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={C.textMuted}
                />
              </View>
            </View>
            <View style={styles.fieldRow}>
              <View style={styles.fieldThird}>
                <Text style={styles.fieldLabel}>SiO2 %</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={ore.chemistry.sio2 ? String(ore.chemistry.sio2) : ""}
                  onChangeText={(v) => updateOreChemistry(index, "sio2", v)}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={C.textMuted}
                />
              </View>
              <View style={styles.fieldThird}>
                <Text style={styles.fieldLabel}>Al2O3 %</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={ore.chemistry.al2o3 ? String(ore.chemistry.al2o3) : ""}
                  onChangeText={(v) => updateOreChemistry(index, "al2o3", v)}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={C.textMuted}
                />
              </View>
              <View style={styles.fieldThird}>
                <Text style={styles.fieldLabel}>Mn %</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={ore.chemistry.mn ? String(ore.chemistry.mn) : ""}
                  onChangeText={(v) => updateOreChemistry(index, "mn", v)}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={C.textMuted}
                />
              </View>
            </View>
            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Text style={styles.fieldLabel}>P %</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={ore.chemistry.p ? String(ore.chemistry.p) : ""}
                  onChangeText={(v) => updateOreChemistry(index, "p", v)}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={C.textMuted}
                />
              </View>
            </View>
          </View>
        ))}

        <View style={styles.blendCard}>
          <Text style={styles.blendTitle}>Validacao do Blend</Text>
          <View style={styles.blendBarContainer}>
            <View style={styles.blendBarTrack}>
              <View
                style={[
                  styles.blendBarFill,
                  {
                    width: `${blendBarWidth}%` as const,
                    backgroundColor: blendBarColor,
                  },
                ]}
              />
            </View>
            <Text style={[styles.blendPercentText, { color: blendBarColor }]}>
              {blendValidation.totalPercentage.toFixed(1)}%
            </Text>
          </View>
          {!blendValidation.isValid && (
            <View style={styles.blendWarningRow}>
              <Ionicons name="warning" size={16} color={C.warning} />
              <Text style={styles.blendWarningText}>
                {blendValidation.totalPercentage < 100
                  ? `Faltam ${(100 - blendValidation.totalPercentage).toFixed(1)}% para completar o blend`
                  : `Blend excede em ${(blendValidation.totalPercentage - 100).toFixed(1)}%`}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.averageCard}>
          <Text style={styles.averageTitle}>Media Ponderada</Text>
          <View style={styles.averageGrid}>
            <View style={styles.averageItem}>
              <Text style={styles.averageLabel}>Fe</Text>
              <Text style={styles.averageValue}>{chemistryAverage.fe.toFixed(2)}%</Text>
            </View>
            <View style={styles.averageItem}>
              <Text style={styles.averageLabel}>SiO2</Text>
              <Text style={styles.averageValue}>{chemistryAverage.sio2.toFixed(2)}%</Text>
            </View>
            <View style={styles.averageItem}>
              <Text style={styles.averageLabel}>Al2O3</Text>
              <Text style={styles.averageValue}>{chemistryAverage.al2o3.toFixed(2)}%</Text>
            </View>
            <View style={styles.averageItem}>
              <Text style={styles.averageLabel}>Mn</Text>
              <Text style={styles.averageValue}>{chemistryAverage.mn.toFixed(2)}%</Text>
            </View>
            <View style={styles.averageItem}>
              <Text style={styles.averageLabel}>P</Text>
              <Text style={styles.averageValue}>{chemistryAverage.p.toFixed(2)}%</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Calcario</Text>
        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>Peso (kg)</Text>
            <TextInput
              style={styles.fieldInput}
              value={limestoneWeight}
              onChangeText={setLimestoneWeight}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={C.textMuted}
            />
          </View>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>Rend. CaO (%)</Text>
            <TextInput
              style={styles.fieldInput}
              value={limestoneCaoYield}
              onChangeText={setLimestoneCaoYield}
              keyboardType="decimal-pad"
              placeholder="52"
              placeholderTextColor={C.textMuted}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Bauxita</Text>
        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>Peso (kg)</Text>
            <TextInput
              style={styles.fieldInput}
              value={bauxiteWeight}
              onChangeText={setBauxiteWeight}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={C.textMuted}
            />
          </View>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>Teor Al2O3 (%)</Text>
            <TextInput
              style={styles.fieldInput}
              value={bauxiteAl2o3}
              onChangeText={setBauxiteAl2o3}
              keyboardType="decimal-pad"
              placeholder="45"
              placeholderTextColor={C.textMuted}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Combustivel</Text>
        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>Base Operacional</Text>
            <TextInput
              style={styles.fieldInput}
              value={operationalBase}
              onChangeText={setOperationalBase}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={C.textMuted}
            />
          </View>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>Peso Coque (kg)</Text>
            <TextInput
              style={styles.fieldInput}
              value={cokeWeight}
              onChangeText={setCokeWeight}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={C.textMuted}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Sucata</Text>
        <TextInput
          style={styles.input}
          value={scrap}
          onChangeText={setScrap}
          keyboardType="decimal-pad"
          placeholder="Peso sucata (kg)"
          placeholderTextColor={C.textMuted}
        />

        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.saveBtnText}>
            {isEditing ? "Atualizar Leito" : "Salvar Leito"}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: C.text },
  versionBadge: {
    backgroundColor: C.accent + "33",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  versionBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: C.accent,
  },
  saveHeaderBtn: { width: 40, height: 40, alignItems: "center" as const, justifyContent: "center" as const },
  body: { flex: 1, paddingHorizontal: 16 },
  scanRow: { flexDirection: "row" as const, gap: 12, marginTop: 16, marginBottom: 8 },
  scanBtn: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    backgroundColor: C.surfaceElevated,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: C.accent + "44",
  },
  scanBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.accent },
  sectionHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: C.primary,
    marginTop: 20,
    marginBottom: 10,
  },
  addOreBtn: { marginTop: 20 },
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
  inputLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: C.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  statusRow: { flexDirection: "row" as const, gap: 10 },
  statusBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceElevated,
    alignItems: "center" as const,
  },
  statusBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.textSecondary },
  oreCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  oreHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 10,
  },
  oreIndex: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.textSecondary },
  fieldRow: { flexDirection: "row" as const, gap: 10, marginTop: 8 },
  fieldHalf: { flex: 1 },
  fieldThird: { flex: 1 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: C.textMuted, marginBottom: 4 },
  fieldInput: {
    backgroundColor: C.surfaceHighlight,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.text,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  blendCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  blendTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: C.text,
    marginBottom: 12,
  },
  blendBarContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  blendBarTrack: {
    flex: 1,
    height: 10,
    backgroundColor: C.surfaceHighlight,
    borderRadius: 5,
    overflow: "hidden" as const,
  },
  blendBarFill: {
    height: 10,
    borderRadius: 5,
  },
  blendPercentText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    minWidth: 55,
    textAlign: "right" as const,
  },
  blendWarningRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginTop: 10,
  },
  blendWarningText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: C.warning,
  },
  averageCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: C.primary + "44",
  },
  averageTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: C.primary,
    marginBottom: 12,
  },
  averageGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
  },
  averageItem: {
    backgroundColor: C.surfaceElevated,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 80,
    flex: 1,
    alignItems: "center" as const,
  },
  averageLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: C.textMuted,
    marginBottom: 4,
  },
  averageValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  saveBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center" as const,
    marginTop: 30,
    marginBottom: 20,
  },
  saveBtnText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff" },
});
