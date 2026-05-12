/**
 * Suggested delivery areas for Armenia checkout (marz / capital names, Latin script).
 * Stored values match admin/API matching (case-insensitive). Labels are localized in checkout UI.
 */
const RAW_ARMENIA_DELIVERY_CITIES = [
  "Yerevan",
  "Aragatsotn",
  "Ararat",
  "Armavir",
  "Gegharkunik",
  "Kotayk",
  "Lori",
  "Shirak",
  "Syunik",
  "Tavush",
  "Vayots Dzor",
] as const;

export const ARMENIA_FALLBACK_DELIVERY_CITIES: readonly string[] = [...RAW_ARMENIA_DELIVERY_CITIES];

/** Maps canonical city value → i18n key under `checkout.shipping.suggestedCities`. */
export const ARMENIA_SUGGESTED_CITY_LABEL_SLUG: Readonly<Record<string, string>> = {
  Yerevan: "yerevan",
  Aragatsotn: "aragatsotn",
  Ararat: "ararat",
  Armavir: "armavir",
  Gegharkunik: "gegharkunik",
  Kotayk: "kotayk",
  Lori: "lori",
  Shirak: "shirak",
  Syunik: "syunik",
  Tavush: "tavush",
  "Vayots Dzor": "vayotsDzor",
};

const SUGGESTED_CITY_ORDER_INDEX = new Map<string, number>(
  ARMENIA_FALLBACK_DELIVERY_CITIES.map((city, index) => [city.trim().toLowerCase(), index])
);

/**
 * Puts configured Armenia suggested areas first (Yerevan, then marzes), then any other cities A–Z.
 */
export function compareSuggestedArmeniaDeliveryCities(a: string, b: string): number {
  const ia = SUGGESTED_CITY_ORDER_INDEX.get(a.trim().toLowerCase());
  const ib = SUGGESTED_CITY_ORDER_INDEX.get(b.trim().toLowerCase());
  if (ia !== undefined && ib !== undefined) {
    return ia - ib;
  }
  if (ia !== undefined) {
    return -1;
  }
  if (ib !== undefined) {
    return 1;
  }
  return a.localeCompare(b, "en");
}
