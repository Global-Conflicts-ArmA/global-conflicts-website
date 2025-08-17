import { MongoClient } from "mongodb";

if (!process.env.MONGO_HOST) {
  throw new Error('Invalid/Missing environment variable: "MONGO_HOST"');
}

const uri = process.env.MONGO_HOST;
const options = { appName: "devrel.template.nextjs" };

let client: MongoClient;
let MyMongo: Promise<MongoClient>

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClient?: MongoClient;
  };

  if (!globalWithMongo._mongoClient) {
    globalWithMongo._mongoClient = new MongoClient(uri, options);
  }
  client = globalWithMongo._mongoClient;
  MyMongo = client.connect()
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  MyMongo = client.connect()
}

// Export a module-scoped MongoClient. By doing this in a
// separate module, the client can be shared across functions.
export default (await MyMongo).db("prod");
