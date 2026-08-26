import { NextRequest, NextResponse } from "next/server";
import { ARMENIA_FALLBACK_DELIVERY_CITIES } from "@/lib/constants/armenia-delivery-cities.constants";
import { adminDeliveryService } from "@/lib/services/admin/admin-delivery.service";
import { runApiRoute } from "@/lib/errors/run-api-route";
import { AppError } from "@/lib/errors/app-error";
import { isDatabaseUnavailableError } from "@/lib/errors/map-prisma-error";

function mergeArmeniaCitiesFromSettings(dbCities: string[]): string[] {
  const map = new Map<string, string>();
  for (const raw of dbCities) {
    const city = raw.trim();
    if (!city) {
      continue;
    }
    map.set(city.toLowerCase(), city);
  }
  for (const city of ARMENIA_FALLBACK_DELIVERY_CITIES) {
    const key = city.toLowerCase();
    if (!map.has(key)) {
      map.set(key, city);
    }
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, "en"));
}

/**
 * GET /api/v1/delivery/cities
 * Cities available for delivery selection (Armenia), merged with admin-configured locations.
 * Empty settings fall back to the static Armenia list. Database outages return 503.
 */
export async function GET(req: NextRequest) {
  return runApiRoute(req, async () => {
    try {
      const countryParam = req.nextUrl.searchParams.get("country")?.trim() || "Armenia";
      const normalizedCountry = countryParam.toLowerCase();

      const { locations } = await adminDeliveryService.getDeliverySettings();
      const fromDb = locations
        .filter((loc) => loc.country.toLowerCase().trim() === normalizedCountry)
        .map((loc) => loc.city.trim())
        .filter(Boolean);

      if (normalizedCountry !== "armenia") {
        const unique = [...new Set(fromDb)].sort((a, b) => a.localeCompare(b, "en"));
        return NextResponse.json({ cities: unique });
      }

      const cities = mergeArmeniaCitiesFromSettings(fromDb);
      return NextResponse.json({ cities });
    } catch (error: unknown) {
      if (isDatabaseUnavailableError(error)) {
        throw AppError.databaseUnavailable();
      }
      throw error;
    }
  });
}
