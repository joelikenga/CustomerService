# How to Publish `ai-customer-service`

This guide explains how to release new versions of the package to npm.

## Prerequisites

- You need an npm account. Sign up at [npmjs.com](https://www.npmjs.com/).
- You must be logged in locally.

## Initial Setup

1. **Login to npm**
   ```bash
   npm login
   ```
   Follow the interactive prompts to authenticate.

## Publishing a New Version

1. **Commit your changes**
   Ensure your working directory is clean and all changes are committed to git.

2. **Run tests/build verify (Optional but recommended)**
   ```bash
   npm run build
   ```

3. **Bump the version**
   Use `npm version` to update `package.json` and create a git tag automatically.
   
   - For bug fixes (0.1.0 -> 0.1.1):
     ```bash
     npm version patch
     ```
   - For new features (0.1.0 -> 0.2.0):
     ```bash
     npm version minor
     ```
   - For breaking changes (0.1.0 -> 1.0.0):
     ```bash
     npm version major
     ```

4. **Publish to npm**
   ```bash
   npm publish
   ```
   If this is the first time you are publishing a scoped package (e.g. `@yourusername/package`), you might need to add `--access public`:
   ```bash
   npm publish --access public
   ```

## Installing in Another Project

### From NPM (after publishing)
```bash
npm install ai-customer-service
```

### Locally (for testing without publishing)
You can use `npm link` or install from a local folder.
```bash
# In ai-customer-service folder
npm link

# In your other app folder
npm link ai-customer-service
```
