import { MongoClient, Db, Collection, InsertOneWriteOpResult } from 'mongodb';

export default class Database {

    private static _db: Database;
    #db: Db;

    constructor(db: Db){
        this.#db = db;
    }

    public static async connectDatabase(databaseUrl, dbname): Promise<Database> {
        if(this._db == null){
            try{
                let connection = await MongoClient.connect(databaseUrl, { useUnifiedTopology: true });
                Database._db = new Database(connection.db(dbname));
            }catch(e){
                throw e;
            }
        }
        return Database._db;
    }

    public static getCollection(collection: string): Collection {
        return Database._db.#db.collection(collection);
    }

}