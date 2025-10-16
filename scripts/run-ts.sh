#!/bin/bash

# Wrapper script to run TypeScript files with tsx
# This fixes permission issues with system temp directory

# Create local tmp directory
mkdir -p ./tmp/tsx

# Set TMPDIR to local tmp directory
export TMPDIR="$(pwd)/tmp/tsx"

# Run tsx with the provided script
npx tsx "$@"
