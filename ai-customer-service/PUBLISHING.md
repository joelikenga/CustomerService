# How to Publish `@joelikenga/ai-customer-service`

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
   *Note: Since this is a scoped package (`@joelikenga/...`), you MUST use `--access public` for the first publish.*

## Installing in Another Project

### From NPM (after publishing)
```bash
npm install @joelikenga/ai-customer-service
```

### Locally (for testing without publishing)
You can use `npm link` or install from a local folder.
```bash
# In ai-customer-service folder
npm link

# In your other app folder
npm link @joelikenga/ai-customer-service
```

## Troubleshooting

### 403 Forbidden (2FA Error) / Bad Request ("otp" fails to match)
If you see an error about `Two-factor authentication` or `child "otp" fails`, it means you need to provide your 2FA code manually.

Run the publish command with your One-Time Password (from your authenticator app like Google Authenticator or Authy):

```bash
npm publish --access public --otp=123456
```
**IMPORTANT:** Replace `123456` with the actual 6-digit number currently shown in your authenticator app. Do NOT run the command with `YOUR_OTP_CODE` literally.
