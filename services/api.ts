const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export interface Site {
  id: string;
  name: string;
  url: string;
  status: string;
  createdAt: string;
}

export async function fetchSites(): Promise<Site[]> {
  const res = await fetch(`${BASE_URL}/api/sites`);
  if (!res.ok) throw new Error(`Failed to fetch sites: ${res.status}`);
  return res.json();
}
