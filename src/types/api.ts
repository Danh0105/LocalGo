export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    details: unknown;
  };
  timestamp: string;
  path: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
