// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../../interfaces/IFactoryManager.sol";

/**
 * @title SimpleStandardToken
 * @dev A simple ERC20 token implementation for direct deployment
 */
contract SimpleStandardToken {
  using SafeMath for uint256;

  mapping(address => uint256) private _balances;
  mapping(address => mapping(address => uint256)) private _allowances;

  uint256 private _totalSupply;
  string private _name;
  string private _symbol;
  uint8 private _decimals;
  address private _tokenOwner;

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed tokenOwner, address indexed spender, uint256 value);

  /**
   * @dev Constructor that gives msg.sender all of existing tokens.
   * @param name_ The name of the token
   * @param symbol_ The symbol of the token
   * @param decimals_ The number of decimals the token uses
   * @param totalSupply_ The total supply of the token (before decimals)
   * @param tokenOwner_ The owner of the token
   */
  constructor(
    string memory name_,
    string memory symbol_,
    uint8 decimals_,
    uint256 totalSupply_,
    address tokenOwner_
  ) {
    require(bytes(name_).length > 0, "SimpleStandardToken: name cannot be empty");
    require(bytes(symbol_).length > 0, "SimpleStandardToken: symbol cannot be empty");
    require(tokenOwner_ != address(0), "SimpleStandardToken: owner cannot be zero address");
    require(totalSupply_ > 0, "SimpleStandardToken: total supply must be greater than 0");

    _name = name_;
    _symbol = symbol_;
    _decimals = decimals_;
    _tokenOwner = tokenOwner_;
    _totalSupply = totalSupply_.mul(10**decimals_);
    _balances[tokenOwner_] = _totalSupply;
    emit Transfer(address(0), tokenOwner_, _totalSupply);
  }

  function name() public view returns (string memory) { return _name; }
  function symbol() public view returns (string memory) { return _symbol; }
  function decimals() public view returns (uint8) { return _decimals; }
  function totalSupply() public view returns (uint256) { return _totalSupply; }
  function owner() public view returns (address) { return _tokenOwner; }
  function balanceOf(address account) public view returns (uint256) { return _balances[account]; }

  function transfer(address to, uint256 amount) public returns (bool) {
    _transfer(msg.sender, to, amount);
    return true;
  }

  function allowance(address tokenOwner, address spender) public view returns (uint256) {
    return _allowances[tokenOwner][spender];
  }

  function approve(address spender, uint256 amount) public returns (bool) {
    _approve(msg.sender, spender, amount);
    return true;
  }

  function transferFrom(address from, address to, uint256 amount) public returns (bool) {
    uint256 currentAllowance = _allowances[from][msg.sender];
    require(currentAllowance >= amount, "SimpleStandardToken: transfer amount exceeds allowance");
    _transfer(from, to, amount);
    _approve(from, msg.sender, currentAllowance.sub(amount));
    return true;
  }

  function _transfer(address from, address to, uint256 amount) internal {
    require(from != address(0), "SimpleStandardToken: transfer from the zero address");
    require(to != address(0), "SimpleStandardToken: transfer to the zero address");
    uint256 fromBalance = _balances[from];
    require(fromBalance >= amount, "SimpleStandardToken: transfer amount exceeds balance");
    _balances[from] = fromBalance.sub(amount);
    _balances[to] = _balances[to].add(amount);
    emit Transfer(from, to, amount);
  }

  function _approve(address tokenOwner, address spender, uint256 amount) internal {
    require(tokenOwner != address(0), "SimpleStandardToken: approve from the zero address");
    require(spender != address(0), "SimpleStandardToken: approve to the zero address");
    _allowances[tokenOwner][spender] = amount;
    emit Approval(tokenOwner, spender, amount);
  }
}

/**
 * @title StandardTokenFactory
 * @dev Factory contract for creating standard ERC20 tokens
 */
