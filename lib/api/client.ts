const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const USE_MOCK_FALLBACK = !process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export interface ApiFetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: unknown
  ) {
    super(`API Error ${status}: ${statusText}`);
    this.name = 'ApiError';
  }
}

export async function apiClient<T>(endpoint: string, options: ApiFetchOptions = {}): Promise<T> {
  if (USE_MOCK_FALLBACK) {
    throw new Error('MOCK_MODE_ACTIVE');
  }

  const { params, headers, ...restOptions } = options;
  let url = `${API_BASE_URL}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    }
    const query = searchParams.toString();
    if (query) {
      url += `?${query}`;
    }
  }

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    },
    ...restOptions,
  });

  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      errorData = await response.text();
    }
    throw new ApiError(response.status, response.statusText, errorData);
  }

  return response.json() as Promise<T>;
}

export function isMockMode(): boolean {
  return USE_MOCK_FALLBACK;
}

export function getApiBaseUrl(): string {
  return API_BASE_URL || 'Mock Environment (Local State)';
}
