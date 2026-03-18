const express = require('express');
const router = express.Router();

// Newsletter Subscription
router.post('/subscribe', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // In a real application, you would save this to a database 
    // or call an external service like Mailchimp/SendGrid
    console.log(`New newsletter subscription: ${email}`);
    
    // Simulate a bit of delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    res.status(200).json({ message: 'Successfully subscribed to newsletter!' });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
