// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PappardelleReferralRegistry is Ownable, ReentrancyGuard {
    bytes32 private constant EIP712_DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    bytes32 private constant NAME_HASH = keccak256("PappardelleReferralRegistry");
    bytes32 private constant VERSION_HASH = keccak256("1");
    bytes32 public constant REFERRAL_AUTHORIZATION_TYPEHASH = keccak256(
        "ReferralAuthorization(address account,address referrer,bytes32 baseClaimTxHash,uint256 deadline)"
    );

    bytes32 private immutable _domainSeparator;

    address public claimSigner;
    uint256 public pointsPerReferral;
    uint256 public totalRegisteredReferrals;

    mapping(address account => address referrer) public referredBy;
    mapping(address account => bool registered) public referralRegistered;
    mapping(address registrar => bool allowed) public registrars;
    mapping(bytes32 baseClaimTxHash => bool used) public baseClaimTxHashUsed;

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
        bytes32 indexed baseClaimTxHash,
        uint256 pointsAwarded,
        uint256 totalPoints,
        uint256 totalReferrals
    );
    event ClaimSignerUpdated(address indexed previousSigner, address indexed newSigner);
    event RegistrarUpdated(address indexed registrar, bool allowed);
    event PointsPerReferralUpdated(uint256 previousPoints, uint256 newPoints);

    error ZeroAddress();
    error ZeroHash();
    error ZeroPoints();
    error SelfReferral();
    error ReferralAlreadyRegistered(address account);
    error ClaimHashAlreadyUsed(bytes32 baseClaimTxHash);
    error SignatureExpired(uint256 deadline);
    error InvalidSignature();
    error NotRegistrar(address account);
    error LeaderboardLimitTooLarge(uint256 limit, uint256 maxLimit);

    modifier onlyRegistrar() {
        if (msg.sender != owner() && !registrars[msg.sender]) revert NotRegistrar(msg.sender);
        _;
    }

    constructor(address initialClaimSigner, uint256 initialPointsPerReferral) Ownable(msg.sender) {
        if (initialClaimSigner == address(0)) revert ZeroAddress();
        if (initialPointsPerReferral == 0) revert ZeroPoints();

        _domainSeparator = keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                NAME_HASH,
                VERSION_HASH,
                block.chainid,
                address(this)
            )
        );
        claimSigner = initialClaimSigner;
        pointsPerReferral = initialPointsPerReferral;
        registrars[initialClaimSigner] = true;

        emit RegistrarUpdated(initialClaimSigner, true);
    }

    function register(
        address referrer,
        bytes32 baseClaimTxHash,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant returns (uint256 pointsAwarded) {
        if (block.timestamp > deadline) revert SignatureExpired(deadline);

        address account = msg.sender;
        bytes32 digest = _hashTypedData(
            keccak256(
                abi.encode(
                    REFERRAL_AUTHORIZATION_TYPEHASH,
                    account,
                    referrer,
                    baseClaimTxHash,
                    deadline
                )
            )
        );

        if (ECDSA.recover(digest, signature) != claimSigner) revert InvalidSignature();

        pointsAwarded = _register(account, referrer, baseClaimTxHash);
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparator;
    }

    function recordReferral(address account, address referrer, bytes32 baseClaimTxHash)
        external
        onlyRegistrar
        nonReentrant
        returns (uint256 pointsAwarded)
    {
        pointsAwarded = _register(account, referrer, baseClaimTxHash);
    }

    function setClaimSigner(address newClaimSigner) external onlyOwner {
        if (newClaimSigner == address(0)) revert ZeroAddress();

        emit ClaimSignerUpdated(claimSigner, newClaimSigner);
        claimSigner = newClaimSigner;
    }

    function setRegistrar(address registrar, bool allowed) external onlyOwner {
        if (registrar == address(0)) revert ZeroAddress();

        registrars[registrar] = allowed;
        emit RegistrarUpdated(registrar, allowed);
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

    function _register(address account, address referrer, bytes32 baseClaimTxHash)
        private
        returns (uint256 pointsAwarded)
    {
        if (account == address(0) || referrer == address(0)) revert ZeroAddress();
        if (baseClaimTxHash == bytes32(0)) revert ZeroHash();
        if (referrer == account) revert SelfReferral();
        if (referralRegistered[account]) revert ReferralAlreadyRegistered(account);
        if (baseClaimTxHashUsed[baseClaimTxHash]) revert ClaimHashAlreadyUsed(baseClaimTxHash);

        pointsAwarded = pointsPerReferral;
        referralRegistered[account] = true;
        referredBy[account] = referrer;
        baseClaimTxHashUsed[baseClaimTxHash] = true;

        if (!_knownReferrer[referrer]) {
            _knownReferrer[referrer] = true;
            _referrers.push(referrer);
        }

        ReferralStats storage stats = _stats[referrer];
        stats.points += pointsAwarded;
        stats.referrals += 1;
        stats.lastReferralAt = block.timestamp;
        totalRegisteredReferrals += 1;

        emit ReferralRegistered(
            account,
            referrer,
            baseClaimTxHash,
            pointsAwarded,
            stats.points,
            stats.referrals
        );
    }

    function _hashTypedData(bytes32 structHash) private view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", _domainSeparator, structHash));
    }
}
