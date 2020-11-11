export interface ITokenService {

    isAllowlisted(
        address: string
    ): Promise<boolean>;

    isBlocklisted(
        address: string
    ): Promise<boolean>;

    // has the token be approved for transfer from uniswap smartcontract ?
    isApproved(
        address: string
    ): Promise<boolean>;

}