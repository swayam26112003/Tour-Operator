# Tour Operator Platform

A full-stack travel management platform designed for tour operators to manage travel packages, publish destination experiences, handle customer enquiries, generate quotations and assist travel consultants using AI.

The platform provides a public-facing travel website alongside an administrative workspace, helping tour operators manage the complete customer journey—from discovering a package to receiving a personalized travel quotation.

## Live Demo

- **Frontend:** https://tour-operator-frontend.onrender.com
- **Backend API:** https://tour-operator-backend.onrender.com
- **Health Check:** https://tour-operator-backend.onrender.com/health
- **GitHub Repository:** https://github.com/swayam26112003/Tour-Operator

## Features

### 1. Public Travel Website

- Browse published travel packages and destinations.
- Search and filter packages.
- View detailed package information.
- Explore day-wise travel itineraries.
- View hotel and accommodation information.
- Check seasonal pricing and per-person costs.
- Explore package inclusions and exclusions.
- View interactive route maps and ordered travel stops.
- Submit travel enquiries directly from package pages.

### 2. Package Management CMS

Manage the complete travel package catalogue through the admin dashboard.

- Create and edit travel packages.
- Duplicate existing packages.
- Manage package descriptions and destinations.
- Configure day-wise itineraries.
- Add hotel information.
- Configure seasonal pricing.
- Manage inclusions, exclusions and map stops.
- Preview packages before publishing.
- Schedule package publishing.
- Maintain package version history.
- Restore previous package versions.

### 3. Blog and Journal CMS

Manage travel-related articles through the administrative interface.

- Create and edit journal articles.
- Rich-text content editing.
- Add images to articles.
- Manage article categories.
- Configure SEO information.
- Connect related travel packages.
- Publish travel articles on the public website.

### 4. Customer Enquiry Management

A centralized workspace for managing customer enquiries.

- Receive enquiries from public package pages.
- View customer and travel information.
- Track enquiry status.
- Assign enquiries to consultants.
- Set enquiry priority.
- Add internal notes.
- Maintain incoming and outgoing message history.
- Manage customer follow-ups.

### 5. AI-Powered Enquiry Assistant

The platform integrates Google's Gemini API to assist travel consultants.

Capabilities include:

- Extract travel requirements from customer enquiries.
- Identify destination, travel dates, budget and traveller preferences.
- Recommend up to three relevant published packages.
- Retrieve seasonal prices from the PostgreSQL database.
- Generate suggested customer reply drafts.
- Allow consultants to edit AI-generated replies.
- Require human approval before recording a reply in message history.

AI-generated package recommendations use actual package data and database pricing rather than inventing package prices.

**Note:** Approving a reply records it in the message history. It does not automatically send email or WhatsApp messages.

### 6. Quote Builder

Generate travel quotations using package information.

- Create quotations from travel packages.
- Configure travel dates and traveller counts.
- Apply seasonal pricing.
- Calculate applicable GST.
- Generate branded PDF quotations.
- Share quotations through a link.

### 7. Media Library

Centralized management of media references.

- Store image URLs and metadata.
- Organize media by category.
- Manage image descriptions and alternative text.
- Reuse media in package and journal editors.

### 8. Administration and Activity Logs

- Administrative dashboard.
- Roles and permissions management interface.
- Admin, editor and consultant role definitions.
- Activity log for administrative actions.
- Centralized package, enquiry, journal and media management.

## Technology Stack

### Frontend

- React 19
- Vite
- React Router
- Tailwind CSS
- Axios
- Framer Motion
- Lucide React
- Tiptap Rich Text Editor

### Backend

- Node.js
- Express.js
- Prisma ORM
- PostgreSQL
- JWT and bcryptjs dependencies
- Zod
- Google Gemini API

### Server-Side Rendering

- React Server Rendering
- React DOM Server
- React Router StaticRouter
- Express SSR server
- Vite SSR build

### Database and Deployment

- Neon PostgreSQL
- Render
- GitHub

## Project Structure

```text
Tour-Operator/
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   │
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── generated/
│   │
│   ├── uploads/
│   ├── server.js
│   ├── prisma.config.ts
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── context/
│   │   ├── layouts/
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   └── public/
│   │   ├── services/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── entry-server.jsx
│   │
│   ├── server.js
│   ├── index.html
│   └── package.json
│
└── README.md
```

## Getting Started

