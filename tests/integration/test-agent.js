import { spawn } from "child_process";

function sendRequest(proc, obj) {
  proc.stdin.write(JSON.stringify(obj) + "\n");
}

async function run() {
  return new Promise((resolve) => {
    const server = spawn("node", ["dist/index.js"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let out = "";
    let err = "";

    server.stdout.on("data", (d) => (out += d.toString()));
    server.stderr.on("data", (d) => (err += d.toString()));

    // Give server a moment to boot
    setTimeout(() => {
      // List tools (optional sanity)
      sendRequest(server, {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      });
      // Call cursor_me to verify API connectivity
      sendRequest(server, {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "cursor_me", arguments: {} },
      });
      // Launch a simple agent on our repo
      sendRequest(server, {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "cursor_launch_agent",
          arguments: {
            prompt:
              "Add a STATUS.md with a short status section and today’s timestamp.",
            repository: "https://github.com/kadash06/cursor-async-agent",
            ref: "main",
          },
        },
      });
    }, 1000);

    // Stop after a few seconds
    setTimeout(() => {
      try {
        server.kill();
      } catch {}
      console.log("\n=== STDERR ===\n" + err.trim());
      console.log("\n=== STDOUT ===\n" + out.trim());
      resolve({ out, err });
    }, 8000);
  });
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
