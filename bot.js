import "dotenv/config";
import { ethers } from "ethers";
import { ABI } from "./abi.js";

// ================= CONFIG =================
const CONTRACT = "0x945D605916e1eaa22b97E39c5E8b6940042a079c";
const QUANTITY = 1;
const PRICE_PER_TOKEN = ethers.parseEther("0.01");

// GAS
const MAX_PRIORITY_FEE = ethers.parseUnits("15", "gwei"); // ± $3
const MAX_FEE = ethers.parseUnits("90", "gwei");

// TARGET TIME
// 03:00 WIB = 20:00 UTC (H-1)
const TARGET_UTC_HOUR = 20;
const TARGET_UTC_MINUTE = 0;
const TARGET_UTC_SECOND = 0;
// =========================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitUntilTarget() {
  while (true) {
    const now = new Date();
    const target = new Date(now);

    target.setUTCHours(
      TARGET_UTC_HOUR,
      TARGET_UTC_MINUTE,
      TARGET_UTC_SECOND,
      0
    );

    // kalau target sudah lewat → besok
    if (target <= now) {
      target.setUTCDate(target.getUTCDate() + 1);
    }

    const diff = target - now;

    if (diff <= 50) break; // tembak <50ms
    console.log(`⏳ Waiting ${(diff / 1000).toFixed(2)} seconds`);
    await sleep(1000);
  }
}

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT, ABI, wallet);

  console.log("Wallet:", wallet.address);
  console.log("🕒 Waiting for 03:00 WIB (20:00 UTC)");

  await waitUntilTarget();

  console.log("🚀 CLAIMING NOW!");

  const tx = await contract.claim(
    wallet.address,
    QUANTITY,
    ethers.ZeroAddress,
    PRICE_PER_TOKEN,
    { proof: [], maxQuantity: 0 },
    "0x",
    {
      value: PRICE_PER_TOKEN * BigInt(QUANTITY),
      gasLimit: 300000,
      maxFeePerGas: MAX_FEE,
      maxPriorityFeePerGas: MAX_PRIORITY_FEE
    }
  );

  console.log("TX HASH:", tx.hash);
  await tx.wait();
  console.log("✅ MINT SUCCESS");
}

main().catch(console.error);
