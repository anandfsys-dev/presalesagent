/**
 * Salesforce API Client
 * Handles authentication and API calls to Salesforce
 */

interface SalesforceAuthResponse {
  access_token: string;
  instance_url: string;
  id: string;
  token_type: string;
  issued_at: string;
  signature: string;
}

interface SalesforceUserInfo {
  user_id: string;
  organization_id: string;
  username: string;
  display_name: string;
  email: string;
}

interface SalesforceOrgInfo {
  Id: string;
  Name: string;
  OrganizationType: string;
  IsSandbox: boolean;
}

export class SalesforceClient {
  private accessToken: string;
  private instanceUrl: string;
  private apiVersion: string;

  constructor(accessToken: string, instanceUrl: string, apiVersion = '59.0') {
    this.accessToken = accessToken;
    this.instanceUrl = instanceUrl;
    this.apiVersion = apiVersion;
  }

  /**
   * Authenticate with Salesforce using username/password flow
   */
  static async authenticate(
    username: string,
    password: string,
    securityToken: string,
    loginUrl: string
  ): Promise<SalesforceAuthResponse> {
    // For username/password flow, we need to use SOAP login or connected app
    // This is a simplified implementation using username-password OAuth flow
    const tokenUrl = `${loginUrl}/services/oauth2/token`;

    // Note: In production, you'd use a Connected App with OAuth
    // This is a placeholder for the SOAP login approach
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: process.env.SALESFORCE_CLIENT_ID || '',
        client_secret: process.env.SALESFORCE_CLIENT_SECRET || '',
        username: username,
        password: `${password}${securityToken}`,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_description || 'Authentication failed');
    }

    return response.json();
  }

  /**
   * Get user info from Salesforce
   */
  async getUserInfo(): Promise<SalesforceUserInfo> {
    return this.request<SalesforceUserInfo>('/services/oauth2/userinfo');
  }

  /**
   * Get organization info
   */
  async getOrgInfo(): Promise<SalesforceOrgInfo> {
    const userInfo = await this.getUserInfo();
    const response = await this.query<SalesforceOrgInfo>(
      `SELECT Id, Name, OrganizationType, IsSandbox FROM Organization WHERE Id = '${userInfo.organization_id}'`
    );
    return response.records[0];
  }

  /**
   * Execute a SOQL query
   */
  async query<T = Record<string, unknown>>(soql: string): Promise<{ records: T[]; totalSize: number; done: boolean }> {
    const encodedQuery = encodeURIComponent(soql);
    return this.request(`/services/data/v${this.apiVersion}/query?q=${encodedQuery}`);
  }

  /**
   * Create a record
   */
  async create(objectType: string, data: Record<string, unknown>): Promise<{ id: string; success: boolean; errors: unknown[] }> {
    return this.request(`/services/data/v${this.apiVersion}/sobjects/${objectType}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Create a record with enhanced error handling
   */
  async createRecord(objectType: string, data: Record<string, unknown>): Promise<{ success: boolean; id?: string; errors?: string[] }> {
    try {
      const result = await this.request<{ id: string; success: boolean; errors: Array<{ message: string }> }>(
        `/services/data/v${this.apiVersion}/sobjects/${objectType}`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      return {
        success: true,
        id: result.id,
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Update a record
   */
  async update(objectType: string, id: string, data: Record<string, unknown>): Promise<void> {
    await this.request(`/services/data/v${this.apiVersion}/sobjects/${objectType}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete a record
   */
  async delete(objectType: string, id: string): Promise<void> {
    await this.request(`/services/data/v${this.apiVersion}/sobjects/${objectType}/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Composite request for batch operations
   */
  async composite(
    requests: Array<{
      method: string;
      url: string;
      referenceId: string;
      body?: Record<string, unknown>;
    }>
  ): Promise<{ compositeResponse: Array<{ body: unknown; httpStatusCode: number; referenceId: string }> }> {
    return this.request(`/services/data/v${this.apiVersion}/composite`, {
      method: 'POST',
      body: JSON.stringify({
        allOrNone: false,
        compositeRequest: requests,
      }),
    });
  }

  /**
   * Describe an object
   */
  async describe(objectType: string): Promise<Record<string, unknown>> {
    return this.request(`/services/data/v${this.apiVersion}/sobjects/${objectType}/describe`);
  }

  /**
   * Make a raw request to Salesforce API
   */
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = path.startsWith('http') ? path : `${this.instanceUrl}${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(Array.isArray(error) ? error[0]?.message : error.message || 'API request failed');
    }

    // Handle empty responses (like DELETE)
    const text = await response.text();
    return text ? JSON.parse(text) : ({} as T);
  }

  /**
   * Make a GET request to any Salesforce endpoint
   */
  async get<T = unknown>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * Make a POST request to any Salesforce endpoint with a payload
   */
  async post<T = unknown>(endpoint: string, data: Record<string, unknown>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Test connection by making a simple API call
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.request(`/services/data/v${this.apiVersion}/limits`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get API limits
   */
  async getLimits(): Promise<Record<string, { Max: number; Remaining: number }>> {
    return this.request(`/services/data/v${this.apiVersion}/limits`);
  }

  /**
   * Get all SObjects in the org
   */
  async getSObjects(): Promise<{ sobjects: Array<{ name: string; label: string; queryable: boolean; createable: boolean; custom: boolean }> }> {
    return this.request(`/services/data/v${this.apiVersion}/sobjects/`);
  }

  /**
   * Search records in an object using SOSL or SOQL
   * Returns Id and Name (or specified fields) for display in picker
   */
  async searchRecords(
    objectType: string,
    searchTerm?: string,
    limit: number = 50,
    nameField: string = 'Name'
  ): Promise<{ records: Array<{ Id: string; Name: string; [key: string]: unknown }>; totalSize: number }> {
    // Build SOQL query
    let soql: string;

    if (searchTerm && searchTerm.trim()) {
      // Search with LIKE clause
      const escapedTerm = searchTerm.replace(/'/g, "\\'");
      soql = `SELECT Id, ${nameField} FROM ${objectType} WHERE ${nameField} LIKE '%${escapedTerm}%' ORDER BY ${nameField} ASC LIMIT ${limit}`;
    } else {
      // Return recent records
      soql = `SELECT Id, ${nameField} FROM ${objectType} ORDER BY LastModifiedDate DESC LIMIT ${limit}`;
    }

    const result = await this.query<{ Id: string; [key: string]: unknown }>(soql);

    // Map to consistent format
    return {
      records: result.records.map(r => {
        const nameValue = r[nameField] as string || r.Id;
        return {
          ...r,
          Id: r.Id,
          Name: nameValue,
        };
      }),
      totalSize: result.totalSize
    };
  }

  /**
   * Get the name field for an object (some objects use different fields)
   */
  async getNameField(objectType: string): Promise<string> {
    try {
      const describe = await this.describe(objectType) as { fields: Array<{ name: string; nameField: boolean }> };
      const nameField = describe.fields.find(f => f.nameField);
      return nameField?.name || 'Name';
    } catch {
      return 'Name';
    }
  }
}

/**
 * Encrypt sensitive data for storage
 */
export function encryptToken(token: string): string {
  // In production, use proper encryption with a secret key
  // This is a placeholder - implement with crypto library
  return Buffer.from(token).toString('base64');
}

/**
 * Decrypt sensitive data
 */
export function decryptToken(encryptedToken: string): string {
  // In production, use proper decryption
  return Buffer.from(encryptedToken, 'base64').toString('utf-8');
}
