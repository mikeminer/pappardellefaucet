// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IPappardelleFaucetVault {
    function hasClaimed(address account) external view returns (bool);
}

contract PappardelleReferralRegistry is Ownable, ReentrancyGuard {
    IPappardelleFaucetVault public immutable faucetVault;

    uint256 public pointsPerReferral;
    uint256 public totalRegisteredReferrals;

    mapping(address account => address referrer) public referredBy;
    mapping(address account => bool registered) public referralRegistered;

    struct ReferralStats {
        uint256 points;
        uint256 referrals;
        uint256 lastReferralAt;
    }

    mapping(address referrer => ReferralStats stats) private _stats;
    mapping(address referrer => bool known) private _knownReferrer;
    address[] private _referrers;

    event ReferralRegistered(
        address indexed account,
        address indexed referrer,
        uint256 pointsAwarded,
        uint256 totalPoints,
        uint256 totalReferrals
    );
    event PointsPerReferralUpdated(uint256 previousPoints, uint256 newPoints);

    error ZeroAddress();
    error ZeroPoints();
    error SelfReferral();
    error ReferralAlreadyRegistered(address account);
    error ClaimRequired(address account);
    error LeaderboardLimitTooLarge(uint256 limit, uint256 maxLimit);

    constructor(address faucetVaultAddress, uint256 initialPointsPerReferral) Ownable(msg.sender) {
        if (faucetVaultAddress == address(0)) revert ZeroAddress();
        if (initialPointsPerReferral == 0) revert ZeroPoints();

        faucetVault = IPappardelleFaucetVault(faucetVaultAddress);
        pointsPerReferral = initialPointsPerReferral;
    }

    function register(address referrer) external nonReentrant returns (uint256 pointsAwarded) {
        address account = msg.sender;

        if (referrer == address(0)) revert ZeroAddress();
        if (referrer == account) revert SelfReferral();
        if (referralRegistered[account]) revert ReferralAlreadyRegistered(account);
        if (!faucetVault.hasClaimed(account)) revert ClaimRequired(account);

        pointsAwarded = pointsPerReferral;
        referralRegistered[account] = true;
        referredBy[account] = referrer;

        if (!_knownReferrer[referrer]) {
            _knownReferrer[referrer] = true;
            _referrers.push(referrer);
        }

        ReferralStats storage stats = _stats[referrer];
        stats.points += pointsAwarded;
        stats.referrals += 1;
        stats.lastReferralAt = block.timestamp;
        totalRegisteredReferrals += 1;

        emit ReferralRegistered(account, referrer, pointsAwarded, stats.points, stats.referrals);
    }

    function setPointsPerReferral(uint256 newPointsPerReferral) external onlyOwner {
        if (newPointsPerReferral == 0) revert ZeroPoints();

        emit PointsPerReferralUpdated(pointsPerReferral, newPointsPerReferral);
        pointsPerReferral = newPointsPerReferral;
    }

    function statsOf(address referrer)
        external
        view
        returns (uint256 points, uint256 referrals, uint256 lastReferralAt)
    {
        ReferralStats storage stats = _stats[referrer];
        return (stats.points, stats.referrals, stats.lastReferralAt);
    }

    function referrerCount() external view returns (uint256) {
        return _referrers.length;
    }

    function referrerAt(uint256 index) external view returns (address) {
        return _referrers[index];
    }

    function topReferrers(uint256 limit)
        external
        view
        returns (
            address[] memory accounts,
            uint256[] memory points,
            uint256[] memory referrals,
            uint256[] memory lastReferralAts
        )
    {
        if (limit > 50) revert LeaderboardLimitTooLarge(limit, 50);

        uint256 referrerLength = _referrers.length;
        uint256 resultLength = limit < referrerLength ? limit : referrerLength;

        accounts = new address[](resultLength);
        points = new uint256[](resultLength);
        referrals = new uint256[](resultLength);
        lastReferralAts = new uint256[](resultLength);

        if (resultLength == 0) {
            return (accounts, points, referrals, lastReferralAts);
        }

        for (uint256 i = 0; i < referrerLength; i++) {
            address candidate = _referrers[i];
            ReferralStats storage candidateStats = _stats[candidate];

            for (uint256 j = 0; j < resultLength; j++) {
                bool beatsCurrent = candidateStats.points > points[j]
                    || (
                        candidateStats.points == points[j]
                            && candidateStats.referrals > referrals[j]
                    );

                if (!beatsCurrent) {
                    continue;
                }

                for (uint256 k = resultLength - 1; k > j; k--) {
                    accounts[k] = accounts[k - 1];
                    points[k] = points[k - 1];
                    referrals[k] = referrals[k - 1];
                    lastReferralAts[k] = lastReferralAts[k - 1];
                }

                accounts[j] = candidate;
                points[j] = candidateStats.points;
                referrals[j] = candidateStats.referrals;
                lastReferralAts[j] = candidateStats.lastReferralAt;
                break;
            }
        }
    }
}
