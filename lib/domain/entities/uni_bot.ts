import { Transaction as Web3_Transaction } from "web3-eth"
import { ILoggerService } from "../services/i_logger_service";
import { ITransactionService } from "../services/i_transaction_service";
import { RawTransaction } from "../value_types/raw_transaction";
import { ParsedTransactionMethod } from "../value_types/parsed_transaction_method";
import { TransactionPairReserves } from "../value_types/transaction_pair_reserves";
import BN from "bignumber.js";
import { ISimulationBoxBuilder } from "../factories/i_simulation_box_builder";
import { ERC20Methods, ITransactionFactory, TransactionType } from "../factories/i_transaction_factory";
import { UNISWAP_CONTRACT_ADDR } from "../../config";
import { BuiltTransaction } from "../value_types/built_transaction";

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
        this.#logger.addInfoForTx(victimTx.hash, `Tx ${victimTx.hash} received by the bot`, 1);

        // Call get reserve custom amoutIn amoutOut
        let txMethod: ParsedTransactionMethod = victimTx["decodedMethod"];
        let path = txMethod.params.find(txParam => txParam.name == "path")!.value;
        this.#logger.addDebugForTx(victimTx.hash, `Path: ${JSON.stringify(path)}`, 1);

        // Compute price impact
        let reserveBeforeVictimTx = await this._getReserve(path[0], path[1]);
        let rawVictimTx = await this.#txService.getRawTxFromHash(victimTx.hash);
        let reserveAfterVictimTx = await this._getReserveAfterVictimTx(rawVictimTx, path[0], path[1]);
        let reserveOutBefore = new BN(reserveBeforeVictimTx.reserveB);
        let reserveOutAfter = new BN(reserveAfterVictimTx.reserveB);
        let priceImpact = reserveOutAfter.minus(reserveOutBefore).div(reserveOutBefore).times(100);
        this.#logger.addDebugForTx(victimTx.hash, `Reserve impact: ${priceImpact} %`, 1);

        // Simulate attack sandwich
        // Approval ?
        // Réinsérer notre tx
        // Réinsérer sa tx
        // Réinsérer notre 2e tx
        // Check si on a bien récupérer notre argent
        let res = await this._simulateSandwichAttack(
            new BN(victimTx.gasPrice),
            rawVictimTx,
            path[0],
            path[1]
        );
        this.#logger.addDebugForTx(victimTx.hash, `RESERVE IMPACT AFTER SIMULATION: ${priceImpact} %`, 1);
        this.#logger.consumeLogsForTx(victimTx.hash);

    }

    private async _getReserve(
        reserveIn: string,
        reserveOut: string
    ): Promise<TransactionPairReserves> {
        return await this.#txService.getReserve(reserveIn, reserveOut);
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
        reserveIn: string,
        reserveOut: string,
    ): Promise<TransactionPairReserves> {

        let currentNonce = this.#txService.getCurrentNonce();

        // Approval transaction
        let approveTx: BuiltTransaction = this.#transactionfactory.createErc20Transaction(
            TransactionType.onGanache,
            reserveOut,
            ERC20Methods.approve,
            [
                UNISWAP_CONTRACT_ADDR,
                "115792089237316195423570985008687907853269984665640564039457584007913129639935"
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
                },
            })
            .addTx(victimTx)
            .build();

        await simulationBox.simulate();
        return await simulationBox.getSimulationReserves(reserveIn, reserveOut);
    }

}