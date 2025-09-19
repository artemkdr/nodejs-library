#!/usr/bin/env bash

# Build and Publish Script for GitHub Packages
set -e

echo "🚀 Starting build and publish process..."

# Ensure we're authenticated
if [[ -z "${GITHUB_TOKEN}" ]]; then
    echo "❌ GITHUB_TOKEN environment variable is required"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Run tests
echo "🧪 Running tests..."
bun run test

# Run linting
echo "🔍 Running linting..."
bun run lint

# Build all packages
echo "🔨 Building packages..."
bun run build

# Publish packages
echo "📤 Publishing to GitHub Packages..."
bun run --filter='*' publish

echo "✅ All packages published successfully!"