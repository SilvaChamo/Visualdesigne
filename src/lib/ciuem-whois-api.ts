/**
 * CIUEM Whois.co.mz API Client
 * This client will handle direct communication with the Mozambique Domain Registrar (CIUEM).
 * Note: Requires API credentials (Key/Token) obtained after meeting the registrar's requirements.
 */

export interface CiuemDomain {
    domain: string;
    registrant: string;
    expiry_date: string;
    status: 'Active' | 'Pending' | 'Expired';
}

class CiuemWhoisAPI {
    private baseUrl = 'https://api.whois.co.mz/v1'; // Hypothetical or official endpoint once confirmed
    private apiKey: string | null = null;

    setCredentials(key: string) {
        this.apiKey = key;
    }

    private async request(endpoint: string, method: string = 'GET', body?: any) {
        if (!this.apiKey) throw new Error('Ciuem API Key not configured');

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: body ? JSON.stringify(body) : undefined
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'API Request failed' }));
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Check if a .mz domain is available
     */
    async checkAvailability(domain: string): Promise<{ available: boolean }> {
        // Implementation logic for WHOIS check
        try {
            const result = await this.request(`/check/${domain}`);
            return { available: result.status === 'available' };
        } catch (error) {
            console.error('Whois check failed:', error);
            return { available: false };
        }
    }

    /**
     * Register a new domain directly via CIUEM
     */
    async registerDomain(domainData: {
        domain: string;
        registrant_name: string;
        registrant_email: string;
        period_years: number;
    }): Promise<{ success: boolean; order_id?: string }> {
        try {
            const result = await this.request('/domains/register', 'POST', domainData);
            return { success: true, order_id: result.id };
        } catch (error) {
            console.error('Registration failed:', error);
            throw error;
        }
    }

    /**
     * Renew a domain
     */
    async renewDomain(domain: string, years: number): Promise<boolean> {
        try {
            await this.request(`/domains/${domain}/renew`, 'POST', { years });
            return true;
        } catch (error) {
            console.error('Renewal failed:', error);
            return false;
        }
    }
}

export const ciuemAPI = new CiuemWhoisAPI();
