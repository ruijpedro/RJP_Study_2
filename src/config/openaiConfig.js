// RJP_Study - Configuração ChatGPT
// Uso particular/doméstico: podes colocar a API Key aqui.
// Melhor prática: usar variável VITE_OPENAI_API_KEY no GitHub Secrets ou .env local.

export const OPENAI_CONFIG = {
  // Opção A - simples: cola aqui a tua API Key entre aspas.
  apiKey: "COLOCA_AQUI_A_TUA_OPENAI_API_KEY",

  // Opção B - recomendada para GitHub/Vite: VITE_OPENAI_API_KEY=sk-...
  envApiKey: import.meta.env?.VITE_OPENAI_API_KEY || "",

  // Modelo editável. Se quiseres trocar, basta mudar aqui.
  model: import.meta.env?.VITE_OPENAI_MODEL || "gpt-4.1-mini",

  endpoint: "https://api.openai.com/v1/responses",

  temperature: 0.2,
  maxOutputTokens: 2500,
};

export function getOpenAIKey() {
  const envKey = OPENAI_CONFIG.envApiKey?.trim();
  if (envKey) return envKey;

  const localKey = OPENAI_CONFIG.apiKey?.trim();
  if (localKey && localKey !== "COLOCA_AQUI_A_TUA_OPENAI_API_KEY") return localKey;

  return "";
}
