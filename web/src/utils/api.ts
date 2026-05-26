export type ApiResult<T> =
  | { ok: true; data: T; status: number; raw?: string }
  | { ok: false; status: number; error: string; raw?: string };

export async function apiGet<T>(path: string): Promise<ApiResult<T>> {
  return apiRequest<T>(path, { method: "GET" });
}

export async function apiPost<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  return apiRequest<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

export async function apiPostForm<T>(path: string, formData: FormData): Promise<ApiResult<T>> {
  return apiRequest<T>(path, {
    method: "POST",
    body: formData,
  });
}

async function apiRequest<T>(path: string, init: RequestInit): Promise<ApiResult<T>> {
  const res = await fetch(path, init);
  const status = res.status;
  const text = await res.text();

  if (!res.ok) {
    return {
      ok: false,
      status,
      error: `${status} ${res.statusText}`.trim(),
      raw: text || undefined,
    };
  }

  if (!text) {
    return { ok: true, status, data: undefined as T };
  }

  try {
    const data = JSON.parse(text) as T;
    return { ok: true, status, data, raw: text };
  } catch {
    return { ok: true, status, data: undefined as T, raw: text };
  }
}

