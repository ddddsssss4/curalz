import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

import authRoutes from './routes/auth.routes';
import eventRoutes from './routes/event.routes';
import conversationRoutes from './routes/conversation.routes';
import chatRoutes from './routes/chat.routes';
import caregiverRoutes from './routes/caregiver.routes';

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/conversation', conversationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/caregiver', caregiverRoutes);

// Swagger Documentation
const swaggerDocument = YAML.load(path.join(__dirname, '../docs/swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', (req, res) => {
    res.send('Medical Memory Assistant API is running');
});

export default app;
