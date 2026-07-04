import type { ApiUsage } from '../types';

const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  'deepseek-v4-flash': { input: 0.001, output: 0.002 },
  'deepseek-v4-pro': { input: 0.003, output: 0.008 },
};

const STORAGE_KEY = 'decipher-api-usage';

export function getDefaultApiUsage(): ApiUsage {
  return {
    totalTokens: 0,
    totalCost: 0,
    modelUsages: {},
    featureUsages: {},
    callCount: 0,
  };
}

export function loadApiUsage(): ApiUsage {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('[ApiUsage] load failed', e);
  }
  return getDefaultApiUsage();
}

export function saveApiUsage(usage: ApiUsage) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
  } catch (e) {
    console.error('[ApiUsage] save failed', e);
  }
}

export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const price = MODEL_PRICES[model] || { input: 0.0014, output: 0.0028 };
  const inputCost = (promptTokens / 1_000_000) * price.input;
  const outputCost = (completionTokens / 1_000_000) * price.output;
  return Math.round((inputCost + outputCost) * 1000000) / 1000000;
}

export function addApiUsage(
  model: string,
  feature: string,
  promptTokens: number,
  completionTokens: number
): ApiUsage {
  const usage = loadApiUsage();
  const cost = calculateCost(model, promptTokens, completionTokens);
  const totalTokens = promptTokens + completionTokens;

  usage.totalTokens += totalTokens;
  usage.totalCost = Math.round((usage.totalCost + cost) * 1000000) / 1000000;
  usage.callCount += 1;

  if (!usage.modelUsages[model]) {
    usage.modelUsages[model] = { tokens: 0, cost: 0 };
  }
  usage.modelUsages[model].tokens += totalTokens;
  usage.modelUsages[model].cost =
    Math.round((usage.modelUsages[model].cost + cost) * 1000000) / 1000000;

  if (!usage.featureUsages[feature]) {
    usage.featureUsages[feature] = { tokens: 0, cost: 0 };
  }
  usage.featureUsages[feature].tokens += totalTokens;
  usage.featureUsages[feature].cost =
    Math.round((usage.featureUsages[feature].cost + cost) * 1000000) / 1000000;

  saveApiUsage(usage);
  console.log(
    `[YanBoard] API usage: model=${model}, feature=${feature}, tokens=${totalTokens}, cost=${cost.toFixed(6)}元`
  );
  return usage;
}

export function resetApiUsage() {
  saveApiUsage(getDefaultApiUsage());
}
