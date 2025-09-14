import { createWriteStream, existsSync, mkdirSync } from "fs";
import { join } from "path";

function getLogFilePath(): string {
  const logsDir = join(process.cwd(), "logs");
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true });
  }
  const day = new Date().toISOString().split("T")[0];
  return join(logsDir, `app-${day}.log`);
}

const stream = createWriteStream(getLogFilePath(), { flags: "a" });

function format(level: string, message: string): string {
  const ts = new Date().toISOString();
  return `${ts} ${level.toUpperCase()} ${message}`;
}

export const logger = {
  info(message: string) {
    const line = format("info", message);
    console.log(line);
    stream.write(line + "\n");
  },
  warn(message: string) {
    const line = format("warn", message);
    console.warn(line);
    stream.write(line + "\n");
  },
  error(message: string) {
    const line = format("error", message);
    console.error(line);
    stream.write(line + "\n");
  },
  debug(message: string) {
    const line = format("debug", message);
    // Keep debug off stdout by default; write only to file
    stream.write(line + "\n");
  },
};
