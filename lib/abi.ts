export const faucetVaultAbi = [
  {
    type: "event",
    name: "Claimed",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false }
    ]
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: []
  },
  {
    type: "function",
    name: "claimAmount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }]
  },
  {
    type: "function",
    name: "totalClaims",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }]
  },
  {
    type: "function",
    name: "hasClaimed",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "bool" }]
  },
  {
    type: "function",
    name: "canClaim",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "bool" }]
  },
  {
    type: "function",
    name: "paused",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bool" }]
  },
  {
    type: "function",
    name: "vaultBalance",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }]
  }
] as const;

export const erc20Abi = [
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }]
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }]
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }]
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ type: "bool" }]
  }
] as const;

export const referralRegistryAbi = [
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [
      { name: "referrer", type: "address" },
      { name: "baseClaimTxHash", type: "bytes32" },
      { name: "deadline", type: "uint256" },
      { name: "signature", type: "bytes" }
    ],
    outputs: [{ name: "pointsAwarded", type: "uint256" }]
  },
  {
    type: "function",
    name: "recordReferral",
    stateMutability: "nonpayable",
    inputs: [
      { name: "account", type: "address" },
      { name: "referrer", type: "address" },
      { name: "baseClaimTxHash", type: "bytes32" }
    ],
    outputs: [{ name: "pointsAwarded", type: "uint256" }]
  },
  {
    type: "function",
    name: "claimSigner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }]
  },
  {
    type: "function",
    name: "baseClaimTxHashUsed",
    stateMutability: "view",
    inputs: [{ name: "baseClaimTxHash", type: "bytes32" }],
    outputs: [{ type: "bool" }]
  },
  {
    type: "function",
    name: "pointsPerReferral",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }]
  },
  {
    type: "function",
    name: "totalRegisteredReferrals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }]
  },
  {
    type: "function",
    name: "referralRegistered",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "bool" }]
  },
  {
    type: "function",
    name: "referredBy",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "address" }]
  },
  {
    type: "function",
    name: "statsOf",
    stateMutability: "view",
    inputs: [{ name: "referrer", type: "address" }],
    outputs: [
      { name: "points", type: "uint256" },
      { name: "referrals", type: "uint256" },
      { name: "lastReferralAt", type: "uint256" }
    ]
  },
  {
    type: "function",
    name: "topReferrers",
    stateMutability: "view",
    inputs: [{ name: "limit", type: "uint256" }],
    outputs: [
      { name: "accounts", type: "address[]" },
      { name: "points", type: "uint256[]" },
      { name: "referrals", type: "uint256[]" },
      { name: "lastReferralAts", type: "uint256[]" }
    ]
  }
] as const;
