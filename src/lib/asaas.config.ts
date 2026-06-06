export function getAsaasBase() {
  if (process.env.ASAAS_BASE_URL) {
    return process.env.ASAAS_BASE_URL;
  }

  const mode = (process.env.ASAAS_MODE || process.env.NODE_ENV || "").toLowerCase();
  if (mode === "sandbox" || mode === "test") {
    return "https://sandbox.asaas.com/v3";
  }

  return "https://api.asaas.com/v3";
}

export function getAsaasApiKey() {
  return process.env.ASAAS_API_KEY || null;
}
