// Base proxy URL configured in vite.config.ts
const API_BASE = '/api';

export class ApiRepository {
  static async get(endpoint: string) {
    const response = await fetch(`${API_BASE}${endpoint}`);
    if (!response.ok) {
      throw { status: response.status, data: await response.json().catch(() => ({})) };
    }
    return response.json();
  }

  static async post(endpoint: string, body: any) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw { status: response.status, data: await response.json().catch(() => ({})) };
    }
    return response.json();
  }
}
