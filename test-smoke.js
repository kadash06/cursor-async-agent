import { spawn } from "child_process";

// Simple smoke test to verify MCP server starts and exposes tools
async function testMcpServer() {
  return new Promise((resolve, reject) => {
    const serverProcess = spawn("node", ["dist/index.js"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let output = "";
    let errorOutput = "";
    let serverExited = false;

    serverProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    serverProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    serverProcess.on("exit", (code) => {
      serverExited = true;
      if (code !== 0) {
        console.log("Server stderr:", errorOutput.trim());
        console.log("❌ Smoke test FAILED: Server exited with code", code);
        reject(new Error(`Server exited with code ${code}`));
      }
    });

    // Send tools/list request after a short delay
    setTimeout(() => {
      if (!serverExited) {
        const listToolsRequest = {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {},
        };

        try {
          serverProcess.stdin.write(JSON.stringify(listToolsRequest) + "\n");
        } catch (error) {
          console.log("❌ Smoke test FAILED: Could not send request to server");
          reject(error);
        }
      }
    }, 1000);

    // Wait for response or timeout
    setTimeout(() => {
      if (!serverExited) {
        serverProcess.kill();
      }

      console.log("Server stderr:", errorOutput.trim());

      if (
        output.includes("cursor_me") &&
        output.includes("cursor_list_agents") &&
        output.includes("cursor_launch_agent")
      ) {
        console.log("✅ Smoke test PASSED: All expected tools found");
        resolve(true);
      } else {
        console.log("❌ Smoke test FAILED: Expected tools not found");
        console.log("Output:", output.trim());
        reject(new Error("Expected tools not found in server output"));
      }
    }, 3000);

    serverProcess.on("error", (error) => {
      console.error("Process error:", error);
      reject(error);
    });
  });
}

testMcpServer().catch((error) => {
  console.error("Test failed:", error.message);
  process.exit(1);
});
