import { Transaction as Web3_Transaction } from "web3-eth"
import { ILoggerService } from "../services/i_logger_service";
import { ITransactionService } from "../services/i_transaction_service";
import { RawTransaction } from "../value_types/raw_transaction";
import { ParsedTransactionMethod } from "../value_types/parsed_transaction_method";
import { TransactionPairReserves } from "../value_types/transaction_pair_reserves";
import BN from "bignumber.js";
import { ISimulationBoxBuilder } from "../factories/i_simulation_box_builder";
import { ERC20Methods, ITransactionFactory, TransactionType, UniswapMethods } from "../factories/i_transaction_factory";
import { MAX_ETH_INVEST, UNISWAP_CONTRACT_ADDR } from "../../config";
import { BuiltTransaction } from "../value_types/built_transaction";
import { TransactionFailure } from "../failures/transaction_failure";

export class UniBot {

    #txService: ITransactionService;
    #transactionfactory: ITransactionFactory;
    #simulationBoxBuilder: ISimulationBoxBuilder;
    #logger: ILoggerService;

    constructor(
        txService: ITransactionService,
        transactionfactory: ITransactionFactory,
        simulationBoxBuilder: ISimulationBoxBuilder,
        logger: ILoggerService
    ) {
        this.#txService = txService;
        this.#logger = logger;
        this.#simulationBoxBuilder = simulationBoxBuilder;
        this.#transactionfactory = transactionfactory;
    }

    async processTx(
        victimTx: Web3_Transaction
    ) {
        this.#logger.addDebugForTx(victimTx.hash, `Tx ${victimTx.hash} received by the bot`, 1);

        // Call get reserve custom amoutIn amoutOut
        let txMethod: ParsedTransactionMethod = victimTx["decodedMethod"];
        let path = txMethod.params.find(txParam => txParam.name == "path")!.value;

        // Compute price impact
        let reserveBeforeVictimTx = await this._getReserve(path[0], path[1]);
        let rawVictimTx = await this.#txService.getRawTxFromHash(victimTx.hash);
        let reserveAfterVictimTx = await this._getReserveAfterVictimTx(rawVictimTx, path[0], path[1]);
        let reserveOutBefore = new BN(reserveBeforeVictimTx.reserveB);
        let reserveOutAfter = new BN(reserveAfterVictimTx.reserveB);
        let priceImpact = reserveOutAfter.minus(reserveOutBefore).div(reserveOutBefore).times(100);
        this.#logger.addDebugForTx(victimTx.hash, `Reserve impact: ${priceImpact} %`, 1);

        // Compute eth to invest to make a worthy trade
        let decodedTxMethod: ParsedTransactionMethod = victimTx["decodedMethod"];
        let amountOutMin = new BN(decodedTxMethod.params.find(txParam => txParam.name === "amountOutMin")!.value as string);
        let amountIn = new BN(victimTx.value);
        let reserveIn = new BN(reserveBeforeVictimTx.reserveA);
        let reserveOut = new BN(reserveBeforeVictimTx.reserveB);

        let maxInvestAmount = new BN(
            this._getMaxAmountIn(
                reserveIn,
                reserveOut,
                amountIn,
                amountOutMin
            ).toFixed(0, 1)
        );

        this.#logger.addDebugForTx(victimTx.hash, `Calculated eth invest: ${maxInvestAmount}`, 1);

        if (maxInvestAmount.gt(new BN(MAX_ETH_INVEST))) {
            this.#logger.addErrorForTx(victimTx.hash, `Invest amount to high`, 1)
        } else {

            // Compute how many token we can get for the eth amount invested
            let maxTokenToBuy = new BN(
                this._getAmountOut(
                    maxInvestAmount,
                    reserveIn,
                    reserveOut
                ).toFixed(0, 1)
            );

            this.#logger.addDebugForTx(victimTx.hash, `Calculated token to buy: ${maxTokenToBuy}`, 1);

            // Simulate on ganache
            let previousBalance = await this._getGanacheBalance();
            let startTime = new Date().getTime();
            let newBalanceOrFailure = await this._simulateSandwichAttack(
                new BN(victimTx.gasPrice),
                rawVictimTx,
                path[0],
                path[1],
                maxInvestAmount,
                maxTokenToBuy,
                maxInvestAmount
            );

            if (typeof newBalanceOrFailure === "object") {
                console.log(newBalanceOrFailure.toString());
                process.exit();
            } else {
                let endTime = new Date().getTime();

                this.#logger.addSuccessFortx(victimTx.hash, `Sandwich attack simulated in ${endTime - startTime}ms`, 1);
                this.#logger.addDebugForTx(victimTx.hash, `Balance before attack: ${previousBalance}`, 2);
                this.#logger.addDebugForTx(victimTx.hash, `Balance after attack: ${newBalanceOrFailure}`, 2);
            }
        }

        this.#logger.consumeLogsForTx(victimTx.hash);
    }

    private async _getGanacheBalance() {
        return this.#simulationBoxBuilder.copy().build().getBalance();
    }

