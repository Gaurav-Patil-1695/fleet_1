export interface Pagination {
  page: number;
  page_size: number;
  total: number;
  /** Alias for total – some generated pages reference this name */
  total_items: number;
  total_pages: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export type Role = 'administrator' | 'manager' | 'technician';
