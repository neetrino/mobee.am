import { db } from "@white-shop/db";
import { logger } from "@/lib/utils/logger";

class AdminDeliveryService {
  /**
   * Get delivery settings
   */
  async getDeliverySettings() {
    const setting = await db.settings.findUnique({
      where: { key: 'delivery-locations' },
    });

    if (!setting) {
      return {
        locations: [],
      };
    }

    const value = setting.value as { locations?: Array<{ id?: string; country: string; city: string; price: number }> };
    return {
      locations: value.locations || [],
    };
  }

  /**
   * Get delivery price for a specific city
   * Returns the configured price if city has shipping, otherwise returns 0
   */
  async getDeliveryPrice(city: string, country: string = 'Armenia') {
    const setting = await db.settings.findUnique({
      where: { key: 'delivery-locations' },
    });

    if (!setting) {
      return 0;
    }

    const value = setting.value as { locations?: Array<{ country: string; city: string; price: number }> };
    const locations = value.locations || [];

    // Find matching location (case-insensitive)
    const location = locations.find(
      (loc) => 
        loc.city.toLowerCase().trim() === city.toLowerCase().trim() &&
        loc.country.toLowerCase().trim() === country.toLowerCase().trim()
    );

    if (location) {
      return location.price;
    }

    const cityMatch = locations.find(
      (loc) => loc.city.toLowerCase().trim() === city.toLowerCase().trim()
    );

    if (cityMatch) {
      return cityMatch.price;
    }

    return 0;
  }

  /**
   * Update delivery settings
   */
  async updateDeliverySettings(data: { locations: Array<{ id?: string; country: string; city: string; price: number }> }) {
    if (!Array.isArray(data.locations)) {
      throw {
        status: 400,
        type: "https://api.shop.am/problems/validation-error",
        title: "Validation Error",
        detail: "Locations must be an array",
      };
    }

    // Validate each location
    for (const location of data.locations) {
      if (!location.country || !location.city) {
        throw {
          status: 400,
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          detail: "Each location must have country and city",
        };
      }
      if (typeof location.price !== 'number' || location.price < 0) {
        throw {
          status: 400,
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          detail: "Price must be a non-negative number",
        };
      }
    }

    // Generate IDs for new locations
    const locationsWithIds = data.locations.map((location, index) => ({
      ...location,
      id: location.id || `location-${Date.now()}-${index}`,
    }));

    const setting = await db.settings.upsert({
      where: { key: 'delivery-locations' },
      update: {
        value: { locations: locationsWithIds },
        updatedAt: new Date(),
      },
      create: {
        key: 'delivery-locations',
        value: { locations: locationsWithIds },
        description: 'Delivery prices by country and city',
      },
    });

    return {
      locations: locationsWithIds,
    };
  }
}

export const adminDeliveryService = new AdminDeliveryService();



