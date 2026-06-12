import whois from 'whois-json';

export interface WhoisResult {
  domainName?: string;
  creationDate?: string;
  registrar?: string;
  error?: string;
}

export async function lookupDomain(domain: string): Promise<WhoisResult> {
  try {
    const results = await whois(domain);
    
    return {
      domainName: results.domainName || results.domain,
      creationDate: results.creationDate || results.created,
      registrar: results.registrar,
    };
  } catch (error) {
    console.error("WHOIS lookup error:", error);
    return { error: "Failed to lookup domain details." };
  }
}
