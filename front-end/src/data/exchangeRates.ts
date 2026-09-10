export const exchangeRates = {
  eurUah: 52.1,
  usdUah: 45.2,
} as const;

export const formatMoney = (valueUah: number, currency: "UAH" | "EUR") => {
  if (currency === "EUR") return `${(valueUah / exchangeRates.eurUah).toFixed(2)} EUR`;
  return `${Math.round(valueUah).toLocaleString("uk-UA")} ₴`;
};