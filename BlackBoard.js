// Persistant Json BlackBoard Class (Acts like INI File Wrapper from back in the day)
// Can be used with Mongo. 

// ES6 NodeJS Module
import fs from 'fs/promises';
import path from 'path';
import { MongoClient } from 'mongodb';

// Define the path to the persistent JSON file for caching
const filePath = path.resolve('PersistentState.json');

// Initialize an in-memory store
let store = {};

// MongoDB client and collection references
let mongoClient = null;
let mongoCollection = null;

// BB object with debug property and methods for accessing and modifying the store
const BB = {
  // Enable or disable debug mode
  debug: false,

  // Initialize the in-memory store
  async init() {
    await loadStore();
  },

  // Connect to MongoDB
  async useMongo(serverDetails) {
    try {
      mongoClient = new MongoClient(serverDetails.url);
      await mongoClient.connect();
      const db = mongoClient.db(serverDetails.dbName);
      mongoCollection = db.collection(serverDetails.collectionName);
      if (this.debug) console.log('BB.useMongo - Connected to MongoDB');
    } catch (error) {
      console.error('Error connecting to MongoDB:', error);
    }
  },

  // Get a value from the store or MongoDB
  async get(section, key) {
    // Check in-memory cache first
    if (store[section]?.[key] !== undefined) {
      if (this.debug) console.log(`BB.get (cache) - Section: ${section}, Key: ${key}`);
      return store[section][key];
    }
    // Fallback to MongoDB if not in cache
    if (mongoCollection) {
      const result = await mongoCollection.findOne({ section, key });
      if (result) {
        store[section] = store[section] || {};
        store[section][key] = result.value;
        if (this.debug) console.log(`BB.get (Mongo) - Section: ${section}, Key: ${key}`);
        return result.value;
      }
    }
    return undefined;
  },

  // Set a value in the store or MongoDB, with optional cache control
  async set(section, key, value, canCache = true) {
    if (canCache) {
      // Update in-memory cache
      if (!store[section]) {
        store[section] = {};
      }
      store[section][key] = value;
    }
    // Always update MongoDB if connected
    if (mongoCollection) {
      await mongoCollection.updateOne(
        { section, key },
        { $set: { value } },
        { upsert: true }
      );
      if (this.debug) console.log(`BB.set - Section: ${section}, Key: ${key}, Value: ${value}, canCache: ${canCache}`);
    }
  },

  // Remove a key from a section in both the cache and MongoDB
  async removeKey(section, key) {
    if (store[section]) {
      delete store[section][key];
      if (Object.keys(store[section]).length === 0) {
        delete store[section];
      }
    }
    if (mongoCollection) {
      await mongoCollection.deleteOne({ section, key });
      if (this.debug) console.log(`BB.removeKey - Section: ${section}, Key: ${key}`);
    }
  },

  // Remove an entire section in both the cache and MongoDB
  async removeSection(section) {
    delete store[section];
    if (mongoCollection) {
      await mongoCollection.deleteMany({ section });
      if (this.debug) console.log(`BB.removeSection - Section: ${section}`);
    }
  }
};

// Load data from JSON file on startup
async function loadStore() {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    store = JSON.parse(data);
    if (BB.debug) console.log('BB.init - Store loaded from PersistentState.json');
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('PersistentState.json not found. Creating new file.');
      store = {};
      await saveStore();
    } else {
      console.error('Error loading PersistentState.json:', error);
    }
  }
}

// Save data to JSON file
async function saveStore() {
  try {
    await fs.writeFile(filePath, JSON.stringify(store, null, 2));
    if (BB.debug) console.log('BB.saveStore - Store saved to PersistentState.json');
  } catch (error) {
    console.error('Error saving PersistentState.json:', error);
  }
}

// Save the store to file on SIGTERM
process.on('SIGTERM', async () => {
  if (BB.debug) console.log('BB - Received SIGTERM. Saving store to PersistentState.json...');
  await saveStore();
  process.exit(0);
});

// Optional: Auto-save on process exit (e.g., SIGINT for CTRL+C)
process.on('SIGINT', async () => {
  if (BB.debug) console.log('BB - Process interrupted. Saving store to PersistentState.json...');
  await saveStore();
  process.exit(0);
});

// Initialize BB by loading the store
await BB.init();

// Export BB as the single export
export default BB;
