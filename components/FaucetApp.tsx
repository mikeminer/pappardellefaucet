"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Coins,
  Copy,
  Droplets,
  ExternalLink,
  Gift,
  Info,
  Loader2,
  Mail,
  PlugZap,
  ShoppingBag,
  ShieldCheck,
  Ticket,
  Trophy,
  Utensils,
  UserPlus,
  Wallet,
  X
} from "lucide-react";
import {
  Address,
  createPublicClient,
  createWalletClient,
  custom,
  fallback,
  http,
  isAddress,
  parseUnits,
  zeroAddress
} from "viem";
import {
  appChain,
  appChainIdHex,
  appChainParams,
  baseRpcUrls,
  faucetAddress,
  monthlyPassPrice,
  monthlyPassRecipient,
  referralAuthApiUrl,
  referralChain,
  referralChainIdHex,
  referralChainParams,
  referralRpcUrls,
  referralRegistryAddress,
  tokenAddress
} from "@/lib/chains";
import { erc20Abi, faucetVaultAbi, referralRegistryAbi } from "@/lib/abi";
import { compactAddress, formatCount, formatTokenAmount } from "@/lib/format";
import { useMiniAppCompatibility, type MiniAppProvider } from "@/hooks/useMiniAppCompatibility";

type EthereumProvider = MiniAppProvider;

type Snapshot = {
  symbol: string;
  decimals: number;
  claimAmount?: bigint;
  vaultBalance?: bigint;
  walletBalance?: bigint;
  totalClaims?: bigint;
  hasClaimed?: boolean;
  canClaim?: boolean;
  paused?: boolean;
};

type ReferralSnapshot = {
  pointsPerReferral?: bigint;
  totalRegisteredReferrals?: bigint;
  referralRegistered?: boolean;
  referredBy?: Address;
  points?: bigint;
  referrals?: bigint;
  lastReferralAt?: bigint;
};

type LeaderboardEntry = {
  account: Address;
  points: bigint;
  referrals: bigint;
  lastReferralAt: bigint;
};

type ReferralAuthorizationResponse = {
  mode?: "signature" | "recorded";
  signature?: `0x${string}`;
  deadline?: string | number;
  baseClaimTxHash?: `0x${string}`;
};

const configuredFaucetAddress =
  faucetAddress && isAddress(faucetAddress) ? (faucetAddress as Address) : undefined;
const configuredReferralRegistryAddress =
  referralRegistryAddress && isAddress(referralRegistryAddress)
    ? (referralRegistryAddress as Address)
    : undefined;
const configuredMonthlyPassRecipient =
  monthlyPassRecipient && isAddress(monthlyPassRecipient) ? (monthlyPassRecipient as Address) : undefined;
const faucetSiteUrl = "https://pappardellefaucet.vercel.app/";
const rektaurantUrl = "https://rektaurant.vercel.app/";
const zoraUrl = "https://zora.co/@pappardelle/creator-coin";

function isSameAddress(left?: Address, right?: Address) {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

function formatPoints(value?: bigint) {
  return value?.toString() || "0";
}

function isBytes32Hex(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value);
}

function isHexString(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[0-9a-fA-F]+$/.test(value);
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object") {
    if ("shortMessage" in error && typeof error.shortMessage === "string") {
      return error.shortMessage;
    }

    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }
  }

  return "The operation could not be completed.";
}

