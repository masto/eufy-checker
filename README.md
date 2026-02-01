# EufyMake Order Tracker CLI

This CLI fetches your EufyMake Kickstarter order status via direct HTTP calls (no browser automation) and highlights the printer SKU.

## Setup

```bash
npm install
```

## Usage

Set credentials via env vars:

```bash
export EUFY_EMAIL="you@example.com"
export EUFY_BACKER_NUMBER="YOUR_BACKER_NUMBER"
```

Run in dev mode:

```bash
npm run dev
```

Or build and run:

```bash
npm run build
npm start
```

### Options

- `--email` / `EUFY_EMAIL` - order email address
- `--backer` / `EUFY_BACKER_NUMBER` - Kickstarter backer number
- `--sku` - SKU to highlight (default: `V8260J40`)
- `--json` - output raw JSON response

Example:

```bash
npm run dev -- --email "you@example.com" --backer "YOUR_BACKER_NUMBER"
```
