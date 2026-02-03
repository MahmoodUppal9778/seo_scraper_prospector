import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import routes from './routes/index.js';
import { initializeJobs } from './services/crawler.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function start() {
  try {
    // Initialize jobs from disk
    await initializeJobs();

    app.listen(config.port, () => {
      console.log(`🚀 SEO Prospector API running on http://localhost:${config.port}`);
      console.log(`   Environment: ${config.nodeEnv}`);
      console.log(`   Concurrent queries: ${config.concurrentQueries}`);
      console.log(`   Max pages per query: ${config.maxPagesPerQuery}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
