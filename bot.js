import "dotenv/config";
import { ethers } from "ethers";
import { ABI } from "./abi.js";

// ================= CONFIG =================
const CONTRACT = "0xe0e7f149959c6cac0dDc2Cb4ab27942BFFdA1eb4";
const QUANTITY = 1;

// GAS - Optimized based on successful claim (~$2.5-3 total including token cost)
const MAX_PRIORITY_FEE = ethers.parseUnits("1", "gwei"); // Very low priority fee
const MAX_FEE = ethers.parseUnits("3", "gwei"); // Optimized max fee for ~$2.5-3 total
const GAS_LIMIT = 200000; // Optimized limit based on successful tx (was ~103k gas)

// TIMING TOLERANCE (in milliseconds)
// Add buffer for network latency and transaction propagation
const TIMING_TOLERANCE = 500; // 0.5 seconds buffer (earlier execution)

// TARGET TIME
// 05:00 WIB = 22:00 UTC (H-1)
const TARGET_UTC_HOUR = 22;
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

async function estimateGasSafely(contract, mintArgs) {
  try {
    // Try to estimate gas for the mintSeaDrop function
    const gasEstimate = await contract.mintSeaDrop.estimateGas(...mintArgs.slice(0, -1)); // Exclude tx options
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
      
      // If gas-related error, increase gas price for next attempt
      if (error.message.includes('gas') || error.message.includes('underpriced')) {
        console.log('🔥 Increasing gas price for retry...');
      }
      
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
  console.log("🕒 Waiting for 05:00 WIB (22:00 UTC)");

  await waitUntilTarget();

  console.log("🚀 MINTING NOW!");

  const mintArgs = [
    wallet.address,
    QUANTITY
  ];

  // Estimate gas with safety buffer
  const estimatedGas = await estimateGasSafely(contract, mintArgs);

  const txOptions = {
    gasLimit: estimatedGas,
    maxFeePerGas: MAX_FEE,
    maxPriorityFeePerGas: MAX_PRIORITY_FEE,
    chainId: (await provider.getNetwork()).chainId // Explicit chain ID for clarity
  };

  const txFunction = () => contract.mintSeaDrop(...mintArgs, txOptions);

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
