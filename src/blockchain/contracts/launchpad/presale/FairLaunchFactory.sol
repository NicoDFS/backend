// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

/**
 * @title FairLaunchFactory
 * @dev Clean factory for creating fairlaunch contracts with proper fairlaunch principles
 * @author KalyChain Team
 */

import "./Fairlaunch.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract FairLaunchFactory is ReentrancyGuard {
    using Address for address payable;
    using SafeMath for uint256;

    // ============ STATE VARIABLES ============
    
    address public owner;
    address public feeTo;                    // Address that receives creation fees
    uint256 public flatFee;                  // Flat fee for fairlaunch creation
    
    // Referral system
    uint256 public referralFeePercent;       // Referral fee as percentage of flat fee (e.g., 10 = 10%)
    mapping(address => bool) public authorizedReferrers; // Authorized referral addresses
    
    // Fairlaunch tracking
    address[] public allFairlaunches;        // Array of all created fairlaunches
    mapping(address => address[]) public userFairlaunches; // User's created fairlaunches
    
    // Constants for fairlaunch principles
    uint256 public constant MIN_LIQUIDITY_PERCENT = 100; // Fairlaunch requires 100% liquidity
    uint256 public constant MAX_LIQUIDITY_PERCENT = 100; // Fairlaunch allows only 100% liquidity
    
    // ============ EVENTS ============
    
    event FairlaunchCreated(
        address indexed creator,
        address indexed fairlaunch,
        address indexed saleToken,
        address baseToken,
        bool isNative,
        uint256 sellingAmount,
        uint256 softCap
    );
    
    event FlatFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeToUpdated(address oldFeeTo, address newFeeTo);
    event ReferralFeeUpdated(uint256 oldPercent, uint256 newPercent);
    event ReferrerAuthorized(address indexed referrer, bool authorized);
    event ReferralFeePaid(address indexed referrer, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // ============ MODIFIERS ============
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier enoughFee() {
        require(msg.value >= flatFee, "Insufficient flat fee");
        _;
    }
    
    modifier validLiquidityPercent(uint256 _liquidityPercent) {
        require(
            _liquidityPercent >= MIN_LIQUIDITY_PERCENT && _liquidityPercent <= MAX_LIQUIDITY_PERCENT,
            "Fairlaunch requires 100% liquidity"
        );
        _;
    }
    
    // ============ CONSTRUCTOR ============
    
    constructor() {
        owner = msg.sender;
        feeTo = msg.sender;
        flatFee = 200_000 ether; // 200,000 KLC (using ether for readability)
        referralFeePercent = 10; // 10% of flat fee goes to referrer
        
        emit OwnershipTransferred(address(0), msg.sender);
    }
    
    // ============ MAIN FUNCTIONS ============
    
    /**
     * @dev Create a new fairlaunch contract
     * @param _saleToken Token being sold in the fairlaunch
     * @param _baseToken Base token for payments (address(0) for native KLC)
     * @param _isNative Whether using native KLC or ERC20 base token
     * @param _buybackRate Rate for token distribution
     * @param _isWhitelist Whether whitelist is enabled
     * @param _sellingAmount Total tokens available for sale
     * @param _softCap Minimum total raise for success
     * @param _liquidityPercent Percentage of raised funds for liquidity (must be 100 for fairlaunch)
     * @param _fairlaunchStart Start timestamp
     * @param _fairlaunchEnd End timestamp
     * @param _referrer Optional referrer address for fee sharing
     */
    function createFairlaunch(
        address _saleToken,
        address _baseToken,
        bool _isNative,
        uint256 _buybackRate,
        bool _isWhitelist,
        uint256 _sellingAmount,
        uint256 _softCap,
        uint256 _liquidityPercent,
        uint256 _fairlaunchStart,
        uint256 _fairlaunchEnd,
        address _referrer
    ) public payable nonReentrant enoughFee validLiquidityPercent(_liquidityPercent) returns (address) {

        // Input validation
        _validateFairlaunchParams(_saleToken, _baseToken, _isNative, _buybackRate, _sellingAmount, _softCap, _fairlaunchStart, _fairlaunchEnd);

        // Refund excess fee
        _refundExcessiveFee();

        // Create new fairlaunch contract
        address fairlaunchAddress = _deployFairlaunch(
            _saleToken, _baseToken, _isNative, _buybackRate, _isWhitelist,
            _sellingAmount, _softCap, _liquidityPercent, _fairlaunchStart, _fairlaunchEnd
        );

        // Transfer tokens and handle fees
        _handleTokenTransferAndFees(_saleToken, fairlaunchAddress, _sellingAmount, _liquidityPercent, _referrer);

        // Track fairlaunch and emit event
        _trackAndEmitFairlaunch(fairlaunchAddress, _saleToken, _baseToken, _isNative, _sellingAmount, _softCap);

        return fairlaunchAddress;
    }

    /**
     * @dev Legacy create function for backward compatibility
     * Forces 100% liquidity for fairlaunch principles
     */
    function create(
        address _sale_token,
        address _base_token,
        bool presale_in_native,
        uint256 _buyback,
        bool _whitelist,
        uint256 _selling_amount,
        uint256 _softcap,
        uint256 _liquidityPercent,
        uint256 _presale_start,
        uint256 _presale_end
    ) external payable returns (address) {
        // Force 100% liquidity for fairlaunch
        require(_liquidityPercent == 100, "Fairlaunch requires 100% liquidity");

        return createFairlaunch(
            _sale_token,
            _base_token,
            presale_in_native,
            _buyback,
            _whitelist,
            _selling_amount,
            _softcap,
            100, // Force 100% liquidity
            _presale_start,
            _presale_end,
            address(0) // No referrer in legacy function
        );
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @dev Validate fairlaunch parameters
     */
    function _validateFairlaunchParams(
        address _saleToken,
        address _baseToken,
        bool _isNative,
        uint256 _buybackRate,
        uint256 _sellingAmount,
        uint256 _softCap,
        uint256 _fairlaunchStart,
        uint256 _fairlaunchEnd
    ) internal view {
        require(_saleToken != address(0), "Invalid sale token");
        require(_buybackRate > 0, "Invalid buyback rate");
        require(_sellingAmount > 0, "Invalid selling amount");
        require(_softCap > 0, "Invalid soft cap");
        require(_fairlaunchStart > block.timestamp, "Invalid start time");
        require(_fairlaunchEnd > _fairlaunchStart, "Invalid end time");

        if (_isNative) {
            require(_baseToken == address(0), "Native fairlaunch should use address(0) for base token");
        } else {
            require(_baseToken != address(0), "ERC20 fairlaunch requires valid base token");
        }
    }

    /**
     * @dev Deploy new fairlaunch contract
     */
    function _deployFairlaunch(
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
    ) internal returns (address) {
        return address(new Fairlaunch(
            msg.sender,
            _saleToken,
            _baseToken,
            _isNative,
            _buybackRate,
            _isWhitelist,
            _sellingAmount,
            _softCap,
            _liquidityPercent,
            _fairlaunchStart,
            _fairlaunchEnd
        ));
    }

    /**
     * @dev Handle token transfer and fee payments
     */
    function _handleTokenTransferAndFees(
        address _saleToken,
        address _fairlaunchAddress,
        uint256 _sellingAmount,
        uint256 _liquidityPercent,
        address _referrer
    ) internal {
        // Transfer required tokens (selling + liquidity)
        uint256 liquidityAmount = _sellingAmount.mul(_liquidityPercent).div(100);
        IERC20(_saleToken).transferFrom(msg.sender, _fairlaunchAddress, _sellingAmount.add(liquidityAmount));

        // Handle referral and platform fees
        if (_referrer != address(0) && authorizedReferrers[_referrer]) {
            uint256 referralFee = flatFee.mul(referralFeePercent).div(100);
            payable(_referrer).transfer(referralFee);
            payable(feeTo).transfer(flatFee.sub(referralFee));
            emit ReferralFeePaid(_referrer, referralFee);
        } else {
            payable(feeTo).transfer(flatFee);
        }
    }

    /**
     * @dev Track fairlaunch and emit creation event
     */
    function _trackAndEmitFairlaunch(
        address _fairlaunchAddress,
        address _saleToken,
        address _baseToken,
        bool _isNative,
        uint256 _sellingAmount,
        uint256 _softCap
    ) internal {
        allFairlaunches.push(_fairlaunchAddress);
        userFairlaunches[msg.sender].push(_fairlaunchAddress);
        emit FairlaunchCreated(msg.sender, _fairlaunchAddress, _saleToken, _baseToken, _isNative, _sellingAmount, _softCap);
    }

    /**
     * @dev Refund any excess fee sent by user
     */
    function _refundExcessiveFee() internal {
        uint256 refund = msg.value.sub(flatFee);
        if (refund > 0) {
            payable(msg.sender).sendValue(refund);
        }
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @dev Set the fee receiving address
     */
    function setFeeTo(address _feeTo) external onlyOwner {
        require(_feeTo != address(0), "Invalid fee address");
        address oldFeeTo = feeTo;
        feeTo = _feeTo;
        emit FeeToUpdated(oldFeeTo, _feeTo);
    }

    /**
     * @dev Set the flat fee for fairlaunch creation
     */
    function setFlatFee(uint256 _fee) external onlyOwner {
        uint256 oldFee = flatFee;
        flatFee = _fee;
        emit FlatFeeUpdated(oldFee, _fee);
    }

    /**
     * @dev Set referral fee percentage
     */
    function setReferralFeePercent(uint256 _percent) external onlyOwner {
        require(_percent <= 50, "Referral fee too high"); // Max 50% of flat fee
        uint256 oldPercent = referralFeePercent;
        referralFeePercent = _percent;
        emit ReferralFeeUpdated(oldPercent, _percent);
    }

    /**
     * @dev Authorize or deauthorize referrer addresses
     */
    function setReferrerAuthorization(address _referrer, bool _authorized) external onlyOwner {
        require(_referrer != address(0), "Invalid referrer");
        authorizedReferrers[_referrer] = _authorized;
        emit ReferrerAuthorized(_referrer, _authorized);
    }

    /**
     * @dev Batch authorize referrers
     */
    function batchAuthorizeReferrers(address[] calldata _referrers, bool _authorized) external onlyOwner {
        for (uint256 i = 0; i < _referrers.length; i++) {
            require(_referrers[i] != address(0), "Invalid referrer");
            authorizedReferrers[_referrers[i]] = _authorized;
            emit ReferrerAuthorized(_referrers[i], _authorized);
        }
    }

    /**
     * @dev Transfer ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid new owner");
        address oldOwner = owner;
        owner = _newOwner;
        emit OwnershipTransferred(oldOwner, _newOwner);
    }

    /**
     * @dev Emergency withdraw function (only for stuck funds)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(owner).transfer(balance);
        }
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @dev Get total number of fairlaunches created
     */
    function totalFairlaunches() external view returns (uint256) {
        return allFairlaunches.length;
    }

    /**
     * @dev Get fairlaunch address by index
     */
    function getFairlaunch(uint256 _index) external view returns (address) {
        require(_index < allFairlaunches.length, "Index out of bounds");
        return allFairlaunches[_index];
    }

    /**
     * @dev Get all fairlaunches created by a user
     */
    function getUserFairlaunches(address _user) external view returns (address[] memory) {
        return userFairlaunches[_user];
    }

    /**
     * @dev Get number of fairlaunches created by a user
     */
    function getUserFairlaunchCount(address _user) external view returns (uint256) {
        return userFairlaunches[_user].length;
    }

    /**
     * @dev Check if address is authorized referrer
     */
    function isAuthorizedReferrer(address _referrer) external view returns (bool) {
        return authorizedReferrers[_referrer];
    }

    /**
     * @dev Calculate referral fee for current settings
     */
    function calculateReferralFee() external view returns (uint256) {
        return flatFee.mul(referralFeePercent).div(100);
    }

    /**
     * @dev Get current owner
     */
    function getOwner() external view returns (address) {
        return owner;
    }

    /**
     * @dev Get fee receiving address
     */
    function getFeeTo() external view returns (address) {
        return feeTo;
    }

    /**
     * @dev Get flat fee amount
     */
    function getFlatFee() external view returns (uint256) {
        return flatFee;
    }

    /**
     * @dev Get referral fee percentage
     */
    function getReferralFeePercent() external view returns (uint256) {
        return referralFeePercent;
    }

    // ============ LEGACY COMPATIBILITY FUNCTIONS ============

    /**
     * @dev Legacy function for backward compatibility
     */
    function transferOwner(address to) external onlyOwner {
        require(to != address(0), "Invalid new owner");
        address oldOwner = owner;
        owner = to;
        emit OwnershipTransferred(oldOwner, to);
    }
}
