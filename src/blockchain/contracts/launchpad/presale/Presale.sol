// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

/**
 * @title Presale
 * @dev An updated presale contract with clean architecture
 * @author KalyChain Team
 */

abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

library SafeMath {
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");
        return c;
    }

    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b <= a, "SafeMath: subtraction overflow");
        return a - b;
    }

    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) return 0;
        uint256 c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");
        return c;
    }

    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b > 0, "SafeMath: division by zero");
        return a / b;
    }
}

interface IERC20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

library TransferHelper {
    function safeApprove(address token, address to, uint256 value) internal {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0x095ea7b3, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'TransferHelper: APPROVE_FAILED');
    }

    function safeTransfer(address token, address to, uint256 value) internal {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0xa9059cbb, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'TransferHelper: TRANSFER_FAILED');
    }

    function safeTransferFrom(address token, address from, address to, uint256 value) internal {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0x23b872dd, from, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'TransferHelper: TRANSFER_FROM_FAILED');
    }

    function safeTransferBaseToken(address token, address payable to, uint256 value, bool isERC20) internal {
        if (!isERC20) {
            to.transfer(value);
        } else {
            (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0xa9059cbb, to, value));
            require(success && (data.length == 0 || abi.decode(data, (bool))), 'TransferHelper: TRANSFER_FAILED');
        }
    }
}

interface IKalySwapRouter {
    function factory() external pure returns (address);
    function WKLC() external pure returns (address);
    
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);
    
    function addLiquidityKLC(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountKLCMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountKLC, uint liquidity);
}

interface IKalySwapFactory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
    function createPair(address tokenA, address tokenB) external returns (address pair);
}

/**
 * @title Presale
 * @dev Presale contract implementation
 */
