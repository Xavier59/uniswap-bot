pragma solidity >=0.7.0;

pragma experimental ABIEncoderV2;

import "./IUniswapV2Pair.sol";

contract UniswapHelper {
    address private _owner;
    address private _factory;
    address private _uniswap;

    /*
    address[] private commonTokens;
    address[] private approvedTokens;

    struct Arbitrage {
        IUniswapV2Pair pathArb;
        IUniswapV2Pair pathOut;
        uint256 profit;
    }
    */

    constructor(address uniswap) {
        _owner = msg.sender;
        _uniswap = uniswap;
    }

    modifier onlyOwner {
        require(msg.sender == _owner, "UniswapHelper: ONLY OWNER");
        _;
    }

    modifier ensure(uint256 blocknumber) {
        require(blocknumber == block.number, "UniswapHelper: EXPIRED");
        _;
    }

    function updateFactory(address factory) public onlyOwner {
        _factory = factory;
    }

    // returns sorted token addresses, used to handle return values from pairs sorted in this order
    function sortTokens(address tokenA, address tokenB)
        public
        pure
        returns (address token0, address token1)
    {
        require(tokenA != tokenB, "UniswapV2Library: IDENTICAL_ADDRESSES");
        (token0, token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        require(token0 != address(0), "UniswapV2Library: ZERO_ADDRESS");
    }

    // calculates the CREATE2 address for a pair without making any external calls
    function pairFor(
        address factory,
        address tokenA,
        address tokenB
    ) public pure returns (address pair) {
        (address token0, address token1) = sortTokens(tokenA, tokenB);
        pair = address(
            uint256(
                keccak256(
                    abi.encodePacked(
                        hex"ff",
                        factory,
                        keccak256(abi.encodePacked(token0, token1)),
                        hex"96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f" // init code hash
                    )
                )
            )
        );
    }

    // fetches and sorts the reserves for a pair
    function getReserves(
        address factory,
        address tokenA,
        address tokenB
    ) public view returns (uint256 reserveA, uint256 reserveB) {
        (address token0, ) = sortTokens(tokenA, tokenB);
        (uint256 reserve0, uint256 reserve1, ) = IUniswapV2Pair(
            pairFor(factory, tokenA, tokenB)
        )
            .getReserves();
        (reserveA, reserveB) = tokenA == token0
            ? (reserve0, reserve1)
            : (reserve1, reserve0);
    }

    /*function addToken(address token) public onlyOwner {
        commonTokens.push(token);
    }

    function addTokens(address[] calldata tokens) public onlyOwner {
        for (uint256 i; i < tokens.length; i++) {
            commonTokens.push(tokens[i]);
        }
    }

    function removeToken(address token) public onlyOwner {
        for (uint256 i; i < commonTokens.length; i++) {
            if (commonTokens[i] == token) {
                if (i != commonTokens.length - 1)
                    commonTokens[i] = commonTokens[commonTokens.length - 1];
                commonTokens.pop();
            }
        }
    }

    function removeTokens(address[] calldata tokens) public onlyOwner {
        for (uint256 i; i < tokens.length; i++) {
            for (uint256 j; j < commonTokens.length; j++) {
                if (tokens[i] == commonTokens[j]) {
                    if (j != commonTokens.length - 1)
                        commonTokens[j] = commonTokens[commonTokens.length - 1];
                    commonTokens.pop();
                    break;
                }
            }
        }
    }

    function findPairs(address tokenA, address tokenB)
        public
        view
        returns (IUniswapV2Pair[] storage)
    {
        IUniswapV2Pair[] storage pairs;
        for (uint256 i; i < commonTokens.length; i++) {
            uint256 size;
            IUniswapV2Pair pair = IUniswapV2Pair(
                pairFor(_factory, tokenA, tokenB)
            );
            assembly {
                size := extcodesize(pair)
            }
            if (size > 0) pairs.push(pair);
        }
        return pairs;
    }

    function calculateArb(IUniswapV2Pair pathArb, IUniswapV2Pair pathOut)
        public
        returns (Arbitrage memory)
    {
        return Arbitrage(pathArb, pathOut, 0);
    }

    // check if a swap can be arbitraged
    function findArb_swapExactETHForTokens(address[] calldata path)
        public
        view
    {
        IUniswapV2Pair[] memory pairs;
        Arbitrage[] storage arbitrages;
        require(path.length != 2, "UniswapHelper: INVALID_PATH"); // TODO should deal with path length > 2 later
        for (uint256 i; i < path.length - 1; i++) {
            pairs = findPairs(path[i], path[i + 1]);
            for (uint256 j; j < pairs.length; j++) {
                arbitrages.push(
                    calculateArb(
                        pairs[j],
                        IUniswapV2Pair(pairFor(_factory, path[i], path[i + 1]))
                    )
                );
            }
        }
    }

    function executeArb(address[] calldata path) public onlyOwner {}*/

    function swapETHForExactTokens(
        uint256 amountOut,
        address[] calldata path,
        address to,
        uint256 blocknumber
    )
        external
        virtual
        payable
        ensure(blocknumber)
        returns (uint256[] memory amounts)
    {
        (bool success, bytes memory result) = _uniswap.call{value: msg.value}(
            abi.encodeWithSignature(
                "swapETHForExactTokens(uint256,address[],address,uint256)",
                amountOut,
                path,
                to,
                block.timestamp+180
            )
        );

        if(success == false){
            assembly {
                let ptr := mload(0x40)
                let size := returndatasize()
                returndatacopy(ptr, 0, size)
                revert(ptr, size)
            }
        }
        return abi.decode(result, (uint256[]));
    }

}
