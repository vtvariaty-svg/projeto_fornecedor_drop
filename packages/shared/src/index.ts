// Shared types, constants, and utilities used across apps and packages.
// Add shared DTOs, enums, helpers, and constants here as the project grows.

export type ApiResponse<T> = {
  data: T;
  message?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};
