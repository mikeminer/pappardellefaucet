// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PappardelleFaucetVault is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    uint256 public claimAmount;
    uint256 public totalClaims;

    mapping(address account => bool claimed) public hasClaimed;

    event Claimed(address indexed account, uint256 amount);
    event ClaimAmountUpdated(uint256 previousAmount, uint256 newAmount);
    event VaultWithdrawn(address indexed to, uint256 amount);

    error ZeroAddress();
    error ZeroAmount();
    error AlreadyClaimed(address account);
    error InsufficientVaultBalance(uint256 balance, uint256 required);

    constructor(address tokenAddress, uint256 initialClaimAmount) Ownable(msg.sender) {
        if (tokenAddress == address(0)) revert ZeroAddress();
        if (initialClaimAmount == 0) revert ZeroAmount();

        token = IERC20(tokenAddress);
        claimAmount = initialClaimAmount;
    }

    function claim() external nonReentrant whenNotPaused {
        address account = msg.sender;
        if (hasClaimed[account]) revert AlreadyClaimed(account);

        uint256 amount = claimAmount;
        if (amount == 0) revert ZeroAmount();

        uint256 balance = token.balanceOf(address(this));
        if (balance < amount) revert InsufficientVaultBalance(balance, amount);

        hasClaimed[account] = true;
        unchecked {
            totalClaims += 1;
        }

        token.safeTransfer(account, amount);
        emit Claimed(account, amount);
    }

    function setClaimAmount(uint256 newClaimAmount) external onlyOwner {
        if (newClaimAmount == 0) revert ZeroAmount();

        emit ClaimAmountUpdated(claimAmount, newClaimAmount);
        claimAmount = newClaimAmount;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function withdraw(address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        token.safeTransfer(to, amount);
        emit VaultWithdrawn(to, amount);
    }

    function vaultBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function canClaim(address account) external view returns (bool) {
        return !paused()
            && !hasClaimed[account]
            && claimAmount > 0
            && token.balanceOf(address(this)) >= claimAmount;
    }
}
