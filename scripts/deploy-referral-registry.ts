import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const pointsPerReferral = BigInt(process.env.REFERRAL_POINTS_PER_CLAIM || "1");

  if (pointsPerReferral <= 0n) {
    throw new Error("REFERRAL_POINTS_PER_CLAIM must be greater than zero.");
  }

  const [deployer] = await ethers.getSigners();
  const claimSigner = process.env.REFERRAL_CLAIM_SIGNER || deployer.address;

  if (!ethers.isAddress(claimSigner)) {
    throw new Error(`Invalid REFERRAL_CLAIM_SIGNER: ${claimSigner}`);
  }

  console.log(`Network: ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Claim signer / default registrar: ${claimSigner}`);
  console.log(`Referral points per claim: ${pointsPerReferral.toString()}`);

  const ReferralRegistry = await ethers.getContractFactory("PappardelleReferralRegistry");
  const referralRegistry = await ReferralRegistry.deploy(claimSigner, pointsPerReferral);
  await referralRegistry.waitForDeployment();

  const referralRegistryAddress = await referralRegistry.getAddress();

  console.log(`Referral registry deployed: ${referralRegistryAddress}`);
  console.log("");
  console.log("Next steps:");
  console.log(`1. Set NEXT_PUBLIC_REFERRAL_REGISTRY_ADDRESS=${referralRegistryAddress} in Vercel`);
  console.log("2. Set NEXT_PUBLIC_REFERRAL_RPC_URL to a Celo RPC if you want a custom endpoint.");
  console.log("3. Connect a registrar service that verifies Base claims and calls recordReferral on Celo.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
