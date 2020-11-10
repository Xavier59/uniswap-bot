import { Collection } from 'mongodb';
import Database from "../services/database";
import { DbToken } from '../../domain/value_types/dbtoken';

export default class TokenRepository {

    #collection: Collection;

    constructor(){
        this.#collection = Database.getCollection("tokens");
    }

    findOne(item: string): Promise<DbToken | null> {
        return this.#collection.findOne({address: item.toLowerCase()})
    }
}