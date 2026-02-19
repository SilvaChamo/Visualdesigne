// API Integration com MozServer
const MOZSERVER_CONFIG = {
  baseURL: 'https://mozserver.co.mz/api',
  token: 'JI9ZP78LANWNSAU38BC60OX3TM0PQP3G',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer JI9ZP78LANWNSAU38BC60OX3TM0PQP3G`
  }
}

// Verificar se a API está acessível
export async function checkApiConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${MOZSERVER_CONFIG.baseURL}/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MOZSERVER_CONFIG.token}`
      },
      signal: AbortSignal.timeout(5000) // Timeout de 5 segundos
    });
    
    return response.ok;
  } catch (error) {
    console.warn('API não está acessível:', error);
    return false;
  }
}

// Tipos de resposta
export interface DomainResponse {
  available: boolean;
  price?: number;
  currency?: string;
  period?: number;
  error?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Verificar disponibilidade de domínio
export async function checkDomainAvailability(domain: string, tld: string = '.mz'): Promise<DomainResponse> {
  try {
    const response = await fetch(`${MOZSERVER_CONFIG.baseURL}/check-domain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MOZSERVER_CONFIG.token}`
      },
      body: JSON.stringify({
        domain: domain,
        tld: tld
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      available: result.available || false,
      price: result.price,
      currency: result.currency,
      period: result.period,
      error: result.error
    };
  } catch (error) {
    console.error('Error checking domain availability:', error);
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Failed to check domain availability'
    };
  }
}

// Registrar domínio
export async function registerDomain(domain: string, tld: string = '.mz', period: number = 1): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${MOZSERVER_CONFIG.baseURL}/register-domain`, {
      method: 'POST',
      headers: MOZSERVER_CONFIG.headers,
      body: JSON.stringify({
        domain: domain,
        tld: tld,
        period: period
      })
    });

    return await response.json();
  } catch (error) {
    console.error('Error registering domain:', error);
    return {
      success: false,
      error: 'Failed to register domain'
    };
  }
}

// Obter lista de domínios registrados
export async function getRegisteredDomains(): Promise<ApiResponse<any[]>> {
  try {
    const response = await fetch(`${MOZSERVER_CONFIG.baseURL}/domains`, {
      method: 'GET',
      headers: MOZSERVER_CONFIG.headers
    });

    return await response.json();
  } catch (error) {
    console.error('Error fetching domains:', error);
    return {
      success: false,
      error: 'Failed to fetch domains'
    };
  }
}

// Obter preços de domínios
export async function getDomainPrices(): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${MOZSERVER_CONFIG.baseURL}/domain-prices`, {
      method: 'GET',
      headers: MOZSERVER_CONFIG.headers
    });

    return await response.json();
  } catch (error) {
    console.error('Error fetching domain prices:', error);
    return {
      success: false,
      error: 'Failed to fetch domain prices'
    };
  }
}

// Funções de Revendedor
export async function getRevendedorClients(): Promise<ApiResponse<any[]>> {
  try {
    const response = await fetch(`${MOZSERVER_CONFIG.baseURL}/reseller/clients`, {
      method: 'GET',
      headers: MOZSERVER_CONFIG.headers
    });

    return await response.json();
  } catch (error) {
    console.error('Error fetching reseller clients:', error);
    return {
      success: false,
      error: 'Failed to fetch reseller clients'
    };
  }
}

export async function createClientAccount(clientData: any): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${MOZSERVER_CONFIG.baseURL}/reseller/create-client`, {
      method: 'POST',
      headers: MOZSERVER_CONFIG.headers,
      body: JSON.stringify(clientData)
    });

    return await response.json();
  } catch (error) {
    console.error('Error creating client account:', error);
    return {
      success: false,
      error: 'Failed to create client account'
    };
  }
}

export async function suspendClient(clientId: string): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${MOZSERVER_CONFIG.baseURL}/reseller/suspend/${clientId}`, {
      method: 'POST',
      headers: MOZSERVER_CONFIG.headers
    });

    return await response.json();
  } catch (error) {
    console.error('Error suspending client:', error);
    return {
      success: false,
      error: 'Failed to suspend client'
    };
  }
}

export async function deleteClient(clientId: string): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${MOZSERVER_CONFIG.baseURL}/reseller/delete/${clientId}`, {
      method: 'DELETE',
      headers: MOZSERVER_CONFIG.headers
    });

    return await response.json();
  } catch (error) {
    console.error('Error deleting client:', error);
    return {
      success: false,
      error: 'Failed to delete client'
    };
  }
}

export async function sendNotificationEmail(clientEmail: string, subject: string, message: string): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${MOZSERVER_CONFIG.baseURL}/reseller/send-notification`, {
      method: 'POST',
      headers: MOZSERVER_CONFIG.headers,
      body: JSON.stringify({
        email: clientEmail,
        subject: subject,
        message: message
      })
    });

    return await response.json();
  } catch (error) {
    console.error('Error sending notification email:', error);
    return {
      success: false,
      error: 'Failed to send notification email'
    };
  }
}
