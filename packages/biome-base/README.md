# biome-base

This package provides the base configuration and shared settings for the Biome ecosystem within the Node.js library monorepo.

## Overview

- **Purpose:** Centralizes common Biome configuration and base settings for all packages in the monorepo.
- **Location:** `packages/biome-base`
- **Consumers:** All packages that require shared Biome settings or base configuration.

## Files

- `base.json`: Contains base configuration values for Biome.
- `biome.json`: Main Biome configuration file, typically extended by other packages.
- `package.json`: Declares the package for dependency management.

## Usage

Other packages in the monorepo should reference or extend the configuration files in `biome-base` to ensure consistent linting, formatting, and code standards.

## How to Extend

1. Reference `biome-base/biome.json` in your package's Biome configuration.
2. Import shared settings from `base.json` as needed.
3. Add package-specific overrides in your own configuration files.

## Contributing

- Update `base.json` and `biome.json` to change shared settings.
- Ensure changes are compatible with all dependent packages.
- Follow monorepo contribution guidelines.

## License

See the root repository for license information.
