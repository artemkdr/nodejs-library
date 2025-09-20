# Node.js Libraries Monorepo

A collection of reusable Node.js libraries optimized for Bun and published to GitHub Packages.

## 🏗️ Structure

```
nodejs-library/
├── packages/
│   ├── core/                    # Core utilities and shared functionality
│   ├── langchainjs-patches/     # Patches and enhancements for LangChain.js
│   └── tsconfig-base-bun/           # Shared TypeScript configuration
├── scripts/                     # Build and publish scripts
└── package.json                 # Root workspace configuration
```

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh/) >= 1.0.0
- Node.js >= 18.0.0
- GitHub account with package publishing access

### Installation

```bash
# Clone the repository
git clone https://github.com/artemkdr/nodejs-library.git
cd nodejs-library

# Install dependencies
bun install
```

### Development

```bash
# Build all packages
bun run build

# Run tests for all packages
bun run test

# Run linting
bun run lint

# Clean build artifacts
bun run clean

# Watch mode for development
bun run dev
```

## 📦 Packages

### artemkdr/core
Core utilities including:
- Logger with Winston integration
- Error handling utilities
- Sensitive data masking
- Task pool management

### artemkdr/langchainjs-patches
Patches and enhancements for LangChain.js:
- Enhanced PGVector implementation
- Performance optimizations

### artemkdr/tsconfig-base
Shared TypeScript configuration for consistent builds across packages.

## 🔧 Configuration

### GitHub Packages Setup

1. Create a GitHub Personal Access Token with `write:packages` permission
2. Set the environment variable:
   ```bash
   export GITHUB_TOKEN=your_token_here
   ```
3. Update package names in all `package.json` files to match your GitHub username

### Publishing

```bash
# Publish all packages (automated)
bun run publish:all

# Or use the scripts
./scripts/publish.sh    # Linux/macOS
scripts\publish.bat     # Windows
```

### Version Management

```bash
# Bump patch version for all packages
bun run version:patch

# Bump minor version for all packages
bun run version:minor

# Bump major version for all packages
bun run version:major
```

## 🛠️ Adding New Packages

1. Create a new directory in `packages/`
2. Add a `package.json` following the existing pattern
3. Create `src/` directory with your code
4. Add TypeScript configuration extending `artemkdr/tsconfig-base-bun`
5. Update root `package.json` workspaces if needed

## 🧪 Testing

Each package uses Bun's built-in test runner:

```bash
# Run tests in a specific package
cd packages/core
bun test

# Run tests with coverage
bun test --coverage
```

## 📝 Best Practices

- Use TypeScript for all code
- Follow the established project structure
- Add tests for new functionality
- Use semantic versioning
- Keep packages focused and small
- Document public APIs

## 🔗 Related

- [Bun Documentation](https://bun.sh/docs)
- [GitHub Packages Documentation](https://docs.github.com/packages)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 📄 License

MIT