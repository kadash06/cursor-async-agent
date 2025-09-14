import { spawn } from "child_process";

// Simple smoke test to verify MCP server starts and exposes tools
async function testMcpServer() {
  return new Promise((resolve, reject) => {
    const serverProcess = spawn("node", ["dist/index.js"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let output = "";
    let errorOutput = "";

    serverProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    serverProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    // Send tools/list request after a short delay
    setTimeout(() => {
      const listToolsRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      };

      serverProcess.stdin.write(JSON.stringify(listToolsRequest) + "\n");
    }, 1000);

    // Wait for response or timeout
    setTimeout(() => {
      serverProcess.kill();

      console.log("Server stderr:", errorOutput);

      if (
        output.includes("cursor_me") &&
        output.includes("cursor_list_agents") &&
        output.includes("cursor_launch_agent")
      ) {
        console.log("✅ Smoke test PASSED: All expected tools found");
        resolve(true);
      } else {
        console.log("❌ Smoke test FAILED: Expected tools not found");
        console.log("Output:", output);
        reject(new Error("Tools not found"));
      }
    }, 3000);

    serverProcess.on("error", (error) => {
      console.error("Process error:", error);
      reject(error);
    });
  });
}

testMcpServer().catch(console.error);
