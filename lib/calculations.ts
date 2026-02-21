import {
  OPERATIONAL_PARAMS,
  type SlagAnalysis,
  type LeitoDeFusao,
} from "./types";

const P = OPERATIONAL_PARAMS;

/* ============================
   UTILIDADES
============================ */

function safeNumber(n: number, fallback = 0): number {
  if (!isFinite(n) || isNaN(n)) return fallback;
  return n;
}

function percentToFraction(p: number): number {
  return safeNumber(p) / 100;
}

function normalizeAnalysis(a: SlagAnalysis) {
  return {
    cao: percentToFraction(a.cao),
    mgo: percentToFraction(a.mgo),
    siGusa: percentToFraction(a.siGusa),
    al2o3: percentToFraction(a.al2o3),
    ib: safeNumber(a.ib),
  };
}

/* ============================
   CÁLCULOS PRINCIPAIS
============================ */

export function calcGusaPerCharge(): number {
  const gusa =
    (safeNumber(P.pesoLaminaMinerio) * safeNumber(P.rendimentoFe)) /
    safeNumber(P.teorFeGusa);

  return safeNumber(gusa);
}

/*
  Volume de escória
  - Cinzas agora parametrizadas
  - Fator gusa/carga agora dinâmico
*/
export function calcSlagVolume(
  limestoneWeight: number,
  gusaPerCharge: number,
  cao: number,
  mgo: number
): number {
  const numerator =
    safeNumber(limestoneWeight) * safeNumber(P.rendimentoCalcario) +
    safeNumber(P.percentualCinzasEscoria);

  const denominator = safeNumber(cao + mgo) * safeNumber(gusaPerCharge);

  if (denominator === 0) return 0;

  return numerator / denominator;
}

export function calcAluminaAdjust(
  slagVolume: number,
  al2o3Fraction: number
): number {
  const alReal = safeNumber(slagVolume) * safeNumber(al2o3Fraction);
  const alMeta = safeNumber(slagVolume) * safeNumber(P.metaAl2O3Escoria);

  const deficit = alMeta - alReal;

  return deficit / safeNumber(P.rendimentoBauxita);
}

export function calcLimestoneAdjustBySilicon(
  siFraction: number
): { y: number; z: number } {
  const y =
    21.43 * safeNumber(P.metaSiGusa) -
    21.43 * safeNumber(siFraction);

  const z = y / safeNumber(P.rendimentoCalcario);

  return { y, z };
}

export function calcLimestoneAdjustByBasicity(
  slagVolume: number,
  cao: number,
  mgo: number,
  ibAnalyzed: number
): number {
  if (ibAnalyzed === 0 || P.ibMeta === 0) return 0;

  const caoMgo = safeNumber(cao + mgo);

  const adjustCaO =
    (safeNumber(slagVolume) * caoMgo) / safeNumber(P.ibMeta) -
    (safeNumber(slagVolume) * caoMgo) / safeNumber(ibAnalyzed);

  return adjustCaO / safeNumber(P.rendimentoCalcario);
}

export function calcCokeRate(
  cokeWeight: number,
  gusaPerCharge: number
): number {
  if (gusaPerCharge === 0) return 0;

  return (
    safeNumber(cokeWeight) * safeNumber(P.carbonoFixoCoque)
  ) / safeNumber(gusaPerCharge);
}

export function calcFuelAdjust(
  operationalBase: number,
  cokeRate: number
): number {
  return safeNumber(operationalBase) - safeNumber(cokeRate);
}

/* ============================
   ORQUESTRADOR PRINCIPAL
============================ */

export function calculateAll(
  leito: LeitoDeFusao,
  analysis: SlagAnalysis
) {
  const norm = normalizeAnalysis(analysis);

  const gusaPerCharge = calcGusaPerCharge();

  const slagVolume = calcSlagVolume(
    leito.limestone.weight,
    gusaPerCharge,
    norm.cao,
    norm.mgo
  );

  const bauxiteAdjust = calcAluminaAdjust(
    slagVolume,
    norm.al2o3
  );

  const { z: limestoneBySilicon } =
    calcLimestoneAdjustBySilicon(norm.siGusa);

  const limestoneByBasicity =
    calcLimestoneAdjustByBasicity(
      slagVolume,
      norm.cao,
      norm.mgo,
      norm.ib
    );

  const totalLimestoneAdjust =
    limestoneBySilicon + limestoneByBasicity;

  const cokeRate = calcCokeRate(
    leito.fuel.cokeWeight,
    gusaPerCharge
  );

  const fuelAdjust = calcFuelAdjust(
    leito.fuel.operationalBase,
    cokeRate
  );

  return {
    gusaPerCharge,
    slagVolume,
    limestoneAdjust: totalLimestoneAdjust,
    bauxiteAdjust,
    fuelAdjust,
    cokeRate,
  };
}
