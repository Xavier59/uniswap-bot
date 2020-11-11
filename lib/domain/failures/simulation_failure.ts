export class SimulationFailure {
    #msg: string;

    constructor(
        msg: string
    ) {
        this.#msg = msg;
    }

    toString(): string {
        return this.#msg;
    }
}