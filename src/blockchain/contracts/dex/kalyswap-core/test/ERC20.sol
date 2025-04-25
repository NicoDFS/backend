pragma solidity =0.5.16;

import '../KalyswapERC20.sol';

contract ERC20 is KalyswapERC20 {
    constructor(uint _totalSupply) public {
        _mint(msg.sender, _totalSupply);
    }
}
