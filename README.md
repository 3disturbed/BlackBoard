# BlackBoard
Persistant Black Board DataStore

```
import BB from './BlackBoard';

// Enable debug mode to log actions
BB.debug = true;

// Set some values
BB.set('database', 'host', 'localhost');
BB.set('database', 'port', 5432);
BB.set('auth', 'token', 'abc123');

// Get a value
console.log(BB.get('database', 'host')); // Logs the action and outputs: 'localhost'

// Remove a key
BB.removeKey('auth', 'token');

// Remove an entire section
BB.removeSection('database');

```

with Mongo 

```
import BB from './BlackBoard';

// Enable debug mode to log actions
BB.debug = true;

// MongoDB connection details
const serverDetails = {
  url: 'mongodb://localhost:27017',
  dbName: 'configDB',
  collectionName: 'config'
};

// Use MongoDB for storage
await BB.useMongo(serverDetails);

// Set some values with and without caching
await BB.set('database', 'host', 'localhost', true); // Cached in memory
await BB.set('database', 'port', 5432, false); // Direct write to MongoDB only

// Get a value (first tries cache, then MongoDB if not cached)
console.log(await BB.get('database', 'host')); // Outputs: 'localhost'

// Remove a key
await BB.removeKey('database', 'host');

// Remove an entire section
await BB.removeSection('database');
```
