# core

This package provides core utilities, types, and error handling for the Node.js library monorepo. It is designed for strict TypeScript environments and serves as the foundation for other packages in the ecosystem.

## Overview

- **Purpose:** Centralizes essential utilities, type definitions, and error handling logic.
- **Location:** `packages/core`
- **Consumers:** All packages requiring core functionality, types, or error management.

## File Structure

- `biome.json`: Biome configuration for linting and formatting.
- `package.json`: Package manifest and dependencies.
- `tsconfig.json`: TypeScript configuration (strict mode enforced).
- `src/`
  - `index.ts`: Entry point for core exports.
  - `types/`
    - `config.ts`: Configuration type definitions.
    - `errors.ts`: Error type definitions.
    - `index.ts`: Aggregates type exports.
    - `logger.ts`: Logger type definitions.
  - `utils/`
    - `error-handler.ts`: Error handling utility.
    - `error-handler.test.ts`: Unit tests for error handling.
    - `logger.ts`: Logger utility.
    - `logger.test.ts`: Unit tests for logger.
    - `sensitive-data-masker.ts`: Utility for masking sensitive data.
    - `sensitive-data-masker.test.ts`: Unit tests for data masker.
    - `task-pool.ts`: Task pool utility for concurrency.
    - `task-pool.test.ts`: Unit tests for task pool.
    - `index.ts`: Aggregates utility exports.

## Usage

Import utilities and types from `@artemkdr/core` to ensure consistent error handling, logging, and configuration management across packages.

## Testing

- All utilities are covered by unit tests in the `utils/` directory.
- Strict TypeScript rules enforced for reliability and maintainability.

## Contributing

- Add new utilities or types in the appropriate subdirectory.
- Ensure all new code is covered by unit tests (minimum 90% coverage).
- Follow monorepo and TypeScript coding standards.

## License

See the root repository for license information.
