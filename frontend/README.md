# Distributed Web Crawler Frontend

A modern, production-ready React-based search interface for the Distributed Web Crawler. This frontend provides real-time search capabilities, intelligent autocomplete suggestions, highlighted search results, and comprehensive crawler management tools with a responsive and intuitive UI.

> 🚀 **Live Demo**: [Distributed Web Crawler Frontend](https://distributed-web-crawler.vercel.app)

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Clone Repository](#clone-repository)
  - [Install Dependencies](#install-dependencies)
  - [Configure Environment Variables](#configure-environment-variables)
- [Development](#development)
- [Building for Production](#building-for-production)
- [Docker Deployment](#docker-deployment)
- [Vercel Deployment](#vercel-deployment)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [License](#license)

---

## Features

✨ **Core Functionality**
- 🔍 Search indexed web pages with powerful query capabilities
- ⚡ Real-time autocomplete suggestions as you type
- 🎯 Highlight matching keywords in search results
- 🕷️ Trigger website crawling and indexing
- 📚 View and manage indexed documents
- 📱 Fully responsive design for all devices
- 🐳 Docker support for containerized deployment
- 🌐 Production-ready with Vercel integration

---

## Tech Stack

**Frontend Framework & Libraries**
- **React.js** - UI library for building interactive components
- **Vite** - Next-generation frontend build tool
- **React Router** - Client-side routing
- **Axios** - HTTP client for API communication
- **React Icons** - Icon library for UI components

**DevOps & Deployment**
- **Docker** - Containerization
- **Nginx** - Reverse proxy and web server
- **Vercel** - Serverless deployment platform

---

## Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable React components
│   ├── pages/               # Page-level components
│   ├── services/            # API and external service calls
│   ├── hooks/               # Custom React hooks
│   └── App.jsx              # Main application component
├── public/                  # Static assets
├── package.json             # Project dependencies
├── vite.config.js           # Vite configuration
├── .env                     # Environment variables (local)
├── .env.production          # Production environment variables
├── Dockerfile               # Docker container configuration
└── README.md                # This file
```

---

## Prerequisites

Before you begin, ensure you have the following installed:

```bash
Node.js >= 18
npm >= 9
Git >= 2.30
```

**Verify Installation:**
```bash
node -v
npm -v
git --version
```

---

## Getting Started

### Clone Repository

```bash
git clone https://github.com/BAIKANI-MANASA/Distributed-web-crawler.git
cd Distributed-web-crawler/frontend
```

### Install Dependencies

Install all required npm packages:

```bash
npm install
```

**Key Packages:**
```bash
npm install axios                 # HTTP client
npm install react-router-dom      # Routing library
npm install react-icons           # Icon components
```

### Configure Environment Variables

Create a `.env` file in the root of the frontend directory:

```bash
touch .env
```

**Development Environment** (`.env`)
```env
VITE_API_URL=http://localhost:8000
```

**Production Environment** (`.env.production`)
```env
VITE_API_URL=https://distributed-web-crawler-api.onrender.com
```

> ⚠️ Never commit `.env` files with sensitive data to version control

---

## Development

### Run Development Server

Start the development server with hot module replacement:

```bash
npm run dev
```

The application will be available at:
```
http://localhost:5173
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint (if configured)

---

## Building for Production

### Create Production Build

```bash
npm run build
```

This generates an optimized production bundle in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

Serves the production build locally for testing before deployment.

---

## Docker Deployment

### Build Docker Image

```bash
docker build -t crawler-frontend .
```

### Run Docker Container

```bash
docker run -p 3000:80 crawler-frontend
```

Access the application at:
```
http://localhost:3000
```

### Docker Compose (Optional)

For running with backend services:

```yaml
version: '3.8'
services:
  frontend:
    build: .
    ports:
      - "3000:80"
    environment:
      - VITE_API_URL=http://backend:8000
```

---

## Vercel Deployment

### Prerequisites

1. Create a [Vercel account](https://vercel.com)
2. Connect your GitHub repository

### Automated Deployment

Push to your main branch - Vercel will automatically build and deploy:

```bash
git push origin main
```

### Manual Deployment with Vercel CLI

**Install Vercel CLI:**
```bash
npm install -g vercel
```

**Login to Vercel:**
```bash
vercel login
```

**Deploy to Staging:**
```bash
vercel
```

Follow the prompts:
- Set up and deploy? → `Y`
- Which scope? → Select your account
- Link to existing project? → `N` (for new projects)
- Project name? → `distributed-web-crawler`
- Framework? → `Vite`

**Deploy to Production:**
```bash
vercel --prod
```

### Environment Variables in Vercel

1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add `VITE_API_URL` with your production API URL
3. Redeploy for changes to take effect

---

## Architecture

### Frontend Deployment Pipeline

```
┌─────────────────────────────────────────────┐
│              User Browser                   │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│        Vercel CDN & Hosting                 │
│     (React Application Bundle)              │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│     React Application (Client-Side)         │
│  ├─ Components                              │
│  ├─ State Management                        │
│  └─ Router                                  │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│    Axios HTTP Client                        │
│    (API Communication)                      │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│   Distributed Web Crawler Backend API       │
│   (Render or On-Premise Server)             │
│   https://distributed-web-crawler-api...   │
└─────────────────────────────────────────────┘
```

### Data Flow

1. **User Input** → Search query or crawler trigger
2. **React Component** → Validates and processes user input
3. **Axios Request** → Sends HTTP request to backend API
4. **Backend Processing** → Performs search or crawling
5. **Response Handling** → Updates component state
6. **Re-render** → Displays results to user

---

## Performance Optimization

- **Code Splitting**: Automatic with Vite
- **Lazy Loading**: Implement React.lazy for route-based code splitting
- **Image Optimization**: Use optimized image formats
- **Caching**: Leverage browser and CDN caching
- **Minification**: Automatic in production builds

---

## Security Best Practices

- ✅ Never commit `.env` files with sensitive data
- ✅ Use HTTPS for all API communications
- ✅ Implement CORS properly on backend
- ✅ Validate user input on frontend and backend
- ✅ Keep dependencies updated: `npm audit fix`
- ✅ Use environment variables for sensitive URLs

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Port 5173 already in use** | Kill process: `lsof -ti:5173 \| xargs kill -9` or use different port |
| **API connection failed** | Verify `VITE_API_URL` in `.env` matches backend URL |
| **Build errors** | Clear cache: `rm -rf node_modules dist` then `npm install && npm run build` |
| **Vercel deployment fails** | Check build logs, ensure `.env.production` is configured in Vercel dashboard |

---

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## Support

- 📧 **Email**: [your-email@example.com]
- 🐛 **Issues**: [GitHub Issues](https://github.com/BAIKANI-MANASA/Distributed-web-crawler/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/BAIKANI-MANASA/Distributed-web-crawler/discussions)

---

**Made with ❤️ by [Your Name/Team]**

Last updated: 2024
