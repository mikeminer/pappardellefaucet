import { NextResponse } from "next/server";
import {
  createPublicClient,
  getAddress,
  http,
  isAddress,
  parseEventLogs,
  type Address,
  type Hex
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { faucetVaultAbi, referralRegistryAbi } from "@/lib/abi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReferralAuthorizationRequest = {
  account?: string;
  referrer?: string;
  baseClaimTxHash?: string;
};

const signatureTypes = {
  ReferralAuthorization: [
    { name: "account", type: "address" },
    { name: "referrer", type: "address" },
    { name: "baseClaimTxHash", type: "bytes32" },
    { name: "deadline", type: "uint256" }
  ]
} as const;

const CELO_CHAIN_ID = 42220;

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

function isBytes32Hex(value: unknown): value is Hex {
  return typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value);
}

function sameAddress(left: Address, right: Address) {
  return left.toLowerCase() === right.toLowerCase();
}

function normalizePrivateKey(value?: string): Hex | undefined {
  if (!value) return undefined;
  const trimmedValue = value.trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(trimmedValue)) {
    throw new Error("REFERRAL_CLAIM_SIGNER_PRIVATE_KEY must be a 32-byte hex private key.");
  }

  return trimmedValue as Hex;
}

export async function POST(request: Request) {
  const faucetAddress = process.env.NEXT_PUBLIC_FAUCET_ADDRESS;
  const referralRegistryAddress = process.env.NEXT_PUBLIC_REFERRAL_REGISTRY_ADDRESS;

  if (!faucetAddress || !isAddress(faucetAddress)) {
    return json({ error: "Referral registrar is missing NEXT_PUBLIC_FAUCET_ADDRESS." }, 503);
  }

  if (!referralRegistryAddress || !isAddress(referralRegistryAddress)) {
    return json({ error: "Referral registrar is missing NEXT_PUBLIC_REFERRAL_REGISTRY_ADDRESS." }, 503);
  }

  let signerPrivateKey: Hex | undefined;
  try {
    signerPrivateKey = normalizePrivateKey(
      process.env.REFERRAL_CLAIM_SIGNER_PRIVATE_KEY || process.env.REFERRAL_REGISTRAR_PRIVATE_KEY
    );
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Invalid referral signer private key." }, 503);
  }

  if (!signerPrivateKey) {
    return json({ error: "Referral registrar needs REFERRAL_CLAIM_SIGNER_PRIVATE_KEY on Vercel." }, 503);
  }

  const body = (await request.json().catch(() => undefined)) as ReferralAuthorizationRequest | undefined;

  if (!body?.account || !isAddress(body.account)) {
    return json({ error: "Invalid account address." }, 400);
  }

  if (!body.referrer || !isAddress(body.referrer)) {
    return json({ error: "Invalid referrer address." }, 400);
  }

  if (!isBytes32Hex(body.baseClaimTxHash)) {
    return json({ error: "Invalid Base claim transaction hash." }, 400);
  }

  const account = getAddress(body.account);
  const referrer = getAddress(body.referrer);
  const baseClaimTxHash = body.baseClaimTxHash;
  const normalizedFaucetAddress = getAddress(faucetAddress);
  const normalizedReferralRegistryAddress = getAddress(referralRegistryAddress);

  if (sameAddress(account, referrer)) {
    return json({ error: "Self referrals do not earn airdrop points." }, 400);
  }

  const baseClient = createPublicClient({
    transport: http(process.env.BASE_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org")
  });

  const celoClient = createPublicClient({
    transport: http(process.env.CELO_RPC_URL || process.env.NEXT_PUBLIC_REFERRAL_RPC_URL || "https://forno.celo.org")
  });

  const signer = privateKeyToAccount(signerPrivateKey);

  const [registered, claimHashUsed, claimSigner] = await Promise.all([
    celoClient.readContract({
      address: normalizedReferralRegistryAddress,
      abi: referralRegistryAbi,
      functionName: "referralRegistered",
      args: [account]
    }),
    celoClient.readContract({
      address: normalizedReferralRegistryAddress,
      abi: referralRegistryAbi,
      functionName: "baseClaimTxHashUsed",
      args: [baseClaimTxHash]
    }),
    celoClient.readContract({
      address: normalizedReferralRegistryAddress,
      abi: referralRegistryAbi,
      functionName: "claimSigner"
    })
  ]);

  if (registered) {
    return json({ error: "This wallet already has a registered referral." }, 409);
  }

  if (claimHashUsed) {
    return json({ error: "This Base claim transaction was already used for referral points." }, 409);
  }

  if (!sameAddress(getAddress(claimSigner), signer.address)) {
    return json({ error: "Configured registrar signer does not match the Celo registry claimSigner." }, 503);
  }

  const [receipt, hasClaimed] = await Promise.all([
    baseClient.getTransactionReceipt({ hash: baseClaimTxHash }),
    baseClient.readContract({
      address: normalizedFaucetAddress,
      abi: faucetVaultAbi,
      functionName: "hasClaimed",
      args: [account]
    })
  ]);

  if (receipt.status !== "success") {
    return json({ error: "The Base claim transaction did not succeed." }, 422);
  }

  if (!hasClaimed) {
    return json({ error: "This wallet is not marked as claimed on the Base faucet." }, 422);
  }

  const claimedEvents = parseEventLogs({
    abi: faucetVaultAbi,
    eventName: "Claimed",
    logs: receipt.logs,
    strict: false
  });

  const claimedByAccount = claimedEvents.some((eventLog) => {
    const args = eventLog.args as { account?: Address };
    return sameAddress(getAddress(eventLog.address), normalizedFaucetAddress)
      && Boolean(args.account && sameAddress(getAddress(args.account), account));
  });

  if (!claimedByAccount) {
    return json({ error: "The transaction is not a PAPPARDELLE faucet claim for this wallet." }, 422);
  }

  const ttlSeconds = Number(process.env.REFERRAL_SIGNATURE_TTL_SECONDS || "900");
  const safeTtlSeconds = Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? Math.min(ttlSeconds, 3600) : 900;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + safeTtlSeconds);

  const signature = await signer.signTypedData({
    domain: {
      name: "PappardelleReferralRegistry",
      version: "1",
      chainId: CELO_CHAIN_ID,
      verifyingContract: normalizedReferralRegistryAddress
    },
    types: signatureTypes,
    primaryType: "ReferralAuthorization",
    message: {
      account,
      referrer,
      baseClaimTxHash,
      deadline
    }
  });

  return json({
    mode: "signature",
    account,
    referrer,
    baseClaimTxHash,
    deadline: deadline.toString(),
    signature
  });
}
