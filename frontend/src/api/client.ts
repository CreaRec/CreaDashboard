async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export default apiFetch;
