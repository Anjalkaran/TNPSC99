/**
 * TNPSC99 Current Affairs Operating Cost & Token Usage Estimator
 * Phase CA-3 Final Accuracy Certification & CA-4 Expansion
 *
 * Configured with currently active production models:
 * - Primary: Gemini 2.5 Flash (`googleai/gemini-2.5-flash`)
 * - Deep Reasoning / Pro: Gemini 2.5 Pro (`googleai/gemini-2.5-pro`)
 *
 * Enforces fail-closed budget caps, Tamil token expansion modeling,
 * independent verification overhead, retry allowances, and zero-spend emulator modes.
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
  inrExchangeRate: number; // 84.00 INR per USD
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
  cloudBillingSeparationNotice?: string;
}

/**
 * Explicit Architectural Separation:
 * AI-Provider Token Inference Expenses vs. Google Cloud Platform Infrastructure Expenses.
 * 
 * IMPORTANT:
 * The application-level $1.00 (₹84.00) circuit breaker bounds AI model token consumption only.
 * It is NOT an absolute guarantee against Google Cloud infrastructure billing (e.g., runaway Cloud Run
 * instances, Firestore DDOS read spikes, or bandwidth egress).
 * Real cloud-billing guarantees require GCP Billing Budgets, Pub/Sub spend alerts, and instance limits.
 */
export interface CloudExpenseSeparationReport {
  aiInference: {
    serviceName: 'Gemini AI Studio / Vertex AI';
    meteredMetric: 'Input & Output Tokens';
    circuitBreakerLimitUSD: number; // $1.00 daily application circuit breaker
    circuitBreakerScope: 'APPLICATION_INFERENCE_ONLY';
    dailyObservedCostUSD: number;
    dailyObservedCostINR: number;
  };
  gcpInfrastructure: {
    serviceName: 'Google Cloud Platform (Cloud Run, Cloud Firestore, Cloud Storage, Egress)';
    meteredMetric: 'Container vCPU/RAM seconds, document read/write ops, GiB egress';
    appLevelGuaranteed: false;
    guaranteeMechanism: 'GCP_BILLING_BUDGETS_AND_PUBSUB_ALERTS';
    recommendedMonthlyBudgetUSD: number; // $30.00 / month
    recommendedAlertThresholdsPercent: number[]; // [50, 80, 100]
    scalingHardLimits: {
      cloudRunMinInstances: number;
      cloudRunMaxInstances: number;
      concurrencyPerInstance: number;
    };
  };
}

/**
 * Generates an auditable expense separation report comparing AI token costs vs GCP infrastructure.
 */
export function generateCloudExpenseSeparationReport(
  observedDailyAiCostUSD: number = 0.088
): CloudExpenseSeparationReport {
  return {
    aiInference: {
      serviceName: 'Gemini AI Studio / Vertex AI',
      meteredMetric: 'Input & Output Tokens',
      circuitBreakerLimitUSD: 1.00,
      circuitBreakerScope: 'APPLICATION_INFERENCE_ONLY',
      dailyObservedCostUSD: observedDailyAiCostUSD,
      dailyObservedCostINR: Number((observedDailyAiCostUSD * 84.0).toFixed(2)),
    },
    gcpInfrastructure: {
      serviceName: 'Google Cloud Platform (Cloud Run, Cloud Firestore, Cloud Storage, Egress)',
      meteredMetric: 'Container vCPU/RAM seconds, document read/write ops, GiB egress',
      appLevelGuaranteed: false,
      guaranteeMechanism: 'GCP_BILLING_BUDGETS_AND_PUBSUB_ALERTS',
      recommendedMonthlyBudgetUSD: 30.00,
      recommendedAlertThresholdsPercent: [50, 80, 100],
      scalingHardLimits: {
        cloudRunMinInstances: 0,
        cloudRunMaxInstances: 3,
        concurrencyPerInstance: 80,
      },
    },
  };
}

export type SupportedAiModel = 'none' | 'gemini_1.5_flash' | 'gemini_2.5_flash' | 'gemini_2.5_pro';

export interface CostCalculationOptions {
  aiModel?: SupportedAiModel;
  inrExchangeRate?: number;
  failClosedLimitUSD?: number; // Fail pipeline if projected/measured cost exceeds this
  firestoreWrites?: number;
  firestoreReads?: number;
  storageBytes?: number;
}

