#!/usr/bin/env node
import { Chalk } from "chalk";
import stringWidth from "string-width";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

type OrderItem = {
  status: string;
  product_name: string;
  sku_number: string;
  quantity: number;
  tracking_number: string;
  carrier: string;
  local_delivery_time: string;
  change_deliver_time: string;
};

type OrderResponse = {
  success: boolean;
  code: string;
  message: string;
  data: OrderItem[];
};

const API_URL = "https://rainbowbridge.anker.com/order-track/query";
const PRINTER_SKU = "V8260J40";
const chalk = new Chalk({ level: process.stdout.isTTY ? 3 : 0 });

const argv = yargs(hideBin(process.argv))
  .option("email", {
    type: "string",
    describe: "Order email address",
    default: process.env.EUFY_EMAIL,
  })
  .option("backer", {
    type: "string",
    describe: "Kickstarter backer number",
    default: process.env.EUFY_BACKER_NUMBER,
  })
  .option("sku", {
    type: "string",
    describe: "Highlight a specific SKU",
    default: PRINTER_SKU,
  })
  .option("json", {
    type: "boolean",
    describe: "Output raw JSON",
    default: false,
  })
  .strict()
  .parseSync();

const email = argv.email?.trim();
const backer = argv.backer?.trim();
const highlightSku = argv.sku?.trim().toUpperCase();

if (!email || !backer) {
  console.error(
    chalk.red(
      "Missing credentials. Provide --email and --backer (or set EUFY_EMAIL and EUFY_BACKER_NUMBER).",
    ),
  );
  process.exit(1);
}

const normalizeStatus = (status: string) => status.trim().toLowerCase();

const statusColor = (status: string) => {
  const normalized = normalizeStatus(status);
  if (normalized === "shipped") {
    return chalk.green(status);
  }
  if (normalized === "not ship" || normalized === "waiting") {
    return chalk.yellow(status);
  }
  return chalk.blue(status);
};

const formatTracking = (item: OrderItem) => {
  if (!item.tracking_number) {
    return "-";
  }
  return item.carrier
    ? `${item.carrier} ${item.tracking_number}`
    : item.tracking_number;
};

const formatEta = (item: OrderItem) => {
  const dateValue = item.change_deliver_time || item.local_delivery_time || "";
  if (!dateValue) {
    return "-";
  }
  const normalized = dateValue
    .replace(/\s+/g, " ")
    .replace(/年/g, "-")
    .replace(/月/g, "-")
    .replace(/日/g, "")
    .trim();
  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match || match.length < 4) {
    return dateValue;
  }
  const year = match[1];
  const month = match[2];
  const day = match[3];
  if (!year || !month || !day) {
    return dateValue;
  }
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const stripAnsi = (value: string) => value.replace(/\x1b\[[0-9;]*m/g, "");

const visibleWidth = (value: string) => stringWidth(stripAnsi(value));

const padCell = (value: string, width: number) => {
  const printableLength = visibleWidth(value);
  const padding = Math.max(0, width - printableLength);
  return `${value}${" ".repeat(padding)}`;
};

const renderTable = (rows: Array<Record<string, string | number>>) => {
  const headers = Object.keys(rows[0] ?? {});
  const widths = headers.map((header) => {
    const headerLength = visibleWidth(header);
    const maxCell = Math.max(
      headerLength,
      ...rows.map((row) => visibleWidth(String(row[header]))),
    );
    return maxCell;
  });

  const buildBorder = (left: string, mid: string, right: string) =>
    `${left}${widths.map((width) => "─".repeat(width + 2)).join(mid)}${right}`;

  const topBorder = buildBorder("┌", "┬", "┐");
  const headerDivider = buildBorder("├", "┼", "┤");
  const bottomBorder = buildBorder("└", "┴", "┘");

  const headerLine = `│ ${headers
    .map((header, index) => padCell(header, widths[index] ?? 0))
    .join(" │ ")} │`;

  console.log(topBorder);
  console.log(headerLine);
  console.log(headerDivider);

  rows.forEach((row) => {
    const line = `│ ${headers
      .map((header, index) => padCell(String(row[header]), widths[index] ?? 0))
      .join(" │ ")} │`;
    console.log(line);
  });
  console.log(bottomBorder);
};

const fetchOrder = async (): Promise<OrderResponse> => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "current-language": "us",
      referer: "https://www.eufymake.com/",
    },
    body: JSON.stringify({ email, number: backer }),
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<OrderResponse>;
};

const printSummary = (items: OrderItem[]) => {
  const printerItem = items.find(
    (item) => item.sku_number?.toUpperCase() === highlightSku,
  );
  if (!printerItem) {
    console.log(
      chalk.yellow(`Printer SKU ${highlightSku} not found in order items.`),
    );
    return;
  }
  console.log(
    `Printer (${highlightSku}) status: ${statusColor(printerItem.status)}`,
  );
};

const printTable = (items: OrderItem[]) => {
  const tableData = items.map((item) => {
    const isHighlight = item.sku_number?.toUpperCase() === highlightSku;
    const label = isHighlight
      ? chalk.bold(`${item.product_name} (SKU ${item.sku_number})`)
      : `${item.product_name} (SKU ${item.sku_number})`;
    return {
      Status: statusColor(item.status),
      Item: label,
      Qty: item.quantity,
      Tracking: formatTracking(item),
      ETA: formatEta(item),
    };
  });
  renderTable(tableData);
};

const run = async () => {
  try {
    const data = await fetchOrder();
    if (!data.success) {
      console.error(chalk.red(`API error: ${data.code} ${data.message}`));
      process.exit(1);
    }

    if (argv.json) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    if (!data.data?.length) {
      console.log(chalk.yellow("No order items found."));
      return;
    }

    printSummary(data.data);
    printTable(data.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(chalk.red(`Failed to fetch order data: ${message}`));
    process.exit(1);
  }
};

run();
