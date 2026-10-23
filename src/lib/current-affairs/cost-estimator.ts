/**
 * TNPSC99 Current Affairs Operating Cost & Token Usage Estimator
 * Replaces fixed flat backfill estimates (e.g. ₹58.50) with precise,
 * measured token/API usage and cloud infrastructure costing.
 */

export interface TokenUsageMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  rawTextCharacters: number;
  documentCount: number;
  factCount: number;
}

export interface OperatingCostBreakdown {
  currency: 'INR' | 'USD';
  inrExchangeRate: number; // e.g. 84.00 INR per USD
  aiInferenceCostUSD: number;
  aiInferenceCostINR: number;
  firestoreOperationsCostUSD: number;
  firestoreOperationsCostINR: number;
  storageAndEgressCostUSD: number;
  storageAndEgressCostINR: number;
  totalCostUSD: number;
  totalCostINR: number;
  isDeterministicFreeExecution: boolean;
  failClosedLimitUSD: number;
  isWithinBudget: boolean;
}

export interface CostCalculationOptions {
  aiModel?: 'none' | 'gemini_1.5_flash' | 'gemini_1.5_pro';
  inrExchangeRate?: number;
  failClosedLimitUSD?: number; // Fail pipeline if projected/measured cost exceeds this
  firestoreWrites?: number;
  firestoreReads?: number;
  storageBytes?: number;
}

// Current Cloud Pricing Constants
const PRICING = {
  USD_TO_INR: 84.00,
  FAIL_CLOSED_MAX_BUDGET_USD: 1.00, // ₹84.00 hard limit
  GEMINI_1_5_FLASH: {
    inputPer1MTokensUSD: 0.075,
    outputPer1MTokensUSD: 0.30,
  },
  GEMINI_1_5_PRO: {
    inputPer1MTokensUSD: 1.25,
    outputPer1MTokensUSD: 5.00,
  },
  FIRESTORE: {
    writePer100kUSD: 0.18, // $0.0000018 per write
    readPer100kUSD: 0.06,  // $0.0000006 per read
    storagePerGiBMonthUSD: 0.18,
  },
};

/**
 * Estimates token counts from raw document texts using standard ratio (approx 4 chars/token).
 */
export function estimateTokensFromTexts(
  texts: string[],
  outputStatementsCount: number = 0
): TokenUsageMetrics {
  const totalChars = texts.reduce((acc, t) => acc + (t ? t.length : 0), 0);
  // Rule of thumb: ~4 characters per token for English/technical; Tamil is ~2.5-3 chars per token
  const estimatedPromptTokens = Math.ceil(totalChars / 3.5);
  // Average factual statement ~ 30 tokens
  const estimatedCompletionTokens = outputStatementsCount * 30;

  return {
    promptTokens: estimatedPromptTokens,
    completionTokens: estimatedCompletionTokens,
    totalTokens: estimatedPromptTokens + estimatedCompletionTokens,
    rawTextCharacters: totalChars,
    documentCount: texts.length,
    factCount: outputStatementsCount,
  };
}

/**
 * Calculates itemized operating cost and enforces fail-closed budget caps.
 */
export function calculateOperatingCost(
  metrics: TokenUsageMetrics,
  options: CostCalculationOptions = {}
): OperatingCostBreakdown {
  const model = options.aiModel || 'none';
  const exchangeRate = options.inrExchangeRate || PRICING.USD_TO_INR;
  const failClosedLimitUSD = options.failClosedLimitUSD || PRICING.FAIL_CLOSED_MAX_BUDGET_USD;

  let aiInferenceCostUSD = 0;
  if (model === 'gemini_1.5_flash') {
    aiInferenceCostUSD = 
      (metrics.promptTokens / 1_000_000) * PRICING.GEMINI_1_5_FLASH.inputPer1MTokensUSD +
      (metrics.completionTokens / 1_000_000) * PRICING.GEMINI_1_5_FLASH.outputPer1MTokensUSD;
  } else if (model === 'gemini_1.5_pro') {
    aiInferenceCostUSD = 
      (metrics.promptTokens / 1_000_000) * PRICING.GEMINI_1_5_PRO.inputPer1MTokensUSD +
      (metrics.completionTokens / 1_000_000) * PRICING.GEMINI_1_5_PRO.outputPer1MTokensUSD;
  }

  const writes = options.firestoreWrites || metrics.documentCount + metrics.factCount;
  const reads = options.firestoreReads || writes;
  const storageBytes = options.storageBytes || metrics.rawTextCharacters;

  const firestoreWritesCostUSD = (writes / 100_000) * PRICING.FIRESTORE.writePer100kUSD;
  const firestoreReadsCostUSD = (reads / 100_000) * PRICING.FIRESTORE.readPer100kUSD;
  const firestoreOperationsCostUSD = firestoreWritesCostUSD + firestoreReadsCostUSD;

  const storageGiB = storageBytes / (1024 * 1024 * 1024);
  const storageAndEgressCostUSD = storageGiB * PRICING.FIRESTORE.storagePerGiBMonthUSD;

  const totalCostUSD = aiInferenceCostUSD + firestoreOperationsCostUSD + storageAndEgressCostUSD;
  const totalCostINR = totalCostUSD * exchangeRate;

  const isWithinBudget = totalCostUSD <= failClosedLimitUSD;
  if (!isWithinBudget) {
    throw new Error(
      `[FAIL-CLOSED] Pipeline budget exceeded: Estimated cost $${totalCostUSD.toFixed(4)} (₹${totalCostINR.toFixed(2)}) exceeds fail-closed limit of $${failClosedLimitUSD.toFixed(2)}`
    );
  }

  return {
    currency: 'INR',
    inrExchangeRate: exchangeRate,
    aiInferenceCostUSD,
    aiInferenceCostINR: aiInferenceCostUSD * exchangeRate,
    firestoreOperationsCostUSD,
    firestoreOperationsCostINR: firestoreOperationsCostUSD * exchangeRate,
    storageAndEgressCostUSD,
    storageAndEgressCostINR: storageAndEgressCostUSD * exchangeRate,
    totalCostUSD,
    totalCostINR,
    isDeterministicFreeExecution: model === 'none',
    failClosedLimitUSD,
    isWithinBudget,
  };
}