// Current Standard Cloud & AI Pricing (2026 Production Baseline)
export const PRICING = {
  USD_TO_INR: 84.0,
  FAIL_CLOSED_MAX_BUDGET_USD: 1.0, // ₹84.00 hard limit for daily operations
  GEMINI_1_5_FLASH: {
    modelId: 'googleai/gemini-1.5-flash',
    inputPer1MTokensUSD: 0.075,  // $0.075 / 1M tokens ($0.000000075/token)
    outputPer1MTokensUSD: 0.30,  // $0.30 / 1M tokens ($0.00000030/token)
  },
  GEMINI_2_5_FLASH: {
    modelId: 'googleai/gemini-2.5-flash',
    inputPer1MTokensUSD: 0.30,   // $0.30 / 1M tokens ($0.00000030/token)
    outputPer1MTokensUSD: 2.50,  // $2.50 / 1M tokens ($0.00000250/token)
  },
  GEMINI_2_5_PRO: {
    modelId: 'googleai/gemini-2.5-pro',
    inputPer1MTokensUSD: 1.25,   // $1.25 / 1M tokens
    outputPer1MTokensUSD: 10.00, // $10.00 / 1M tokens
  },
  FIRESTORE: {
    writePer100kUSD: 0.18,       // $0.0000018 per write
    readPer100kUSD: 0.06,        // $0.0000006 per read
    storagePerGiBMonthUSD: 0.18,
  },
  FACTORS: {
    TAMIL_TOKEN_EXPANSION_RATIO: 2.8, // Tamil script tokens per equivalent English word
    VERIFICATION_OVERHEAD_RATIO: 0.65, // Verification tokens relative to generation
    RETRY_FAILURE_ALLOWANCE: 0.08,    // 8% retry/re-prompt overhead
  },
};

/**
 * Detailed per-MCQ Token & Cost Profile
 */
export interface McqPipelineItemCost {
  mcqId: string;
  generation: {
    inputTokens: number;
    outputTokens: number;
    costUSD: number;
  };
  verification: {
    inputTokens: number;
    outputTokens: number;
    costUSD: number;
  };
  translation: {
    tamilInputTokens: number;
    tamilOutputTokens: number;
    costUSD: number;
  };
  retryAllowanceUSD: number;
  totalCostUSD: number;
  totalCostINR: number;
}

/**
 * Estimates token counts from raw document texts using standard ratio (approx 3.5 chars/token).
 */
