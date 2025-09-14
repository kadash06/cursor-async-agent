import { spawn } from "child_process";

function sendRequest(proc, obj) {
  proc.stdin.write(JSON.stringify(obj) + "\n");
}

async function checkAgents() {
  return new Promise((resolve) => {
    const server = spawn("node", ["dist/index.js"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let out = "";
    server.stdout.on("data", (d) => (out += d.toString()));

    setTimeout(() => {
      sendRequest(server, {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "cursor_list_agents" },
      });
    }, 500);

    setTimeout(() => {
      try {
        server.kill();
      } catch {}
      resolve(out);
    }, 3000);
  });
}

checkAgents().then((result) => {
  const lines = result.split("\n");
  lines.forEach((line) => {
    if (line.includes("cursor/") || line.includes("branchName")) {
      console.log(line.trim());
    }
  });
});
