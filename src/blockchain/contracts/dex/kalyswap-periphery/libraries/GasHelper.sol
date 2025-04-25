pragma solidity =0.6.6;

library GasHelper {
    modifier ensureGas(uint gasPrice, uint gasLimit) {
        require(tx.gasprice <= gasPrice, 'GasHelper: INVALID_GAS_PRICE');
        require(gasleft() >= gasLimit, 'GasHelper: INSUFFICIENT_GAS');
        _;
    }
}