export function estimateTokensFromTexts(
  texts: string[],
  outputStatementsCount: number = 0
): TokenUsageMetrics {
  const totalChars = texts.reduce((acc, t) => acc + (t ? t.length : 0), 0);
  const estimatedPromptTokens = Math.ceil(totalChars / 3.5);
  const estimatedCompletionTokens = outputStatementsCount * 35;

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
 * Calculates itemized token usage and cost for generating, verifying, and translating
 * a single TNPSC bilingual MCQ using Gemini 2.5 Flash.
 */
export function calculateItemizedMcqCost(
  sourceTextLengthChars: number = 500,
  model: SupportedAiModel = 'gemini_2.5_flash'
): McqPipelineItemCost {
  if (model === 'none') {
    return {
      mcqId: 'offline_deterministic',
      generation: { inputTokens: 0, outputTokens: 0, costUSD: 0 },
      verification: { inputTokens: 0, outputTokens: 0, costUSD: 0 },
      translation: { tamilInputTokens: 0, tamilOutputTokens: 0, costUSD: 0 },
      retryAllowanceUSD: 0,
      totalCostUSD: 0,
      totalCostINR: 0,
    };
  }

  const modelPricing = model === 'gemini_2.5_pro'
    ? PRICING.GEMINI_2_5_PRO
    : model === 'gemini_1.5_flash'
    ? PRICING.GEMINI_1_5_FLASH
    : PRICING.GEMINI_2_5_FLASH;

  // 1. Generation Step: Prompt includes official release excerpt + TNPSC MCQ format instructions
  const genInputTokens = Math.ceil(sourceTextLengthChars / 3.5) + 350; // Context + instructions
  const genOutputTokens = 180; // English question + 4 options + explanation
  const genCostUSD = 
    (genInputTokens / 1_000_000) * modelPricing.inputPer1MTokensUSD +
    (genOutputTokens / 1_000_000) * modelPricing.outputPer1MTokensUSD;

  // 2. Independent Verification Step: Blind solver reads question and options without label
  const verInputTokens = genOutputTokens + 220; // Question prompt to blind solver
  const verOutputTokens = 60; // Predicted index, confidence, reasoning
  const verCostUSD = 
    (verInputTokens / 1_000_000) * modelPricing.inputPer1MTokensUSD +
    (verOutputTokens / 1_000_000) * modelPricing.outputPer1MTokensUSD;

  // 3. Tamil Translation & Linguistic Parity Step:
  // Tamil Unicode script requires ~2.8x tokens compared to English Latin script
  const transInputTokens = genOutputTokens + 120;
  const transOutputTokens = Math.ceil(genOutputTokens * PRICING.FACTORS.TAMIL_TOKEN_EXPANSION_RATIO);
  const transCostUSD = 
    (transInputTokens / 1_000_000) * modelPricing.inputPer1MTokensUSD +
    (transOutputTokens / 1_000_000) * modelPricing.outputPer1MTokensUSD;

  // 4. Retry & Failed Calls Allowance (8%)
  const subtotalUSD = genCostUSD + verCostUSD + transCostUSD;
  const retryAllowanceUSD = subtotalUSD * PRICING.FACTORS.RETRY_FAILURE_ALLOWANCE;

  const totalCostUSD = subtotalUSD + retryAllowanceUSD;
  const totalCostINR = totalCostUSD * PRICING.USD_TO_INR;

  return {
    mcqId: 'calculated_profile',
    generation: { inputTokens: genInputTokens, outputTokens: genOutputTokens, costUSD: genCostUSD },
    verification: { inputTokens: verInputTokens, outputTokens: verOutputTokens, costUSD: verCostUSD },
    translation: { tamilInputTokens: transInputTokens, tamilOutputTokens: transOutputTokens, costUSD: transCostUSD },
    retryAllowanceUSD,
    totalCostUSD,
    totalCostINR,
  };
}

/**
 * Calculates recurring daily and monthly operational expense projections.
 */
export function calculateRecurringOperationsExpense(
  dailyQuestionCount: number = 10,
  model: SupportedAiModel = 'gemini_2.5_flash'
) {
  const perMcq = calculateItemizedMcqCost(500, model);

  // Daily totals
  const dailyCostUSD = perMcq.totalCostUSD * dailyQuestionCount;
  const dailyCostINR = dailyCostUSD * PRICING.USD_TO_INR;

  // Monthly totals (30 calendar days = 300 MCQs/month)
  const monthlyQuestionCount = dailyQuestionCount * 30;
  const monthlyCostUSD = dailyCostUSD * 30;
  const monthlyCostINR = monthlyCostUSD * PRICING.USD_TO_INR;

  return {
    model,
    dailyQuestionCount,
    monthlyQuestionCount,
    perMcqCostUSD: perMcq.totalCostUSD,
    perMcqCostINR: perMcq.totalCostINR,
    dailyCostUSD,
    dailyCostINR,
    monthlyCostUSD,
    monthlyCostINR,
    itemizedPerMcq: perMcq,
  };
}

/**
 * Calculates itemized operating cost and enforces fail-closed budget caps.
 */
export function calculateOperatingCost(
  metrics: TokenUsageMetrics,
  options: CostCalculationOptions = {}
): OperatingCostBreakdown {
  const model: SupportedAiModel = options.aiModel || 'none';
  const exchangeRate = options.inrExchangeRate || PRICING.USD_TO_INR;
  const failClosedLimitUSD = options.failClosedLimitUSD || PRICING.FAIL_CLOSED_MAX_BUDGET_USD;

  let aiInferenceCostUSD = 0;
  if (model === 'gemini_2.5_flash') {
    aiInferenceCostUSD =
      (metrics.promptTokens / 1_000_000) * PRICING.GEMINI_2_5_FLASH.inputPer1MTokensUSD +
      (metrics.completionTokens / 1_000_000) * PRICING.GEMINI_2_5_FLASH.outputPer1MTokensUSD;
  } else if (model === 'gemini_2.5_pro') {
    aiInferenceCostUSD =
      (metrics.promptTokens / 1_000_000) * PRICING.GEMINI_2_5_PRO.inputPer1MTokensUSD +
      (metrics.completionTokens / 1_000_000) * PRICING.GEMINI_2_5_PRO.outputPer1MTokensUSD;
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
