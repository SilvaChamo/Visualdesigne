// VHM API Integration
// Real connection to user's VHM hosting system
// Note: Due to CORS restrictions, we'll use a proxy approach

export interface VHMClient {
  id: string;
  username: string;
  domain: string;
  plan: string;
  status: 'active' | 'suspended' | 'terminated';
  created: string;
  expires: string;
  disk_usage: number;
  disk_limit: number;
  bandwidth_usage: number;
  bandwidth_limit: number;
  email: string;
  package: string;
  ip: string;
}

export interface VHMPlan {
  name: string;
  quota: number;
  bandwidth: number;
  maxftp: number;
  maxsql: number;
  maxpop: number;
  maxlst: number;
  maxsub: number;
  maxpark: number;
  maxaddon: number;
  shell: boolean;
  cgi: boolean;
  frontpage: boolean;
  cpmod: string;
}

export interface VHMStats {
  total_clients: number;
  active_clients: number;
  suspended_clients: number;
  total_domains: number;
  disk_usage_total: number;
  bandwidth_usage_total: number;
}

class VHMAPI {
  private baseUrl: string;
  private username: string;
  private password: string;
  private sessionId: string | null = null;

  constructor() {
    this.baseUrl = 'https://za4.mozserver.com:2087';
    this.username = 'yknrnlev';
    this.password = 'FerramentasWeb#2020';
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    try {
      // Use our proxy API to bypass CORS
      const proxyUrl = '/api/vhm-proxy'

      const requestBody = {
        endpoint,
        params
      }

      console.log('Making VHM API request via proxy:', endpoint, params)

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`Proxy error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('VHM API Response via proxy:', data);

      // Check for error in response
      if (data.error) {
        throw new Error(`VHM API Error: ${data.error}`);
      }

      // Handle raw response if present
      if (data.raw) {
        try {
          return JSON.parse(data.raw);
        } catch {
          return data.raw;
        }
      }

      return data;
    } catch (error) {
      console.error('VHM API Error:', error);
      throw error;
    }
  }


  async login(): Promise<boolean> {
    try {
      console.log('Verifying VHM Connection...');
      // Simple request that doesn't need much data
      const result = await this.makeRequest('/json-api/listaccts', { api_version: 1 });
      return !!(result && (result.acct || result.data?.acct || result.metadata?.result === 1));
    } catch (error) {
      console.error('VHM Connection verification failed:', error);
      return false;
    }
  }

  async getAllClients(): Promise<VHMClient[]> {
    try {
      const result = await this.makeRequest('/json-api/listaccts', { api_version: 1 });

      // Handle both v0 (result.acct) and v1 (result.data.acct) formats
      const accounts = result.acct || result.data?.acct || [];

      return accounts.map((account: any) => ({
        id: account.user,
        username: account.user,
        domain: account.domain,
        plan: account.plan,
        status: account.suspended ? 'suspended' : 'active',
        created: account.startdate,
        expires: account.enddate || 'N/A',
        disk_usage: parseFloat(account.diskused) || 0,
        disk_limit: parseFloat(account.disklimit) || 0,
        bandwidth_usage: parseFloat(account.bandwidthused) || 0,
        bandwidth_limit: parseFloat(account.bandwidthlimit) || 0,
        email: account.email || 'N/A',
        package: account.package,
        ip: account.ip || 'N/A'
      }));
    } catch (error) {
      console.error('Failed to fetch all VHM clients:', error);
      throw error;
    }
  }

  async getClients(): Promise<VHMClient[]> {
    return this.getAllClients();
  }

  async getPlans(): Promise<VHMPlan[]> {
    try {
      const result = await this.makeRequest('/json-api/listpkgs', { api_version: 1 });

      const packages = result.pkg || result.data?.pkg || result.package || result.data?.package || [];

      return packages.map((pkg: any) => ({
        name: pkg.name,
        quota: parseFloat(pkg.quota) || 0,
        bandwidth: parseFloat(pkg.bandwidth) || 0,
        maxftp: parseInt(pkg.maxftp) || 0,
        maxsql: parseInt(pkg.maxsql) || 0,
        maxpop: parseInt(pkg.maxpop) || 0,
        maxlst: parseInt(pkg.maxlst) || 0,
        maxsub: parseInt(pkg.maxsub) || 0,
        maxpark: parseInt(pkg.maxpark) || 0,
        maxaddon: parseInt(pkg.maxaddon) || 0,
        shell: pkg.shell === '1',
        cgi: pkg.cgi === '1',
        frontpage: pkg.frontpage === '1',
        cpmod: pkg.cpmod || 'x3'
      }));
    } catch (error) {
      console.error('Failed to fetch VHM plans:', error);
      throw error;
    }
  }

  async getStats(): Promise<VHMStats> {
    try {
      const result = await this.makeRequest('/json-api/showbw', { api_version: 1 });

      const bandwidthList = result.bandwidth || result.data?.bandwidth || [];
      const totalClients = bandwidthList.length;
      const totalDisk = bandwidthList.reduce((acc: number, item: any) => acc + (parseFloat(item.totalusage) || 0), 0);

      return {
        total_clients: totalClients,
        active_clients: bandwidthList.filter((b: any) => !b.suspended).length,
        suspended_clients: bandwidthList.filter((b: any) => b.suspended).length,
        total_domains: totalClients,
        disk_usage_total: totalDisk,
        bandwidth_usage_total: bandwidthList.reduce((acc: number, item: any) => acc + (parseFloat(item.bwused) || 0), 0)
      };
    } catch (error) {
      console.error('Failed to fetch VHM stats:', error);
      throw error;
    }
  }

  async suspendClient(username: string): Promise<boolean> {
    try {
      console.log(`Simulating suspend client: ${username}`);
      return true;
    } catch (error) {
      console.error('Failed to suspend client:', error);
      return false;
    }
  }

  async unsuspendClient(username: string): Promise<boolean> {
    try {
      console.log(`Simulating unsuspend client: ${username}`);
      return true;
    } catch (error) {
      console.error('Failed to unsuspend client:', error);
      return false;
    }
  }

  async terminateClient(username: string): Promise<boolean> {
    try {
      console.log(`Simulating terminate client: ${username}`);
      return true;
    } catch (error) {
      console.error('Failed to terminate client:', error);
      return false;
    }
  }

  async createClient(params: {
    username: string;
    domain: string;
    password: string;
    plan: string;
    email: string;
  }): Promise<boolean> {
    try {
      console.log('Simulating create client:', params);
      return true;
    } catch (error) {
      console.error('Failed to create client:', error);
      return false;
    }
  }

  async createAccount(data: {
    domain: string;
    username: string;
    password?: string;
    plan: string;
    contactemail: string;
    dkim?: number;
    spf?: number;
    cgi?: number;
    quota?: number;
    bwlimit?: number;
  }): Promise<any> {
    try {
      console.log('Creating new account:', data);
      const result = await this.makeRequest('/json-api/createacct', {
        ...data,
        api_version: 1
      });
      return result;
    } catch (error) {
      console.error('Failed to create account:', error);
      throw error;
    }
  }

  async updateClient(username: string, updates: { email?: string; quota?: number }): Promise<boolean> {
    try {
      console.log(`Updating client ${username}:`, updates);

      const results = [];

      // 1. Update Email if provided
      if (updates.email) {
        results.push(await this.makeRequest('/json-api/modifyacct', {
          user: username,
          contactemail: updates.email,
          api_version: 1
        }));
      }

      // 2. Update Quota if provided
      if (updates.quota !== undefined) {
        results.push(await this.makeRequest('/json-api/editquota', {
          user: username,
          quota: updates.quota,
          api_version: 1
        }));
      }

      // Check if all requests were successful
      return results.every(res => res.metadata?.result === 1 || res.result?.[0]?.status === 1 || res.status === 1);
    } catch (error) {
      console.error('Failed to update client:', error);
      return false;
    }
  }

  async changePassword(username: string, newPassword: string): Promise<boolean> {
    try {
      console.log(`Simulating change password for: ${username}`);
      return true;
    } catch (error) {
      console.error('Failed to change password:', error);
      return false;
    }
  }

  async getAccountUsage(username: string): Promise<any> {
    try {
      const result = await this.makeRequest('/json-api/showbw', {
        user: username,
        api_version: 1
      });

      return result;
    } catch (error) {
      console.error('Failed to get account usage:', error);
      throw error;
    }
  }
}

export const vhmAPI = new VHMAPI();
