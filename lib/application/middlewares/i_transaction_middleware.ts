import { Transaction } from "web3-eth"
import { ILoggerService } from "../../domain/services/i_logger_service";


export abstract class ITransactionMiddleware {
    protected next: ITransactionMiddleware | null;
    protected logger: ILoggerService;

    constructor(logger: ILoggerService) {
        this.next = null;
        this.logger = logger;
    }

    setNext(txMiddleware: ITransactionMiddleware) {
        this.next = txMiddleware;
    }

    abstract dispatch(tx: Transaction): Promise<boolean>;
}