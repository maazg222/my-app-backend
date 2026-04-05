const axios = require('axios');
const crypto = require('crypto');

const MAIL_TM_API = 'https://api.mail.tm';
const MAIL_GW_API = 'https://api.mail.gw';
const SEC_MAIL_API = 'https://www.1secmail.com/api/v1/';
const DROPMAIL_API = 'https://dropmail.me/api/graphql';
const DROPMAIL_TOKEN = 'af_AQVp0bVEih1QFGYtRdmr43o0FqCZaxXBrtB93QCR';

// Helper to clean up DropMail sender address and show website name
const cleanDropMailSender = (fromAddr, subject = '') => {
  if (!fromAddr) return { address: '', name: 'Unknown' };
  
  // If it's in "Name <email@domain.com>" format
  const match = fromAddr.match(/^(.*)<(.*)>$/);
  if (match) {
    let name = match[1].trim();
    name = name.replace(/^["'](.*)["']$/, '$1');
    if (name && name.length > 1) return { address: match[2].trim(), name: name };
  }

  // If the subject contains a known pattern like "TRAE EMAIL VERIFICATION", extract "TRAE"
  if (subject) {
    const subMatch = subject.match(/^([A-Za-z0-9]+)\s+EMAIL/i) || subject.match(/^([A-Za-z0-9]+)\s+Verification/i);
    if (subMatch && subMatch[1]) {
      return { address: fromAddr, name: subMatch[1].toUpperCase() };
    }
  }

  // If it's a bounce/VERP address like bounces+...=example.com@...
  if (fromAddr.toLowerCase().includes('bounces+') && fromAddr.includes('=')) {
    const parts = fromAddr.split('=');
    if (parts.length > 1) {
      let domainPart = parts[1].split('@')[0];
      const name = domainPart.split('.')[0].toUpperCase();
      return { address: fromAddr, name: name };
    }
  }

  // Extract domain and use as name (e.g., service@paypal.com -> Paypal)
  if (fromAddr.includes('@')) {
    const domain = fromAddr.split('@')[1];
    if (domain) {
      const mainDomain = domain.split('.')[domain.split('.').length - 2];
      if (mainDomain) {
        const name = mainDomain.toUpperCase();
        return { address: fromAddr, name: name };
      }
    }
  }

  return { address: fromAddr, name: fromAddr.split('@')[0].toUpperCase() || 'Unknown' };
};

// Helper to clean markdown images and links from intro text and extract logo if present
const processIntroText = (text) => {
  if (!text) return { cleaned: '', logo: null };
  
  let logo = null;
  // Try to extract logo URL from markdown image syntax [![logo]](link) or ![logo](link)
  const logoMatch = text.match(/\[!\[.*?\]\]\((.*?)\)/) || text.match(/!\[.*?\]\((.*?)\)/);
  if (logoMatch && logoMatch[1]) {
    logo = logoMatch[1];
  }

  // Remove markdown image syntax
  let cleaned = text.replace(/\[!\[.*?\]\]\(.*?\)/g, '');
  cleaned = cleaned.replace(/!\[.*?\]\(.*?\)/g, '');
  // Remove markdown link syntax [text](link) but keep the text
  cleaned = cleaned.replace(/\[(.*?)\]\(.*?\)/g, '$1');
  // Remove extra whitespace and dashes
  cleaned = cleaned.replace(/-{3,}/g, '');
  cleaned = cleaned.trim().substring(0, 100);

  return { cleaned, logo };
};

class MailService {
  /**
   * Universal fetch for Mail.tm/Mail.gw style APIs
   */
  async getDomains(apiUrl) {
    try {
      const response = await axios.get(`${apiUrl}/domains`, { 
        timeout: 10000,
        headers: { 'Accept': 'application/json' }
      });
      const data = response.data;
      if (data && data['hydra:member']) return data['hydra:member'];
      if (Array.isArray(data)) return data;
      return [];
    } catch (error) {
      console.error(`API Domain error (${apiUrl}):`, error.message);
      return [];
    }
  }

  async createAccount(apiUrl, address, password) {
    try {
      const response = await axios.post(`${apiUrl}/accounts`, { address, password }, { timeout: 10000 });
      return response.data;
    } catch (error) {
      console.error(`API Account error (${apiUrl}):`, error.message);
      throw error;
    }
  }

  async login(apiUrl, address, password) {
    try {
      const response = await axios.post(`${apiUrl}/token`, { address, password }, { timeout: 10000 });
      return response.data.token;
    } catch (error) {
      console.error(`API Login error (${apiUrl}):`, error.message);
      throw error;
    }
  }

  async getMessages(apiUrl, token) {
    try {
      const response = await axios.get(`${apiUrl}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      return response.data['hydra:member'] || [];
    } catch (error) {
      console.error(`API Messages error (${apiUrl}):`, error.message);
      return [];
    }
  }

  async getMessageContent(apiUrl, id, token) {
    try {
      const response = await axios.get(`${apiUrl}/messages/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error(`API Message detail error (${apiUrl}):`, error.message);
      throw error;
    }
  }

  /**
   * 1SecMail methods
   */
  async getSecMailMessages(login, domain) {
    try {
      const response = await axios.get(`${SEC_MAIL_API}?action=getMessages&login=${login}&domain=${domain}`, { timeout: 10000 });
      return response.data || [];
    } catch (error) {
      console.error('1SecMail Messages error:', error.message);
      return [];
    }
  }

  async getSecMailMessageContent(login, domain, id) {
    try {
      const response = await axios.get(`${SEC_MAIL_API}?action=readMessage&login=${login}&domain=${domain}&id=${id}`, { timeout: 10000 });
      return response.data;
    } catch (error) {
      console.error('1SecMail Message detail error:', error.message);
      throw error;
    }
  }

  /**
   * DropMail methods
   */
  async getDropMailDomains() {
    try {
      const query = `
        query {
          domains {
            name
          }
        }
      `;
      const response = await axios.post(`${DROPMAIL_API}/${DROPMAIL_TOKEN}`, { query }, { 
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.data && response.data.data && response.data.data.domains) {
        return response.data.data.domains.map(d => d.name);
      }
      return [];
    } catch (error) {
      console.error('DropMail Domains error:', error.message);
      return [];
    }
  }

  async createDropMailSession(customEmail) {
    if (customEmail) {
      throw new Error('Custom addresses are currently not supported by DropMail domains. Please use Random mode or choose a 1secmail.com domain for custom names.');
    }
    try {
      const query = `
        mutation {
          introduceSession {
            id
            expiresAt
            addresses {
              address
            }
          }
        }
      `;
      
      const response = await axios.post(`${DROPMAIL_API}/${DROPMAIL_TOKEN}`, { query }, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });

      // GraphQL can return 200 with errors in the body
      if (response.data?.errors) {
        throw new Error(response.data.errors[0].message);
      }

      const session = response.data?.data?.introduceSession;
      if (session && session.addresses && session.addresses.length > 0) {
        return {
          id: session.id,
          email: session.addresses[0].address,
          expiresAt: session.expiresAt
        };
      }
      
      throw new Error('Failed to create DropMail session');
    } catch (error) {
      console.error('DropMail Session error:', error.response?.data || error.message);
      throw error;
    }
  }

  async getDropMailMessages(login, domain, token) {
    try {
      const email = `${login}@${domain}`;
      console.log(`Fetching DropMail messages for: ${email}, token: ${token}`);
      
      let session;

      // Step 1: If token is a session ID, use it directly
      if (token && token.startsWith('U2Vzc2lvbj')) {
        console.log(`Using provided session ID: ${token}`);
        const fetchQuery = `
          query($id: ID!) {
            session(id: $id) {
              id
              mails {
                id
                fromAddr
                toAddr
                headerSubject
                text
                html
                receivedAt
              }
            }
          }
        `;
        const fetchResponse = await axios.post(`${DROPMAIL_API}/${DROPMAIL_TOKEN}`, { query: fetchQuery, variables: { id: token } }, {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (fetchResponse.data?.errors) {
          console.error('DropMail Session Query Error:', fetchResponse.data.errors[0].message);
        } else {
          session = fetchResponse.data?.data?.session;
        }
      }

      // Step 2: If session not found, try to find by address
      if (!session) {
        console.log(`Searching for session by address: ${email}`);
        const query = `
          query {
            sessions {
              id
              addresses {
                address
              }
              mails {
                id
                fromAddr
                toAddr
                headerSubject
                text
                html
                receivedAt
              }
            }
          }
        `;
        let response = await axios.post(`${DROPMAIL_API}/${DROPMAIL_TOKEN}`, { query }, {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.data?.errors) {
          console.error('DropMail Sessions Query Error:', response.data.errors[0].message);
        } else {
          let sessions = response.data?.data?.sessions || [];
          session = sessions.find(s => s.addresses.some(a => a.address === email));
        }
      }

      // Step 3: If still not found, create/restore it
      if (!session) {
        console.log(`Session not found for ${email}, creating/restoring...`);
        const mutation = `
          mutation($email: String!) {
            introduceSession(input: { withAddress: { address: $email }}) {
              id
              addresses {
                address
              }
            }
          }
        `;
        const variables = { email };
        const mutResponse = await axios.post(`${DROPMAIL_API}/${DROPMAIL_TOKEN}`, { query: mutation, variables }, {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (mutResponse.data?.errors) {
           console.error('DropMail Mutation Error:', mutResponse.data.errors[0].message);
        } else {
          const newSessionId = mutResponse.data?.data?.introduceSession?.id;
          if (newSessionId) {
            // Re-fetch to get mails
            const fetchQuery = `
              query($id: ID!) {
                session(id: $id) {
                  mails {
                    id
                    fromAddr
                    toAddr
                    headerSubject
                    text
                    html
                    receivedAt
                  }
                }
              }
            `;
            const fetchResponse = await axios.post(`${DROPMAIL_API}/${DROPMAIL_TOKEN}`, { query: fetchQuery, variables: { id: newSessionId } }, {
              timeout: 10000,
              headers: { 'Content-Type': 'application/json' }
            });
            
            if (fetchResponse.data?.errors) {
              console.error('DropMail Session Query Error after mutation:', fetchResponse.data.errors[0].message);
            } else {
              session = fetchResponse.data?.data?.session;
            }
          }
        }
      }

      if (session && session.mails) {
        console.log(`Found ${session.mails.length} messages for ${email}`);
        return session.mails.map(m => {
          const senderInfo = cleanDropMailSender(m.fromAddr, m.headerSubject);
          const { cleaned, logo } = processIntroText(m.text);
          return {
            id: m.id,
            from: { address: senderInfo.address, name: senderInfo.name, logo: logo },
            subject: m.headerSubject,
            intro: cleaned,
            text: m.text,
            html: [m.html],
            createdAt: m.receivedAt || new Date().toISOString()
          };
        });
      }
      
      console.log(`No messages found for ${email}`);
      return [];
    } catch (error) {
      console.error('DropMail Messages error details:', error.response?.data || error.message);
      return [];
    }
  }
}

module.exports = {
  mailService: new MailService(),
  MAIL_TM_API,
  MAIL_GW_API,
  DROPMAIL_API,
  DROPMAIL_TOKEN
};

