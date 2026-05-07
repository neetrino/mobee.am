/**
 * Fallback cities for checkout when admin `delivery-locations` is empty or incomplete.
 * Values use Latin script to match typical admin/API matching (case-insensitive).
 */
const RAW_ARMENIA_DELIVERY_CITIES = [
  "Abovyan",
  "Agarak",
  "Alaverdi",
  "Apaga",
  "Ararat",
  "Armavir",
  "Artashat",
  "Ashtarak",
  "Bagratashen",
  "Berd",
  "Byureghavan",
  "Chambarak",
  "Dilijan",
  "Gavar",
  "Goris",
  "Gyumri",
  "Hrazdan",
  "Ijevan",
  "Jermuk",
  "Kapan",
  "Masis",
  "Martuni",
  "Meghri",
  "Metsamor",
  "Nor Hachen",
  "Noyemberyan",
  "Sevan",
  "Sisian",
  "Spitak",
  "Stepanavan",
  "Talin",
  "Tsaghkadzor",
  "Vagharshapat",
  "Vanadzor",
  "Vardenis",
  "Vayk",
  "Yeghvard",
  "Yerevan",
] as const;

export const ARMENIA_FALLBACK_DELIVERY_CITIES: readonly string[] = [...RAW_ARMENIA_DELIVERY_CITIES].sort((a, b) =>
  a.localeCompare(b, "en")
);
