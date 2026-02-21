// ======================
// Tipos Base
// ======================

export type Decimal = number;

// ======================
// Composição Química
// ======================

export interface OreChemistry {
  fe: Decimal;
  sio2: Decimal;
  al2o3: Decimal;
  mn: Decimal;
  p: Decimal;
}

// ======================
// Minério no Blend
// ======================

export interface OreComposition {
  id: string;
  name: string;

  // Percentual deste minério no leito
  blendPercentage: Decimal;

  // Composição química do minério
  chemistry: OreChemistry;
}

// ======================
// Média Química do Leito
// ======================

export interface LeitoChemistryAverage {
  fe: Decimal;
  sio2: Decimal;
  al2o3: Decimal;
  mn: Decimal;
  p: Decimal;
}

// ======================
// Validação do Blend
// ======================

export interface BlendValidation {
  totalPercentage: Decimal;
  isValid: boolean;
  tolerance: Decimal; // Exemplo: 0.5 (%)
}

// ======================
// Leito de Fusão
// ======================

export interface LeitoDeFusao {
  id: string;
  name: string;
  version: number;
  createdAt: string;

  status: "simulated" | "applied";

  ores: OreComposition[];

  // Média química calculada automaticamente
  chemistryAverage?: LeitoChemistryAverage;

  blendValidation: BlendValidation;

  limestone: {
    weight: Decimal;
    caoYield: Decimal;
  };

  bauxite: {
    weight: Decimal;
    al2o3Content: Decimal;
  };

  fuel: {
    operationalBase: Decimal;
    cokeWeight: Decimal;
  };

  scrap: Decimal;
}

// ======================
// Análise de Escória
// ======================

export interface SlagAnalysis {
  sio2: Decimal;
  al2o3: Decimal;
  cao: Decimal;
  mgo: Decimal;
  feo: Decimal;
  mno: Decimal;
  ib: Decimal;
  if_: Decimal;

  // Silício no gusa
  siGusa: Decimal;

  closure: Decimal;
}

// ======================
// Registro Operacional
// ======================

export interface OperationalRecord {
  id: string;
  date: string;

  // Snapshot completo do leito utilizado
  leitoSnapshot: LeitoDeFusao;

  analysis: SlagAnalysis;

  results: {
    gusaPerCharge: Decimal;
    slagMass: Decimal;
    limestoneAdjust: Decimal;
    bauxiteAdjust: Decimal;
    fuelAdjust: Decimal;
    cokeRate: Decimal;
  };
}

// ======================
// Pessoas
// ======================

export type PresenceStatus =
  | "presente"
  | "falta"
  | "afastado"
  | "suspenso";

export interface Person {
  id: string;
  name: string;
  role: string;
  status: PresenceStatus;
  observation: string;
  date: string;
}

// ======================
// Tarefas
// ======================

export type TaskPriority = "baixa" | "media" | "alta";
export type TaskStatus = "pendente" | "andamento" | "concluida";

export interface Task {
  id: string;
  title: string;
  description: string;
  sector: string;
  priority: TaskPriority;
  status: TaskStatus;
  responsible: string;
  createdAt: string;
}

// ======================
// Estoque - Status Dinâmico
// ======================

export interface InventoryStatus {
  id: string;
  name: string;
  color?: string;
}

// ======================
// Item de Estoque
// ======================

export interface InventoryItem {
  id: string;
  name: string;
  lot: string;
  status: InventoryStatus;
  description: string;
  quantity: Decimal;
}

// ======================
// Configuração Global do App
// ======================

export interface AppConfig {
  inventoryStatuses: InventoryStatus[];
  blendTolerance: Decimal;
}

// ======================
// Parâmetros Operacionais
// ======================

export interface OperationalParams {
  metaSiGusa: Decimal;
  metaAl2O3Escoria: Decimal;
  pesoLaminaMinerio: Decimal;
  rendimentoFe: Decimal;
  teorFeGusa: Decimal;
  ibMeta: Decimal;
  rendimentoCalcario: Decimal;
  rendimentoBauxita: Decimal;
  carbonoFixoCoque: Decimal;
  percentualCinzasEscoria: Decimal;
}

// ======================
// Valores Padrão Operacionais
// ======================

export const OPERATIONAL_PARAMS: OperationalParams = {
  metaSiGusa: 0.1,
  metaAl2O3Escoria: 0.14,
  pesoLaminaMinerio: 2200,
  rendimentoFe: 0.6,
  teorFeGusa: 0.95,
  ibMeta: 0.85,
  rendimentoCalcario: 0.52,
  rendimentoBauxita: 0.45,
  carbonoFixoCoque: 0.73,
  percentualCinzasEscoria: 7,
};

// ======================
// Default Inventory Statuses
// ======================

export const DEFAULT_INVENTORY_STATUSES: InventoryStatus[] = [
  { id: "disponivel", name: "Disponivel", color: "#22C55E" },
  { id: "reservado", name: "Reservado", color: "#F59E0B" },
  { id: "esgotado", name: "Esgotado", color: "#EF4444" },
  { id: "em_analise", name: "Em analise", color: "#3B82F6" },
  { id: "quarentena", name: "Quarentena", color: "#9333EA" },
];
