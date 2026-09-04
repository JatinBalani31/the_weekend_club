import fs from "node:fs";
import path from "node:path";

/**
 * Loads .env.local for the test run, the same file `next dev` reads, so specs
 * exercise the real configuration rather than a parallel fixture that can drift.
 */
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const index = line.indexOf("=");
    if (index <= 0 || line.trim().startsWith("#")) continue;
    const key = line.slice(0, index).trim();
    if (!process.env[key]) process.env[key] = line.slice(index + 1).trim();
  }
}

/**
 * Hard stop against ever running the suite with live Razorpay credentials.
 *
 * Several specs create real Razorpay orders. Against `rzp_live_` keys those are
 * real orders on a real account, and a completed one moves real money, so this
 * refuses to run rather than trusting whoever starts the suite to have checked.
 */
const razorpayKeyId = process.env.RAZORPAY_KEY_ID ?? "";
if (razorpayKeyId.startsWith("rzp_live_")) {
  throw new Error(
    "Refusing to run tests with LIVE Razorpay keys (" +
      razorpayKeyId +
      "). Payment specs create real orders. Put rzp_test_ keys in .env.local and keep live keys in the hosting provider only.",
  );
}
