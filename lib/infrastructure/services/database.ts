import { MongoClient, Db, Collection } from 'mongodb';

export default class Database {

    private static _db: Database;
    #db: Db;

    constructor(db: Db) {
        this.#db = db;
    }

    public static async connectDatabase(databaseUrl: string, dbname: string): Promise<Database> {
        if (this._db == null) {
            try {
                const connection = await MongoClient.connect(`${databaseUrl}/?authSource=${dbname}`, { useUnifiedTopology: true, connectTimeoutMS: 5000, serverSelectionTimeoutMS: 5000 });
                Database._db = new Database(connection.db(dbname));
            } catch (e) {
                throw e;
            }
        }
        return Database._db;
    }

    public static getCollection(collection: string): Collection {
        return Database._db.#db.collection(collection);
    }

}