contract Presale is ReentrancyGuard {
    using SafeMath for uint256;

    // ============ ENUMS ============
    
    enum PresaleStatus { PENDING, ACTIVE, SUCCESS, FAILED, CANCELLED, FINALIZED }
    enum PresaleType { PUBLIC, WHITELIST }

    // ============ STRUCTS ============
    
    struct PresaleInfo {
        address saleToken;          // Token being sold
        address baseToken;          // Token used for payment (address(0) for native KLC)
        uint256 tokenRate;          // How many sale tokens per base token
        uint256 liquidityRate;      // Rate for liquidity addition
        uint256 raiseMin;           // Minimum contribution per user
        uint256 raiseMax;           // Maximum contribution per user
        uint256 softCap;            // Minimum total raise for success
        uint256 hardCap;            // Maximum total raise
        uint256 liquidityPercent;   // Percentage of raised funds for liquidity
        uint256 presaleStart;       // Start timestamp
        uint256 presaleEnd;         // End timestamp
        PresaleType presaleType;    // Public or whitelist
        uint256 publicTime;         // When whitelist becomes public (0 = always whitelist)
    }

    struct BuyerInfo {
        uint256 baseContribution;   // Amount of base token contributed
        uint256 tokenAllocation;    // Amount of sale tokens allocated
        bool claimed;               // Whether tokens have been claimed
    }

    struct TokenInfo {
        string name;
        string symbol;
        uint256 totalSupply;
        uint8 decimals;
    }

    // ============ STATE VARIABLES ============
    
    address public owner;
    PresaleInfo public presaleInfo;
    TokenInfo public tokenInfo;
    
    // Status tracking
    uint256 public raisedAmount;        // Total base tokens raised
    uint256 public soldTokens;          // Total sale tokens sold
    uint256 public participantCount;    // Number of unique participants
    bool public cancelled;              // Whether presale is cancelled
    bool public finalized;              // Whether presale is finalized
    uint256 public tokenUnlockTime;     // When users can claim tokens
    
    // LP Token locking
    address public lpTokenAddress;      // Address of LP token pair
    uint256 public lpTokenAmount;       // Amount of LP tokens locked
    uint256 public lpUnlockTime;        // When LP tokens can be withdrawn
    uint256 public lpLockDuration;      // LP lock duration in seconds
    address public lpRecipient;         // Who receives LP tokens after unlock
    bool public lpTokensWithdrawn;      // Whether LP tokens have been withdrawn
    
    // Configuration
    IKalySwapRouter public router;
    uint256 public lockDelay;           // Additional token lock delay after finalization
    
    // Constants
    uint256 public constant MIN_LP_LOCK_TIME = 2592000; // 1 month
    uint256 public constant FOREVER_LOCK = type(uint256).max;
    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    
    // Mappings
    mapping(address => BuyerInfo) public buyers;
    mapping(address => bool) public whitelist;
    mapping(address => bool) public permanentWhitelist;
    
    // ============ EVENTS ============
    
    event PresaleCreated(address indexed owner, address indexed presale);
    event Participated(address indexed user, uint256 baseAmount, uint256 tokenAmount);
    event TokensClaimed(address indexed user, uint256 amount);
    event RefundClaimed(address indexed user, uint256 amount);
    event PresaleFinalized(uint256 raisedAmount, uint256 liquidityAmount);
    event LPTokensLocked(address indexed lpToken, uint256 amount, uint256 unlockTime);
    event LPTokensWithdrawn(address indexed lpToken, uint256 amount, address recipient);
    event PresaleCancelled();
    event RemainingFundsWithdrawn(address indexed owner, uint256 amount);
    
    // ============ MODIFIERS ============
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyWhenActive() {
        require(getStatus() == PresaleStatus.ACTIVE, "Presale not active");
        _;
    }
    
    modifier onlyWhenFinalized() {
        require(getStatus() == PresaleStatus.FINALIZED, "Not finalized");
        _;
    }

    // ============ CONSTRUCTOR ============

    /**
     * @dev Constructor - limited to 12 parameters due to Solidity constraints
     */
    constructor(
        address _owner,
        address _saleToken,
        address _baseToken,
        uint256 _tokenRate,
        uint256 _liquidityRate,
        uint256 _raiseMin,
        uint256 _raiseMax,
        uint256 _softCap,
        uint256 _hardCap,
        uint256 _liquidityPercent,
        uint256 _presaleStart,
        uint256 _presaleEnd
    ) {
        require(_owner != address(0), "Invalid owner");
        require(_saleToken != address(0), "Invalid sale token");
        require(_tokenRate > 0, "Invalid token rate");
        require(_liquidityRate > 0, "Invalid liquidity rate");
        require(_raiseMin > 0 && _raiseMax > _raiseMin, "Invalid raise limits");
        require(_softCap > 0 && _hardCap > _softCap, "Invalid caps");
        require(_liquidityPercent > 0 && _liquidityPercent <= 100, "Invalid liquidity percent");
        require(_presaleStart > block.timestamp, "Invalid start time");
        require(_presaleEnd > _presaleStart, "Invalid end time");

        owner = _owner;

        // Initialize presale info
        presaleInfo = PresaleInfo({
            saleToken: _saleToken,
            baseToken: _baseToken,
            tokenRate: _tokenRate,
            liquidityRate: _liquidityRate,
            raiseMin: _raiseMin,
            raiseMax: _raiseMax,
            softCap: _softCap,
            hardCap: _hardCap,
            liquidityPercent: _liquidityPercent,
            presaleStart: _presaleStart,
            presaleEnd: _presaleEnd,
            presaleType: PresaleType.PUBLIC,
            publicTime: 0
        });

        // Initialize token info
        IERC20 token = IERC20(_saleToken);
        tokenInfo = TokenInfo({
            name: token.name(),
            symbol: token.symbol(),
            totalSupply: token.totalSupply(),
            decimals: token.decimals()
        });

        // Initialize LP locking with defaults
        lpLockDuration = MIN_LP_LOCK_TIME;
        lpRecipient = _owner;

        emit PresaleCreated(_owner, address(this));
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @dev Get current presale status (pure view function with no side effects)
     */
    function getStatus() public view returns (PresaleStatus) {
        if (cancelled) return PresaleStatus.CANCELLED;
        if (finalized) return PresaleStatus.FINALIZED;

        if (block.timestamp < presaleInfo.presaleStart) {
            return PresaleStatus.PENDING;
        }

        if (block.timestamp <= presaleInfo.presaleEnd) {
            if (raisedAmount >= presaleInfo.hardCap) {
                return PresaleStatus.SUCCESS;
            }
            return PresaleStatus.ACTIVE;
        }

        // Presale has ended
        if (raisedAmount >= presaleInfo.softCap) {
            return PresaleStatus.SUCCESS;
        }

        return PresaleStatus.FAILED;
    }

    /**
     * @dev Calculate token amount for given base amount
     */
    function calculateTokenAmount(uint256 baseAmount) public view returns (uint256) {
        return baseAmount.mul(presaleInfo.tokenRate).div(10**(18 - tokenInfo.decimals));
    }

    /**
     * @dev Check if address is whitelisted (considers permanent whitelist and public time)
     */
    function isWhitelisted(address user) public view returns (bool) {
        if (presaleInfo.presaleType == PresaleType.PUBLIC) {
            if (presaleInfo.publicTime == 0 || block.timestamp >= presaleInfo.publicTime) {
                return true;
            }
        }
        return whitelist[user];
    }

    /**
     * @dev Get presale progress as percentage (0-100)
     */
    function getProgress() public view returns (uint256) {
        if (presaleInfo.hardCap == 0) return 0;
        return raisedAmount.mul(100).div(presaleInfo.hardCap);
    }

    /**
     * @dev Check if user can participate
     */
    function canParticipate(address user, uint256 amount) public view returns (bool, string memory) {
        if (getStatus() != PresaleStatus.ACTIVE) {
            return (false, "Presale not active");
        }

        if (!isWhitelisted(user)) {
            return (false, "Not whitelisted");
        }

        if (amount < presaleInfo.raiseMin) {
            return (false, "Below minimum contribution");
        }

        uint256 newContribution = buyers[user].baseContribution.add(amount);
        if (newContribution > presaleInfo.raiseMax) {
            return (false, "Exceeds maximum contribution");
        }

        if (raisedAmount.add(amount) > presaleInfo.hardCap) {
            return (false, "Exceeds hard cap");
        }

        return (true, "");
    }

    // ============ CORE FUNCTIONS ============

    /**
     * @dev Participate in presale by contributing base tokens
     * @param amount Amount of ERC20 base tokens (ignored for native KLC)
     */
    function participate(uint256 amount) external payable nonReentrant onlyWhenActive {
        bool isNative = (presaleInfo.baseToken == address(0));
        uint256 contribution = isNative ? msg.value : amount;

        (bool canPart, string memory reason) = canParticipate(msg.sender, contribution);
        require(canPart, reason);

        // Calculate token allocation
        uint256 tokenAmount = calculateTokenAmount(contribution);
        require(tokenAmount > 0, "Zero tokens");

        // Update buyer info
        BuyerInfo storage buyer = buyers[msg.sender];
        if (buyer.baseContribution == 0) {
            participantCount = participantCount.add(1);
        }

        buyer.baseContribution = buyer.baseContribution.add(contribution);
        buyer.tokenAllocation = buyer.tokenAllocation.add(tokenAmount);

        // Update global state
        raisedAmount = raisedAmount.add(contribution);
        soldTokens = soldTokens.add(tokenAmount);

        // Handle payment
        if (!isNative) {
            TransferHelper.safeTransferFrom(presaleInfo.baseToken, msg.sender, address(this), contribution);
        }

        emit Participated(msg.sender, contribution, tokenAmount);
    }

    /**
     * @dev Finalize successful presale - adds liquidity and locks LP tokens
     */
    function finalize() external nonReentrant onlyOwner {
        require(!finalized, "Already finalized");
        require(getStatus() == PresaleStatus.SUCCESS, "Presale not successful");
        require(address(router) != address(0), "Router not set");

        bool isNative = (presaleInfo.baseToken == address(0));

        // Calculate liquidity amounts
        uint256 liquidityBase = raisedAmount.mul(presaleInfo.liquidityPercent).div(100);
        uint256 liquidityTokens = liquidityBase.mul(presaleInfo.liquidityRate).div(10**(18 - tokenInfo.decimals));

        // Verify sufficient tokens for liquidity
        require(IERC20(presaleInfo.saleToken).balanceOf(address(this)) >= liquidityTokens, "Insufficient tokens for liquidity");

        // Approve tokens for router
        TransferHelper.safeApprove(presaleInfo.saleToken, address(router), liquidityTokens);

        uint256 liquidity;

        if (isNative) {
            // Add KLC liquidity
            (, , liquidity) = router.addLiquidityKLC{value: liquidityBase}(
                presaleInfo.saleToken,
                liquidityTokens,
                0, // Accept any amount of tokens
                0, // Accept any amount of KLC
                address(this), // LP tokens come to this contract
                block.timestamp + 3600 // 1 hour deadline
            );
        } else {
            // Add ERC20 liquidity
            TransferHelper.safeApprove(presaleInfo.baseToken, address(router), liquidityBase);

            (, , liquidity) = router.addLiquidity(
                presaleInfo.baseToken,
                presaleInfo.saleToken,
                liquidityBase,
                liquidityTokens,
                0, // Accept any amount of base tokens
                0, // Accept any amount of sale tokens
                address(this), // LP tokens come to this contract
                block.timestamp + 3600 // 1 hour deadline
            );
        }

        // Lock LP tokens
        _lockLPTokens(liquidity);

        // Transfer remaining base tokens to owner
        uint256 remainingBase = isNative ? address(this).balance : IERC20(presaleInfo.baseToken).balanceOf(address(this));
        if (remainingBase > 0) {
            TransferHelper.safeTransferBaseToken(presaleInfo.baseToken, payable(owner), remainingBase, !isNative);
        }

        // Set finalization state
        finalized = true;
        tokenUnlockTime = block.timestamp.add(lockDelay);

        emit PresaleFinalized(raisedAmount, liquidityBase);
    }

    /**
     * @dev Internal function to lock LP tokens
     */
    function _lockLPTokens(uint256 _liquidity) internal {
        require(_liquidity > 0, "No LP tokens to lock");

        // Get LP token address from router's factory after liquidity has been added
        address factory = router.factory();
        address wklc = router.WKLC();
        address baseTokenAddr = (presaleInfo.baseToken == address(0)) ? wklc : presaleInfo.baseToken;

        // The pair should exist after addLiquidity call - get it from factory
        lpTokenAddress = IKalySwapFactory(factory).getPair(presaleInfo.saleToken, baseTokenAddr);
        require(lpTokenAddress != address(0), "LP pair not found");

        // Store LP token info
        lpTokenAmount = _liquidity;

        // Calculate unlock time
        if (lpLockDuration == FOREVER_LOCK) {
            lpUnlockTime = FOREVER_LOCK;
        } else {
            lpUnlockTime = block.timestamp.add(lpLockDuration);
        }

        lpTokensWithdrawn = false;

        emit LPTokensLocked(lpTokenAddress, _liquidity, lpUnlockTime);
    }

    // ============ WITHDRAWAL FUNCTIONS ============

    /**
     * @dev Claim purchased tokens after successful presale finalization
     */
    function claimTokens() external nonReentrant onlyWhenFinalized {
        require(block.timestamp >= tokenUnlockTime, "Tokens still locked");

        BuyerInfo storage buyer = buyers[msg.sender];
        require(buyer.tokenAllocation > 0, "No tokens to claim");
        require(!buyer.claimed, "Already claimed");

        uint256 tokenAmount = buyer.tokenAllocation;
        buyer.claimed = true;

        TransferHelper.safeTransfer(presaleInfo.saleToken, msg.sender, tokenAmount);

        emit TokensClaimed(msg.sender, tokenAmount);
    }

    /**
     * @dev Claim refund if presale failed
     */
    function claimRefund() external nonReentrant {
        PresaleStatus status = getStatus();
        require(status == PresaleStatus.FAILED || status == PresaleStatus.CANCELLED, "Presale not failed");

        BuyerInfo storage buyer = buyers[msg.sender];
        require(buyer.baseContribution > 0, "No contribution to refund");
        require(!buyer.claimed, "Already claimed");

        uint256 refundAmount = buyer.baseContribution;
        buyer.claimed = true;

        bool isNative = (presaleInfo.baseToken == address(0));
        TransferHelper.safeTransferBaseToken(presaleInfo.baseToken, payable(msg.sender), refundAmount, !isNative);

        emit RefundClaimed(msg.sender, refundAmount);
    }

    /**
     * @dev Owner withdraws remaining funds after finalization
     */
    function withdrawRemainingFunds() external nonReentrant onlyOwner onlyWhenFinalized {
        // Withdraw any remaining sale tokens
        uint256 remainingTokens = IERC20(presaleInfo.saleToken).balanceOf(address(this));
        if (remainingTokens > 0) {
            TransferHelper.safeTransfer(presaleInfo.saleToken, owner, remainingTokens);
            emit RemainingFundsWithdrawn(owner, remainingTokens);
        }
    }

    /**
     * @dev Withdraw LP tokens after lock period expires
     */
    function withdrawLPTokens() external nonReentrant {
        require(lpTokenAmount > 0, "No LP tokens to withdraw");
        require(!lpTokensWithdrawn, "LP tokens already withdrawn");
        require(msg.sender == lpRecipient, "Only LP recipient can withdraw");
        require(lpUnlockTime != FOREVER_LOCK, "LP tokens locked forever");
        require(block.timestamp >= lpUnlockTime, "LP tokens still locked");

        uint256 amount = lpTokenAmount;
        address lpToken = lpTokenAddress;

        lpTokensWithdrawn = true;

        TransferHelper.safeTransfer(lpToken, lpRecipient, amount);

        emit LPTokensWithdrawn(lpToken, amount, lpRecipient);
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @dev Set router address (must be called before finalization)
     */
    function setRouter(address _router) external onlyOwner {
        require(_router != address(0), "Invalid router");
        require(!finalized, "Cannot change after finalization");
        router = IKalySwapRouter(_router);
    }

    /**
     * @dev Set LP lock settings
     */
    function setLPLockSettings(uint256 _lockDuration, address _recipient) external onlyOwner {
        require(!finalized, "Cannot change after finalization");
        require(_lockDuration >= MIN_LP_LOCK_TIME || _lockDuration == FOREVER_LOCK, "Invalid lock duration");
        require(_recipient != address(0), "Invalid recipient");

        lpLockDuration = _lockDuration;
        lpRecipient = _recipient;
    }

    /**
     * @dev Set token unlock delay
     */
    function setLockDelay(uint256 _delay) external onlyOwner {
        require(!finalized, "Cannot change after finalization");
        lockDelay = _delay;
    }

    /**
     * @dev Set presale type and public time
     */
    function setPresaleType(PresaleType _type, uint256 _publicTime) external onlyOwner {
        require(getStatus() == PresaleStatus.PENDING, "Presale already started");
        presaleInfo.presaleType = _type;
        presaleInfo.publicTime = _publicTime;
    }

    /**
     * @dev Add addresses to whitelist
     */
    function addToWhitelist(address[] calldata users, bool isPermanent) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) {
            whitelist[users[i]] = true;
            if (isPermanent) {
                permanentWhitelist[users[i]] = true;
            }
        }
    }

    /**
     * @dev Remove addresses from whitelist (cannot remove permanent)
     */
    function removeFromWhitelist(address[] calldata users) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) {
            if (!permanentWhitelist[users[i]]) {
                whitelist[users[i]] = false;
            }
        }
    }

    /**
     * @dev Cancel presale (only before finalization)
     */
    function cancelPresale() external onlyOwner {
        require(!finalized, "Cannot cancel after finalization");
        cancelled = true;
        emit PresaleCancelled();
    }

    /**
     * @dev Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        owner = newOwner;
    }
}
