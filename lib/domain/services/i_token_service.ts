export interface ITokenService {

    isAllowlisted(
        address: string
    ): Promise<boolean>;

    isBlocklisted(
        address: string
    ): Promise<boolean>;

    isApproved(
        address: string
    ): Promise<boolean>;

    approveToken(address: string): Promise<void>

}