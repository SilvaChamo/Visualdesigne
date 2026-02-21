// CyberPanel API Integration
// Library to manage the new private infrastructure (VPS 109.199.104.22)

export interface CyberPanelWebsite {
    domain: string;
    adminEmail: string;
    package: string;
    owner: string;
    status: 'Active' | 'Suspended';
    diskUsage: string;
    bandwidthUsage: string;
}

export interface CyberPanelEmail {
    email: string;
    quota: string;
    usage: string;
}

class CyberPanelAPI {
    private baseUrl: string;
    private adminUser: string = 'admin'; // Default administrator
    private adminPass: string = 'Vgz5Zat4uMyFt2tb';      // Set from user provided credentials

    constructor() {
        this.baseUrl = 'https://109.199.104.22:8090/api';
    }

    private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
        try {
            const proxyUrl = '/api/cyberpanel-proxy';

            // Always include admin credentials for CyberPanel API calls
            const requestBody = {
                endpoint,
                params: {
                    ...params,
                    adminUser: this.adminUser,
                    adminPass: this.adminPass
                }
            };

            console.log('Making CyberPanel API request via proxy:', endpoint);

            const response = await fetch(proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                let errorMessage = `CyberPanel Proxy error! status: ${response.status}`;
                try {
                    const errorBody = await response.json();
                    errorMessage = errorBody.details || errorBody.error || errorMessage;
                } catch { }
                throw new Error(errorMessage);
            }

            const data = await response.json();

            // CyberPanel API often returns status codes inside the data
            if (data.status === 0 || data.error_message) {
                throw new Error(`CyberPanel API Error: ${data.error_message || 'Unknown error'}`);
            }

            return data;
        } catch (error) {
            console.error('CyberPanel API Client Error:', error);
            throw error;
        }
    }

    // --- Website Management ---

    async listWebsites(): Promise<CyberPanelWebsite[]> {
        try {
            // Note: CyberPanel doesn't have a direct "listAll" in some API versions, 
            // sometimes we need to fetch info about the admin user
            const result = await this.makeRequest('fetchWebsites');

            if (result.status === 1 && Array.isArray(result.data)) {
                return result.data.map((site: any) => ({
                    domain: site.domain,
                    adminEmail: site.adminEmail,
                    package: site.package,
                    owner: site.owner,
                    status: site.status,
                    diskUsage: site.diskUsage,
                    bandwidthUsage: site.bandwidthUsage
                }));
            }
            return [];
        } catch (error) {
            console.error('Failed to fetch CyberPanel websites:', error);
            return [];
        }
    }

    async createWebsite(params: {
        domainName: string;
        ownerEmail: string;
        packageName: string;
        websiteOwner: string;
        ownerPassword: string;
    }): Promise<boolean> {
        try {
            const result = await this.makeRequest('createWebsite', params);
            return result.status === 1;
        } catch (error) {
            console.error('Failed to create website in CyberPanel:', error);
            return false;
        }
    }

    // --- Email Management ---

    async listEmails(domain: string): Promise<CyberPanelEmail[]> {
        try {
            const result = await this.makeRequest('fetchEmails', { domainName: domain });
            if (result.status === 1 && Array.isArray(result.data)) {
                return result.data;
            }
            return [];
        } catch (error) {
            console.error(`Failed to fetch emails for ${domain}:`, error);
            return [];
        }
    }

    async createEmail(params: {
        domainName: string;
        emailUser: string;
        emailPass: string;
        quota: number;
    }): Promise<boolean> {
        try {
            const result = await this.makeRequest('createEmail', params);
            return result.status === 1;
        } catch (error) {
            console.error('Failed to create email in CyberPanel:', error);
            return false;
        }
    }

    setCredentials(pass: string, user: string = 'admin') {
        this.adminPass = pass;
        this.adminUser = user;
    }
}

export const cyberPanelAPI = new CyberPanelAPI();