export function FaucetApp() {
  const [account, setAccount] = useState<Address>();
  const [networkOk, setNetworkOk] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot>({
    symbol: "PAPPARDELLE",
    decimals: 18
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<string>();
  const [txHash, setTxHash] = useState<`0x${string}`>();
  const [txChain, setTxChain] = useState<"base" | "celo">("base");
  const [lastClaimTxHash, setLastClaimTxHash] = useState<`0x${string}`>();
  const [showInvitation, setShowInvitation] = useState(false);
  const [donationAmount, setDonationAmount] = useState("");
  const [isDonating, setIsDonating] = useState(false);
  const [isBuyingMonthlyPass, setIsBuyingMonthlyPass] = useState(false);
  const [pendingReferrer, setPendingReferrer] = useState<Address>();
  const [referralSnapshot, setReferralSnapshot] = useState<ReferralSnapshot>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [referralError, setReferralError] = useState<string>();
  const [copyStatus, setCopyStatus] = useState<string>();
  const [isRegisteringReferral, setIsRegisteringReferral] = useState(false);
  const autoConnectedRef = useRef(false);
  const miniAppCompatibility = useMiniAppCompatibility();

  const getProvider = useCallback(
    () => miniAppCompatibility.provider || window.ethereum,
    [miniAppCompatibility.provider]
  );

  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: appChain,
        transport: fallback(baseRpcUrls.map((url) => http(url)))
      }),
    []
  );

  const referralPublicClient = useMemo(
    () =>
      createPublicClient({
        chain: referralChain,
        transport: fallback(referralRpcUrls.map((url) => http(url)))
      }),
    []
  );

  const refresh = useCallback(
    async (activeAccount = account) => {
      setIsRefreshing(true);
      setError(undefined);

      try {
        const [symbol, decimals] = await Promise.all([
          publicClient.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: "symbol"
          }),
          publicClient.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: "decimals"
          })
        ]);

        if (!configuredFaucetAddress) {
          setSnapshot({
            symbol,
            decimals
          });
          return;
        }

        const [claimAmount, vaultBalance, totalClaims, paused, hasClaimed, canClaim, walletBalance] =
          await Promise.all([
            publicClient.readContract({
              address: configuredFaucetAddress,
              abi: faucetVaultAbi,
              functionName: "claimAmount"
            }),
            publicClient.readContract({
              address: configuredFaucetAddress,
              abi: faucetVaultAbi,
              functionName: "vaultBalance"
            }),
            publicClient.readContract({
              address: configuredFaucetAddress,
              abi: faucetVaultAbi,
              functionName: "totalClaims"
            }),
            publicClient.readContract({
              address: configuredFaucetAddress,
              abi: faucetVaultAbi,
              functionName: "paused"
            }),
            activeAccount
              ? publicClient.readContract({
                  address: configuredFaucetAddress,
                  abi: faucetVaultAbi,
                  functionName: "hasClaimed",
                  args: [activeAccount]
                })
              : Promise.resolve(false),
            activeAccount
              ? publicClient.readContract({
                  address: configuredFaucetAddress,
                  abi: faucetVaultAbi,
                  functionName: "canClaim",
                  args: [activeAccount]
                })
              : Promise.resolve(false),
            activeAccount
              ? publicClient.readContract({
                  address: tokenAddress,
                  abi: erc20Abi,
                  functionName: "balanceOf",
                  args: [activeAccount]
                })
              : Promise.resolve(0n)
          ]);

        setSnapshot({
          symbol,
          decimals,
          claimAmount,
          vaultBalance,
          walletBalance,
          totalClaims,
          hasClaimed,
          canClaim,
          paused
        });
      } catch (refreshError) {
        setError(getErrorMessage(refreshError));
      } finally {
        setIsRefreshing(false);
      }
    },
    [account, publicClient]
  );

  const refreshReferralData = useCallback(
    async (activeAccount = account) => {
      setReferralError(undefined);

      if (!configuredReferralRegistryAddress) {
        setReferralSnapshot({});
        setLeaderboard([]);
        return;
      }

      try {
        const [pointsPerReferral, totalRegisteredReferrals, topResult] = await Promise.all([
          referralPublicClient.readContract({
            address: configuredReferralRegistryAddress,
            abi: referralRegistryAbi,
            functionName: "pointsPerReferral"
          }),
          referralPublicClient.readContract({
            address: configuredReferralRegistryAddress,
            abi: referralRegistryAbi,
            functionName: "totalRegisteredReferrals"
          }),
          referralPublicClient.readContract({
            address: configuredReferralRegistryAddress,
            abi: referralRegistryAbi,
            functionName: "topReferrers",
            args: [10n]
          })
        ]);

        const [leaderAccounts, leaderPoints, leaderReferrals, leaderLastReferralAts] = topResult as readonly [
          readonly Address[],
          readonly bigint[],
          readonly bigint[],
          readonly bigint[]
        ];

        setLeaderboard(
          leaderAccounts.map((leaderAccount, index) => ({
            account: leaderAccount,
            points: leaderPoints[index] || 0n,
            referrals: leaderReferrals[index] || 0n,
            lastReferralAt: leaderLastReferralAts[index] || 0n
          }))
        );

        if (!activeAccount) {
          setReferralSnapshot({
            pointsPerReferral,
            totalRegisteredReferrals,
            referralRegistered: false,
            points: 0n,
            referrals: 0n,
            lastReferralAt: 0n
          });
          return;
        }

        const [registered, referrer, statsResult] = await Promise.all([
          referralPublicClient.readContract({
            address: configuredReferralRegistryAddress,
            abi: referralRegistryAbi,
            functionName: "referralRegistered",
            args: [activeAccount]
          }),
          referralPublicClient.readContract({
            address: configuredReferralRegistryAddress,
            abi: referralRegistryAbi,
            functionName: "referredBy",
            args: [activeAccount]
          }),
          referralPublicClient.readContract({
            address: configuredReferralRegistryAddress,
            abi: referralRegistryAbi,
            functionName: "statsOf",
            args: [activeAccount]
          })
        ]);

        const [points, referrals, lastReferralAt] = statsResult as readonly [bigint, bigint, bigint];

        setReferralSnapshot({
          pointsPerReferral,
          totalRegisteredReferrals,
          referralRegistered: registered,
          referredBy: referrer === zeroAddress ? undefined : referrer,
          points,
          referrals,
          lastReferralAt
        });
      } catch (referralRefreshError) {
        setReferralError(getErrorMessage(referralRefreshError));
      }
    },
    [account, referralPublicClient]
  );

  const checkNetwork = useCallback(async () => {
    const provider = getProvider();
    if (!provider) {
      setNetworkOk(false);
      return false;
    }

    const chainId = await provider.request({ method: "eth_chainId" });
    const isBase = typeof chainId === "string" && chainId.toLowerCase() === appChainIdHex;
    setNetworkOk(isBase);
    return isBase;
  }, [getProvider]);

  const switchToBase = useCallback(async () => {
    const provider = getProvider();
    if (!provider) throw new Error("Wallet not found.");

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: appChainIdHex }]
      });
    } catch (switchError) {
      const maybeError = switchError as { code?: number };
      if (maybeError.code !== 4902) throw switchError;

      await provider.request({
        method: "wallet_addEthereumChain",
        params: [appChainParams]
      });
    }

    setNetworkOk(true);
  }, [getProvider]);

  const switchToReferralChain = useCallback(async () => {
    const provider = getProvider();
    if (!provider) throw new Error("Wallet not found.");

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: referralChainIdHex }]
      });
    } catch (switchError) {
      const maybeError = switchError as { code?: number };
      if (maybeError.code !== 4902) throw switchError;

      await provider.request({
        method: "wallet_addEthereumChain",
        params: [referralChainParams]
      });
    }
  }, [getProvider]);

  const requestAccount = useCallback(async () => {
    const provider = getProvider();
    if (!provider) throw new Error("Install a Base-compatible wallet.");

    const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
    const nextAccount = accounts.find((value) => isAddress(value));

    if (!nextAccount) throw new Error("No account is available in the wallet.");

    const typedAccount = nextAccount as Address;
    setAccount(typedAccount);
    return typedAccount;
  }, [getProvider]);

  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    setError(undefined);
    setStatus(undefined);

    try {
      const nextAccount = await requestAccount();

      if (miniAppCompatibility.isMiniPay) {
        setNetworkOk(false);
        setStatus("MiniPay detected on Celo. The Celo referral leaderboard is available; Base faucet claims need a Base-compatible wallet.");
        await refresh(nextAccount);
        await refreshReferralData(nextAccount);
        return;
      }

      const isBase = await checkNetwork();

      if (!isBase) {
        await switchToBase();
      }

      setStatus(miniAppCompatibility.isFarcasterMiniApp ? "Farcaster wallet connected on Base." : "Wallet connected on Base.");
      await refresh(nextAccount);
      await refreshReferralData(nextAccount);
    } catch (connectError) {
      setError(getErrorMessage(connectError));
    } finally {
      setIsConnecting(false);
    }
  }, [
    checkNetwork,
    miniAppCompatibility.isFarcasterMiniApp,
    miniAppCompatibility.isMiniPay,
    refresh,
    refreshReferralData,
    requestAccount,
    switchToBase
  ]);

  const registerReferral = useCallback(
    async (
      activeAccount: Address,
      referrer: Address,
      baseClaimTxHash: `0x${string}`,
      provider: EthereumProvider
    ) => {
      if (!configuredReferralRegistryAddress) {
        return false;
      }

      if (!referralAuthApiUrl) {
        setReferralError("Celo referral scoring needs a registrar API to verify the Base claim before points can be written.");
        return false;
      }

      if (isSameAddress(activeAccount, referrer)) {
        setReferralError("Self referrals do not earn airdrop points.");
        return false;
      }

      setIsRegisteringReferral(true);
      setReferralError(undefined);

      try {
        const alreadyRegistered = await referralPublicClient.readContract({
          address: configuredReferralRegistryAddress,
          abi: referralRegistryAbi,
          functionName: "referralRegistered",
          args: [activeAccount]
        });

        if (alreadyRegistered) {
          setStatus("Referral points already registered.");
          await refreshReferralData(activeAccount);
          return false;
        }

        const authorizationResponse = await fetch(referralAuthApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            account: activeAccount,
            referrer,
            baseClaimTxHash
          })
        });

        if (!authorizationResponse.ok) {
          const registrarError = (await authorizationResponse.json().catch(() => undefined)) as
            | { error?: string }
            | undefined;
          throw new Error(registrarError?.error || "The referral registrar could not verify this Base claim yet.");
        }

        const authorization = (await authorizationResponse.json()) as ReferralAuthorizationResponse;

        if (authorization.mode === "recorded") {
          setStatus("Referral points are being recorded on Celo by the registrar.");
          await refreshReferralData(activeAccount);
          return true;
        }

        if (!isHexString(authorization.signature)) {
          throw new Error("The referral registrar did not return a valid signature.");
        }

        const attestedClaimHash = authorization.baseClaimTxHash || baseClaimTxHash;
        if (!isBytes32Hex(attestedClaimHash)) {
          throw new Error("The referral registrar did not return a valid Base claim hash.");
        }

        if (authorization.deadline === undefined) {
          throw new Error("The referral registrar did not return a signature deadline.");
        }

        const deadline = BigInt(authorization.deadline);

        setStatus("Confirm Celo referral points in your wallet.");
        await switchToReferralChain();

        const walletClient = createWalletClient({
          account: activeAccount,
          chain: referralChain,
          transport: custom(provider)
        });

        const hash = await walletClient.writeContract({
          address: configuredReferralRegistryAddress,
          abi: referralRegistryAbi,
          functionName: "register",
          args: [referrer, attestedClaimHash, deadline, authorization.signature]
        });

        setTxChain("celo");
        setTxHash(hash);
        setStatus("Referral sent. Waiting for Celo confirmation.");

        await referralPublicClient.waitForTransactionReceipt({ hash });
        setStatus(`Referral points added for ${compactAddress(referrer)}.`);
        await refreshReferralData(activeAccount);
        return true;
      } catch (referralRegisterError) {
        setReferralError(getErrorMessage(referralRegisterError));
        return false;
      } finally {
        setIsRegisteringReferral(false);
      }
    },
    [referralPublicClient, refreshReferralData, switchToReferralChain]
  );

  const donateToFaucet = useCallback(async () => {
    setError(undefined);
    setStatus(undefined);
    setTxHash(undefined);

    if (!configuredFaucetAddress) {
      setError("The faucet address is not configured yet.");
      return;
    }

    const normalizedAmount = donationAmount.trim().replace(",", ".");

    if (!/^\d+(\.\d+)?$/.test(normalizedAmount)) {
      setError("Enter a valid PAPPARDELLE amount.");
      return;
    }

    try {
      const parsedDonationAmount = parseUnits(normalizedAmount, snapshot.decimals);

      if (parsedDonationAmount <= 0n) {
        throw new Error("Enter an amount greater than zero.");
      }

      if (snapshot.walletBalance !== undefined && parsedDonationAmount > snapshot.walletBalance) {
        throw new Error("Your wallet does not have enough PAPPARDELLE for this donation.");
      }

      const activeAccount = account || (await requestAccount());
      await switchToBase();

      const provider = getProvider();
      if (!provider) throw new Error("Wallet not found.");

      setIsDonating(true);
      setStatus("Confirm the PAPPARDELLE donation in your wallet.");

      const walletClient = createWalletClient({
        account: activeAccount,
        chain: appChain,
        transport: custom(provider)
      });

      const hash = await walletClient.writeContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "transfer",
        args: [configuredFaucetAddress, parsedDonationAmount]
      });

      setTxChain("base");
      setTxHash(hash);
      setStatus("Donation sent. Waiting for Base confirmation.");

      await publicClient.waitForTransactionReceipt({ hash });
      setDonationAmount("");
      setStatus("Donation received. The faucet pantry has been refilled.");
      await refresh(activeAccount);
    } catch (donationError) {
      setError(getErrorMessage(donationError));
    } finally {
      setIsDonating(false);
    }
  }, [
    account,
    donationAmount,
    getProvider,
    publicClient,
    refresh,
    requestAccount,
    snapshot.decimals,
    snapshot.walletBalance,
    switchToBase
  ]);

  const buyMonthlyPass = useCallback(async () => {
    setError(undefined);
    setStatus(undefined);
    setTxHash(undefined);

    if (!configuredMonthlyPassRecipient) {
      setError("The monthly pass recipient is not configured yet.");
      return;
    }

    try {
      const parsedPassPrice = parseUnits(monthlyPassPrice, snapshot.decimals);

      if (snapshot.walletBalance !== undefined && parsedPassPrice > snapshot.walletBalance) {
        throw new Error(`You need ${monthlyPassPrice} PAPPARDELLE for the monthly pass.`);
      }

      const activeAccount = account || (await requestAccount());
      await switchToBase();

      const provider = getProvider();
      if (!provider) throw new Error("Wallet not found.");

      setIsBuyingMonthlyPass(true);
      setStatus("Confirm the monthly pass purchase in your wallet.");

      const walletClient = createWalletClient({
        account: activeAccount,
        chain: appChain,
        transport: custom(provider)
      });

      const hash = await walletClient.writeContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "transfer",
        args: [configuredMonthlyPassRecipient, parsedPassPrice]
      });

      setTxChain("base");
      setTxHash(hash);
      setStatus("Monthly pass payment sent. Waiting for Base confirmation.");

      await publicClient.waitForTransactionReceipt({ hash });
      setStatus("Monthly pass purchased with PAPPARDELLE.");
      await refresh(activeAccount);
    } catch (monthlyPassError) {
      setError(getErrorMessage(monthlyPassError));
    } finally {
      setIsBuyingMonthlyPass(false);
    }
  }, [
    account,
    getProvider,
    publicClient,
    refresh,
    requestAccount,
    snapshot.decimals,
    snapshot.walletBalance,
    switchToBase
  ]);

  const claim = useCallback(async () => {
    setError(undefined);
    setStatus(undefined);
    setTxHash(undefined);

    try {
      if (!configuredFaucetAddress) {
        throw new Error("NEXT_PUBLIC_FAUCET_ADDRESS is not configured.");
      }

      const activeAccount = account || (await requestAccount());
      await switchToBase();

      const provider = getProvider();
      if (!provider) throw new Error("Wallet not found.");

      setIsClaiming(true);
      setStatus("Confirm the transaction in your wallet.");

      const walletClient = createWalletClient({
        account: activeAccount,
        chain: appChain,
        transport: custom(provider)
      });

      const hash = await walletClient.writeContract({
        address: configuredFaucetAddress,
        abi: faucetVaultAbi,
        functionName: "claim"
      });

      setTxChain("base");
      setTxHash(hash);
      setLastClaimTxHash(hash);
      setStatus("Transaction sent. Waiting for Base confirmation.");

      await publicClient.waitForTransactionReceipt({ hash });
      setStatus("Serving claimed.");
      if (
        pendingReferrer &&
        configuredReferralRegistryAddress &&
        !isSameAddress(activeAccount, pendingReferrer)
      ) {
        await registerReferral(activeAccount, pendingReferrer, hash, provider);
      }
      setShowInvitation(true);
      await refresh(activeAccount);
      await refreshReferralData(activeAccount);
    } catch (claimError) {
      setError(getErrorMessage(claimError));
    } finally {
      setIsClaiming(false);
    }
  }, [
    account,
    getProvider,
    pendingReferrer,
    publicClient,
    refresh,
    refreshReferralData,
    registerReferral,
    requestAccount,
    switchToBase
  ]);

  useEffect(() => {
    refresh().catch(() => undefined);
    refreshReferralData().catch(() => undefined);
  }, [refresh, refreshReferralData]);

  useEffect(() => {
    const referrer = new URLSearchParams(window.location.search).get("ref");
    if (referrer && isAddress(referrer)) {
      setPendingReferrer(referrer as Address);
    }
  }, []);

  useEffect(() => {
    checkNetwork().catch(() => undefined);

    const provider = getProvider();
    if (!provider?.on || !provider.removeListener) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const nextAccount =
        Array.isArray(accounts) && typeof accounts[0] === "string" && isAddress(accounts[0])
          ? (accounts[0] as Address)
          : undefined;

      setAccount(nextAccount);
      refresh(nextAccount).catch(() => undefined);
      refreshReferralData(nextAccount).catch(() => undefined);
    };

    const handleChainChanged = () => {
      checkNetwork().catch(() => undefined);
      refresh().catch(() => undefined);
      refreshReferralData().catch(() => undefined);
    };

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);

    return () => {
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
      provider.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [checkNetwork, getProvider, refresh, refreshReferralData]);

  useEffect(() => {
    if (!miniAppCompatibility.shouldAutoConnect || account || autoConnectedRef.current) return;

    autoConnectedRef.current = true;
    connectWallet().catch(() => undefined);
  }, [account, connectWallet, miniAppCompatibility.shouldAutoConnect]);

  useEffect(() => {
    if (!showInvitation) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowInvitation(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showInvitation]);

  const explorerTokenUrl = `https://basescan.org/token/${tokenAddress}`;
  const explorerFaucetUrl = configuredFaucetAddress
    ? `https://basescan.org/address/${configuredFaucetAddress}`
    : undefined;
  const explorerReferralRegistryUrl = configuredReferralRegistryAddress
    ? `https://celoscan.io/address/${configuredReferralRegistryAddress}`
    : undefined;
  const explorerTxUrl = txHash
    ? `${txChain === "celo" ? "https://celoscan.io/tx/" : "https://basescan.org/tx/"}${txHash}`
    : undefined;
  const personalReferralUrl = account ? `${faucetSiteUrl}?ref=${account}` : undefined;
  const hasValidPendingReferrer = Boolean(
    pendingReferrer && (!account || !isSameAddress(account, pendingReferrer))
  );
  const canRegisterReferral = Boolean(
    configuredReferralRegistryAddress &&
      account &&
      pendingReferrer &&
      lastClaimTxHash &&
      snapshot.hasClaimed &&
      !referralSnapshot.referralRegistered &&
      !isSameAddress(account, pendingReferrer)
  );

  const claimDisabled =
    isConnecting ||
    isClaiming ||
    isRegisteringReferral ||
    isRefreshing ||
    miniAppCompatibility.isMiniPay ||
    !configuredFaucetAddress ||
    Boolean(snapshot.paused) ||
    Boolean(snapshot.hasClaimed) ||
    (account ? snapshot.canClaim === false : false);
  const donateDisabled =
    isConnecting ||
    isDonating ||
    isRefreshing ||
    miniAppCompatibility.isMiniPay ||
    !configuredFaucetAddress ||
    !donationAmount.trim();
  const monthlyPassDisabled =
    isConnecting ||
    isBuyingMonthlyPass ||
    isRefreshing ||
    miniAppCompatibility.isMiniPay ||
    !configuredMonthlyPassRecipient;

  const claimLabel = miniAppCompatibility.isMiniPay
    ? "Base wallet required"
    : !account
    ? "Connect wallet"
    : snapshot.hasClaimed
      ? "Already served"
      : snapshot.paused
        ? "Kitchen paused"
        : isClaiming
          ? "Preparing serving"
          : "Claim your serving";

  const displaySymbol = snapshot.symbol.toUpperCase();

  const copyReferralLink = useCallback(async () => {
    if (!personalReferralUrl) return;

    try {
      await navigator.clipboard.writeText(personalReferralUrl);
      setCopyStatus("Referral link copied.");
      window.setTimeout(() => setCopyStatus(undefined), 2200);
    } catch {
      setReferralError("Could not copy the referral link from this browser.");
    }
  }, [personalReferralUrl]);

  const retryReferralRegistration = useCallback(async () => {
    if (!account || !pendingReferrer || !lastClaimTxHash) return;

    const provider = getProvider();
    if (!provider) {
      setReferralError("Wallet not found.");
      return;
    }

    await registerReferral(account, pendingReferrer, lastClaimTxHash, provider);
  }, [account, getProvider, lastClaimTxHash, pendingReferrer, registerReferral]);

  return (
    <div className="app-frame">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="site-logo" role="img" aria-label="PAPPARDELLE plate with crypto meatballs" />
          <div>
            <p className="eyebrow">Base mainnet</p>
            <h1>PAPPARDELLE Trattoria Faucet</h1>
          </div>
        </div>

        <div className={networkOk ? "network-pill ready" : "network-pill"}>
          <ShieldCheck size={16} />
          <span>{networkOk ? "Base ready" : "Base needed"}</span>
        </div>
      </header>

      <section
        className="promo-banner"
        aria-label="PAPPARDELLE trattoria banner with steaming crypto meatball pasta"
      >
        <div className="promo-banner-copy">
          <p className="eyebrow">Fresh from the chain</p>
          <h2>Crypto meatballs, one serving per wallet</h2>
          <p>Pull up a chair, claim your plate, and keep the faucet pantry warm.</p>
          <a className="menu-dish-link" href={faucetSiteUrl}>
            <span>Today's menu plate</span>
            <strong>{faucetSiteUrl}</strong>
          </a>
        </div>
      </section>

      <section className="monthly-special" aria-label="PAPPARDELLE monthly special">
        <div className="monthly-special-copy">
          <div className="monthly-special-icon">
            <Ticket size={28} />
          </div>
          <div>
            <p className="eyebrow">Monthly special</p>
            <h2>Monthly pass</h2>
            <p>Buy PAPPARDELLE on Zora or request them from the faucet, then buy the monthly pass.</p>
            <strong>Price: {monthlyPassPrice} {displaySymbol}</strong>
          </div>
        </div>

        <div className="monthly-special-actions">
          <a className="special-button secondary" href={zoraUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={18} />
            <span>Buy on Zora</span>
          </a>
          <button className="special-button secondary" type="button" onClick={claim} disabled={claimDisabled}>
            {isClaiming ? <Loader2 className="spin" size={18} /> : <PlugZap size={18} />}
            <span>Request PAPPARDELLE from faucet</span>
          </button>
          <button className="special-button primary" type="button" onClick={buyMonthlyPass} disabled={monthlyPassDisabled}>
            {isBuyingMonthlyPass ? <Loader2 className="spin" size={18} /> : <ShoppingBag size={18} />}
            <span>Buy monthly pass using PAPPARDELLE</span>
          </button>
        </div>

        {!configuredMonthlyPassRecipient ? (
          <div className="notice warning">
            <AlertTriangle size={18} />
            <span>Set NEXT_PUBLIC_MONTHLY_PASS_RECIPIENT to enable monthly pass payments.</span>
          </div>
        ) : null}
      </section>

      <section className="claim-layout">
        <div className="claim-panel">
          <div className="claim-header">
            <div>
              <p className="eyebrow">One-time serving</p>
              <h2>{formatTokenAmount(snapshot.claimAmount, snapshot.decimals)} {displaySymbol}</h2>
              <p className="claim-copy">A fresh plate of PAPPARDELLE for each eligible wallet.</p>
            </div>
            <Utensils size={34} />
          </div>

          <div className="wallet-row">
            <div>
              <p className="label">Wallet</p>
              <p className="value">{account ? compactAddress(account) : "Not connected"}</p>
            </div>
            {!miniAppCompatibility.isMiniPay ? (
              <button className="secondary-button" type="button" onClick={connectWallet} disabled={isConnecting}>
                {isConnecting ? <Loader2 className="spin" size={18} /> : <Wallet size={18} />}
                <span>{account ? "Reconnect" : "Connect"}</span>
              </button>
            ) : null}
          </div>

          <button className="claim-button" type="button" onClick={claim} disabled={claimDisabled}>
            {isClaiming ? <Loader2 className="spin" size={20} /> : <PlugZap size={20} />}
            <span>{claimLabel}</span>
          </button>

          {!configuredFaucetAddress ? (
            <div className="notice warning">
              <AlertTriangle size={18} />
              <span>Configure NEXT_PUBLIC_FAUCET_ADDRESS after deploying the vault.</span>
            </div>
          ) : null}

          {miniAppCompatibility.isMiniPay ? (
            <div className="notice warning">
              <Info size={18} />
              <span>MiniPay detected. The Celo referral leaderboard works here, while the Base token claim still needs a Base-compatible wallet.</span>
            </div>
          ) : null}

          {miniAppCompatibility.isFarcasterMiniApp ? (
            <div className="notice success">
              <CheckCircle2 size={18} />
              <span>Farcaster Mini App ready. The app is using the Farcaster wallet provider when available.</span>
            </div>
          ) : null}

          {snapshot.hasClaimed ? (
            <div className="notice success">
              <CheckCircle2 size={18} />
              <span>This wallet has already received its serving.</span>
            </div>
          ) : null}

          <div className="notice disclaimer">
            <Info size={18} />
            <span>
              Disclaimer: PAPPARDELLE is a utility token for accessing and using tools created by
              {" "}pappardelle.eth. It is not presented as an investment product.
            </span>
          </div>

          {status ? (
            <div className="notice success">
              <CheckCircle2 size={18} />
              <span>{status}</span>
            </div>
          ) : null}

          {error ? (
            <div className="notice error">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          ) : null}

          {explorerTxUrl ? (
            <a className="inline-link" href={explorerTxUrl} target="_blank" rel="noreferrer">
              View transaction on {txChain === "celo" ? "CeloScan" : "BaseScan"}
              <ExternalLink size={16} />
            </a>
          ) : null}
        </div>

        <div className="side-rail">
          <div
            className="dish-showcase"
            role="img"
            aria-label="A steaming plate of pappardelle with crypto meatballs, fork, spoon, knife, and a pappardelle.eth napkin."
          />

          <div className="action-grid" aria-label="PAPPARDELLE actions">
            <a className="action-card pay-check-card" href={zoraUrl} target="_blank" rel="noreferrer">
              <span className="action-card-image" aria-hidden="true" />
              <span className="action-card-copy">
                <span className="eyebrow">Pay check</span>
                <strong>Buy PAPPARDELLE on Zora</strong>
                <small>Open the creator coin page.</small>
              </span>
              <ExternalLink size={18} />
            </a>

            <form className="action-card tip-box-card donation-form" onSubmit={(event) => {
              event.preventDefault();
              donateToFaucet().catch(() => undefined);
            }}>
              <span className="action-card-image" aria-hidden="true" />
              <span className="action-card-copy">
                <span className="eyebrow">Tip box</span>
                <strong>Donate PAPPARDELLE to the Faucet</strong>
                <small>Choose how many tokens to send to the vault.</small>
              </span>
              <span className="donation-controls">
                <input
                  aria-label="Donation amount"
                  className="donation-input"
                  inputMode="decimal"
                  min="0"
                  onChange={(event) => setDonationAmount(event.target.value)}
                  placeholder="Amount"
                  type="text"
                  value={donationAmount}
                />
                <button className="donation-button" type="submit" disabled={donateDisabled}>
                  {isDonating ? <Loader2 className="spin" size={16} /> : <Coins size={16} />}
                  <span>Donate</span>
                </button>
              </span>
            </form>
          </div>

          <div className="stats-grid">
            <Metric
              icon={<Coins size={20} />}
              label="Pantry"
              value={`${formatTokenAmount(snapshot.vaultBalance, snapshot.decimals)} ${displaySymbol}`}
            />
            <Metric
              icon={<Wallet size={20} />}
              label="In your wallet"
              value={`${formatTokenAmount(snapshot.walletBalance, snapshot.decimals)} ${displaySymbol}`}
            />
            <Metric icon={<Droplets size={20} />} label="Servings claimed" value={formatCount(snapshot.totalClaims)} />
            <Metric
              icon={<ShieldCheck size={20} />}
              label="Kitchen"
              value={snapshot.paused ? "Paused" : snapshot.hasClaimed ? "Served" : "Ready"}
            />
          </div>
        </div>
      </section>

      <section className="referral-section" aria-label="PAPPARDELLE referral airdrop points">
        <div className="referral-panel">
          <div className="referral-heading">
            <div className="referral-icon">
              <Gift size={24} />
            </div>
            <div>
              <p className="eyebrow">Airdrop points</p>
              <h2>Referral leaderboard</h2>
              <p>
                Share your trattoria link. When a new wallet claims from it, your address earns
                points for a future PAPPARDELLE airdrop.
              </p>
            </div>
          </div>

          {!configuredReferralRegistryAddress ? (
            <div className="notice warning">
              <AlertTriangle size={18} />
              <span>Referral scoring is ready for Celo. Deploy the registry on Celo mainnet and set NEXT_PUBLIC_REFERRAL_REGISTRY_ADDRESS to activate the leaderboard.</span>
            </div>
          ) : null}

          {configuredReferralRegistryAddress && !referralAuthApiUrl ? (
            <div className="notice warning">
              <AlertTriangle size={18} />
              <span>Leaderboard reads from Celo. To write points after Base claims, connect a registrar API that verifies the Base claim and authorizes the Celo registry.</span>
            </div>
          ) : null}

          {hasValidPendingReferrer && pendingReferrer ? (
            <div className="notice success">
              <UserPlus size={18} />
              <span>Referral chef detected: {compactAddress(pendingReferrer)}.</span>
            </div>
          ) : null}

          {pendingReferrer && account && isSameAddress(account, pendingReferrer) ? (
            <div className="notice warning">
              <AlertTriangle size={18} />
              <span>Self referrals do not earn airdrop points.</span>
            </div>
          ) : null}

          <div className="referral-link-row">
            <div className="referral-url">
              <p className="label">Your referral link</p>
              <strong>{personalReferralUrl || "Connect wallet to cook your link"}</strong>
            </div>
            <button className="copy-button" type="button" onClick={copyReferralLink} disabled={!personalReferralUrl}>
              <Copy size={18} />
              <span>Copy</span>
            </button>
          </div>

          <div className="referral-metrics">
            <div className="referral-stat">
              <p className="label">Your points</p>
              <strong>{formatPoints(referralSnapshot.points)}</strong>
            </div>
            <div className="referral-stat">
              <p className="label">Your referrals</p>
              <strong>{formatPoints(referralSnapshot.referrals)}</strong>
            </div>
            <div className="referral-stat">
              <p className="label">Points per claim</p>
              <strong>{formatPoints(referralSnapshot.pointsPerReferral)}</strong>
            </div>
            <div className="referral-stat">
              <p className="label">Registered referrals</p>
              <strong>{formatPoints(referralSnapshot.totalRegisteredReferrals)}</strong>
            </div>
          </div>

          {referralSnapshot.referralRegistered && referralSnapshot.referredBy ? (
            <div className="notice success">
              <CheckCircle2 size={18} />
              <span>Your referral was registered for {compactAddress(referralSnapshot.referredBy)}.</span>
            </div>
          ) : null}

          {canRegisterReferral ? (
            <button
              className="referral-register-button"
              type="button"
              onClick={retryReferralRegistration}
              disabled={isRegisteringReferral}
            >
              {isRegisteringReferral ? <Loader2 className="spin" size={18} /> : <UserPlus size={18} />}
              <span>Sync Celo referral points</span>
            </button>
          ) : null}

          {copyStatus ? (
            <div className="notice success">
              <CheckCircle2 size={18} />
              <span>{copyStatus}</span>
            </div>
          ) : null}

          {referralError ? (
            <div className="notice error">
              <AlertTriangle size={18} />
              <span>{referralError}</span>
            </div>
          ) : null}
        </div>

        <div className="leaderboard-panel">
          <div className="leaderboard-heading">
            <Trophy size={24} />
            <div>
              <p className="eyebrow">Future airdrop</p>
              <h2>Top referrers</h2>
            </div>
          </div>

          <div className="leaderboard-list">
            {leaderboard.length > 0 ? (
              leaderboard.map((entry, index) => (
                <a
                  className="leaderboard-row"
                  href={`https://basescan.org/address/${entry.account}`}
                  key={entry.account}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="leaderboard-rank">#{index + 1}</span>
                  <span className="leaderboard-account">{compactAddress(entry.account)}</span>
                  <span className="leaderboard-score">
                    <strong>{formatPoints(entry.points)}</strong>
                    <small>{formatPoints(entry.referrals)} referrals</small>
                  </span>
                </a>
              ))
            ) : (
              <div className="empty-leaderboard">
                <Trophy size={24} />
                <span>No referral points yet.</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="contract-row">
        <a href={explorerTokenUrl} target="_blank" rel="noreferrer">
          Token {compactAddress(tokenAddress)}
          <ExternalLink size={15} />
        </a>
        {explorerFaucetUrl ? (
          <a href={explorerFaucetUrl} target="_blank" rel="noreferrer">
            Vault {compactAddress(configuredFaucetAddress || zeroAddress)}
            <ExternalLink size={15} />
          </a>
        ) : null}
        {explorerReferralRegistryUrl ? (
          <a href={explorerReferralRegistryUrl} target="_blank" rel="noreferrer">
            Referrals {compactAddress(configuredReferralRegistryAddress || zeroAddress)}
            <ExternalLink size={15} />
          </a>
        ) : null}
      </footer>

      {showInvitation ? <RektaurantInvitation onClose={() => setShowInvitation(false)} /> : null}
    </div>
  );
}

function RektaurantInvitation({ onClose }: { onClose: () => void }) {
  return (
    <div className="invite-overlay" role="presentation">
      <section className="invite-modal" role="dialog" aria-modal="true" aria-labelledby="rektaurant-title">
        <button className="invite-close" type="button" onClick={onClose} aria-label="Close invitation">
          <X size={18} />
        </button>

        <div className="invite-envelope" aria-hidden="true">
          <div className="envelope-flap" />
          <div className="envelope-card">
            <Mail size={34} />
            <span>pappardelle.eth</span>
          </div>
        </div>

        <p className="eyebrow">Claim served</p>
        <h3 id="rektaurant-title">Your table is ready at the Rektaurant</h3>
        <p className="invite-copy">
          Bring your fresh PAPPARDELLE utility token and step into the tool kitchen by pappardelle.eth.
        </p>

        <a className="invite-button" href={rektaurantUrl} target="_blank" rel="noreferrer">
          Open Rektaurant
          <ExternalLink size={17} />
        </a>
      </section>
    </div>
  );
}

function Metric({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div>
        <p className="label">{label}</p>
        <p className="value">{value}</p>
      </div>
    </div>
  );
}
