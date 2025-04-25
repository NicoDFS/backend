pragma solidity >=0.5.0;

import "../../kalyswap-core/interfaces/IKalyswapERC20.sol";

interface IBridgeToken is IKalyswapERC20 {
    function swap(address token, uint256 amount) external;
    function swapSupply(address token) external view returns (uint256);
}