export const usd = new Intl.NumberFormat("es-US", { style: "currency", currency: "USD" });
export const longDate = new Intl.DateTimeFormat("es-US", { day: "numeric", month: "short", timeZone: "UTC" });
export const fullDate = new Intl.DateTimeFormat("es-US", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
