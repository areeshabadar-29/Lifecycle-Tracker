import {
  User,
  Category,
  ItemSummary,
  ItemDetail,
  ServiceProvider,
  KnownIssue,
  Organization
} from './types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('lifecycle_jwt_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  // Auth
  async register(data: any): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Registration failed');
    }
    const result = await res.json();
    localStorage.setItem('lifecycle_jwt_token', result.token);
    return result;
  },

  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Login failed');
    }
    const result = await res.json();
    localStorage.setItem('lifecycle_jwt_token', result.token);
    return result;
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error('Failed to get current user');
    const data = await res.json();
    return {
      userId: data.user.user_id,
      email: data.user.email,
      fullName: data.user.full_name,
      role: data.user.role,
      phone: data.user.phone,
      city: data.user.city
    };
  },

  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/auth/users`);
    if (!res.ok) throw new Error('Failed to fetch users list');
    const data = await res.json();
    return (data.users || []).map((u: any) => ({
      userId: u.user_id,
      email: u.email,
      fullName: u.full_name,
      role: u.role,
      city: u.city
    }));
  },

  // Categories
  async getCategories(): Promise<{ categories: Category[]; tree: Category[] }> {
    const res = await fetch(`${API_BASE}/categories`);
    if (!res.ok) throw new Error('Failed to fetch categories');
    return res.json();
  },

  // Items
  async getItems(filters: Record<string, string | number> = {}): Promise<ItemSummary[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== '' && val !== null) {
        params.append(key, String(val));
      }
    });

    const res = await fetch(`${API_BASE}/items?${params.toString()}`, {
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error('Failed to fetch items');
    const data = await res.json();
    return data.items || [];
  },

  async getItemById(id: number): Promise<ItemDetail> {
    const res = await fetch(`${API_BASE}/items/${id}`, {
      headers: getAuthHeader()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch item details');
    }
    return res.json();
  },

  async registerItem(payload: any): Promise<{ item_id: number; message: string }> {
    const res = await fetch(`${API_BASE}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Item registration failed');
    }
    return res.json();
  },

  async listItemForSale(itemId: number, asking_price: number): Promise<any> {
    const res = await fetch(`${API_BASE}/items/${itemId}/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ asking_price })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to list item for sale');
    }
    return res.json();
  },

  async recordSale(itemId: number, saleData: any): Promise<any> {
    const res = await fetch(`${API_BASE}/items/${itemId}/sell`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(saleData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to record sale transaction');
    }
    return res.json();
  },

  async logRepair(itemId: number, repairData: any): Promise<any> {
    const res = await fetch(`${API_BASE}/items/${itemId}/repair`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(repairData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to log repair record');
    }
    return res.json();
  },

  async recordDonation(itemId: number, donationData: any): Promise<any> {
    const res = await fetch(`${API_BASE}/items/${itemId}/donate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(donationData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to record donation');
    }
    return res.json();
  },

  async verifyProvenance(itemId: number, verificationData: any): Promise<any> {
    const res = await fetch(`${API_BASE}/items/${itemId}/verify-provenance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(verificationData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to verify provenance');
    }
    return res.json();
  },

  async logCondition(itemId: number, condData: any): Promise<any> {
    const res = await fetch(`${API_BASE}/items/${itemId}/log-condition`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(condData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to log condition check');
    }
    return res.json();
  },

  // Knowledge base & directory
  async getProviders(): Promise<ServiceProvider[]> {
    const res = await fetch(`${API_BASE}/repair-kb/providers`);
    if (!res.ok) throw new Error('Failed to fetch service providers');
    const data = await res.json();
    return data.providers || [];
  },

  async getKnownIssues(categoryId?: number): Promise<KnownIssue[]> {
    const url = categoryId ? `${API_BASE}/repair-kb/issues?category_id=${categoryId}` : `${API_BASE}/repair-kb/issues`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch known issues');
    const data = await res.json();
    return data.issues || [];
  },

  async getOrganizations(): Promise<Organization[]> {
    const res = await fetch(`${API_BASE}/repair-kb/organizations`);
    if (!res.ok) throw new Error('Failed to fetch organizations');
    const data = await res.json();
    return data.organizations || [];
  },

  async uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Upload failed');
    }
    return res.json();
  },

  async getStatus(): Promise<{ engine: string; details: string; status: string }> {
    const res = await fetch(`${API_BASE}/status`);
    if (!res.ok) throw new Error('Failed to check backend status');
    return res.json();
  }
};
