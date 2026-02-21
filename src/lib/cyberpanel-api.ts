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

export interface CyberPanelPackage {
    packageName: string;
    diskSpace: number;     // MB
    bandwidth: number;     // MB
    emailAccounts: number;
    dataBases: number;
    ftpAccounts: number;
    allowedDomains: number;
}

export interface CyberPanelEmail {
    email: string;
    quota: string;
    usage: string;
}

export interface WPInstallParams {
    domainName: string;
    wpTitle: string;
    wpUser: string;
    wpPassword: string;
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
        phpSelection: string;
    }): Promise<boolean> {
        try {
            const requestParams = {
                domainName: params.domainName,
                ownerEmail: params.ownerEmail,
                packageName: params.packageName,
                websiteOwner: 'admin',      // Defaulting to admin
                ownerPassword: 'RandomPassword123!', // Required by API but admin can access it anyway
                phpSelection: params.phpSelection
            };
            const result = await this.makeRequest('createWebsite', requestParams);
            return result.status === 1;
        } catch (error) {
            console.error('Failed to create website in CyberPanel:', error);
            return false;
        }
    }

    async installWordPress(params: WPInstallParams): Promise<boolean> {
        try {
            const requestParams = {
                domainName: params.domainName,
                wpTitle: params.wpTitle,
                wpUser: params.wpUser,
                wpPassword: params.wpPassword
            };

            // Usage of our specialized SSH-based WP install route
            // Because CyberPanel's REST API lacks a functional WP installer endpoint publicly
            const response = await fetch('/api/cyberpanel-wp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestParams),
            });

            const result = await response.json();

            if (!response.ok) {
                console.error(`Failed to install WordPress on ${params.domainName}:`, result.error || result.details);
                return false;
            }

            return result.success === true;
        } catch (error) {
            console.error(`Failed to install WordPress on ${params.domainName}:`, error);
            return false;
        }
    }

    // --- WP Manager & Operations ---

    async issueSSL(domainName: string): Promise<boolean> {
        try {
            const result = await this.makeRequest('issueSSL', { domainName });
            return result.status === 1 || result.success === 1;
        } catch (error) {
            console.error(`Failed to issue SSL for ${domainName}:`, error);
            return false;
        }
    }

    async wpAutoLogin(domainName: string): Promise<string | null> {
        try {
            // This attempts to call a CyberPanel native or plugin endpoint for WP AutoLogin
            const result = await this.makeRequest('wpAutoLogin', { domainName });
            if (result.status === 1 && result.token) {
                return `https://${domainName}/wp-login.php?cyberpanel_token=${result.token}`;
            }
            return null;
        } catch (error) {
            console.error(`Failed to get AutoLogin URL for ${domainName}:`, error);
            return null;
        }
    }

    async purgeLSCache(domainName: string): Promise<boolean> {
        try {
            const result = await this.makeRequest('purgeLSCache', { domainName });
            return result.status === 1 || result.success === 1;
        } catch (error) {
            console.error(`Failed to purge LSCache for ${domainName}:`, error);
            return false;
        }
    }

    async createBackup(domainName: string): Promise<boolean> {
        try {
            const result = await this.makeRequest('submitWebsiteBackup', { websiteName: domainName });
            return result.status === 1 || result.success === 1;
        } catch (error) {
            console.error(`Failed to create backup for ${domainName}:`, error);
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

    // --- Package Management ---

    async listPackages(): Promise<CyberPanelPackage[]> {
        try {
            // Some CyberPanel versions don't expose package lists natively via simple endpoints.
            // Using fetchPackages if available, or we will handle fallback in UI if it fails.
            const result = await this.makeRequest('fetchPackages');

            if (result.status === 1 && Array.isArray(result.data)) {
                return result.data.map((pkg: any) => ({
                    packageName: pkg.packageName,
                    diskSpace: pkg.diskSpace,
                    bandwidth: pkg.bandwidth,
                    emailAccounts: pkg.emailAccounts,
                    dataBases: pkg.dataBases,
                    ftpAccounts: pkg.ftpAccounts,
                    allowedDomains: pkg.allowedDomains
                }));
            }

            // Fallback: If the API doesn't return data, we can at least return the Default package
            return [{
                packageName: 'Default',
                diskSpace: 1000,
                bandwidth: 10000,
                emailAccounts: 10,
                dataBases: 1,
                ftpAccounts: 1,
                allowedDomains: 1
            }];
        } catch (error) {
            console.error('Failed to fetch CyberPanel packages:', error);
            // Fallback to ensuring at least 'Default' exists on error
            return [{
                packageName: 'Default',
                diskSpace: 1000,
                bandwidth: 10000,
                emailAccounts: 10,
                dataBases: 1,
                ftpAccounts: 1,
                allowedDomains: 1
            }];
        }
    }

    async createPackage(params: {
        packageName: string;
        diskSpace: number;     // MB
        bandwidth: number;     // MB
        emailAccounts: number;
        dataBases: number;
        ftpAccounts: number;
        allowedDomains: number;
    }): Promise<boolean> {
        try {
            // CyberPanel expects string endpoints, and these are the default API parameters for createPackage.
            const result = await this.makeRequest('createPackage', params);
            return result.status === 1 || result.success === 1 || !result.error_message;
        } catch (error) {
            console.error('Failed to create package in CyberPanel:', error);
            return false;
        }
    }

    async deletePackage(packageName: string): Promise<boolean> {
        try {
            const result = await this.makeRequest('deletePackage', { packageName });
            return result.status === 1 || result.success === 1 || !result.error_message;
        } catch (error) {
            console.error('Failed to delete package in CyberPanel:', error);
            return false;
        }
    }

    setCredentials(pass: string, user: string = 'admin') {
        this.adminPass = pass;
        this.adminUser = user;
    }
}

export const cyberPanelAPI = new CyberPanelAPI();
