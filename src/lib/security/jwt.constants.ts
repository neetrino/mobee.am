/** HS256 only — prevents `none` / unexpected algorithms on verify. */
export const JWT_ALGORITHM = "HS256" as const;
