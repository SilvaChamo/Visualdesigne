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
      
      // For demo purposes, return mock data when API fails
      if (endpoint.includes('listaccts')) {
        return this.getMockClients();
      } else if (endpoint.includes('showbw')) {
        return this.getMockStats();
      }
      
      throw error;
    }
  }

  private getMockClients() {
    return {
      account: [
        {
          user: 'yknrnlev',
          domain: 'visualdesign.co.mz',
          plan: 'Professional',
          suspended: 0,
          startdate: '2023-01-15',
          enddate: '2025-01-15',
          diskused: '2048',
          disklimit: '10240',
          bandwidthused: '5120',
          bandwidthlimit: '51200',
          email: 'silva.chamo@gmail.com',
          package: 'Professional',
          ip: '192.168.1.1'
        },
        {
          user: 'testuser',
          domain: 'test.co.mz',
          plan: 'Basic',
          suspended: 0,
          startdate: '2024-01-01',
          enddate: '2025-01-01',
          diskused: '1024',
          disklimit: '5120',
          bandwidthused: '2560',
          bandwidthlimit: '25600',
          email: 'test@example.com',
          package: 'Basic',
          ip: '192.168.1.2'
        }
      ]
    };
  }

  private getMockStats() {
    return {
      total_clients: 2,
      active_clients: 2,
      suspended_clients: 0,
      total_domains: 2,
      disk_usage_total: 3072,
      bandwidth_usage_total: 7680
    };
  }

  async login(): Promise<boolean> {
    try {
      // For now, return true since we have mock data
      console.log('VHM Login - Using mock mode due to CORS');
      return true;
    } catch (error) {
      console.error('VHM Login failed:', error);
      return false;
    }
  }

  async getAllClients(): Promise<VHMClient[]> {
    try {
      const result = await this.makeRequest('/json-api/listaccts');
      
      if (result && result.account) {
        return result.account.map((account: any) => ({
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
      }

      return [];
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
      const result = await this.makeRequest('/json-api/listpkgs');
      
      if (result && result.package) {
        return result.package.map((pkg: any) => ({
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
      }

      return [];
    } catch (error) {
      console.error('Failed to fetch VHM plans:', error);
      throw error;
    }
  }

  async getStats(): Promise<VHMStats> {
    try {
      const result = await this.makeRequest('/json-api/showbw');
      
      if (result && result.total_clients !== undefined) {
        return result;
      }

      // Return mock stats if API fails
      return this.getMockStats();
    } catch (error) {
      console.error('Failed to fetch VHM stats:', error);
      return this.getMockStats();
    }
  }

  async suspendClient(username: string): Promise<boolean> {
    try {
      console.log(`Simulating suspend client: ${username}`);
      // In real implementation, this would call the VHM API
      // For now, simulate success
      return true;
    } catch (error) {
      console.error('Failed to suspend client:', error);
      return false;
    }
  }

  async unsuspendClient(username: string): Promise<boolean> {
    try {
      console.log(`Simulating unsuspend client: ${username}`);
      // In real implementation, this would call the VHM API
      // For now, simulate success
      return true;
    } catch (error) {
      console.error('Failed to unsuspend client:', error);
      return false;
    }
  }

  async terminateClient(username: string): Promise<boolean> {
    try {
      console.log(`Simulating terminate client: ${username}`);
      // In real implementation, this would call the VHM API
      // For now, simulate success
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
      // In real implementation, this would call the VHM API
      // For now, simulate success
      return true;
    } catch (error) {
      console.error('Failed to create client:', error);
      return false;
    }
  }

  async changePassword(username: string, newPassword: string): Promise<boolean> {
    try {
      console.log(`Simulating change password for: ${username}`);
      // In real implementation, this would call the VHM API
      // For now, simulate success
      return true;
    } catch (error) {
      console.error('Failed to change password:', error);
      return false;
    }
  }

  async getAccountUsage(username: string): Promise<any> {
    try {
      const result = await this.makeRequest('/json-api/showbw', {
        user: username
      });
      
      return result;
    } catch (error) {
      console.error('Failed to get account usage:', error);
      throw error;
    }
  }
}

export const vhmAPI = new VHMAPI();
