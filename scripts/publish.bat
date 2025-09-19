@echo off
REM Build and Publish Script for GitHub Packages (Windows)
setlocal enabledelayedexpansion

echo 🚀 Starting build and publish process...

REM Ensure we're authenticated
if "%GITHUB_TOKEN%"=="" (
    echo ❌ GITHUB_TOKEN environment variable is required
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
echo 📤 Publishing to GitHub Packages...
bun run --filter=* publish
if !errorlevel! neq 0 exit /b !errorlevel!

echo ✅ All packages published successfully!