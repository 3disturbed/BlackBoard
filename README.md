# BlackBoard
Persistant Black Board DataStore

```
import BB from './BlackBoard.js';

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