### Prerequisites

Install the following:

- Node.js 22 or compatible version.
- npm.
- PostgreSQL database or Neon PostgreSQL account.
- Google Gemini API key.

### 1. Clone the Repository

```bash
git clone https://github.com/swayam26112003/Tour-Operator.git

cd Tour-Operator
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
npm install
```

Create a `.env` file inside the backend directory.

Configure the following environment variables:

```env
PORT=5000

DATABASE_URL="YOUR_NEON_POOLED_DATABASE_URL"
DIRECT_URL="YOUR_NEON_DIRECT_DATABASE_URL"

JWT_SECRET="YOUR_SECURE_RANDOM_SECRET"

GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
GEMINI_MODEL="gemini-flash-lite-latest"

COMPANY_NAME="Company A"
COMPANY_EMAIL="your-email@example.com"
COMPANY_PHONE="your-phone-number"
COMPANY_ADDRESS="Your business address"
COMPANY_LOGO=""
```

Replace the placeholder values with your actual configuration.

Generate the Prisma client:

```bash
npx prisma generate
```

Apply existing database migrations:

```bash
npx prisma migrate deploy
```

Start the backend development server:

```bash
npm run dev
```

Backend runs at:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/health
```

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
```

Create `.env.development`:

```env
VITE_API_URL=http://localhost:5000/api
```

Create `.env.production`:

```env
VITE_API_URL=https://tour-operator-backend.onrender.com/api
```

Start the frontend development server:

```bash
npm run dev
```

For the SSR development server:

```bash
npm run dev:ssr
```

The frontend development server runs at:

```text
http://localhost:5173
```

### 4. Production Build

Build the frontend client and server bundles:

```bash
npm run build:ssr
```

Start the production SSR server:

```bash
npm run start:ssr
```

The production server uses the `PORT` environment variable supplied by the hosting platform.

## Application Routes

### Public Routes

| Route | Description |
|---|---|
| `/` | Homepage |
| `/journeys` | Travel package catalogue |
| `/package/:id` | Package details |
| `/journal` | Travel journal |
| `/journal/:slug` | Journal article |
| `/plan-your-journey` | Travel enquiry page |

### Administrative Routes

| Route | Description |
|---|---|
| `/admin` | Admin dashboard |
| `/admin/packages` | Package library |
| `/admin/packages/:id/edit` | Package editor |
| `/admin/enquiries` | Enquiry inbox |
| `/admin/quotes` | Quote builder |
| `/admin/journal/edit` | Journal editor |
| `/admin/journal/:id/edit` | Edit journal article |
| `/admin/roles` | Roles management |
| `/admin/activity` | Activity logs |
| `/admin/media` | Media library |

## Deployment

The application is deployed using Render.

### Backend Deployment

- Platform: Render Web Service
- Root Directory: `backend`
- Runtime: Node.js
- Build Command:

```bash
npm ci --include=dev && npx prisma generate
```

- Start Command:

```bash
npm start
```

Configure the backend environment variables in the Render dashboard.

### Frontend Deployment

- Platform: Render Web Service
- Root Directory: `frontend`
- Runtime: Node.js
- Build Command:

```bash
npm ci --include=dev && npm run build:ssr
```

- Start Command:

```bash
npm run start:ssr
```

Configure these frontend environment variables:

```env
NODE_ENV=production
BACKEND_URL=https://tour-operator-backend.onrender.com
VITE_API_URL=https://tour-operator-backend.onrender.com/api
PUBLIC_SITE_URL=https://tour-operator-frontend.onrender.com
```

## Important Notes

- Package prices are retrieved from the database's seasonal pricing records.
- AI-generated replies require human review and approval.
- The application does not process online payments.
- The platform does not provide live hotel or flight inventory.
- Media Library currently stores image URLs and metadata rather than uploading image files to cloud storage.
- Render free services may spin down after inactivity, resulting in slower initial requests.
- Keep all API keys, database credentials and environment files out of version control.

## Future Improvements

Potential extensions include:

- Email and WhatsApp communication integrations.
- Cloud-based image uploads.
- More comprehensive role-based authorization.
- Hindi and German language support.
- Automated sitemap generation and legacy URL redirects.
- Advanced enquiry analytics and reporting.
- Production performance optimization.

## License

This project is currently maintained as a private development project. Contact the repository owner for usage or licensing permissions.
