#!/usr/bin/env node
import chalk from "chalk";
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
  if (item.change_deliver_time) {
    return item.change_deliver_time;
  }
  if (item.local_delivery_time) {
    return item.local_delivery_time;
  }
  return "-";
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
  console.table(tableData);
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
