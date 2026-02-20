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

      console.log('Making VHM API request via proxy:', endpoint)

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        // Try to extract the detailed error message from the proxy
        let errorMessage = `Proxy error! status: ${response.status}`
        try {
          const errorBody = await response.json()
          if (errorBody.details) {
            errorMessage = errorBody.details
          } else if (errorBody.error) {
            errorMessage = errorBody.error
          }
        } catch {
          // If we can't parse JSON, use the default message
        }
        throw new Error(errorMessage)
      }

      const data = await response.json();
      console.log('VHM API Response via proxy:', endpoint, '→ OK');

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
      // Fetch both listaccts and showbw for most accurate picture
      const [acctsResult, bwResult] = await Promise.all([
        this.makeRequest('/json-api/listaccts', { api_version: 1 }),
        this.makeRequest('/json-api/showbw', { api_version: 1 })
      ]);

      const accounts = acctsResult.acct || acctsResult.data?.acct || [];
      const bandwidthList = bwResult.bandwidth || bwResult.data?.bandwidth || [];

      const totalClients = accounts.length;
      const activeClients = accounts.filter((a: any) => !a.suspended).length;
      const suspendedClients = accounts.filter((a: any) => a.suspended).length;

      // Calculate totals from account data (diskused is in MB)
      const diskUsageTotal = accounts.reduce((acc: number, accnt: any) => {
        const usedMB = accnt.diskused ? parseFloat(accnt.diskused.toString().replace(/[a-zA-Z]/g, '')) : 0;
        return acc + usedMB;
      }, 0) * 1024 * 1024; // Convert MB to Bytes for formatBytes()

      const bandwidthUsageTotal = bandwidthList.reduce((acc: number, item: any) => acc + (parseFloat(item.bwused) || 0), 0);

      return {
        total_clients: totalClients,
        active_clients: activeClients,
        suspended_clients: suspendedClients,
        total_domains: totalClients, // Main domains
        disk_usage_total: diskUsageTotal,
        bandwidth_usage_total: bandwidthUsageTotal
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

  async updateClient(username: string, updates: {
    email?: string;
    quota?: number;
    plan?: string;
    shell?: number;
    cgi?: number;
    bwlimit?: number;
    newDomain?: string;
  }): Promise<boolean> {
    try {
      console.log(`Updating client ${username}:`, updates);

      const results = [];

      // 1. Update Core Account Data (modifyacct covers most things)
      const modifyParams: any = {
        user: username,
        api_version: 1
      };

      if (updates.email) modifyParams.contactemail = updates.email;
      if (updates.plan) modifyParams.pkg = updates.plan;
      if (updates.shell !== undefined) modifyParams.shell = updates.shell;
      if (updates.cgi !== undefined) modifyParams.cgi = updates.cgi;
      if (updates.bwlimit !== undefined) modifyParams.bwlimit = updates.bwlimit;
      if (updates.newDomain) modifyParams.newdomain = updates.newDomain;

      if (Object.keys(modifyParams).length > 2) {
        results.push(await this.makeRequest('/json-api/modifyacct', modifyParams));
      }

      // 2. Update Quota if provided (separate endpoint usually)
      if (updates.quota !== undefined) {
        results.push(await this.makeRequest('/json-api/editquota', {
          user: username,
          quota: updates.quota,
          api_version: 1
        }));
      }

      // Check if all requests were successful
      return results.every(res =>
        res.metadata?.result === 1 ||
        res.result?.[0]?.status === 1 ||
        res.status === 1 ||
        res.data?.result === 1
      );
    } catch (error) {
      console.error('Failed to update client:', error);
      return false;
    }
  }

  async changePassword(username: string, password: string): Promise<boolean> {
    try {
      const result = await this.makeRequest('/json-api/passwd', {
        user: username,
        pass: password,
        api_version: 1
      });
      return result.metadata?.result === 1 || result.status === 1;
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

  async getMailDeliveryReports(filters: {
    recipient?: string;
    sender?: string;
    startTime?: number; // Unix timestamp
    endTime?: number;   // Unix timestamp
  } = {}): Promise<any[]> {
    try {
      const params: any = {
        api_version: 1,
        'api.filter.enable': 1,
      };

      let filterCount = 0;
      const addFilter = (field: string, value: string | number, type: string = 'contains') => {
        const prefix = `api.filter.${String.fromCharCode(97 + filterCount)}`; // a, b, c...
        params[`${prefix}.field`] = field;
        params[`${prefix}.arg0`] = value;
        params[`${prefix}.type`] = type;
        filterCount++;
      };

      if (filters.recipient) addFilter('recipient', filters.recipient);
      if (filters.sender) addFilter('sender', filters.sender);
      if (filters.startTime) addFilter('sendunixtime', filters.startTime, 'gt');
      if (filters.endTime) addFilter('sendunixtime', filters.endTime, 'lt');

      const result = await this.makeRequest('/json-api/emailtrack_search', params);

      // The results are usually in result.data or result.data.emailtrack
      return result.data || result.data?.emailtrack || result.emailtrack || [];
    } catch (error) {
      console.error('Failed to fetch mail delivery reports:', error);
      throw error;
    }
  }

  // --- Email Account Management (POP/IMAP) ---

  async getEmailAccounts(cpanelUser: string): Promise<any[]> {
    try {
      const result = await this.makeRequest('/json-api/list_pops_for', {
        user: cpanelUser,
        api_version: 1
      });
      // Handle various response structures
      const pops = result.data?.pops || result.pops || (Array.isArray(result.data) ? result.data : []);

      // Normalize: Ensure each account has an 'email' field
      return pops.map((acc: any) => ({
        ...acc,
        email: acc.email || (acc.user && acc.domain ? `${acc.user}@${acc.domain}` : acc.user)
      }));
    } catch (error) {
      console.error(`Failed to list email accounts for ${cpanelUser}:`, error);
      throw error;
    }
  }

  async createEmailAccount(cpanelUser: string, params: {
    email: string;
    domain: string;
    password: string;
    quota: number;
  }): Promise<boolean> {
    try {
      const result = await this.makeRequest('/json-api/addpop', {
        user: cpanelUser,
        email: params.email,
        domain: params.domain,
        password: params.password,
        quota: params.quota,
        api_version: 1
      });
      return result.metadata?.result === 1 || result.status === 1;
    } catch (error) {
      console.error(`Failed to create email account for ${cpanelUser}:`, error);
      return false;
    }
  }

  async deleteEmailAccount(cpanelUser: string, email: string, domain: string): Promise<boolean> {
    try {
      const result = await this.makeRequest('/json-api/delpop', {
        user: cpanelUser,
        email: email,
        domain: domain,
        api_version: 1
      });
      return result.metadata?.result === 1 || result.status === 1;
    } catch (error) {
      console.error(`Failed to delete email account ${email}@${domain}:`, error);
      return false;
    }
  }

  async updateEmailPassword(cpanelUser: string, email: string, domain: string, password: string): Promise<boolean> {
    try {
      const result = await this.makeRequest('/json-api/passwdpop', {
        user: cpanelUser,
        email: email,
        domain: domain,
        password: password,
        api_version: 1
      });
      return result.metadata?.result === 1 || result.status === 1;
    } catch (error) {
      console.error(`Failed to update password for ${email}@${domain}:`, error);
      return false;
    }
  }

  async updateEmailQuota(cpanelUser: string, email: string, domain: string, quota: number): Promise<boolean> {
    try {
      const result = await this.makeRequest('/json-api/editpopquota', {
        user: cpanelUser,
        email: email,
        domain: domain,
        quota: quota,
        api_version: 1
      });
      return result.metadata?.result === 1 || result.status === 1;
    } catch (error) {
      console.error(`Failed to update quota for ${email}@${domain}:`, error);
      return false;
    }
  }

  async createWebmailSession(cpanelUser: string, email: string): Promise<string | null> {
    try {
      const result = await this.makeRequest('/json-api/create_webmail_session_for_user', {
        user: cpanelUser,
        email: email,
        api_version: 1
      });

      if (result.metadata?.result === 1 || result.status === 1) {
        return result.data?.url || result.url || null;
      }
      return null;
    } catch (error) {
      console.error(`Failed to create webmail session for ${email}:`, error);
      return null;
    }
  }
}

export const vhmAPI = new VHMAPI();
