export const exchangeRates: { eurUah: number | null; source: string; updatedAt: string | null } = {
  eurUah: null,
  source: "",
  updatedAt: null,
};

export function updateExchangeRates(rates: { eurUah?: unknown; source?: unknown; updatedAt?: unknown } | null | undefined) {
  const validRate = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
  exchangeRates.eurUah = validRate(rates?.eurUah);
  exchangeRates.source = typeof rates?.source === "string" ? rates.source : "";
  exchangeRates.updatedAt = typeof rates?.updatedAt === "string" && Number.isFinite(Date.parse(rates.updatedAt)) ? rates.updatedAt : null;
}

export const formatMoney = (valueUah: number, currency: "UAH" | "EUR") => {
  if (currency === "EUR" && exchangeRates.eurUah !== null) return `${(valueUah / exchangeRates.eurUah).toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`;
  return `${valueUah.toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴`;
};
