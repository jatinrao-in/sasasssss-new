const { sendMSG91WhatsApp } = require('../lib/msg91');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  
  // Basic auth check using a shared secret
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.VERCEL_API_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { to, templateName, components } = req.body;
  
  if (!to || !templateName) {
    return res.status(400).json({ error: 'Missing required parameters (to, templateName)' });
  }

  try {
    const result = await sendMSG91WhatsApp({ to, templateName, components });
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
