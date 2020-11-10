import TokenRepository from "../repository/token_repository";
import { DbToken } from "../../domain/value_types/dbtoken";

export class TokenService {

    #tr: TokenRepository;

    constructor(){
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