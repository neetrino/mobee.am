import { Prisma } from "@prisma/client";
import type { OrderFilters } from "./types";

/**
 * Build where clause for order queries
 */
export function buildOrderWhereClause(filters: OrderFilters): Prisma.OrderWhereInput {
  const andConditions: Prisma.OrderWhereInput[] = [];

  // Apply status filter
  if (filters.status) {
    andConditions.push({ status: filters.status });
  }

  // Apply payment status filter
  if (filters.paymentStatus) {
    andConditions.push({ paymentStatus: filters.paymentStatus });
  }

  // Apply search filter
  if (filters.search && filters.search.trim()) {
    const searchTerm = filters.search.trim();
    andConditions.push({
      OR: [
        { number: { contains: searchTerm, mode: 'insensitive' } },
        { customerEmail: { contains: searchTerm, mode: 'insensitive' } },
        { customerPhone: { contains: searchTerm, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { firstName: { contains: searchTerm, mode: 'insensitive' } },
              { lastName: { contains: searchTerm, mode: 'insensitive' } },
              { email: { contains: searchTerm, mode: 'insensitive' } },
              { phone: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
        },
      ],
    });
  }

  // Return where clause
  if (andConditions.length > 0) {
    return { AND: andConditions };
  }

  return {};
}

/**
 * Build orderBy clause for order queries
 */
export function buildOrderByClause(filters: OrderFilters): Prisma.OrderOrderByWithRelationInput {
  const sortBy = filters.sortBy || 'createdAt';
  const sortOrder = filters.sortOrder || 'desc';
  
  // Map frontend sort fields to database fields
  const sortFieldMap: Record<string, string> = {
    'total': 'total',
    'createdAt': 'createdAt',
  };
  
  const dbSortField = sortFieldMap[sortBy] || 'createdAt';
  return { [dbSortField]: sortOrder };
}




