// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "./ReentrancyGuard.sol";
import "./Pausable.sol";
import "./Ownable.sol";

error ZeroAmount();
error ZeroAddress();
error AccessIsDenied();
error NotEnded();
error InsufficientBalance();
error TransferFailed();

contract KalyStaking is Ownable, ReentrancyGuard, Pausable {
    uint256 public periodFinish;
    uint256 public rewardRate;
    uint256 public rewardsDuration;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;

    address private _pendingOwner;

    event RewardAdded(uint256 reward);
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event RewardsDurationUpdated(uint256 indexed newDuration);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);

    constructor() {
        rewardsDuration = 356 days;
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    function transferOwnership(address newOwner) public virtual override onlyOwner {
        if (newOwner == address(0)) {
            revert ZeroAddress();
        }
        _pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner(), newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != _pendingOwner) {
            revert AccessIsDenied();
        }
        _transferOwnership(_pendingOwner);
        _pendingOwner = address(0);
    }

    function recoverKALY(uint256 amount) external onlyOwner {
        if (amount == 0) {
            revert ZeroAmount();
        }
        if (amount > address(this).balance) {
            revert InsufficientBalance();
        }
        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) {
            revert TransferFailed();
        }
    }

    function stake() external payable nonReentrant whenNotPaused updateReward(msg.sender) {
        if (msg.value == 0) {
            revert ZeroAmount();
        }
        totalSupply += msg.value;
        balanceOf[msg.sender] += msg.value;
        emit Staked(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external nonReentrant whenNotPaused updateReward(msg.sender) {
        if (amount == 0) {
            revert ZeroAmount();
        }
        if (balanceOf[msg.sender] < amount) {
            revert InsufficientBalance();
        }
        totalSupply -= amount;
        balanceOf[msg.sender] -= amount;
        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) {
            revert TransferFailed();
        }
        emit Withdrawn(msg.sender, amount);
    }

    function claimReward() external nonReentrant whenNotPaused updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            (bool success, ) = msg.sender.call{value: reward}("");
            if (!success) {
                revert TransferFailed();
            }
            emit RewardPaid(msg.sender, reward);
        }
    }

    function exit() external whenNotPaused nonReentrant {
        uint256 amount = balanceOf[msg.sender];
        if (amount > 0) {
            totalSupply -= amount;
            balanceOf[msg.sender] = 0;
            (bool success, ) = msg.sender.call{value: amount}("");
            if (!success) {
                revert TransferFailed();
            }
            emit Withdrawn(msg.sender, amount);
        }
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            (bool success, ) = msg.sender.call{value: reward}("");
            if (!success) {
                revert TransferFailed();
            }
            emit RewardPaid(msg.sender, reward);
        }
    }

    function notifyRewardAmount(uint256 reward) external payable onlyOwner updateReward(address(0)) {
        if (msg.value != reward) {
            revert ZeroAmount();
        }
        if (block.timestamp >= periodFinish) {
            rewardRate = reward / rewardsDuration;
        } else {
            uint256 remaining = periodFinish - block.timestamp;
            uint256 leftover = remaining * rewardRate;
            rewardRate = (reward + leftover) / rewardsDuration;
        }

        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp + rewardsDuration;

        emit RewardAdded(reward);
    }

    function setRewardsDuration(uint256 _rewardsDuration) external onlyOwner {
        if (block.timestamp < periodFinish) {
            revert NotEnded();
        }
        rewardsDuration = _rewardsDuration;
        emit RewardsDurationUpdated(rewardsDuration);
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalSupply == 0) {
            return rewardPerTokenStored;
        }
        return
            rewardPerTokenStored +
            ((((lastTimeRewardApplicable() - lastUpdateTime) * rewardRate) *
                1e18) / totalSupply);
    }

    function earned(address account) public view returns (uint256) {
        return
            (balanceOf[account] *
                (rewardPerToken() - userRewardPerTokenPaid[account])) /
            1e18 +
            rewards[account];
    }

    function getRewardForDuration() external view returns (uint256) {
        return rewardRate * rewardsDuration;
    }

    function setPaused(bool _paused) external onlyOwner {
        if (_paused) {
            _pause();
        } else {
            _unpause();
        }
    }

    receive() external payable nonReentrant whenNotPaused updateReward(msg.sender) {
        if (msg.value == 0) {
            revert ZeroAmount();
        }
        totalSupply += msg.value;
        balanceOf[msg.sender] += msg.value;
        emit Staked(msg.sender, msg.value);
    }
}