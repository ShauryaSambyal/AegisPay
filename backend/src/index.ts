import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import merchantsRouter from './routes/merchants.js';
import transactionsRouter from './routes/transactions.js';
import simulatorRouter from './routes/simulator.js';
import syndicateRouter from './routes/syndicate.js';
import aiRouter from './routes/ai.js';
import osmRouter from './routes/osm.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.options('*', cors());
app.use(express.json());

// API Routes
app.use('/api/merchants', merchantsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/simulator', simulatorRouter);
app.use('/api/syndicate', syndicateRouter);
app.use('/api/ai', aiRouter);
app.use('/api/osm', osmRouter);

// Health check & Problem statement info
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    service: 'AegisPay Sentinel API',
    problemStatement: 'The Bakery That Takes Bets (Follow the Money - PayU & IIM Bangalore)',
    aiEngine: process.env.GEMINI_API_KEY ? 'Gemini 3.8 Flash (Active)' : 'Heuristic Forensic Engine (Fallback / Ready for Key)',
    merchantData: 'OpenStreetMap / Overpass API (key-less)',
    timestamp: new Date().toISOString()
  });
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`[AegisPay Sentinel] Backend running on http://127.0.0.1:${PORT} and http://localhost:${PORT}`);
  console.log(`[AegisPay Sentinel] Problem: "The Bakery That Takes Bets" - PayU Innovation Challenge`);
});
