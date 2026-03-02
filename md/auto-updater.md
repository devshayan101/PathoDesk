# 1. Bump version in package.json
# 2. Build and publish to GitHub Releases:
set GH_TOKEN=your_github_token
npx electron-builder --publish always
