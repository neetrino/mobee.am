import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { PATCH as patchTranslations } from "./translations/route";
import { POST as createValue } from "./values/route";
import {
  DELETE as deleteValue,
  PATCH as patchValue,
} from "./values/[valueId]/route";
import { requireAdminApiContext } from "@/lib/middleware/admin-api-auth";
import { adminService } from "@/lib/services/admin.service";

vi.mock("@/lib/middleware/admin-api-auth", () => ({
  requireAdminApiContext: vi.fn(),
}));

vi.mock("@/lib/services/admin.service", () => ({
  adminService: {
    addAttributeValue: vi.fn(),
    updateAttributeTranslation: vi.fn(),
    updateAttributeValue: vi.fn(),
    deleteAttributeValue: vi.fn(),
  },
}));

describe("admin attribute lifecycle routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminApiContext).mockResolvedValue({
      userId: "admin-1",
      roles: ["admin"],
      source: "fallback-auth",
    });
  });

  it("returns 403 for non-admin access", async () => {
    vi.mocked(requireAdminApiContext).mockResolvedValue(
      NextResponse.json(
        {
          type: "https://api.shop.am/problems/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "Admin access required",
        },
        { status: 403 },
      ),
    );

    const req = new NextRequest("http://localhost:3000/api/v1/admin/attributes/attr-1/values", {
      method: "POST",
      body: JSON.stringify({ label: "Blue", locale: "en" }),
      headers: { "content-type": "application/json" },
    });

    const res = await createValue(req, { params: Promise.resolve({ id: "attr-1" }) });
    expect(res.status).toBe(403);
  });

  it("handles value and translation lifecycle", async () => {
    const attributeState = {
      id: "attr-1",
      key: "color",
      name: "Color",
      type: "select",
      filterable: true,
      values: [
        {
          id: "val-1",
          value: "blue",
          label: "Blue",
          colors: [] as string[],
          imageUrl: null as string | null,
        },
      ],
    };

    vi.mocked(adminService.addAttributeValue).mockImplementation(async () => ({
      ...attributeState,
    }));
    vi.mocked(adminService.updateAttributeTranslation).mockImplementation(
      async (_id, payload: { name: string }) => {
        attributeState.name = payload.name;
        return { ...attributeState };
      }
    );
    vi.mocked(adminService.updateAttributeValue).mockImplementation(
      async (_id, valueId: string, payload: { label?: string; colors?: string[] }) => {
        attributeState.values = attributeState.values.map((item) =>
          item.id === valueId
            ? {
                ...item,
                label: payload.label ?? item.label,
                colors: payload.colors ?? item.colors,
              }
            : item
        );
        return { ...attributeState };
      }
    );
    vi.mocked(adminService.deleteAttributeValue).mockImplementation(async (valueId: string) => {
      attributeState.values = attributeState.values.filter((item) => item.id !== valueId);
      return { ...attributeState };
    });

    const createReq = new NextRequest(
      "http://localhost:3000/api/v1/admin/attributes/attr-1/values",
      {
        method: "POST",
        body: JSON.stringify({ label: "Blue", locale: "en" }),
        headers: { "content-type": "application/json" },
      }
    );
    const createRes = await createValue(createReq, {
      params: Promise.resolve({ id: "attr-1" }),
    });
    expect(createRes.status).toBe(201);

    const translateReq = new NextRequest(
      "http://localhost:3000/api/v1/admin/attributes/attr-1/translations",
      {
        method: "PATCH",
        body: JSON.stringify({ name: "Colour", locale: "en" }),
        headers: { "content-type": "application/json" },
      }
    );
    const translateRes = await patchTranslations(translateReq, {
      params: Promise.resolve({ id: "attr-1" }),
    });
    expect(translateRes.status).toBe(200);
    const translationBody = await translateRes.json();
    expect(translationBody.data.name).toBe("Colour");

    const patchReq = new NextRequest(
      "http://localhost:3000/api/v1/admin/attributes/attr-1/values/val-1",
      {
        method: "PATCH",
        body: JSON.stringify({ label: "Azure", colors: ["#007FFF"], locale: "en" }),
        headers: { "content-type": "application/json" },
      }
    );
    const patchRes = await patchValue(patchReq, {
      params: Promise.resolve({ id: "attr-1", valueId: "val-1" }),
    });
    expect(patchRes.status).toBe(200);
    const valueBody = await patchRes.json();
    expect(valueBody.data.values[0]).toMatchObject({
      id: "val-1",
      label: "Azure",
      colors: ["#007FFF"],
    });

    const deleteReq = new NextRequest(
      "http://localhost:3000/api/v1/admin/attributes/attr-1/values/val-1",
      { method: "DELETE" }
    );
    const deleteRes = await deleteValue(deleteReq, {
      params: Promise.resolve({ id: "attr-1", valueId: "val-1" }),
    });
    expect(deleteRes.status).toBe(200);
    const deleteBody = await deleteRes.json();
    expect(deleteBody.data.values).toEqual([]);
  });

  it("returns service validation errors for protected deletes", async () => {
    vi.mocked(adminService.deleteAttributeValue).mockRejectedValue({
      status: 400,
      type: "https://api.shop.am/problems/validation-error",
      title: "Cannot delete attribute value",
      detail: "Attribute value is used in 1 variant(s).",
    });

    const req = new NextRequest(
      "http://localhost:3000/api/v1/admin/attributes/attr-1/values/val-1",
      { method: "DELETE" }
    );
    const res = await deleteValue(req, {
      params: Promise.resolve({ id: "attr-1", valueId: "val-1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.title).toBe("Cannot delete attribute value");
  });
});
