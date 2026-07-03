import fetch from 'node-fetch';

const DEFAULT_BACKEND_URL = 'http://localhost:4000';

export class BackendClient {
  constructor(baseUrl = process.env.BACKEND_URL || DEFAULT_BACKEND_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async getDevices() {
    return this.#get('/devices');
  }

  async getRoom(room) {
    return this.#get(`/rooms/${encodeURIComponent(room)}`);
  }

  async getUsage() {
    return this.#get('/usage');
  }

  async getAlerts() {
    return this.#get('/alerts');
  }

  async #get(path) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Backend returned ${response.status} for ${path}${text ? `: ${text}` : ''}`);
    }

    return response.json();
  }
}

export const backendClient = new BackendClient();
