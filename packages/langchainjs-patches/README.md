# langchainjs-patches

This package provides custom patches and extensions for LangChainJS, focusing on community vector store integrations and enhancements for the Node.js library monorepo.

## Overview

- **Purpose:** Supplies patched modules and custom implementations for LangChainJS, enabling advanced features and bug fixes not available in the upstream library.
- **Location:** `packages/langchainjs-patches`
- **Consumers:** Projects requiring modified or extended LangChainJS functionality, especially for vector store operations.

## File Structure

- `biome.json`: Biome configuration for linting and formatting.
- `package.json`: Package manifest and dependencies.
- `tsconfig.json`: TypeScript configuration.
- `src/`
  - `index.ts`: Entry point for patch exports.
  - `index.test.ts`: Unit tests for patch functionality.
  - `libs/langchain-community/vectorstores/`
    - `index.ts`: Aggregates vector store exports.
    - `pgvector.ts`: Custom or patched implementation for PGVector integration.

## Usage

Import patched modules from `@artemkdr/langchainjs-patches` to leverage enhanced or fixed LangChainJS features, especially for vector store operations.

## Testing

- All patches and custom modules are covered by unit tests in the `src/` directory.
- Ensure compatibility with LangChainJS updates and upstream changes.

## Contributing

- Add new patches or extensions in the appropriate subdirectory.
- Document changes and reasons for patching.
- Maintain test coverage for all new code.

## License

See the root repository for license information.
