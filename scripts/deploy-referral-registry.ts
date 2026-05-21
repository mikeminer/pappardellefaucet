import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const faucetAddress = process.env.FAUCET_ADDRESS || process.env.NEXT_PUBLIC_FAUCET_ADDRESS;
  const pointsPerReferral = BigInt(process.env.REFERRAL_POINTS_PER_CLAIM || "1");

  if (!faucetAddress || !ethers.isAddress(faucetAddress)) {
    throw new Error(`Invalid FAUCET_ADDRESS: ${faucetAddress || "missing"}`);
  }

  if (pointsPerReferral <= 0n) {
    throw new Error("REFERRAL_POINTS_PER_CLAIM must be greater than zero.");
  }

  const [deployer] = await ethers.getSigners();

  console.log(`Network: ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Faucet vault: ${faucetAddress}`);
  console.log(`Referral points per claim: ${pointsPerReferral.toString()}`);

  const ReferralRegistry = await ethers.getContractFactory("PappardelleReferralRegistry");
  const referralRegistry = await ReferralRegistry.deploy(faucetAddress, pointsPerReferral);
  await referralRegistry.waitForDeployment();

  const referralRegistryAddress = await referralRegistry.getAddress();

  console.log(`Referral registry deployed: ${referralRegistryAddress}`);
  console.log("");
  console.log("Next steps:");
  console.log(`1. Set NEXT_PUBLIC_REFERRAL_REGISTRY_ADDRESS=${referralRegistryAddress} in Vercel`);
  console.log("2. Redeploy the web app so referral links and leaderboard read the registry.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
