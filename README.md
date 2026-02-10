# Curalz - AI Second Brain for Alzheimer's Patients

> A compassionate AI-powered memory assistant that helps Alzheimer's patients preserve and retrieve their memories through natural conversations.

## 🎯 What It Does

Curalz is a backend system that acts as a "digital second brain" for patients with memory challenges. It enables:

- **💬 Natural Conversations**: Patients can chat naturally about their day, and the AI remembers everything
- **🧠 Semantic Memory**: Uses vector embeddings to find relevant memories even when queries don't match exact words
- **👥 Entity Recognition**: Automatically extracts people, activities, and important details from conversations
- **👨‍⚕️ Caregiver Support**: Caregivers can monitor patient activity and manage profiles through dedicated APIs
- **⏰ Smart Reminders**: Event-based reminder system for appointments and important tasks

## 🏗️ Architecture

### Technology Stack

- **Runtime**: Bun/Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB (local via Docker)
- **Vector Store**: Qdrant (local via Docker)
- **AI**: Google Gemini (embeddings + chat)
- **Auth**: JWT-based authentication

### Key Components

```
┌─────────────────┐
│  Patient Chat   │ ──> Gemini AI ──> Vector Memory (Qdrant)
└─────────────────┘           │
                              ├──> Entities Extracted
                              └──> Context Retrieved
                              
┌─────────────────┐
│ Caregiver Panel │ ──> MongoDB ──> Patient Activity & Profiles
└─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Docker Desktop (running)
- Bun or Node.js
- Gemini API Key ([Get free key](https://ai.google.dev/))

### Installation

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd curalz

# 2. Install dependencies
bun install

# 3. Start infrastructure
docker-compose up -d

# 4. Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# 5. Start server
bun run dev
```

Server runs on `http://localhost:5000`

## 📚 API Documentation

Visit **[http://localhost:5000/api-docs](http://localhost:5000/api-docs)** for interactive Swagger documentation.

### Main Endpoints

#### Chat (AI Second Brain)
- `POST /api/chat/message` - Send message, get AI response with stored memory
- `GET /api/chat/history` - Retrieve conversation history
- `POST /api/chat/search` - Semantic search through memories

#### Caregiver Dashboard
- `GET /api/caregiver/patients` - List linked patients
- `GET /api/caregiver/patient/:id/profile` - View patient details
- `PUT /api/caregiver/patient/:id/profile` - Update patient
- `GET /api/caregiver/patient/:id/activity` - View patient activity

#### Events & Reminders
- `POST /api/events` - Create reminder
- `GET /api/events` - List upcoming events
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

## 🧪 Example Usage

### Patient Chat Flow

```bash
# 1. Register as patient
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com","password":"pass123","role":"patient"}'

# 2. Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"pass123"}'

# 3. Chat with AI
curl -X POST http://localhost:5000/api/chat/message \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"I had lunch with my daughter Sarah today"}'

# Response includes:
# - Stored thought with entities: {"people": ["Sarah"], "activities": ["lunch"]}
# - AI response acknowledging the memory
# - Number of similar memories retrieved for context
```

### Semantic Search

```bash
# Later, ask about Sarah
curl -X POST http://localhost:5000/api/chat/message \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"Who is Sarah?"}'

# The AI will retrieve the lunch memory and provide context!
```

## 🐳 Docker Services

```yaml
# MongoDB - Port 27017
# Qdrant - Port 6333 (Dashboard: http://localhost:6333/dashboard)
```

Manage containers:
```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# View logs
docker-compose logs -f
```

## 🔒 Security

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (Patient/Caregiver)
- CORS and Helmet middleware

## 📦 Project Structure

```
src/
├── config/         # Database & Qdrant setup
├── models/         # MongoDB schemas (User, Event, Thought)
├── services/       # Business logic (embeddings, LLM, entities)
├── controllers/    # Request handlers
├── routes/         # API endpoints
├── middleware/     # Auth & RBAC
└── jobs/           # Cron jobs (reminders)
```

## 🛠️ Development

```bash
# Build
bun run build

# Development with hot reload
bun run dev

# Production
bun run start
```

## 🌟 Features in Detail

### Vector Memory System
- **Embeddings**: Uses Gemini `text-embedding-004` (768 dimensions)
- **Storage**: Qdrant for vectors, MongoDB for metadata
- **Search**: Cosine similarity for semantic matching

### Entity Extraction
- **AI-Powered**: Gemini extracts people and activities
- **Fallback**: Regex-based extraction if AI fails
- **Structured Storage**: Enables filtering like "Show me all memories with Sarah"

### Caregiver Dashboard
- **Patient Linking**: Caregivers can manage multiple patients
- **Activity Monitoring**: View recent conversations
- **Profile Management**: Update patient information

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 💡 Roadmap

- [ ] Push notifications for reminders
- [ ] Mood tracking and sentiment analysis
- [ ] Multi-modal support (voice, images)
- [ ] Mobile app integration
- [ ] Advanced analytics for caregivers

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.22. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
