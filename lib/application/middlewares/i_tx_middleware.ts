import {Transaction} from "web3-eth"
import { ILogger } from "../../domain/services/i_logger";


export abstract class ITxMiddleware {
    protected next: ITxMiddleware | null;
    protected logger: ILogger;

    constructor(logger: ILogger) {
        this.next = null;
        this.logger = logger;
    }

    setNext(txMiddleware: ITxMiddleware) {
        this.next = txMiddleware;
    }

    abstract dispatch(tx: Transaction): Promise<boolean>;    
}