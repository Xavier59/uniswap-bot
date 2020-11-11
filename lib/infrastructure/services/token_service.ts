import TokenRepository from "../repository/token_repository";
import { ITokenService } from "../../domain/services/i_token_service";

export class TokenService implements ITokenService {

    #tr: TokenRepository;

    constructor() {
        this.#tr = new TokenRepository();
    }

    async isAllowlisted(address: string): Promise<boolean> {
        let token = await this.#tr.findOne(address);
        return token ? token.isAllowlisted : false;
    }

    async isBlocklisted(address: string): Promise<boolean> {
        let token = await this.#tr.findOne(address);
        return token ? token.isBlocklisted : false;
    }

    async isApproved(address: string): Promise<boolean> {
        let token = await this.#tr.findOne(address);
        return token ? token.isApproved : false;
    }

}