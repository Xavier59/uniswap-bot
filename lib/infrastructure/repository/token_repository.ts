import { Collection } from 'mongodb';
import Database from "../services/database";
import { DbToken } from '../../domain/value_types/dbtoken';

export default class TokenRepository {

    #collection: Collection;

    constructor() {
        this.#collection = Database.getCollection("tokens");
    }

    async findOne(
        item: string
    ): Promise<DbToken | null> {
        return await this.#collection.findOne({ "address": item.toLowerCase() })
    }

    async updateOne(
        item: string,
        data: {}
    ): Promise<void> {
        this.#collection.updateOne(
            { "address": item.toLowerCase() },
            { $set: data }
        );
    }
}