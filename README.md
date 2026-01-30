# Salesforce Revenue Cloud Advanced Configuration Tool

A full-stack application for automating the configuration of Salesforce Revenue Cloud Advanced environments through Excel-based data templates.

## Features

- **Multi-Org Connection Management**: Connect to multiple Salesforce orgs with secure OAuth 2.0 authentication
- **Excel Template Processing**: Upload and validate Excel templates with automatic data integrity checks
- **Configurable Deployment Pipeline**: Flexible framework for handling object hierarchies and ID dependencies
- **Real-time Deployment Progress**: Monitor deployment status with live progress updates
- **Deployment History**: Track all past deployments with detailed logs and results

## Tech Stack

- **Frontend**: React + Next.js 16
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Icons**: Bootstrap Icons
- **Authentication**: Supabase Auth

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Supabase account
- Salesforce org with Revenue Cloud Advanced

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd presalesagent
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your configuration:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SALESFORCE_CLIENT_ID=your_connected_app_client_id
SALESFORCE_CLIENT_SECRET=your_connected_app_client_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
ENCRYPTION_KEY=your_32_character_encryption_key
```

4. Set up the database:
   - Go to your Supabase dashboard
   - Run the SQL from `supabase/schema.sql` in the SQL editor

5. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Heroku

1. Create a Heroku app:
```bash
heroku create your-app-name
```

2. Set environment variables:
```bash
heroku config:set NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
heroku config:set NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
heroku config:set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
heroku config:set SALESFORCE_CLIENT_ID=your_client_id
heroku config:set SALESFORCE_CLIENT_SECRET=your_client_secret
heroku config:set NEXT_PUBLIC_APP_URL=https://your-app-name.herokuapp.com
heroku config:set ENCRYPTION_KEY=your_encryption_key
```

3. Deploy:
```bash
git push heroku main
```

## Excel Template Structure

The application expects Excel templates with the following worksheets:

| Worksheet | Description |
|-----------|-------------|
| Products | Product definitions (Standalone, Bundle, Configurable) |
| Attributes | Product attributes (Text, Number, Picklist, etc.) |
| Picklists | Picklist definitions |
| Picklist_Values | Picklist value entries |
| Categories | Category hierarchy |
| Catalogs | Product catalogs |
| Catalog_Products | Product-catalog associations |
| PriceBooks | Price book definitions |
| PriceListItems | Price entries |
| SellingModels | Selling model configurations |
| ProductRelationships | Product relationships (Bundle, Cross-sell, etc.) |
| AttributeMappings | Product-attribute mappings |

See the sample template for detailed column specifications.

## Pipeline Configuration

The deployment pipeline is configurable to handle different object hierarchies and ID dependencies. The default configuration supports:

1. Picklists (no dependencies)
2. Picklist Values (depends on Picklists)
3. Categories (self-referential hierarchy)
4. Attributes (depends on Picklists)
5. Products (standalone first)
6. Product Relationships (depends on Products)
7. Catalogs (no dependencies)
8. Catalog Products (depends on Catalogs and Products)
9. Price Books (no dependencies)
10. Price List Items (depends on Price Books and Products)
11. Selling Models (depends on Products)
12. Attribute Mappings (depends on Products and Attributes)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   └── dashboard/         # Dashboard pages
├── components/            # React components
│   ├── layout/           # Layout components
│   └── ui/               # UI components
├── lib/                   # Utility libraries
│   ├── excel/            # Excel parsing
│   ├── pipeline/         # Deployment pipeline
│   ├── salesforce/       # Salesforce API client
│   └── supabase/         # Supabase clients
├── hooks/                 # Custom React hooks
└── types/                 # TypeScript types
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and feature requests, please use the GitHub issue tracker.
