// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

/**
 * @title Fairlaunch
 * @dev Updated fairlaunch contract with clean architecture
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
 * @title Fairlaunch
 * @dev Clean, bug-free fairlaunch contract implementation
 */
contract Fairlaunch is ReentrancyGuard {
    using SafeMath for uint256;

    // ============ ENUMS ============
    
    enum FairlaunchStatus { PENDING, ACTIVE, SUCCESS, FAILED, CANCELLED, FINALIZED }

    // ============ STRUCTS ============
    
    struct FairlaunchInfo {
        address saleToken;          // Token being sold
        address baseToken;          // Token used for payment (address(0) for native KLC)
        uint256 buybackRate;        // Rate for token distribution
        uint256 sellingAmount;      // Total tokens available for sale
        uint256 softCap;            // Minimum total raise for success
        uint256 liquidityPercent;   // Percentage of raised funds for liquidity
        uint256 fairlaunchStart;    // Start timestamp
        uint256 fairlaunchEnd;      // End timestamp
        bool isNative;              // Whether using native KLC or ERC20 base token
        bool isWhitelist;           // Whether whitelist is enabled
    }

    struct ParticipantInfo {
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
    FairlaunchInfo public fairlaunchInfo;
    TokenInfo public tokenInfo;
    
    // Status tracking
    uint256 public raisedAmount;        // Total base tokens raised
    uint256 public participantCount;    // Number of unique participants
    bool public cancelled;              // Whether fairlaunch is cancelled
    bool public finalized;              // Whether fairlaunch is finalized
    uint256 public tokenUnlockTime;     // When users can claim tokens
    
    // LP Token burning
    address public lpTokenAddress;      // Address of LP token pair
    uint256 public lpTokenAmount;       // Amount of LP tokens burned
    bool public lpTokensBurned;         // Whether LP tokens have been burned
    
    // Configuration
    IKalySwapRouter public router;
    address public profitAddress;
    uint256 public lockDelay;           // Additional token lock delay after finalization

    // Referral system
    address public referralAddress;     // Address that referred this fairlaunch
    uint256 public referralFee;         // Referral fee amount (if any)
    
    // Constants
    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    
    // Mappings
    mapping(address => ParticipantInfo) public participants;
    mapping(address => bool) public whitelist;
    
    // ============ EVENTS ============
    
    event FairlaunchCreated(address indexed owner, address indexed fairlaunch);
    event Participated(address indexed user, uint256 baseAmount, uint256 tokenAmount);
    event TokensClaimed(address indexed user, uint256 amount);
    event RefundClaimed(address indexed user, uint256 amount);
    event FairlaunchFinalized(uint256 raisedAmount, uint256 liquidityAmount);
    event LPTokensBurned(address indexed lpToken, uint256 amount);
    event FairlaunchCancelled();
    event RemainingFundsWithdrawn(address indexed owner, uint256 amount);
    event ReferralFeePaid(address indexed referral, uint256 amount);
    
    // ============ MODIFIERS ============
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyWhenActive() {
        require(getStatus() == FairlaunchStatus.ACTIVE, "Fairlaunch not active");
        _;
    }
    
    modifier onlyWhenFinalized() {
        require(getStatus() == FairlaunchStatus.FINALIZED, "Not finalized");
        _;
    }

    // ============ CONSTRUCTOR ============

    /**
     * @dev Constructor for fairlaunch creation
     * @param _owner Owner of the fairlaunch
     * @param _saleToken Token being sold
     * @param _baseToken Base token for payments (address(0) for native KLC)
     * @param _isNative Whether using native KLC
     * @param _buybackRate Rate for token distribution
     * @param _isWhitelist Whether whitelist is enabled
     * @param _sellingAmount Total tokens for sale
     * @param _softCap Minimum raise amount
     * @param _liquidityPercent Percentage for liquidity
     * @param _fairlaunchStart Start timestamp
     * @param _fairlaunchEnd End timestamp
     */
    constructor(
        address _owner,
        address _saleToken,
        address _baseToken,
        bool _isNative,
        uint256 _buybackRate,
        bool _isWhitelist,
        uint256 _sellingAmount,
        uint256 _softCap,
        uint256 _liquidityPercent,
        uint256 _fairlaunchStart,
        uint256 _fairlaunchEnd
    ) {
        require(_owner != address(0), "Invalid owner");
        require(_saleToken != address(0), "Invalid sale token");
        require(_buybackRate > 0, "Invalid buyback rate");
        require(_sellingAmount > 0, "Invalid selling amount");
        require(_softCap > 0, "Invalid soft cap");
        require(_liquidityPercent > 0 && _liquidityPercent <= 100, "Invalid liquidity percent");
        require(_fairlaunchStart > block.timestamp, "Invalid start time");
        require(_fairlaunchEnd > _fairlaunchStart, "Invalid end time");

        owner = _owner;

        // Initialize fairlaunch info with clean flag separation
        fairlaunchInfo = FairlaunchInfo({
            saleToken: _saleToken,
            baseToken: _baseToken,
            buybackRate: _buybackRate,
            sellingAmount: _sellingAmount,
            softCap: _softCap,
            liquidityPercent: _liquidityPercent,
            fairlaunchStart: _fairlaunchStart,
            fairlaunchEnd: _fairlaunchEnd,
            isNative: _isNative,  
            isWhitelist: _isWhitelist
        });

        // Initialize token info
        IERC20 token = IERC20(_saleToken);
        tokenInfo = TokenInfo({
            name: token.name(),
            symbol: token.symbol(),
            totalSupply: token.totalSupply(),
            decimals: token.decimals()
        });

        emit FairlaunchCreated(_owner, address(this));
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @dev Get current fairlaunch status
     */
    function getStatus() public view returns (FairlaunchStatus) {
        if (cancelled) return FairlaunchStatus.CANCELLED;
        if (finalized) return FairlaunchStatus.FINALIZED;

        if (block.timestamp < fairlaunchInfo.fairlaunchStart) {
            return FairlaunchStatus.PENDING;
        }

        if (block.timestamp <= fairlaunchInfo.fairlaunchEnd) {
            return FairlaunchStatus.ACTIVE;
        }

        // Fairlaunch has ended
        if (raisedAmount >= fairlaunchInfo.softCap) {
            return FairlaunchStatus.SUCCESS;
        }

        return FairlaunchStatus.FAILED;
    }

    /**
     * @dev Calculate current token rate based on raised amount and selling amount
     * Uses the correct decimal formula to avoid precision issues
     */
    function calculateCurrentRate() public view returns (uint256) {
        if (raisedAmount == 0) return 0;

        // Rate = sellingAmount / raisedAmount (adjusted for decimals)
        return fairlaunchInfo.sellingAmount.mul(10**(18 - tokenInfo.decimals)).div(raisedAmount);
    }

    /**
     * @dev Calculate token amount for given base amount using current rate
     * Uses the correct decimal formula from Presale
     */
    function calculateTokenAmount(uint256 baseAmount) public view returns (uint256) {
        uint256 currentRate = calculateCurrentRate();
        if (currentRate == 0) return 0;

        return baseAmount.mul(currentRate).div(10**(18 - tokenInfo.decimals));
    }

    /**
     * @dev Check if address is whitelisted
     */
    function isWhitelisted(address user) public view returns (bool) {
        if (!fairlaunchInfo.isWhitelist) return true;
        return whitelist[user];
    }

    /**
     * @dev Get fairlaunch progress as percentage (0-100)
     */
    function getProgress() public view returns (uint256) {
        if (fairlaunchInfo.softCap == 0) return 0;
        return raisedAmount.mul(100).div(fairlaunchInfo.softCap);
    }

    /**
     * @dev Check if user can participate
     */
    function canParticipate(address user, uint256 amount) public view returns (bool, string memory) {
        if (getStatus() != FairlaunchStatus.ACTIVE) {
            return (false, "Fairlaunch not active");
        }

        if (!isWhitelisted(user)) {
            return (false, "Not whitelisted");
        }

        if (amount == 0) {
            return (false, "Invalid amount");
        }

        return (true, "");
    }

    // ============ CORE FUNCTIONS ============

    /**
     * @dev Participate in fairlaunch by contributing base tokens
     * @param amount Amount of ERC20 base tokens (ignored for native KLC)
     */
    function participate(uint256 amount) external payable nonReentrant onlyWhenActive {
        uint256 contribution = fairlaunchInfo.isNative ? msg.value : amount;

        (bool canPart, string memory reason) = canParticipate(msg.sender, contribution);
        require(canPart, reason);

        // Store contribution and calculate tokens at finalization
        // This avoids the rate calculation issues from the original contract
        ParticipantInfo storage participant = participants[msg.sender];
        if (participant.baseContribution == 0) {
            participantCount = participantCount.add(1);
        }

        participant.baseContribution = participant.baseContribution.add(contribution);
        raisedAmount = raisedAmount.add(contribution);

        // Handle payment
        if (!fairlaunchInfo.isNative) {
            TransferHelper.safeTransferFrom(fairlaunchInfo.baseToken, msg.sender, address(this), contribution);
        }

        emit Participated(msg.sender, contribution, 0); // Token amount calculated at finalization
    }

    /**
     * @dev Finalize successful fairlaunch - adds liquidity and burns LP tokens
     */
    function finalize() external nonReentrant onlyOwner {
        require(!finalized, "Already finalized");
        require(getStatus() == FairlaunchStatus.SUCCESS, "Fairlaunch not successful");
        require(address(router) != address(0), "Router not set");

        // Calculate final token allocations for all participants
        _calculateFinalAllocations();

        // In fairlaunch: 100% of raised funds go to liquidity (liquidityPercent should be 100)
        // But we'll respect the configured percentage for flexibility
        uint256 liquidityBase = raisedAmount.mul(fairlaunchInfo.liquidityPercent).div(100);
        uint256 liquidityTokens = liquidityBase.mul(calculateCurrentRate()).div(10**(18 - tokenInfo.decimals));

        // Verify sufficient tokens for liquidity
        require(IERC20(fairlaunchInfo.saleToken).balanceOf(address(this)) >= liquidityTokens, "Insufficient tokens for liquidity");

        // Approve tokens for router
        TransferHelper.safeApprove(fairlaunchInfo.saleToken, address(router), liquidityTokens);

        uint256 liquidity;

        if (fairlaunchInfo.isNative) {
            // Add KLC liquidity
            (, , liquidity) = router.addLiquidityKLC{value: liquidityBase}(
                fairlaunchInfo.saleToken,
                liquidityTokens,
                0, // Accept any amount of tokens
                0, // Accept any amount of KLC
                address(this), // LP tokens come to this contract for burning
                block.timestamp + 3600 // 1 hour deadline
            );
        } else {
            // Add ERC20 liquidity
            TransferHelper.safeApprove(fairlaunchInfo.baseToken, address(router), liquidityBase);

            (, , liquidity) = router.addLiquidity(
                fairlaunchInfo.baseToken,
                fairlaunchInfo.saleToken,
                liquidityBase,
                liquidityTokens,
                0, // Accept any amount of base tokens
                0, // Accept any amount of sale tokens
                address(this), // LP tokens come to this contract for burning
                block.timestamp + 3600 // 1 hour deadline
            );
        }

        // Burn LP tokens permanently
        _burnLPTokens(liquidity);

        // In a true fairlaunch, ALL raised funds go to liquidity - no funds to owner
        // Any remaining base tokens should also go to liquidity or be locked permanently

        // Set finalization state
        finalized = true;
        tokenUnlockTime = block.timestamp.add(lockDelay);

        emit FairlaunchFinalized(raisedAmount, liquidityBase);
    }

    /**
     * @dev Internal function to calculate final token allocations for all participants
     * This ensures consistent allocation based on final rate
     * Note: Currently participants calculate allocation on-demand during claiming for gas efficiency
     */
    function _calculateFinalAllocations() internal view {
        // In this implementation, token allocations are calculated on-demand during claimTokens()
        // This avoids gas issues from iterating through all participants during finalization
        // The final rate is available via calculateCurrentRate() when needed
    }

    /**
     * @dev Internal function to burn LP tokens permanently
     * @param _liquidity Amount of LP tokens to burn
     */
    function _burnLPTokens(uint256 _liquidity) internal {
        require(_liquidity > 0, "No LP tokens to burn");

        // Get LP token address from router's factory
        address factory = router.factory();
        address wklc = router.WKLC();
        address baseTokenAddr = fairlaunchInfo.isNative ? wklc : fairlaunchInfo.baseToken;

        lpTokenAddress = IKalySwapFactory(factory).getPair(fairlaunchInfo.saleToken, baseTokenAddr);
        require(lpTokenAddress != address(0), "LP pair not found");

        // Store LP token info
        lpTokenAmount = _liquidity;

        // Burn LP tokens by sending to dead address
        TransferHelper.safeTransfer(lpTokenAddress, DEAD_ADDRESS, _liquidity);
        lpTokensBurned = true;

        emit LPTokensBurned(lpTokenAddress, _liquidity);
    }

    // ============ WITHDRAWAL FUNCTIONS ============

    /**
     * @dev Claim purchased tokens after successful fairlaunch finalization
     */
    function claimTokens() external nonReentrant onlyWhenFinalized {
        require(block.timestamp >= tokenUnlockTime, "Tokens still locked");

        ParticipantInfo storage participant = participants[msg.sender];
        require(participant.baseContribution > 0, "No contribution found");
        require(!participant.claimed, "Already claimed");

        // Calculate token allocation based on final rate
        uint256 tokenAmount = calculateTokenAmount(participant.baseContribution);
        require(tokenAmount > 0, "No tokens to claim");

        participant.tokenAllocation = tokenAmount;
        participant.claimed = true;

        TransferHelper.safeTransfer(fairlaunchInfo.saleToken, msg.sender, tokenAmount);

        emit TokensClaimed(msg.sender, tokenAmount);
    }

    /**
     * @dev Claim refund if fairlaunch failed
     */
    function claimRefund() external nonReentrant {
        FairlaunchStatus status = getStatus();
        require(status == FairlaunchStatus.FAILED || status == FairlaunchStatus.CANCELLED, "Fairlaunch not failed");

        ParticipantInfo storage participant = participants[msg.sender];
        require(participant.baseContribution > 0, "No contribution to refund");
        require(!participant.claimed, "Already claimed");

        uint256 refundAmount = participant.baseContribution;
        participant.claimed = true;

        TransferHelper.safeTransferBaseToken(fairlaunchInfo.baseToken, payable(msg.sender), refundAmount, !fairlaunchInfo.isNative);

        emit RefundClaimed(msg.sender, refundAmount);
    }

    /**
     * @dev Owner can only withdraw remaining SALE TOKENS after finalization
     * Base tokens (raised funds) can NEVER be withdrawn - they all go to liquidity
     * This maintains the fairlaunch principle
     */
    function withdrawRemainingTokens() external nonReentrant onlyOwner onlyWhenFinalized {
        // Only allow withdrawal of remaining sale tokens, never base tokens
        uint256 remainingTokens = IERC20(fairlaunchInfo.saleToken).balanceOf(address(this));
        if (remainingTokens > 0) {
            TransferHelper.safeTransfer(fairlaunchInfo.saleToken, owner, remainingTokens);
            emit RemainingFundsWithdrawn(owner, remainingTokens);
        }

        // Explicitly prevent any base token withdrawal
        uint256 remainingBase = fairlaunchInfo.isNative ? address(this).balance : IERC20(fairlaunchInfo.baseToken).balanceOf(address(this));
        require(remainingBase == 0, "Base tokens must stay locked - fairlaunch principle");
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
     * @dev Set profit address
     */
    function setProfitAddress(address _profitAddress) external onlyOwner {
        require(_profitAddress != address(0), "Invalid profit address");
        profitAddress = _profitAddress;
    }

    /**
     * @dev Set token unlock delay
     */
    function setLockDelay(uint256 _delay) external onlyOwner {
        require(!finalized, "Cannot change after finalization");
        lockDelay = _delay;
    }

    /**
     * @dev Add addresses to whitelist
     */
    function addToWhitelist(address[] calldata users) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) {
            whitelist[users[i]] = true;
        }
    }

    /**
     * @dev Remove addresses from whitelist
     */
    function removeFromWhitelist(address[] calldata users) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) {
            whitelist[users[i]] = false;
        }
    }

    /**
     * @dev Cancel fairlaunch (only before finalization)
     * FIXED: Now properly sets cancelled flag instead of wrong flag
     */
    function cancelFairlaunch() external onlyOwner {
        require(!finalized, "Cannot cancel after finalization");
        cancelled = true; // FIXED: Properly sets cancelled flag
        emit FairlaunchCancelled();
    }

    /**
     * @dev Set referral information
     */
    function setReferral(address _referralAddress, uint256 _referralFee) external onlyOwner {
        require(!finalized, "Cannot change after finalization");
        referralAddress = _referralAddress;
        referralFee = _referralFee;
    }

    /**
     * @dev Pay referral fee (called by factory)
     */
    function payReferralFee() external payable {
        require(referralAddress != address(0), "No referral set");
        require(msg.value == referralFee, "Incorrect referral fee");

        payable(referralAddress).transfer(msg.value);
        emit ReferralFeePaid(referralAddress, msg.value);
    }

    /**
     * @dev Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        owner = newOwner;
    }

    // ============ COMPATIBILITY FUNCTIONS ============
    // These maintain compatibility with existing interfaces

    /**
     * @dev Legacy status function for compatibility
     */
    function presaleStatus() external view returns (uint256) {
        FairlaunchStatus status = getStatus();
        if (status == FairlaunchStatus.PENDING) return 0;
        if (status == FairlaunchStatus.ACTIVE) return 1;
        if (status == FairlaunchStatus.SUCCESS) return 2;
        if (status == FairlaunchStatus.FAILED) return 3;
        if (status == FairlaunchStatus.CANCELLED) return 4;
        if (status == FairlaunchStatus.FINALIZED) return 5;
        return 0;
    }

    /**
     * @dev Legacy function for compatibility
     */
    function buyers(address user) external view returns (uint256) {
        return participants[user].baseContribution;
    }
}
