import { base } from "viem/chains";

export const tokenAddress = (
  process.env.NEXT_PUBLIC_TOKEN_ADDRESS || "0x41859a1048fb4f8d668861b1249504bf52e6d3bd"
) as `0x${string}`;

export const faucetAddress = process.env.NEXT_PUBLIC_FAUCET_ADDRESS as
  | `0x${string}`
  | undefined;

export const referralRegistryAddress = process.env.NEXT_PUBLIC_REFERRAL_REGISTRY_ADDRESS as
  | `0x${string}`
  | undefined;

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