    private async _getReserve(
        reserveInAddr: string,
        reserveOutAddr: string
    ): Promise<TransactionPairReserves> {
        return await this.#txService.getReserve(reserveInAddr, reserveOutAddr);
    }

    private async _getReserveAfterVictimTx(
        victimTx: RawTransaction,
        reserveIn: string,
        reserveOut: string
    ): Promise<TransactionPairReserves> {
        let simulationBox = this.#simulationBoxBuilder.copy().addTx(victimTx).build();
        await simulationBox.simulate();
        return await simulationBox.getSimulationReserves(reserveIn, reserveOut);
    }

    private async _simulateSandwichAttack(
        victimGasPrice: BN,
        victimTx: RawTransaction,
        reserveInAddr: string,
        reserveOutAddr: string,
        amountToInvest: BN,
        amountTokenToBuy: BN,
        amountOutMin: BN,
    ): Promise<string | TransactionFailure> {

        let currentNonce = this.#txService.getCurrentNonce();

        // Approval transaction
        let approveTx: BuiltTransaction = this.#transactionfactory.createErc20Transaction(
            TransactionType.onGanache,
            reserveOutAddr,
            ERC20Methods.approve,
            [
                UNISWAP_CONTRACT_ADDR,                                                                  // Uniswap contract
                "115792089237316195423570985008687907853269984665640564039457584007913129639935"        // UNIT256MAX -1
            ]
        );

        let buyTx = this.#transactionfactory.createUniswapTransaction(
            TransactionType.onGanache,
            UniswapMethods.swapETHForExactTokens,
            [
                amountTokenToBuy,                                           // amoutTokenOut
                [reserveInAddr, reserveOutAddr],                            // Pair
                process.env.ETH_PUBLIC_KEY,                                 // Wallet
                Math.floor(new Date().getTime() / 1000) + 180               // Timestamp
            ]
        );

        let sellTx = this.#transactionfactory.createUniswapTransaction(
            TransactionType.onGanache,
            UniswapMethods.swapExactTokensForETH,
            [
                amountTokenToBuy,                                           // amountIn
                amountOutMin,                                               // amountOutMin
                [reserveOutAddr, reserveInAddr],                            // Pairs
                process.env.ETH_PUBLIC_KEY,                                 // Wallet
                Math.floor(new Date().getTime() / 1000) + 180               // Timestamp
            ]
        );

        let simulationBox = this.#simulationBoxBuilder
            .copy()
            .addTx({
                transaction: approveTx,
                sendParams: {
                    from: process.env.ETH_PUBLIC_KEY!,
                    gas: 60000,
                    gasPrice: victimGasPrice.plus(10000001),
                    nonce: currentNonce + 1,
                    to: reserveOutAddr,
                },
            })
            .addTx({
                transaction: buyTx,
                sendParams: {
                    from: process.env.ETH_PUBLIC_KEY!,
                    gas: 250000,
                    gasPrice: victimGasPrice.plus(10000000),
                    value: amountToInvest.toFixed(0, 0),
                    nonce: currentNonce + 2,
                    to: UNISWAP_CONTRACT_ADDR,
                }
            })
            .addTx(victimTx)
            .addTx({
                transaction: sellTx,
                sendParams: {
                    from: process.env.ETH_PUBLIC_KEY!,
                    gas: 250000,
                    gasPrice: victimGasPrice,
                    nonce: currentNonce + 3,
                    to: UNISWAP_CONTRACT_ADDR,
                }
            })
            .build();

        let voidOrFailure = await simulationBox.simulate();
        if (typeof voidOrFailure === "object") {
            return voidOrFailure;
        } else {
            let balance = await simulationBox.getBalance();
            return balance;
        }

    }

    private _getMaxAmountIn(
        reserveIn: BN,
        reserveOut: BN,
        amountIn: BN,
        amountOutMin: BN
    ): BN {
        let a = amountIn;
        let b = reserveIn;
        let c = reserveOut;
        let d = amountOutMin;

        let A = new BN("997000");
        let B = new BN("1997000").times(b.times(d)).plus(new BN("994009").times(a.times(d)));
        let C = new BN("1000000").times(b.times(b).times(d)).plus(new BN("997000").times(a.times(b.times(d)))).minus(new BN("997000").times(a.times(b.times(c))));

        let delta = (B.times(B)).minus(A.times(C).times(4));

        if (delta.lt(0)) {
            throw new Error("DELTA < 0 not possible !");
        }

        let x1 = (B.negated().minus(delta.sqrt())).div(a.times(2));
        let x2 = (B.negated().plus(delta.sqrt())).div(a.times(2));

        return x2;
    }

    private _getAmountOut(
        amountIn: BN,
        reserveIn: BN,
        reserveOut: BN
    ): BN {
        let amountInWithFee = amountIn.times(997);
        let numerator = amountInWithFee.times(reserveOut);
        let denominator = reserveIn.times(1000).plus(amountInWithFee);
        return numerator.div(denominator);
    }

}