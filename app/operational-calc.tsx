import React, { useState, useEffect } from "react";
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
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { leitoStorage, operationalStorage } from "@/lib/storage";
import { calculateAll } from "@/lib/calculations";
import type { LeitoDeFusao, SlagAnalysis } from "@/lib/types";

const C = Colors.dark;

export default function OperationalCalcScreen() {
  const insets = useSafeAreaInsets();
  const [leitos, setLeitos] = useState<LeitoDeFusao[]>([]);
  const [selectedLeitoId, setSelectedLeitoId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  const [sio2, setSio2] = useState("");
  const [al2o3, setAl2o3] = useState("");
  const [cao, setCao] = useState("");
  const [mgo, setMgo] = useState("");
  const [feo, setFeo] = useState("");
  const [mno, setMno] = useState("");
  const [ib, setIb] = useState("");
  const [if_, setIf] = useState("");
  const [siGusa, setSiGusa] = useState("");
  const [closure, setClosure] = useState("");

  const [results, setResults] = useState<{
    gusaPerCharge: number;
    slagVolume: number;
    limestoneAdjust: number;
    bauxiteAdjust: number;
    fuelAdjust: number;
    cokeRate: number;
  } | null>(null);

  useEffect(() => {
    loadLeitos();
  }, []);

  const loadLeitos = async () => {
    const all = await leitoStorage.getAll();
    const applied = all.filter((l) => l.status === "applied");
    setLeitos(applied);
    if (applied.length > 0) {
      setSelectedLeitoId(applied[0].id);
    }
  };

  const handleCalculate = () => {
    if (!selectedLeitoId) {
      Alert.alert("Erro", "Selecione um leito aplicado");
      return;
    }

    const leito = leitos.find((l) => l.id === selectedLeitoId);
    if (!leito) return;

    const parseValue = (val: string) => {
      const parsed = parseFloat(val.replace(",", ".")) || 0;
      return parseFloat(parsed.toFixed(3));
    };

    const analysis: SlagAnalysis = {
      sio2: parseValue(sio2),
      al2o3: parseValue(al2o3),
      cao: parseValue(cao),
      mgo: parseValue(mgo),
      feo: parseValue(feo),
      mno: parseValue(mno),
      ib: parseValue(ib),
      if_: parseValue(if_),
      siGusa: parseValue(siGusa),
      closure: parseValue(closure),
    };

    const calc = calculateAll(leito, analysis);
    setResults(calc);
    setShowResults(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const handleSaveRecord = async () => {
    if (!results || !selectedLeitoId) return;

    const leito = leitos.find((l) => l.id === selectedLeitoId);
    if (!leito) return;

    const parseValue = (val: string) => {
      const parsed = parseFloat(val.replace(",", ".")) || 0;
      return parseFloat(parsed.toFixed(3));
    };

    const analysis: SlagAnalysis = {
      sio2: parseValue(sio2),
      al2o3: parseValue(al2o3),
      cao: parseValue(cao),
      mgo: parseValue(mgo),
      feo: parseValue(feo),
      mno: parseValue(mno),
      ib: parseValue(ib),
      if_: parseValue(if_),
      siGusa: parseValue(siGusa),
      closure: parseValue(closure),
    };

    await operationalStorage.save({
      date: new Date().toISOString(),
      leito: leito,
      analysis,
      results: { ...results, slagMass: results.slagVolume },
    });

    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const selectedLeito = leitos.find((l) => l.id === selectedLeitoId);
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={26} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Calculo Operacional</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Selecionar Leito Aplicado</Text>
        {leitos.length === 0 ? (
          <Text style={styles.noLeitos}>
            Nenhum leito com status "Aplicado" encontrado
          </Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.leitoScroll}>
            {leitos.map((leito) => (
              <Pressable
                key={leito.id}
                onPress={() => setSelectedLeitoId(leito.id)}
                style={[
                  styles.leitoChip,
                  selectedLeitoId === leito.id && styles.leitoChipActive,
                ]}
              >
                <Ionicons
                  name="flame"
                  size={14}
                  color={selectedLeitoId === leito.id ? C.primary : C.textMuted}
                />
                <Text
                  style={[
                    styles.leitoChipText,
                    selectedLeitoId === leito.id && styles.leitoChipTextActive,
                  ]}
                >
                  {leito.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {selectedLeito && (
          <View style={styles.leitoInfo}>
            <Text style={styles.leitoInfoText}>
              Calcario: {selectedLeito.limestone.weight} kg | Coque: {selectedLeito.fuel.cokeWeight} kg | Base: {selectedLeito.fuel.operationalBase}
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Analise da Escoria</Text>

        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>SiO2 (%)</Text>
            <TextInput style={styles.fieldInput} value={sio2} onChangeText={setSio2} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={C.textMuted} />
          </View>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>Al2O3 (%)</Text>
            <TextInput style={styles.fieldInput} value={al2o3} onChangeText={setAl2o3} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={C.textMuted} />
          </View>
        </View>

        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>CaO (%)</Text>
            <TextInput style={styles.fieldInput} value={cao} onChangeText={setCao} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={C.textMuted} />
          </View>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>MgO (%)</Text>
            <TextInput style={styles.fieldInput} value={mgo} onChangeText={setMgo} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={C.textMuted} />
          </View>
        </View>

        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>FeO (%)</Text>
            <TextInput style={styles.fieldInput} value={feo} onChangeText={setFeo} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={C.textMuted} />
          </View>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>MnO (%)</Text>
            <TextInput style={styles.fieldInput} value={mno} onChangeText={setMno} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={C.textMuted} />
          </View>
        </View>

        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>IB</Text>
            <TextInput style={styles.fieldInput} value={ib} onChangeText={setIb} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={C.textMuted} />
          </View>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>IF</Text>
            <TextInput style={styles.fieldInput} value={if_} onChangeText={setIf} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={C.textMuted} />
          </View>
        </View>

        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>Si (% gusa)</Text>
            <TextInput style={styles.fieldInput} value={siGusa} onChangeText={setSiGusa} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={C.textMuted} />
          </View>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>Fechamento (%)</Text>
            <TextInput style={styles.fieldInput} value={closure} onChangeText={setClosure} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={C.textMuted} />
          </View>
        </View>

        <Pressable
          onPress={handleCalculate}
          style={({ pressed }) => [styles.calcBtn, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="calculator" size={20} color="#fff" />
          <Text style={styles.calcBtnText}>Calcular Correcoes</Text>
        </Pressable>

        {showResults && results && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>Resultados</Text>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Gusa por carga</Text>
              <Text style={styles.resultValue}>{results.gusaPerCharge.toFixed(1)} kg</Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Volume de escoria</Text>
              <Text style={styles.resultValue}>{results.slagVolume.toFixed(2)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Correcao Calcario</Text>
              <View style={styles.resultBadge}>
                <Ionicons
                  name={results.limestoneAdjust < 0 ? "add-circle" : results.limestoneAdjust > 0 ? "remove-circle" : "ellipse"}
                  size={16}
                  color={results.limestoneAdjust < 0 ? C.success : results.limestoneAdjust > 0 ? C.danger : C.textMuted}
                />
                <Text
                  style={[
                    styles.resultValueBig,
                    {
                      color: results.limestoneAdjust < 0 ? C.success : results.limestoneAdjust > 0 ? C.danger : C.text,
                    },
                  ]}
                >
                  {Math.abs(results.limestoneAdjust).toFixed(1)} kg
                </Text>
                <Text style={styles.resultAction}>
                  {results.limestoneAdjust < 0 ? "Adicionar" : results.limestoneAdjust > 0 ? "Remover" : "OK"}
                </Text>
              </View>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Correcao Bauxita</Text>
              <View style={styles.resultBadge}>
                <Ionicons name="add-circle" size={16} color={C.warning} />
                <Text style={[styles.resultValueBig, { color: C.warning }]}>
                  {results.bauxiteAdjust.toFixed(1)} kg
                </Text>
                <Text style={styles.resultAction}>Adicionar</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Coke Rate</Text>
              <Text style={styles.resultValue}>{results.cokeRate.toFixed(2)}</Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Ajuste de Fator</Text>
              <Text
                style={[
                  styles.resultValueBig,
                  {
                    color: results.fuelAdjust > 0 ? C.success : results.fuelAdjust < 0 ? C.danger : C.text,
                  },
                ]}
              >
                {results.fuelAdjust > 0 ? "+" : ""}{results.fuelAdjust.toFixed(2)}
              </Text>
            </View>

            <Pressable
              onPress={handleSaveRecord}
              style={({ pressed }) => [styles.saveRecordBtn, pressed && { opacity: 0.8 }]}
            >
              <Ionicons name="save" size={18} color="#fff" />
              <Text style={styles.saveRecordText}>Salvar no Historico</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: C.text },
  body: { flex: 1, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: C.primary,
    marginTop: 20,
    marginBottom: 10,
  },
  noLeitos: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
    textAlign: "center",
    padding: 20,
  },
  leitoScroll: { marginBottom: 8 },
  leitoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.surfaceElevated,
    borderWidth: 1,
    borderColor: C.borderLight,
    marginRight: 8,
  },
  leitoChipActive: {
    backgroundColor: C.primary + "22",
    borderColor: C.primary,
  },
  leitoChipText: { fontSize: 14, fontFamily: "Inter_500Medium", color: C.textSecondary },
  leitoChipTextActive: { color: C.primary },
  leitoInfo: {
    backgroundColor: C.surfaceElevated,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  leitoInfoText: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textSecondary },
  fieldRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  fieldHalf: { flex: 1 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: C.textMuted, marginBottom: 4 },
  fieldInput: {
    backgroundColor: C.surfaceElevated,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.text,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  calcBtn: {
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  calcBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  resultsCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 18,
    marginTop: 20,
    borderWidth: 1,
    borderColor: C.primary + "44",
  },
  resultsTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: C.text,
    marginBottom: 14,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  resultLabel: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.textSecondary },
  resultValue: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.text },
  resultBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  resultValueBig: { fontSize: 17, fontFamily: "Inter_700Bold", color: C.text },
  resultAction: { fontSize: 11, fontFamily: "Inter_500Medium", color: C.textMuted },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 8,
  },
  saveRecordBtn: {
    backgroundColor: C.success,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  saveRecordText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
});
