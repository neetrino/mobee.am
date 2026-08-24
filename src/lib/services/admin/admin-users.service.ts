import { Prisma } from "@white-shop/db";
import { db } from "@white-shop/db";
import type { AdminUserUpdateInput } from "@/lib/schemas/admin-users.schema";
import { invalidateAdminUserValidationCache } from "@/lib/middleware/admin-validation-cache";

export interface AdminUsersFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}

function buildUsersWhere(filters: AdminUsersFilters): Prisma.UserWhereInput {
  const andConditions: Prisma.UserWhereInput[] = [{ deletedAt: null }];

  const role = filters.role?.trim().toLowerCase();
  if (role === "admin") {
    andConditions.push({ roles: { has: "admin" } });
  } else if (role === "customer") {
    andConditions.push({ roles: { has: "customer" } });
  }

  const search = filters.search?.trim();
  if (search) {
    andConditions.push({
      OR: [
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (andConditions.length === 1) {
    return andConditions[0];
  }

  return { AND: andConditions };
}

class AdminUsersService {
  /**
   * Get users with pagination, search, and role filter
   */
  async getUsers(filters: AdminUsersFilters = {}) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 20;
    const skip = (page - 1) * limit;
    const where = buildUsersWhere(filters);

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          roles: true,
          blocked: true,
          createdAt: true,
          _count: {
            select: {
              orders: true,
            },
          },
        },
      }),
      db.user.count({ where }),
    ]);

    return {
      data: users.map((user) => ({
        id: user.id,
        email: user.email ?? "",
        phone: user.phone ?? "",
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        roles: user.roles ?? [],
        blocked: user.blocked,
        createdAt: user.createdAt.toISOString(),
        ordersCount: user._count?.orders ?? 0,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  /**
   * Update user
   */
  async updateUser(userId: string, data: AdminUserUpdateInput) {
    const updated = await db.user.update({
      where: { id: userId },
      data: {
        ...(data.blocked !== undefined ? { blocked: data.blocked } : {}),
        ...(data.roles !== undefined ? { roles: data.roles } : {}),
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        roles: true,
        blocked: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await invalidateAdminUserValidationCache(userId);

    return updated;
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "User not found",
        detail: `User with id '${userId}' does not exist`,
      };
    }

    await db.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        blocked: true,
      },
      select: { id: true },
    });

    await invalidateAdminUserValidationCache(userId);

    return { success: true };
  }
}

export const adminUsersService = new AdminUsersService();
