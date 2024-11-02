import fs from 'fs/promises';
import path from 'path';
import { MongoClient, Db, Collection } from 'mongodb';

interface ServerDetails {
  url: string;
  dbName: string;
  collectionName: string;
}

type Store = { [section: string]: { [key: string]: any } };

// Define the path to the persistent JSON file
const filePath = path.resolve('PersistentState.json');

// BlackBoard class with MongoDB support and optional caching
class BlackBoard {
  private store: Store = {};
  private mongoClient: MongoClient | null = null;
  private mongoCollection: Collection | null = null;
  public debug: boolean = false;

  constructor() {
    this.loadStore();
  }

  // Connect to MongoDB
  async useMongo(serverDetails: ServerDetails): Promise<void> {
    try {
      this.mongoClient = new MongoClient(serverDetails.url);
      await this.mongoClient.connect();
      const db: Db = this.mongoClient.db(serverDetails.dbName);
      this.mongoCollection = db.collection(serverDetails.collectionName);
      if (this.debug) console.log('BlackBoard.useMongo - Connected to MongoDB');
    } catch (error) {
      console.error('Error connecting to MongoDB:', error);
    }
  }

  // Get a value from the store or MongoDB
  async get(section: string, key: string): Promise<any> {
    if (this.store[section]?.[key] !== undefined) {
      if (this.debug) console.log(`BlackBoard.get (cache) - Section: ${section}, Key: ${key}`);
      return this.store[section][key];
    }
    if (this.mongoCollection) {
      const result = await this.mongoCollection.findOne({ section, key });
      if (result) {
        this.store[section] = this.store[section] || {};
        this.store[section][key] = result.value;
        if (this.debug) console.log(`BlackBoard.get (Mongo) - Section: ${section}, Key: ${key}`);
        return result.value;
      }
    }
    return undefined;
  }

  // Set a value in the store or MongoDB, with optional cache control
  async set(section: string, key: string, value: any, canCache: boolean = true): Promise<void> {
    if (canCache) {
      if (!this.store[section]) {
        this.store[section] = {};
      }
      this.store[section][key] = value;
    }
    if (this.mongoCollection) {
      await this.mongoCollection.updateOne(
        { section, key },
        { $set: { value } },
        { upsert: true }
      );
      if (this.debug) console.log(`BlackBoard.set - Section: ${section}, Key: ${key}, Value: ${value}, canCache: ${canCache}`);
    }
  }

  // Remove a key from a section in both the cache and MongoDB
  async removeKey(section: string, key: string): Promise<void> {
    if (this.store[section]) {
      delete this.store[section][key];
      if (Object.keys(this.store[section]).length === 0) {
        delete this.store[section];
      }
    }
    if (this.mongoCollection) {
      await this.mongoCollection.deleteOne({ section, key });
      if (this.debug) console.log(`BlackBoard.removeKey - Section: ${section}, Key: ${key}`);
    }
  }

  // Remove an entire section in both the cache and MongoDB
  async removeSection(section: string): Promise<void> {
    delete this.store[section];
    if (this.mongoCollection) {
      await this.mongoCollection.deleteMany({ section });
      if (this.debug) console.log(`BlackBoard.removeSection - Section: ${section}`);
    }
  }

  // Load data from JSON file on startup
  private async loadStore(): Promise<void> {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      this.store = JSON.parse(data) as Store;
      if (this.debug) console.log('BlackBoard.loadStore - Store loaded from PersistentState.json');
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('PersistentState.json not found. Creating new file.');
        this.store = {};
        await this.saveStore();
      } else {
        console.error('Error loading PersistentState.json:', error);
      }
    }
  }

  // Save data to JSON file
  private async saveStore(): Promise<void> {
    try {
      await fs.writeFile(filePath, JSON.stringify(this.store, null, 2));
      if (this.debug) console.log('BlackBoard.saveStore - Store saved to PersistentState.json');
    } catch (error) {
      console.error('Error saving PersistentState.json:', error);
    }
  }

  // Set up graceful shutdown to save in-memory store to JSON on process termination
  public async setupShutdown(): Promise<void> {
    process.on('SIGTERM', async () => {
      if (this.debug) console.log('BlackBoard - Received SIGTERM. Saving store to PersistentState.json...');
      await this.saveStore();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      if (this.debug) console.log('BlackBoard - Process interrupted. Saving store to PersistentState.json...');
      await this.saveStore();
      process.exit(0);
    });
  }
}

// Export a single instance of BlackBoard
const BB = new BlackBoard();
export default BB;
