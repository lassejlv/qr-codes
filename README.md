# QR Code Generator

A simple yet powerful web application built with [Bun](https://bun.sh) and [ElysiaJS](https://elysiajs.com) to generate QR codes, store them in S3, and track metadata in a SQLite database.

## Features

- **QR Code Generation**: Create QR codes from text or URLs with high error correction.
- **Persistent Storage**:
  - Images stored in **S3**.
  - Metadata (IDs, text, file keys) stored in **SQLite** via **Drizzle ORM**.
- **Rate Limiting**: Protects endpoints using **Redis** (via `bunlimit`).
- **Web Interface**: Simple HTML interface to generate and view QR codes.
- **Optimized**: Built on Bun for high performance.

## Tech Stack

- **Runtime**: Bun
- **Framework**: ElysiaJS
- **Database**: SQLite (drizzle-orm)
- **Storage**: S3
- **Caching/Rate Limiting**: Redis

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (v1.0 or later)

### Installation

```bash
bun install
```

### Configuration

Ensure you have the necessary environment variables set (e.g., in a `.env` file):

```env
DB_FILE_NAME=sqlite.db
# S3 Configuration
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=your_region
AWS_BUCKET=your_bucket
# Redis Configuration
REDIS_URL=redis://localhost:6379
```

### Running the Project

**Development Server:**

```bash
bun dev
```

**Run Migrations & Start:**

```bash
bun start
```

## API Endpoints

- `GET /`: Home page with QR code generation form.
- `POST /new`: Generate a new QR code.
- `GET /view?id=<id>`: View a specific QR code.

## License

MIT
