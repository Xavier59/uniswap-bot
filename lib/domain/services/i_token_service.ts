export interface TokenService {

    isAllowlisted(
        address: string
    ): boolean;

    isBlocklisted(
        address: string
    ): boolean;

    // has the token be approved for transfer from uniswap smartcontract ?
    isApproved(
        address: string
    ): boolean;

}