import "dotenv/config";
import { ethers } from "ethers";
import { ABI } from "./abi.js";

// ================= CONFIG =================
const CONTRACT = "0x945D605916e1eaa22b97E39c5E8b6940042a079c";
const QUANTITY = 1;
const PRICE_PER_TOKEN = 0; // Free mint

// GAS - Optimized for free mint (~$3 total)
const MAX_PRIORITY_FEE = ethers.parseUnits("0.5", "gwei"); // Very low priority fee
const MAX_FEE = ethers.parseUnits("3", "gwei"); // Low max fee for ~$3 total
const GAS_LIMIT = 500000; // Safety buffer

// TIMING TOLERANCE (in milliseconds)
// Add buffer for network latency and transaction propagation
const TIMING_TOLERANCE = 1500; // 1.5 seconds buffer

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

    if (diff <= TIMING_TOLERANCE) break; // tembak dengan buffer
    console.log(`⏳ Waiting ${(diff / 1000).toFixed(2)} seconds`);
    await sleep(1000);
  }
}

async function estimateGasSafely(contract, claimArgs) {
  try {
    // Try to estimate gas for the claim function
    const gasEstimate = await contract.claim.estimateGas(...claimArgs.slice(0, -1)); // Exclude tx options
    const gasWithBuffer = (gasEstimate * 120n) / 100n; // Add 20% buffer
    return gasWithBuffer > BigInt(GAS_LIMIT) ? gasWithBuffer : BigInt(GAS_LIMIT);
  } catch (error) {
    console.log("⚠️ Gas estimation failed, using default limit");
    return BigInt(GAS_LIMIT);
  }
}

async function retryTransaction(txFunction, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await txFunction();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`⚠️ Transaction failed, retrying in ${delay}ms (${i + 1}/${maxRetries})`);
      console.log(`Error: ${error.message}`);
      await sleep(delay);
      delay *= 2; // Exponential backoff
    }
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

  const claimArgs = [
    wallet.address,
    QUANTITY,
    ethers.ZeroAddress,
    PRICE_PER_TOKEN,
    { proof: [], maxQuantity: 0 },
    "0x"
  ];

  // Estimate gas with safety buffer
  const estimatedGas = await estimateGasSafely(contract, claimArgs);

  const txOptions = {
    value: 0, // Free mint
    gasLimit: estimatedGas,
    maxFeePerGas: MAX_FEE,
    maxPriorityFeePerGas: MAX_PRIORITY_FEE
  };

  const txFunction = () => contract.claim(...claimArgs, txOptions);

  try {
    const tx = await retryTransaction(txFunction, 3, 2000);

    console.log("TX HASH:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log("✅ MINT SUCCESS");
      console.log(`Gas used: ${receipt.gasUsed}`);
      console.log(`Transaction fee: ${ethers.formatEther(receipt.fee || receipt.gasUsed * tx.gasPrice)} ETH`);
    } else {
      console.log("❌ Transaction failed");
      console.log("Receipt:", receipt);
    }
  } catch (error) {
    console.error("💥 Final error:", error.message);
    if (error.code === "INSUFFICIENT_FUNDS") {
      console.error("💸 Insufficient funds for transaction");
    } else if (error.code === "ACTION_REJECTED") {
      console.error("🚫 Transaction rejected");
    } else if (error.message.includes("gas")) {
      console.error("⛽ Gas-related error");
    }
  }
}

main().catch(console.error);
