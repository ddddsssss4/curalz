import http from 'http';
import app from './app';
import connectDB from './config/db';
import { setupQdrant } from './config/qdrant';
import dotenv from 'dotenv';
import './jobs/reminder.job'; // Start the cron job

dotenv.config();

const PORT = process.env.PORT || 5000;

connectDB();
setupQdrant(); // Initialize Qdrant collection

const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
