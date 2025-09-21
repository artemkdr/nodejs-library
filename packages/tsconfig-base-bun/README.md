# tsconfig-base-bun

This package provides the base TypeScript configuration for Bun-based projects in the Node.js library monorepo.

## Overview

- **Purpose:** Centralizes TypeScript settings optimized for Bun, ensuring consistent and strict type safety across all Bun projects.
- **Location:** `packages/tsconfig-base-bun`
- **Consumers:** All packages targeting Bun as their runtime and requiring shared TypeScript configuration.

## File Structure

- `base.json`: Contains base TypeScript configuration values for Bun projects.
- `biome.json`: Biome configuration for linting and formatting.
- `package.json`: Declares the package for dependency management.

## Usage

Extend or reference the configuration files in `tsconfig-base-bun` from your package's TypeScript configuration to enforce strict type safety and Bun compatibility.

### Example

In your package's `tsconfig.json`:

```json
{
  "extends": "../tsconfig-base-bun/base.json",
  // ...your overrides
}
```

## Contributing

- Update `base.json` to change shared TypeScript settings for Bun projects.
- Ensure changes are compatible with all dependent packages.
- Follow monorepo contribution guidelines.

## License

See the root repository for license information.
