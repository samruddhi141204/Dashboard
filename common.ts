export interface DateRange {
  start: Date;
  end: Date;
}

export interface FilterOptions {
  line?: string;
  station?: string;
  shift?: string;
  operator?: string;
  product?: string;
  dateRange?: DateRange;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

