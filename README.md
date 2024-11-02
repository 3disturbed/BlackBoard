# BlackBoard
Persistant Black Board DataStore using JSON, with Mongo support, Available in Native and TS


## Examples
Basic Usage Without MongoDB
```
import BB from './BlackBoard';

// Set and retrieve a value without using MongoDB
await BB.set('app', 'version', '1.0.0');
console.log(await BB.get('app', 'version')); // Outputs: '1.0.0'

// Remove a key
await BB.removeKey('app', 'version');

// Remove an entire section
await BB.removeSection('app');

// Setup graceful shutdown
BB.setupShutdown();
```

Usage With MongoDB and LRU Caching

```
import BB from './BlackBoard';

// Enable MongoDB and LRU cache
await BB.useMongo({
  url: 'mongodb://localhost:27017',
  dbName: 'configDB',
  collectionName: 'config'
});

// Use `BlackBoard` with MongoDB and cache
await BB.set('database', 'host', 'localhost');
console.log(await BB.get('database', 'host')); // Outputs: 'localhost'

// Remove a key and section with MongoDB persistence
await BB.removeKey('database', 'host');
await BB.removeSection('database');

// Setup graceful shutdown
BB.setupShutdown();
```

# BlackBoard API Documentation

BlackBoard is a flexible, in-memory configuration management module with optional MongoDB persistence and LRU caching for optimized performance. This API documentation outlines how to set up and use BlackBoard.

## Initialization 

To use BlackBoard, import the module and initialize it as shown in the Examples section. MongoDB persistence and LRU caching are optional and configured through useMongo().

Methods
## useMongo(serverDetails, maxCacheItems, ttl)
Initializes MongoDB persistence and LRU caching for BlackBoard.

### Parameters:

serverDetails (object): MongoDB connection details.

url (string): MongoDB connection URL.

dbName (string): Database name.

collectionName (string): Collection name to store configuration data.

maxCacheItems (number, optional): Maximum number of items in the LRU cache (default is 500).
ttl (number, optional): Time-to-live for cached items in milliseconds (default is 600,000 ms or 10 minutes).

Returns: Promise<void>

```
await BB.useMongo({
  url: 'mongodb://localhost:27017',
  dbName: 'configDB',
  collectionName: 'config'
}, 500, 600000);
```

## get(section, key)
Retrieves the value associated with the specified section and key.

### Parameters:

section (string): The section in which the key resides.

key (string): The key whose value is to be retrieved.

Returns: Promise<any> - The value associated with the key, or undefined if not found.

```
const version = await BB.get('app', 'version');
```

## set(section, key, value, canCache)

Sets the value for the specified section and key. Optionally caches the value in memory.

### Parameters:

section (string): The section in which the key will be set.

key (string): The key to be set.

value (any): The value to assign to the key.

canCache (boolean, optional): If true, caches the value in memory (default is true).

Returns: Promise<void>

```
await BB.set('app', 'version', '1.0.0', true);
```
## removeKey(section, key)
Removes a specific key from the specified section in both memory and MongoDB (if enabled).

### Parameters:

section (string): The section from which to remove the key.

key (string): The key to be removed.

Returns: Promise<void>

```
await BB.removeKey('app', 'version');
```
## removeSection(section)
Removes an entire section from memory and MongoDB (if enabled).

### Parameters:

section (string): The section to be removed.

Returns: Promise<void>

```
await BB.removeSection('app');
```
## setupShutdown()
Sets up graceful shutdown handling. On SIGTERM or SIGINT, BlackBoard saves in-memory data to a JSON file (PersistentState.json) and closes MongoDB connections, if applicable.

### Parameters: None

Returns: Promise<void>

```
BB.setupShutdown();
```
## Additional Notes
Caching Behavior: Caching is enabled only if useMongo is called. Cached items are stored in an LRU cache with an optional TTL, improving access speed for frequently accessed data.
Persistence: Data is persisted to PersistentState.json by default. When MongoDB is enabled via useMongo, data is also persisted to MongoDB.
Debugging: Set BB.debug = true to log actions and debug messages to the console.






