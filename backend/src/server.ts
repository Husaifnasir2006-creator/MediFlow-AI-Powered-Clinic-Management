import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import apiRouter from './routes/api.routes.js';
import { WebRTCSignalingServer } from './websocket/signaling.js';
import { ConfigService } from './services/config.service.js';

dotenv.config();

// Validate configuration fail-safes on boot
const config = ConfigService.getInstance().getConfig();

const app = express();
const server = http.createServer(app);

// Security & Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Allow local dev Vite connections
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Demo-Role', 'stripe-signature']
}));

app.use(express.json({ limit: '10mb' }));

// API Router
app.use('/api', apiRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    reference: 'REF_' + Date.now().toString(36)
  });
});

// Attach WebRTC Signaling Server
WebRTCSignalingServer.initialize(server);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` MediFlow Backend API & WebRTC Signaling Server`);
    console.log(` URL: http://localhost:${PORT}`);
    console.log(` Signaling WS: ws://localhost:${PORT}/ws/signaling`);
    console.log(` Environment: ${config.nodeEnv}`);
    console.log(` Storage Engine: ${config.storageMode.toUpperCase()} (${config.storageMode === 'supabase' ? config.supabaseUrl : 'In-Memory Mock Adapter'})`);
    console.log(` TURN Relay: ${config.isTurnConfigured ? 'Active (Coturn)' : 'Unconfigured (STUN Fallback)'}`);
    console.log(` Market: United Kingdom (NHS / CQC Readiness)`);
    console.log(`====================================================`);
  });
}

export { app, server };
