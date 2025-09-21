# @artemkdr/core

Core TypeScript library. 
Provides foundational services, error handling, logging, and utility functions for Node.js projects.

## Features
- **Config Service**: Centralized configuration management (`src/config/`)
- **Error Handling**: Typed error classes and error handler utilities (`src/errors/`)
- **Logger**: Structured logging and sensitive data masking (`src/logger/`)
- **Task Pool**: Utility for managing concurrent tasks (`src/utils/task-pool.ts`)

## Directory Structure
```
src/
  config/         # Configuration service and types
  errors/         # Error classes, error handler, and types
  logger/         # Logger, sensitive data masker, and types
  utils/          # Utility functions (e.g., task pool)
  index.ts        # Entry point
```

## Usage
Import the core modules in your TypeScript project:
```typescript
import { ConfigService } from '@artemkdr/core/config';
import { ApiError, ErrorHandler } from '@artemkdr/core/errors';
import { Logger } from '@artemkdr/core/logger';
import { TaskPool } from '@artemkdr/core/utils/task-pool';
```

## Development Standards
- **Strict TypeScript**: All code uses strict settings
- **Explicit Types**: No `any` type
- **Immutable Patterns**: Prefer `readonly` and `const`
- **Error Handling**: Use typed errors and error handler
- **Dependency Injection**: Use interfaces for loose coupling

## Testing
- Minimum 90% code coverage
- All public methods and error conditions are tested
- External dependencies are mocked

## License
MIT
