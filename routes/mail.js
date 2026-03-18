const express = require('express');
const router = express.Router();
const { mailService, MAIL_TM_API, MAIL_GW_API, DROPMAIL_TOKEN } = require('../services/mailService');

// Helper to determine API URL based on provider name
const getApiUrl = (provider) => {
  if (provider === 'mail.gw') return MAIL_GW_API;
  return MAIL_TM_API; // default to mail.tm
};

// Get Domains from all providers
router.get('/domains', async (req, res) => {
  console.log('Fetching domains from all providers...');
  try {
    const [tmDomains, gwDomains, dropMailDomains] = await Promise.all([
      mailService.getDomains(MAIL_TM_API).catch(e => { console.error('TM Error:', e.message); return []; }),
      mailService.getDomains(MAIL_GW_API).catch(e => { console.error('GW Error:', e.message); return []; }),
      mailService.getDropMailDomains().catch(e => { console.error('DropMail Error:', e.message); return []; })
    ]);

    const domains = [
      ...tmDomains.map(d => ({ domain: d.domain, provider: 'mail.tm' })),
      ...gwDomains.map(d => ({ domain: d.domain, provider: 'mail.gw' })),
      ...dropMailDomains.map(d => ({ domain: d, provider: 'dropmail' })),
      // Reliable DropMail Mirror Domains (Replacements for 1SecMail)
      { domain: '10mail.info', provider: 'dropmail' },
      { domain: '10mail.org', provider: 'dropmail' },
      { domain: '10mail.xyz', provider: 'dropmail' },
      { domain: 'emlhub.com', provider: 'dropmail' },
      { domain: 'emlpro.com', provider: 'dropmail' },
      { domain: 'emltmp.com', provider: 'dropmail' },
      { domain: 'freeml.net', provider: 'dropmail' },
      { domain: 'mail2me.co', provider: 'dropmail' },
      { domain: 'mailpwr.com', provider: 'dropmail' },
      { domain: 'mailtowin.com', provider: 'dropmail' },
      { domain: 'maximail.fyi', provider: 'dropmail' },
      { domain: 'maximail.vip', provider: 'dropmail' },
      { domain: 'mimimail.me', provider: 'dropmail' },
      { domain: 'pickmail.org', provider: 'dropmail' },
      { domain: 'pickmemail.com', provider: 'dropmail' },
      { domain: 'picomail.biz', provider: 'dropmail' },
      { domain: 'spymail.one', provider: 'dropmail' },
      { domain: 'yomail.info', provider: 'dropmail' }
    ];

    console.log(`Fetched ${domains.length} domains in total.`);
    res.json(domains);
  } catch (error) {
    console.error('Fatal error in /domains:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create Account (Mail.tm or Mail.gw)
router.post('/accounts', async (req, res) => {
  const { address, password, provider } = req.body;
  const apiUrl = getApiUrl(provider);
  
  try {
    const account = await mailService.createAccount(apiUrl, address, password);
    res.status(201).json(account);
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to create account.';
    res.status(400).json({ error: message });
  }
});

// Login and Get Token (Mail.tm or Mail.gw)
router.post('/token', async (req, res) => {
  const { address, password, provider } = req.body;
  const apiUrl = getApiUrl(provider);

  try {
    const token = await mailService.login(apiUrl, address, password);
    res.json({ token });
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Authentication failed.';
    res.status(401).json({ error: message });
  }
});

// Initialize DropMail Session
router.post('/dropmail/session', async (req, res) => {
  const { email } = req.body;
  try {
    const session = await mailService.createDropMailSession(email);
    res.json(session);
  } catch (error) {
    const message = error.response?.data?.errors?.[0]?.message || error.message;
    res.status(400).json({ error: message });
  }
});

// Get Messages
router.get('/messages', async (req, res) => {
  const { provider, token, login, domain } = req.query;
  try {
    if (provider === 'mail.tm' || provider === 'mail.gw') {
      const apiUrl = getApiUrl(provider);
      const messages = await mailService.getMessages(apiUrl, token);
      return res.json(messages);
    } else if (provider === 'dropmail') {
      const messages = await mailService.getDropMailMessages(login, domain, token);
      return res.json(messages);
    } else {
      const messages = await mailService.getSecMailMessages(login, domain);
      return res.json(messages);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Message Content
router.get('/messages/:id', async (req, res) => {
  const { id } = req.params;
  const { provider, token, login, domain } = req.query;
  try {
    if (provider === 'mail.tm' || provider === 'mail.gw') {
      const apiUrl = getApiUrl(provider);
      const message = await mailService.getMessageContent(apiUrl, id, token);
      return res.json(message);
    } else if (provider === 'dropmail') {
      const messages = await mailService.getDropMailMessages(login, domain, token);
      const message = messages.find(m => m.id === id);
      return res.json(message || { error: 'Message not found' });
    } else {
      const message = await mailService.getSecMailMessageContent(login, domain, id);
      return res.json(message);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
