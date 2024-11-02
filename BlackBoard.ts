import fs from 'fs/promises';
import { watch } from 'fs';
import path from 'path';

interface ServerDetails {
  url: string;
  dbName: string;
  collectionName: string;
}

type Store = { [section: string]: { [key: string]: any } };

// Define the path to the persistent JSON file for caching
const filePath = path.resolve('PersistentState.json');

// BlackBoard class with optional MongoDB and LRU caching
class BlackBoard {
  private store: Store | any = {}; // Can be an LRU instance or a plain object
  private useCache: boolean = false;
  private mongoClient: any = null;
  private mongoCollection: any = null;
  private mongoWriteQueue: { section: string, key: string, value: any }[] = [];
  public debug: boolean = false;

  constructor() {
    this.loadStore();
    this.setupFileWatcher();
  }

  // Connect to MongoDB with server details and initialize LRU cache if needed
  async useMongo(serverDetails: ServerDetails, maxCacheItems: number = 500, ttl: number = 1000 * 60 * 10): Promise<void> {
    // Dynamically load MongoDB and connect
    if (!this.mongoClient) {
      const { MongoClient } = await import('mongodb');
      this.mongoClient = new MongoClient(serverDetails.url);
      await this.mongoClient.connect();
      const db = this.mongoClient.db(serverDetails.dbName);
      this.mongoCollection = db.collection(serverDetails.collectionName);
      if (this.debug) console.log('BlackBoard.useMongo - Connected to MongoDB');
    }

    // Initialize the LRU cache only if MongoDB is enabled
    if (!this.useCache) {
      const { default: LRU } = await import('lru-cache');
      this.store = new LRU({ max: maxCacheItems, ttl });
      this.useCache = true;
      if (this.debug) console.log('BlackBoard - LRU cache initialized');
    }
  }

  async get(section: string, key: string): Promise<any> {
    const cacheKey = `${section}.${key}`;
    const cachedValue = this.useCache ? this.store.get(cacheKey) : this.store[section]?.[key];
    if (cachedValue !== undefined) {
      if (this.debug) console.log(`BlackBoard.get - Section: ${section}, Key: ${key}`);
      return cachedValue;
    }

    if (this.mongoCollection) {
      const result = await this.mongoCollection.findOne({ section, key });
      if (result) {
        if (this.useCache) {
          this.store.set(cacheKey, result.value);
        } else {
          this.store[section] = this.store[section] || {};
          this.store[section][key] = result.value;
        }
        if (this.debug) console.log(`BlackBoard.get (Mongo) - Section: ${section}, Key: ${key}`);
        return result.value;
      }
    }
    return undefined;
  }

  async set(section: string, key: string, value: any, canCache: boolean = true): Promise<void> {
    const cacheKey = `${section}.${key}`;
    if (canCache) {
      if (this.useCache) {
        this.store.set(cacheKey, value);
      } else {
        this.store[section] = this.store[section] || {};
        this.store[section][key] = value;
      }
    }

    if (this.mongoCollection) {
      this.mongoWriteQueue.push({ section, key, value });
      if (this.mongoWriteQueue.length >= 10) {
        await this.flushMongoWrites();
      }
    }
    if (this.debug) console.log(`BlackBoard.set - Section: ${section}, Key: ${key}, Value: ${value}, canCache: ${canCache}`);
  }

  async removeKey(section: string, key: string): Promise<void> {
    const cacheKey = `${section}.${key}`;
    if (this.useCache) {
      this.store.delete(cacheKey);
    } else if (this.store[section]) {
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

  async removeSection(section: string): Promise<void> {
    if (this.useCache) {
      this.store.forEach((_, key) => {
        if (key.startsWith(`${section}.`)) this.store.delete(key);
      });
    } else {
      delete this.store[section];
    }

    if (this.mongoCollection) {
      await this.mongoCollection.deleteMany({ section });
      if (this.debug) console.log(`BlackBoard.removeSection - Section: ${section}`);
    }
  }

  private async flushMongoWrites(): Promise<void> {
    if (!this.mongoCollection || this.mongoWriteQueue.length === 0) return;

    const bulkOps = this.mongoWriteQueue.map(item => ({
      updateOne: {
        filter: { section: item.section, key: item.key },
        update: { $set: { value: item.value } },
        upsert: true
      }
    }));

    try {
      await this.mongoCollection.bulkWrite(bulkOps);
      if (this.debug) console.log('BlackBoard.flushMongoWrites - MongoDB batch write completed');
      this.mongoWriteQueue = [];
    } catch (error) {
      console.error('Error performing batch write to MongoDB:', error);
    }
  }

  private async loadStore(): Promise<void> {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const jsonData = JSON.parse(data) as Store;
      Object.entries(jsonData).forEach(([section, keys]) => {
        Object.entries(keys).forEach(([key, value]) => {
          if (this.useCache) {
            this.store.set(`${section}.${key}`, value);
          } else {
            this.store[section] = this.store[section] || {};
            this.store[section][key] = value;
          }
        });
      });
      if (this.debug) console.log('BlackBoard.loadStore - Store loaded from PersistentState.json');
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('PersistentState.json not found. Creating new file.');
        await this.saveStore();
      } else {
        console.error('Error loading PersistentState.json:', error);
      }
    }
  }

  private async saveStore(): Promise<void> {
    const jsonData: Store = {};

    if (this.useCache) {
      this.store.forEach((value: any, key: string) => {
        const [section, subKey] = key.split('.');
        jsonData[section] = jsonData[section] || {};
        jsonData[section][subKey] = value;
      });
    } else {
      Object.assign(jsonData, this.store);
    }

    try {
      await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2));
      if (this.debug) console.log('BlackBoard.saveStore - Store saved to PersistentState.json');
    } catch (error) {
      console.error('Error saving PersistentState.json:', error);
    }
  }

  private setupFileWatcher(): void {
    watch(filePath, async (eventType) => {
      if (eventType === 'change') {
        await this.loadStore();
        if (this.debug) console.log('BlackBoard.setupFileWatcher - PersistentState.json reloaded');
      }
    });
  }

  public async setupShutdown(): Promise<void> {
    process.on('SIGTERM', async () => {
      if (this.debug) console.log('BlackBoard - Received SIGTERM. Saving store to PersistentState.json...');
      await this.saveStore();
      await this.mongoClient?.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      if (this.debug) console.log('BlackBoard - Process interrupted. Saving store to PersistentState.json...');
      await this.saveStore();
      await this.mongoClient?.close();
      process.exit(0);
    });
  }
}

// Export a single instance of BlackBoard
const BB = new BlackBoard();
export default BB;
