# Contributing to Cursor Async Agent MCP Server

Thank you for your interest in contributing to the Cursor Async Agent MCP Server! This guide will help you get started with development.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** with ES modules support
- **npm** (comes with Node.js)
- **Git** for version control
- A **Cursor API key** (get from [Cursor Dashboard](https://cursor.com/dashboard))
- A **GitHub token** with repository access
- **XAI API key** (optional, for enhanced AI capabilities)

## Getting Started

### 1. Fork and Clone the Repository

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/cursor-async-agent.git
cd cursor-async-agent
```

### 2. Install Dependencies

```bash
# Install all project dependencies
npm install
```

This will install both production dependencies and development dependencies:
- **Production**: `@hono/node-server`, `@modelcontextprotocol/sdk`, `axios`, `dotenv`, `hono`, `zod`
- **Development**: `@types/node`, `tsx`, `typescript`

### 3. Set Up Environment Configuration

Create a `.env` file with your API keys and configuration:

```bash
# Copy the example environment file (if it exists) or create a new one
touch .env
```

Add the following required environment variables to your `.env` file:

```env
# Cursor API Configuration (Required)
CURSOR_API_KEY=key_your_cursor_api_key
CURSOR_EMAIL=your_email@example.com
CURSOR_MODEL=grok-code-fast-1

# GitHub Configuration (Required)
GITHUB_TOKEN=github_pat_your_token
GITHUB_USERNAME=your_github_username

# XAI API Configuration (Optional)
XAI_API_KEY=xai-your_api_key
XAI_MODEL_REASONING=grok-4
XAI_MODEL_CODE=grok-code-fast-1

# Webhook Configuration (Optional)
WEBHOOK_PORT=3000
ZROK_SHARE_URL=https://your-zrok-share-url.ngrok.io
```

### 4. Build the Project

```bash
# Compile TypeScript to JavaScript
npm run build
```

This will:
- Compile TypeScript files from `src/` to `dist/`
- Generate type declarations (`.d.ts` files)
- Create source maps for debugging

### 5. Run Tests

```bash
# Run the smoke test to verify everything works
npm test
```

The smoke test will:
- Start the MCP server
- Verify that all expected tools are available (`cursor_me`, `cursor_list_agents`, `cursor_launch_agent`)
- Test basic functionality

## Development Workflow

### Running in Development Mode

```bash
# Run with auto-reload on file changes
npm run dev
```

This uses `tsx --watch` to automatically restart the server when you modify TypeScript files in the `src/` directory.

### Running in Production Mode

```bash
# Build and start the server
npm run build
npm start
```

### Code Structure

The project follows this structure:

```
src/
├── config.ts          # Environment variable validation using Zod
├── cursor-client.ts    # HTTP client for Cursor API calls
├── webhook-server.ts   # Hono-based webhook server with JSONL logging
├── mcp-server.ts      # MCP server implementation with tools and resources
└── index.ts           # Main entry point that starts all services
```

### TypeScript Configuration

The project uses modern TypeScript settings:
- **Target**: ES2022
- **Module**: ESNext with Node.js resolution
- **Strict mode**: Enabled
- **Output**: `dist/` directory with declarations and source maps

## Testing

### Smoke Test

The basic smoke test (`test-smoke.js`) verifies that:
- The MCP server starts successfully
- All expected tools are exposed
- The server responds to MCP protocol requests

### Agent Test

The integration test (`test-agent.js`) performs a more comprehensive test:
- Tests API connectivity with `cursor_me`
- Launches a real agent on the repository
- Verifies the complete workflow

### Running Type Checking

```bash
# Check TypeScript types without building
npx tsc --noEmit
```

## Development Guidelines

### Code Style

- Use **TypeScript** for all new code
- Follow **ES modules** syntax (`import`/`export`)
- Use **async/await** for asynchronous operations
- Implement proper **error handling** with try/catch blocks
- Add **type annotations** where TypeScript inference isn't sufficient

### Environment Variables

- All configuration should use environment variables
- Validate environment variables using **Zod schemas** in `config.ts`
- Provide helpful error messages for missing or invalid configuration
- Never commit API keys or sensitive data

### Error Handling

- Use comprehensive error handling for all API calls
- Provide meaningful error messages to users
- Log errors appropriately without exposing sensitive information
- Handle network timeouts and connection issues gracefully

### Security

- Validate all webhook signatures when configured
- Never log sensitive data (API keys, tokens, etc.)
- Use secure defaults for all configuration options
- Validate all inputs from external sources

## Webhook Development

### Setting Up Zrok for Webhook Testing

1. Install [zrok](https://zrok.io/) and create an account:
   ```bash
   # Follow zrok installation instructions for your platform
   zrok enable
   ```

2. Create a public tunnel:
   ```bash
   zrok share public localhost:3000
   ```

3. Update your `.env` with the generated URL:
   ```env
   ZROK_SHARE_URL=https://your-generated-url.share.zrok.io
   ```

### Webhook Payload Testing

Webhooks are logged to `logs/webhooks-YYYY-MM-DD.jsonl` for debugging. Example payload:

```json
{
  "received_at": "2024-01-15T10:30:00.000Z",
  "event": "statusChange",
  "timestamp": "2024-01-15T10:30:00Z",
  "id": "bc_abc123",
  "status": "FINISHED",
  "source": {
    "repository": "https://github.com/myorg/myproject",
    "ref": "main"
  },
  "target": {
    "url": "https://cursor.com/agents?id=bc_abc123",
    "branchName": "cursor/add-feature-1234",
    "prUrl": "https://github.com/myorg/myproject/pull/1234"
  },
  "summary": "Added comprehensive error handling and logging"
}
```

## MCP Configuration

The server is configured for MCP clients in `mcp.json`:

```json
{
  "mcpServers": {
    "cursor-async-agent": {
      "command": "node",
      "args": ["dist/index.js"]
    }
  }
}
```

## Submitting Changes

### Before Submitting a Pull Request

1. **Test your changes**:
   ```bash
   npm run build
   npm test
   ```

2. **Check TypeScript types**:
   ```bash
   npx tsc --noEmit
   ```

3. **Test with a real MCP client** if possible

4. **Update documentation** if you've added new features or changed APIs

### Pull Request Guidelines

- Create a clear, descriptive title
- Provide a detailed description of your changes
- Include any breaking changes in the description
- Reference any related issues
- Ensure all tests pass
- Update documentation as needed

### Commit Message Format

Use clear, descriptive commit messages:

```
feat: add support for custom webhook headers
fix: handle network timeouts in cursor client
docs: update API documentation for new parameters
refactor: simplify error handling in webhook server
```

## Getting Help

- Check the [README.md](README.md) for basic usage information
- Review existing issues on GitHub
- Create a new issue if you encounter bugs or have feature requests
- Join discussions in the repository's discussion section

## License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.