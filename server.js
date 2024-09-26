const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const JWT_SECRET = 'bHw07UsqGpGetZJGTkAacfL6nTsNG4b1xRJXYHhD291OZ8Tado3TQbx3mNWfZqIvmFCzQ6VF9UN_AlRztOgngQ';
const APP_ID = '66ccec9cfa3e729fb760ee18';
const KEY_ID = 'app_66f48d644e5eda634ef2a78f'
const BASE_URL = 'https://d3v-collective.zendesk.com/sc/v2';


const HELP_CENTER_SUBDOMAIN = 'd3v-collective';
const HELP_CENTER_EMAIL = 'jleme@collective.com';
const HELP_CENTER_API_TOKEN = 'D73OvFi2UMy2IOm38e5eYqnl8XI2sC6w7tLvztQC';

// Middleware to authenticate requests
function authenticateToken(req, res, next) {
  const token = req.headers['authorization'];

  if (!token) return res.status(401).json({ error: 'Authorization token missing' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.appUserId = user.sub;
    req.appUserJwt = token;
    next();
  });
}

app.post('/auth', (req, res) => {
  const { userId } = req.body;

  const token = jwt.sign(
    {
      scope: 'app'
    },
    JWT_SECRET,
    {
      header: {
        alg: 'HS256',
        typ: 'JWT',
        kid: KEY_ID,
      },
      subject: userId,
    }
  );

  res.json({ token });
});

// Route to list all conversations for a user
app.get('/conversations', authenticateToken, async (req, res) => {

  try {
    console.log(`${BASE_URL}/apps/${APP_ID}/conversations?filter[userId]=${req.appUserId}`);
    const response = await axios.get(
      `${BASE_URL}/apps/${APP_ID}/conversations?filter[userId]=${req.appUserId}`,
      {
        headers: {
          Authorization: `Bearer ${req.appUserJwt}`,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res
      .status(500)
      .json({ error: error.response?.data || error.message });
  }
});

// Route to create a new conversation
app.post('/conversations', authenticateToken, async (req, res) => {
  try {
    console.log(`${BASE_URL}/apps/${APP_ID}/conversations`);
    const response = await axios.post(
      `${BASE_URL}/apps/${APP_ID}/conversations`,
      {
        type: 'personal',
        participants: [{ userId: req.appUserId }],
      },
      {
        headers: {
          Authorization: `Bearer ${req.appUserJwt}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res
      .status(500)
      .json({ error: error.response?.data || error.message });
  }
});

// Route to get messages in a conversation
app.get(
  '/conversations/:conversationId/messages',
  authenticateToken,
  async (req, res) => {
    const { conversationId } = req.params;
    console.log(`${BASE_URL}/apps/${APP_ID}/conversations/${conversationId}/messages`);
    try {
      const response = await axios.get(
        `${BASE_URL}/apps/${APP_ID}/conversations/${conversationId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${req.appUserJwt}`,
          },
        }
      );

      res.json(response.data);
    } catch (error) {
      console.error(error.response?.data || error.message);
      res
        .status(500)
        .json({ error: error.response?.data || error.message });
    }
  }
);

// Route to send a message in a conversation
app.post(
  '/conversations/:conversationId/messages',
  authenticateToken,
  async (req, res) => {
    const { conversationId } = req.params;
    const { text } = req.body;

    if (!text) return res.status(400).json({ error: 'text is required' });

    console.log(`${BASE_URL}/apps/${APP_ID}/conversations/${conversationId}/messages`);

    try {
      const response = await axios.post(
        `${BASE_URL}/apps/${APP_ID}/conversations/${conversationId}/messages`,
        {
          author: { type: 'user', userId: req.appUserId },
          content: { type: 'text', text },
        },
        {
          headers: {
            Authorization: `Bearer ${req.appUserJwt}`,
            'Content-Type': 'application/json',
          },
        }
      );

      res.json(response.data);
    } catch (error) {
      console.error(error.response?.data || error.message);
      res
        .status(500)
        .json({ error: error.response?.data || error.message });
    }
  }
);

// Route to search articles
app.get('/helpcenter/search', async (req, res) => {
  const query = req.query.query;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  try {
    console.log(`https://${HELP_CENTER_SUBDOMAIN}.zendesk.com/api/v2/help_center/articles/search.json`);
    const response = await axios.get(
      `https://${HELP_CENTER_SUBDOMAIN}.zendesk.com/api/v2/help_center/articles/search.json`,
      {
        params: { query },
        auth: {
          username: HELP_CENTER_EMAIL,
          password: HELP_CENTER_API_TOKEN,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});


// Route to get article details
app.get('/helpcenter/articles/:articleId', async (req, res) => {
  const { articleId } = req.params;

  try {
    console.log(`https://${HELP_CENTER_SUBDOMAIN}.zendesk.com/api/v2/help_center/articles/${articleId}.json`);
    const response = await axios.get(
      `https://${HELP_CENTER_SUBDOMAIN}.zendesk.com/api/v2/help_center/articles/${articleId}.json`,
      {
        auth: {
          username: HELP_CENTER_EMAIL,
          password: HELP_CENTER_API_TOKEN,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