contract StandardTokenFactory is ReentrancyGuard {
  using Address for address payable;
  using SafeMath for uint256;

  address public factoryManager;
  address public feeTo;
  uint256 public flatFee;
  address public factoryOwner;

  event TokenCreated(
    address indexed tokenAddress,
    address indexed creator,
    string name,
    string symbol,
    uint8 decimals,
    uint256 totalSupply
  );

  event FeeToUpdated(address indexed oldFeeTo, address indexed newFeeTo);
  event FlatFeeUpdated(uint256 oldFee, uint256 newFee);
  event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

  modifier enoughFee() {
    require(msg.value >= flatFee, "StandardTokenFactory: insufficient fee");
    _;
  }

  modifier onlyOwner() {
    require(msg.sender == factoryOwner, "StandardTokenFactory: caller is not the owner");
    _;
  }

  /**
   * @dev Constructor
   * @param factoryManager_ Address of the factory manager contract
   */
  constructor(address factoryManager_, address /* implementation_ */) {
    require(factoryManager_ != address(0), "StandardTokenFactory: factory manager cannot be zero address");

    factoryManager = factoryManager_;
    // Note: implementation_ parameter is ignored as we deploy direct contracts
    feeTo = msg.sender;
    flatFee = 3_000_000_000 gwei; // 3 KLC
    factoryOwner = msg.sender;

    emit OwnershipTransferred(address(0), msg.sender);
  }

  /**
   * @dev Set the fee recipient address
   * @param feeReceivingAddress New fee recipient address
   */
  function setFeeTo(address feeReceivingAddress) external onlyOwner {
    require(feeReceivingAddress != address(0), "StandardTokenFactory: fee recipient cannot be zero address");
    address oldFeeTo = feeTo;
    feeTo = feeReceivingAddress;
    emit FeeToUpdated(oldFeeTo, feeReceivingAddress);
  }

  /**
   * @dev Set the flat fee for token creation
   * @param fee New flat fee amount
   */
  function setFlatFee(uint256 fee) external onlyOwner {
    uint256 oldFee = flatFee;
    flatFee = fee;
    emit FlatFeeUpdated(oldFee, fee);
  }

  /**
   * @dev Transfer ownership of the factory
   * @param newOwner New owner address
   */
  function transferOwnership(address newOwner) external onlyOwner {
    require(newOwner != address(0), "StandardTokenFactory: new owner cannot be zero address");
    address oldOwner = factoryOwner;
    factoryOwner = newOwner;
    emit OwnershipTransferred(oldOwner, newOwner);
  }

  /**
   * @dev Create a new standard token
   * @param name Token name
   * @param symbol Token symbol
   * @param decimals Token decimals
   * @param totalSupply Token total supply (before decimals)
   * @return token Address of the created token
   */
  function create(
    string memory name,
    string memory symbol,
    uint8 decimals,
    uint256 totalSupply
  ) external payable enoughFee nonReentrant returns (address token) {
    require(bytes(name).length > 0, "StandardTokenFactory: name cannot be empty");
    require(bytes(symbol).length > 0, "StandardTokenFactory: symbol cannot be empty");
    require(totalSupply > 0, "StandardTokenFactory: total supply must be greater than 0");

    _refundExcessiveFee();
    payable(feeTo).sendValue(flatFee);

    // Deploy a new SimpleStandardToken contract directly (no proxy)
    SimpleStandardToken newToken = new SimpleStandardToken(
      name,
      symbol,
      decimals,
      totalSupply,
      msg.sender
    );

    token = address(newToken);

    // Register token with factory manager
    IFactoryManager(factoryManager).assignTokensToOwner(msg.sender, token, 0);

    emit TokenCreated(token, msg.sender, name, symbol, decimals, totalSupply);
  }

  /**
   * @dev Refund any excessive fee sent by the user
   */
  function _refundExcessiveFee() internal {
    uint256 refund = msg.value.sub(flatFee);
    if (refund > 0) {
      payable(msg.sender).sendValue(refund);
    }
  }
}