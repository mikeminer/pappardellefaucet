import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

const DEFAULT_TOKEN_ADDRESS = "0x41859a1048fb4f8d668861b1249504bf52e6d3bd";

async function main() {
  const tokenAddress = process.env.TOKEN_ADDRESS || DEFAULT_TOKEN_ADDRESS;
  const tokenDecimals = Number(process.env.TOKEN_DECIMALS || "18");
  const claimAmount = process.env.CLAIM_AMOUNT || "1000";

  if (!ethers.isAddress(tokenAddress)) {
    throw new Error(`Invalid TOKEN_ADDRESS: ${tokenAddress}`);
  }

  if (!Number.isInteger(tokenDecimals) || tokenDecimals < 0 || tokenDecimals > 255) {
    throw new Error(`Invalid TOKEN_DECIMALS: ${process.env.TOKEN_DECIMALS}`);
  }

  const parsedClaimAmount = ethers.parseUnits(claimAmount, tokenDecimals);
  const [deployer] = await ethers.getSigners();

  console.log(`Network: ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Token: ${tokenAddress}`);
  console.log(`Claim amount: ${claimAmount} tokens (${parsedClaimAmount.toString()} units)`);

  const FaucetVault = await ethers.getContractFactory("PappardelleFaucetVault");
  const faucetVault = await FaucetVault.deploy(tokenAddress, parsedClaimAmount);
  await faucetVault.waitForDeployment();

  const faucetAddress = await faucetVault.getAddress();

  console.log(`Faucet vault deployed: ${faucetAddress}`);
  console.log("");
  console.log("Next steps:");
  console.log(`1. Send PAPPARDELLE tokens to ${faucetAddress}`);
  console.log(`2. Set NEXT_PUBLIC_FAUCET_ADDRESS=${faucetAddress} in Vercel`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
