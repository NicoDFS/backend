pragma solidity =0.6.6;

import '../kalyswap-core/interfaces/IKalyswapFactory.sol';
import '../kalyswap-lib/libraries/TransferHelper.sol';

import './interfaces/IKalyswapRouter.sol';
import './libraries/KalyswapLibrary.sol';
import './libraries/SafeMath.sol';
import './interfaces/IERC20.sol';
import './interfaces/IWKLC.sol';
import './libraries/GasHelper.sol';

contract KalyswapRouter is IKalyswapRouter {
    using SafeMath for uint;
    using GasHelper for *;

    address public immutable override factory;
    address public immutable override WKLC;

    modifier ensure(uint deadline) {
        require(deadline >= block.timestamp, 'KalyswapRouter: EXPIRED');
        _;
    }

    constructor(address _factory, address _WKLC) public {
        factory = _factory;
        WKLC = _WKLC;
    }

    receive() external payable {
        assert(msg.sender == WKLC); // only accept KLC via fallback from the WKLC contract
    }

    // **** ADD LIQUIDITY ****
    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin
    ) internal virtual returns (uint amountA, uint amountB) {
        // create the pair if it doesn't exist yet
        if (IKalyswapFactory(factory).getPair(tokenA, tokenB) == address(0)) {
            IKalyswapFactory(factory).createPair(tokenA, tokenB);
        }
        (uint reserveA, uint reserveB) = KalyswapLibrary.getReserves(factory, tokenA, tokenB);
        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint amountBOptimal = KalyswapLibrary.quote(amountADesired, reserveA, reserveB);
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, 'KalyswapRouter: INSUFFICIENT_B_AMOUNT');
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint amountAOptimal = KalyswapLibrary.quote(amountBDesired, reserveB, reserveA);
                assert(amountAOptimal <= amountADesired);
                require(amountAOptimal >= amountAMin, 'KalyswapRouter: INSUFFICIENT_A_AMOUNT');
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external virtual override ensure(deadline) returns (uint amountA, uint amountB, uint liquidity) {
        (amountA, amountB) = _addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin);
        address pair = KalyswapLibrary.pairFor(factory, tokenA, tokenB);
        TransferHelper.safeTransferFrom(tokenA, msg.sender, pair, amountA);
        TransferHelper.safeTransferFrom(tokenB, msg.sender, pair, amountB);
        liquidity = IKalyswapPair(pair).mint(to);
    }
    function addLiquidityKLC(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountKLCMin,
        address to,
        uint deadline
    ) external virtual override payable ensure (deadline) returns (uint amountToken, uint amountKLC, uint liquidity) {
        (amountToken, amountKLC) = _addLiquidity(
            token,
            WKLC,
            amountTokenDesired,
            msg.value,
            amountTokenMin,
            amountKLCMin
        );
        address pair = KalyswapLibrary.pairFor(factory, token, WKLC);
        TransferHelper.safeTransferFrom(token, msg.sender, pair, amountToken);
        IWKLC(WKLC).deposit{value: amountKLC}();
        assert(IWKLC(WKLC).transfer(pair, amountKLC));
        liquidity = IKalyswapPair(pair).mint(to);
        // refund dust KLC, if any
        if (msg.value > amountKLC) TransferHelper.safeTransferKLC(msg.sender, msg.value - amountKLC);
    }

    // **** REMOVE LIQUIDITY ****
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) public virtual override ensure(deadline) returns (uint amountA, uint amountB) {
        address pair = KalyswapLibrary.pairFor(factory, tokenA, tokenB);
        IKalyswapPair(pair).transferFrom(msg.sender, pair, liquidity); // send liquidity to pair
        (uint amount0, uint amount1) = IKalyswapPair(pair).burn(to);
        (address token0,) = KalyswapLibrary.sortTokens(tokenA, tokenB);
        (amountA, amountB) = tokenA == token0 ? (amount0, amount1) : (amount1, amount0);
        require(amountA >= amountAMin, 'KalyswapRouter: INSUFFICIENT_A_AMOUNT');
        require(amountB >= amountBMin, 'KalyswapRouter: INSUFFICIENT_B_AMOUNT');
    }
    function removeLiquidityKLC(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountKLCMin,
        address to,
        uint deadline
    ) public virtual override ensure(deadline) returns (uint amountToken, uint amountKLC) {
        (amountToken, amountKLC) = removeLiquidity(
            token,
            WKLC,
            liquidity,
            amountTokenMin,
            amountKLCMin,
            address(this),
            deadline
        );
        TransferHelper.safeTransfer(token, to, amountToken);
        IWKLC(WKLC).withdraw(amountKLC);
        TransferHelper.safeTransferKLC(to, amountKLC);
    }
    function removeLiquidityWithPermit(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external virtual override returns (uint amountA, uint amountB) {
        address pair = KalyswapLibrary.pairFor(factory, tokenA, tokenB);
        uint value = approveMax ? uint(-1) : liquidity;
        IKalyswapPair(pair).permit(msg.sender, address(this), value, deadline, v, r, s);
        (amountA, amountB) = removeLiquidity(tokenA, tokenB, liquidity, amountAMin, amountBMin, to, deadline);
    }
    function removeLiquidityKLCWithPermit(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountKLCMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external virtual override returns (uint amountToken, uint amountKLC) {
        address pair = KalyswapLibrary.pairFor(factory, token, WKLC);
        uint value = approveMax ? uint(-1) : liquidity;
        IKalyswapPair(pair).permit(msg.sender, address(this), value, deadline, v, r, s);
        (amountToken, amountKLC) = removeLiquidityKLC(token, liquidity, amountTokenMin, amountKLCMin, to, deadline);
    }



    // **** REMOVE LIQUIDITY (supporting fee-on-transfer tokens) ****
    function removeLiquidityKLCSupportingFeeOnTransferTokens(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountKLCMin,
        address to,
        uint deadline
    ) public virtual override ensure(deadline) returns (uint amountKLC) {
        (, amountKLC) = removeLiquidity(
            token,
            WKLC,
            liquidity,
            amountTokenMin,
            amountKLCMin,
            address(this),
            deadline
        );
        TransferHelper.safeTransfer(token, to, IERC20(token).balanceOf(address(this)));
        IWKLC(WKLC).withdraw(amountKLC);
        TransferHelper.safeTransferKLC(to, amountKLC);
    }
    function removeLiquidityKLCWithPermitSupportingFeeOnTransferTokens(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountKLCMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external virtual override returns (uint amountKLC) {
        address pair = KalyswapLibrary.pairFor(factory, token, WKLC);
        uint value = approveMax ? uint(-1) : liquidity;
        IKalyswapPair(pair).permit(msg.sender, address(this), value, deadline, v, r, s);
        amountKLC = removeLiquidityKLCSupportingFeeOnTransferTokens(
            token, liquidity, amountTokenMin, amountKLCMin, to, deadline
        );
    }

    // **** SWAP ****
    // requires the initial amount to have already been sent to the first pair
    function _swap(uint[] memory amounts, address[] memory path, address _to) internal virtual {
        for (uint i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = KalyswapLibrary.sortTokens(input, output);
            uint amountOut = amounts[i + 1];
            (uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOut) : (amountOut, uint(0));
            address to = i < path.length - 2 ? KalyswapLibrary.pairFor(factory, output, path[i + 2]) : _to;
            IKalyswapPair(KalyswapLibrary.pairFor(factory, input, output)).swap(
                amount0Out, amount1Out, to, new bytes(0)
            );
        }
    }
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external virtual override ensure(deadline) returns (uint[] memory amounts) {
        amounts = KalyswapLibrary.getAmountsOut(factory, amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, 'KalyswapRouter: INSUFFICIENT_OUTPUT_AMOUNT');
        TransferHelper.safeTransferFrom(
            path[0], msg.sender, KalyswapLibrary.pairFor(factory, path[0], path[1]), amounts[0]
        );
        _swap(amounts, path, to);
    }
    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external virtual override ensure(deadline) returns (uint[] memory amounts) {
        amounts = KalyswapLibrary.getAmountsIn(factory, amountOut, path);
        require(amounts[0] <= amountInMax, 'KalyswapRouter: EXCESSIVE_INPUT_AMOUNT');
        TransferHelper.safeTransferFrom(
            path[0], msg.sender, KalyswapLibrary.pairFor(factory, path[0], path[1]), amounts[0]
        );
        _swap(amounts, path, to);
    }
    function swapExactKLCForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        virtual
        override
        payable
        ensure(deadline)
        returns (uint[] memory amounts)
    {
        require(path[0] == WKLC, 'KalyswapRouter: INVALID_PATH');
        amounts = KalyswapLibrary.getAmountsOut(factory, msg.value, path);
        require(amounts[amounts.length - 1] >= amountOutMin, 'KalyswapRouter: INSUFFICIENT_OUTPUT_AMOUNT');
        IWKLC(WKLC).deposit{value: amounts[0]}();
        assert(IWKLC(WKLC).transfer(KalyswapLibrary.pairFor(factory, path[0], path[1]), amounts[0]));
        _swap(amounts, path, to);
    }
    function swapTokensForExactKLC(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline)
        external
        virtual
        override
        ensure(deadline)
        returns (uint[] memory amounts)
    {
        require(path[path.length - 1] == WKLC, 'KalyswapRouter: INVALID_PATH');
        amounts = KalyswapLibrary.getAmountsIn(factory, amountOut, path);
        require(amounts[0] <= amountInMax, 'KalyswapRouter: EXCESSIVE_INPUT_AMOUNT');
        TransferHelper.safeTransferFrom(
            path[0], msg.sender, KalyswapLibrary.pairFor(factory, path[0], path[1]), amounts[0]
        );
        _swap(amounts, path, address(this));
        IWKLC(WKLC).withdraw(amounts[amounts.length - 1]);
        TransferHelper.safeTransferKLC(to, amounts[amounts.length - 1]);
    }
    function swapExactTokensForKLC(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        virtual
        override
        ensure(deadline)
        returns (uint[] memory amounts)
    {
        require(path[path.length - 1] == WKLC, 'KalyswapRouter: INVALID_PATH');
        amounts = KalyswapLibrary.getAmountsOut(factory, amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, 'KalyswapRouter: INSUFFICIENT_OUTPUT_AMOUNT');
        TransferHelper.safeTransferFrom(
            path[0], msg.sender, KalyswapLibrary.pairFor(factory, path[0], path[1]), amounts[0]
        );
        _swap(amounts, path, address(this));
        IWKLC(WKLC).withdraw(amounts[amounts.length - 1]);
        TransferHelper.safeTransferKLC(to, amounts[amounts.length - 1]);
    }
    function swapKLCForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline)
        external
        virtual
        override
        payable
        ensure(deadline)
        returns (uint[] memory amounts)
    {
        require(path[0] == WKLC, 'KalyswapRouter: INVALID_PATH');
        amounts = KalyswapLibrary.getAmountsIn(factory, amountOut, path);
        require(amounts[0] <= msg.value, 'KalyswapRouter: EXCESSIVE_INPUT_AMOUNT');
        IWKLC(WKLC).deposit{value: amounts[0]}();
        assert(IWKLC(WKLC).transfer(KalyswapLibrary.pairFor(factory, path[0], path[1]), amounts[0]));
        _swap(amounts, path, to);
        // refund dust KLC, if any
        if (msg.value > amounts[0]) TransferHelper.safeTransferKLC(msg.sender, msg.value - amounts[0]);
    }

    // **** SWAP (supporting fee-on-transfer tokens) ****
    // requires the initial amount to have already been sent to the first pair
    function _swapSupportingFeeOnTransferTokens(address[] memory path, address _to) internal virtual {
        for (uint i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = KalyswapLibrary.sortTokens(input, output);
            IKalyswapPair pair = IKalyswapPair(KalyswapLibrary.pairFor(factory, input, output));
            uint amountInput;
            uint amountOutput;
            { // scope to avoid stack too deep errors
            (uint reserve0, uint reserve1,) = pair.getReserves();
            (uint reserveInput, uint reserveOutput) = input == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
            amountInput = IERC20(input).balanceOf(address(pair)).sub(reserveInput);
            amountOutput = KalyswapLibrary.getAmountOut(amountInput, reserveInput, reserveOutput);
            }
            (uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOutput) : (amountOutput, uint(0));
            address to = i < path.length - 2 ? KalyswapLibrary.pairFor(factory, output, path[i + 2]) : _to;
            pair.swap(amount0Out, amount1Out, to, new bytes(0));
        }
    }
    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external virtual override ensure(deadline) {
        TransferHelper.safeTransferFrom(
            path[0], msg.sender, KalyswapLibrary.pairFor(factory, path[0], path[1]), amountIn
        );
        uint balanceBefore = IERC20(path[path.length - 1]).balanceOf(to);
        _swapSupportingFeeOnTransferTokens(path, to);
        require(
            IERC20(path[path.length - 1]).balanceOf(to).sub(balanceBefore) >= amountOutMin,
            'KalyswapRouter: INSUFFICIENT_OUTPUT_AMOUNT'
        );
    }
    function swapExactKLCForTokensSupportingFeeOnTransferTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    )
        external
        virtual
        override
        payable
        ensure(deadline)
    {
        require(path[0] == WKLC, 'KalyswapRouter: INVALID_PATH');
        uint amountIn = msg.value;
        IWKLC(WKLC).deposit{value: amountIn}();
        assert(IWKLC(WKLC).transfer(KalyswapLibrary.pairFor(factory, path[0], path[1]), amountIn));
        uint balanceBefore = IERC20(path[path.length - 1]).balanceOf(to);
        _swapSupportingFeeOnTransferTokens(path, to);
        require(
            IERC20(path[path.length - 1]).balanceOf(to).sub(balanceBefore) >= amountOutMin,
            'KalyswapRouter: INSUFFICIENT_OUTPUT_AMOUNT'
        );
    }
    function swapExactTokensForKLCSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    )
        external
        virtual
        override
        ensure(deadline)
    {
        require(path[path.length - 1] == WKLC, 'KalyswapRouter: INVALID_PATH');
        TransferHelper.safeTransferFrom(
            path[0], msg.sender, KalyswapLibrary.pairFor(factory, path[0], path[1]), amountIn
        );
        _swapSupportingFeeOnTransferTokens(path, address(this));
        uint amountOut = IERC20(WKLC).balanceOf(address(this));
        require(amountOut >= amountOutMin, 'KalyswapRouter: INSUFFICIENT_OUTPUT_AMOUNT');
        IWKLC(WKLC).withdraw(amountOut);
        TransferHelper.safeTransferKLC(to, amountOut);
    }

    // **** LIBRARY FUNCTIONS ****
    function quote(uint amountA, uint reserveA, uint reserveB) public pure virtual override returns (uint amountB) {
        return KalyswapLibrary.quote(amountA, reserveA, reserveB);
    }

    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut)
        public
        pure
        virtual
        override
        returns (uint amountOut)
    {
        return KalyswapLibrary.getAmountOut(amountIn, reserveIn, reserveOut);
    }

    function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut)
        public
        pure
        virtual
        override
        returns (uint amountIn)
    {
        return KalyswapLibrary.getAmountIn(amountOut, reserveIn, reserveOut);
    }

    function getAmountsOut(uint amountIn, address[] memory path)
        public
        view
        virtual
        override
        returns (uint[] memory amounts)
    {
        return KalyswapLibrary.getAmountsOut(factory, amountIn, path);
    }

    function getAmountsIn(uint amountOut, address[] memory path)
        public
        view
        virtual
        override
        returns (uint[] memory amounts)
    {
        return KalyswapLibrary.getAmountsIn(factory, amountOut, path);
    }
}
