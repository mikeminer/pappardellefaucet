import { base, celo } from "viem/chains";

export const tokenAddress = (
  process.env.NEXT_PUBLIC_TOKEN_ADDRESS || "0x41859a1048fb4f8d668861b1249504bf52e6d3bd"
) as `0x${string}`;

export const faucetAddress = process.env.NEXT_PUBLIC_FAUCET_ADDRESS as
  | `0x${string}`
  | undefined;

export const referralRegistryAddress = process.env.NEXT_PUBLIC_REFERRAL_REGISTRY_ADDRESS as
  | `0x${string}`
  | undefined;

export const referralAuthApiUrl =
  process.env.NEXT_PUBLIC_REFERRAL_AUTH_API_URL || "/api/referral/authorize";

export const monthlyPassRecipient = process.env.NEXT_PUBLIC_MONTHLY_PASS_RECIPIENT as
  | `0x${string}`
  | undefined;

export const monthlyPassPrice = process.env.NEXT_PUBLIC_MONTHLY_PASS_PRICE || "10000000";

export const baseRpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org";
export const baseRpcUrls = Array.from(
  new Set([baseRpcUrl, "https://base-rpc.publicnode.com", "https://base.llamarpc.com"])
);

export const appChain = {
  ...base,
  rpcUrls: {
    ...base.rpcUrls,
    default: {
      http: baseRpcUrls
    },
    public: {
      http: baseRpcUrls
    }
  }
} as const;

export const appChainIdHex = `0x${appChain.id.toString(16)}`;

export const appChainParams = {
  chainId: appChainIdHex,
  chainName: "Base",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: baseRpcUrls,
  blockExplorerUrls: ["https://basescan.org"]
};

export const referralRpcUrl = process.env.NEXT_PUBLIC_REFERRAL_RPC_URL || "https://forno.celo.org";
export const referralRpcUrls = Array.from(new Set([referralRpcUrl, ...celo.rpcUrls.default.http]));

export const referralChain = {
  ...celo,
  rpcUrls: {
    ...celo.rpcUrls,
    default: {
      http: referralRpcUrls
    },
    public: {
      http: referralRpcUrls
    }
  }
} as const;

export const referralChainIdHex = `0x${referralChain.id.toString(16)}`;

export const referralChainParams = {
  chainId: referralChainIdHex,
  chainName: "Celo",
  nativeCurrency: {
    name: "CELO",
    symbol: "CELO",
    decimals: 18
  },
  rpcUrls: referralRpcUrls,
  blockExplorerUrls: ["https://celoscan.io"]
};
