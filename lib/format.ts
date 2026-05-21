import { formatUnits } from "viem";

export function compactAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatTokenAmount(
  value: bigint | undefined,
  decimals: number,
  maxFractionDigits = 4
) {
  if (value === undefined) return "0";

  const formatted = formatUnits(value, decimals);
  const [whole, fraction = ""] = formatted.split(".");
  const trimmedFraction = fraction.slice(0, maxFractionDigits).replace(/0+$/, "");

  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole;
}

export function formatCount(value: bigint | undefined) {
  if (value === undefined) return "0";
  return new Intl.NumberFormat("it-IT").format(Number(value));
}
