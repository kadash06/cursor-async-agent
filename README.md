# Cursor Async Agent MCP Server

A Model Context Protocol (MCP) server that provides access to Cursor's Background Agents API, allowing you to programmatically launch and manage AI coding agents on GitHub repositories.

## Features

- **MCP Tools**: Access Cursor Background Agents API through standardized MCP tools
- **Webhook Support**: Receive real-time notifications about agent status changes
- **Resource Access**: Read Cursor API documentation directly within MCP clients
- **Environment Validation**: Robust configuration validation with helpful error messages

## Project Structure

```
cursor-async-agent/
├── bin/                    # Binary files (zrok.exe)
├── docs/
│   └── cursor-api/         # Moved from cursor-api-doc/
├── scripts/                # Helper scripts
│   ├── ci/                 # CI/CD scripts
│   └── maintenance/        # Maintenance utilities
├── src/                    # Source code
│   ├── clients/           # API clients
│   ├── config/            # Configuration
│   ├── mcp/               # MCP server implementation
│   └── webhook/           # Webhook server
├── tests/                  # Test files
│   ├── e2e/               # End-to-end tests
│   ├── integration/       # Integration tests
│   └── smoke/             # Smoke tests
├── logs/                   # Webhook logs (JSONL files)
├── dist/                   # Build output
├── .cursor/                # Cursor configuration
└── mcp.json               # MCP configuration
```

## Prerequisites

- Node.js 18+ with ES modules support
- Cursor API key (get from [Cursor Dashboard](https://cursor.com/dashboard))
- GitHub token with repository access
- XAI API key (optional, for enhanced AI capabilities)

## Installation

1. Clone this repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy environment configuration:

   ```bash
   cp .env.example .env
   ```

4. Fill in your API keys and configuration in `.env`

5. Build the project:

   ```bash
   npm run build
   ```

6. Run the smoke test to verify everything works:
   ```bash
   npm test
   ```

## Configuration

Required environment variables:

```env
# Cursor API Configuration
CURSOR_API_KEY=key_your_cursor_api_key
CURSOR_EMAIL=your_email@example.com
CURSOR_MODEL=grok-code-fast-1

# GitHub Configuration
GITHUB_TOKEN=github_pat_your_token
GITHUB_USERNAME=your_github_username

# XAI API Configuration (optional)
XAI_API_KEY=xai-your_api_key
XAI_MODEL_REASONING=grok-4
XAI_MODEL_CODE=grok-code-fast-1
```

Optional webhook configuration:

```env
# Webhook server (starts automatically if configured)
WEBHOOK_PORT=3000
ZROK_SHARE_URL=https://your-zrok-share-url.ngrok.io
```

## Usage

### Build and Run

```bash
# Build the project
npm run build

# Start the MCP server
npm start

# Or run in development mode with auto-reload
npm run dev
```

### MCP Tools Available

#### `cursor_me`

Get information about your API key and account.

#### `cursor_list_agents`

List your background agents with pagination support.

**Parameters:**

- `limit` (optional): Number of agents to return (default: 20)
- `cursor` (optional): Pagination cursor from previous response

#### `cursor_launch_agent`

Launch a new background agent to work on a repository.

**Parameters:**

- `prompt` (required): The instruction for the agent
- `repository` (required): GitHub repository URL
- `ref` (optional): Git branch/tag (default: "main")
- `webhook_url` (optional): URL for status notifications
- `webhook_secret` (optional): Secret for webhook signature verification
- `images` (optional): Array of images to include in the prompt

### Webhook Setup with Zrok

To receive webhook notifications from Cursor:

1. Install [zrok](https://zrok.io/) and create an account:

   ```bash
   # Download and install zrok
   # Then enable your account
   zrok enable
   ```

2. Run the setup script to create a tunnel:

   ```powershell
   .\scripts\setup-zrok.ps1
   ```

   Or manually:

   ```bash
   zrok share public localhost:3000
   ```

3. Copy the generated URL and set it in your `.env`:

   ```env
   ZROK_SHARE_URL=https://your-zrok-url.ngrok.io
   ```

4. Restart the MCP server to enable webhook functionality

5. Use the webhook URL when launching agents

### Example Usage

Launch an agent with webhook notifications:

```javascript
// In your MCP client, call the cursor_launch_agent tool
{
  "prompt": "Add comprehensive error handling and logging to the authentication module",
  "repository": "https://github.com/myorg/myproject",
  "ref": "develop",
  "webhook_url": "https://your-zrok-url.ngrok.io/webhook",
  "webhook_secret": "your-webhook-secret"
}
```

### Webhook Payload Format

Webhooks are logged to `logs/webhooks-YYYY-MM-DD.jsonl`:

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

## Development

```bash
# Run in development mode with auto-reload
npm run dev

# Build for production
npm run build

# Type checking
npx tsc --noEmit
```

## Architecture

- **`src/config.ts`**: Environment variable validation using Zod
- **`src/cursor-client.ts`**: HTTP client for Cursor API calls
- **`src/webhook-server.ts`**: Hono-based webhook server with JSONL logging
- **`src/mcp-server.ts`**: MCP server implementation with tools and resources
- **`src/index.ts`**: Main entry point that starts all services

## Error Handling

The server includes comprehensive error handling:

- Configuration validation on startup
- Network error handling for API calls
- Webhook signature verification
- Graceful shutdown on process signals

## Security

- API keys are validated on startup
- Webhook signatures are verified when configured
- No sensitive data is logged
- Environment variables are required and validated

## License

MIT
