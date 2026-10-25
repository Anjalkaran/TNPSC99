import { calculateItemizedMcqCost, PRICING, generateCloudExpenseSeparationReport } from '../src/lib/current-affairs/cost-estimator';

const singleCost = calculateItemizedMcqCost(500, 'gemini_2.5_flash');
const daily15CostUSD = singleCost.totalCostUSD * 15;
const daily15CostINR = singleCost.totalCostINR * 15;
const cloudReport = generateCloudExpenseSeparationReport(daily15CostUSD);

console.log('=== GEMINI 2.5 FLASH PRICING & COST BREAKDOWN ===');
console.log('Model ID:                  ', PRICING.GEMINI_2_5_FLASH.modelId);
console.log('Input Pricing:             $', PRICING.GEMINI_2_5_FLASH.inputPer1MTokensUSD, '/ 1M tokens');
console.log('Output Pricing:            $', PRICING.GEMINI_2_5_FLASH.outputPer1MTokensUSD, '/ 1M tokens');
console.log('USD to INR Exchange Rate:  ₹', PRICING.USD_TO_INR);
console.log('\n--- Single MCQ Itemized Token Profile ---');
console.log('Generation:                ', singleCost.generation);
console.log('Verification:              ', singleCost.verification);
console.log('Translation (Tamil):       ', singleCost.translation);
console.log('Retry Allowance (8%):      $', singleCost.retryAllowanceUSD.toFixed(6));
console.log('Total per MCQ (USD):       $', singleCost.totalCostUSD.toFixed(6));
console.log('Total per MCQ (INR):       ₹', singleCost.totalCostINR.toFixed(4));
console.log('\n--- Daily 15-MCQ Edition Projection ---');
console.log('Daily Estimated Spend (USD):$', daily15CostUSD.toFixed(4));
console.log('Daily Estimated Spend (INR):₹', daily15CostINR.toFixed(2));
console.log('Daily Circuit Breaker:     $', cloudReport.aiInference.circuitBreakerLimitUSD, '(Enforced)');
console.log('Within Circuit Breaker:    ', daily15CostUSD < cloudReport.aiInference.circuitBreakerLimitUSD);
