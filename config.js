require('dotenv').config();

module.exports = {
  // Server configuration
  port: process.env.PORT || 3000,

  // OpenAI configuration (optional)
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: 'gpt-3.5-turbo',
    maxTokens: 50, // Keep responses short
    temperature: 0.7,
  },

  // Voice configuration
  voice: {
    default: process.env.DEFAULT_VOICE || 'female',
    enablePremium: process.env.ENABLE_PREMIUM_VOICES === 'true',
  },

  // Performance settings
  performance: {
    cacheEnabled: true,
    maxCacheSize: 10000,
    responseTimeout: 5000, // 5 seconds max
  },

  // Dataset configuration
  dataset: {
    path: './ai_friend_dataset.txt',
    encoding: 'utf8',
    sourceUrl: 'https://www.wattpad.com/1366787853-slayer-of-the-night-demon-slayer-x-hashira-reader',
  },

  // WebSocket configuration
  websocket: {
    pingInterval: 30000, // 30 seconds
    maxPayload: 1024 * 1024, // 1MB
  },
};
