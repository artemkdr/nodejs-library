# Node.js Library Monorepo

This repository contains a unified set of TypeScript-based Node.js packages for use across multiple projects. All packages are published to the GitHub Package Registry.

## Technologies
- **Package Manager:** Bun
- **Language:** TypeScript (strict mode)

## Packages
- `packages/biome-base`: Base utilities and shared configuration
- `packages/core`: Core library functionality
- `packages/langchainjs-patches`: LangChain community patches and extensions
- `packages/tsconfig-base-bun`: Shared TypeScript config for Bun

## Development Standards
- **Strict TypeScript:** All code uses strict settings (see `tsconfig.json`)
- **Explicit Types:** No `any` type, always use explicit types
- **Immutable Patterns:** Prefer `readonly` and `const` assertions
- **Error Handling:** Use Result/Either patterns or proper error types
- **Dependency Injection:** Use interfaces for loose coupling
- **Single Responsibility:** Each module has one reason to change

## Testing
- Minimum 90% code coverage for new code
- Test all public methods and error conditions
- Mock external dependencies

## Publishing
Use Bun to publish packages:
```sh
bun publish
```

## Contributing
1. Fork the repo and create a feature branch
2. Build a plan before implementing changes (see `.github/copilot-instructions.md`)
3. Add/modify code and cover with unit tests
4. Open a pull request with a summary of changes

## License
MIT
