@echo off
REM Build and Publish Script for GitHub Packages (Windows)
setlocal enabledelayedexpansion

echo 🚀 Starting build and publish process...

REM Ensure we're authenticated
if "%NPM_TOKEN%"=="" (
    echo ❌ NPM_TOKEN environment variable is required
    exit /b 1
)

REM Install dependencies
echo 📦 Installing dependencies...
bun install
if !errorlevel! neq 0 exit /b !errorlevel!

REM Run tests
echo 🧪 Running tests...
bun run test
if !errorlevel! neq 0 exit /b !errorlevel!

REM Run linting
echo 🔍 Running linting...
bun run lint
if !errorlevel! neq 0 exit /b !errorlevel!

REM Build all packages
echo 🔨 Building packages...
bun run build
if !errorlevel! neq 0 exit /b !errorlevel!

REM Publish packages
echo 📤 Publishing to npmjs packages...

echo 📦 Publishing @artemkdr/biome-base...
cd packages/biome-base
bun publish
cd ../..
if !errorlevel! neq 0 exit /b !errorlevel!

echo 📦 Publishing @artemkdr/core...
cd packages/core
bun publish
cd ../..
if !errorlevel! neq 0 exit /b !errorlevel!

echo 📦 Publishing @artemkdr/langchainjs-patches...
cd packages/langchainjs-patches
bun publish
cd ../..
if !errorlevel! neq 0 exit /b !errorlevel!

echo 📦 Publishing @artemkdr/tsconfig-base-bun...
cd packages/tsconfig-base-bun
bun publish
cd ../..
if !errorlevel! neq 0 exit /b !errorlevel!

echo ✅ All packages published successfully!