## Goal

Create a TypeScript/Node.js CLI that retrieves the EufyMake Kickstarter order status via HTTP (no browser automation) and prints item shipping statuses, highlighting the printer (SKU **V8260J40**) and overall shipped vs waiting state with color.

## Deliverables

- A TypeScript CLI script that calls the order tracking API and outputs item statuses.
- Configurable input for email/backer number (env vars or CLI flags).
- Colorized output for shipped vs not shipped items.
- README with usage instructions.

## Success Criteria

- Running the CLI prints all items returned by the API with correct status.
- The printer SKU (V8260J40) is clearly identified in output.
- Script uses direct HTTP calls (no Playwright/Puppeteer).
- Script handles API errors and missing data gracefully.

## Constraints

- Do not use browser automation in the final script.
- Use TypeScript + Node.js only.
- Keep credentials out of source (use env vars or args).

## Checklist

- [x] Analyze requirements and document plan/checklist
- [x] Inspect tracking site network calls and data flow
- [ ] Initialize Node/TypeScript project structure
- [ ] Implement CLI script to fetch and parse order status
- [ ] Add colored status output and item filtering
- [ ] Test script end-to-end
