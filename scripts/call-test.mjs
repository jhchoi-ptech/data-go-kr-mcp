#!/usr/bin/env node

/**
 * L3 도구 호출 테스트 - API 키 필요
 *
 * 서버를 STDIO로 spawn하고 실제 도구를 호출하여 E2E 검증:
 * 1. initialize → tools/list 로 도구 목록 확보
 * 2. 각 도구를 기본 파라미터로 호출
 * 3. 응답 형식 검증 (JSON, 에러 아님)
 *
 * 사용법:
 *   node scripts/call-test.mjs --server air-quality --lang typescript
 *   node scripts/call-test.mjs --server air-quality --lang python
 *
 * 환경변수:
 *   DATA_GO_KR_SERVICE_KEY - 공공데이터포털 서비스키 (필수)
 */

import { spawn } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync, readFileSync } from "fs";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// .env 로드
config({ path: join(ROOT, ".env") });

// --- Argument parsing ---
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const serverName = getArg("server");
const lang = getArg("lang") || "typescript";

if (!serverName) {
  console.error("사용법: node scripts/call-test.mjs --server <api-name> [--lang typescript|python]");
  process.exit(1);
}

if (!process.env.DATA_GO_KR_SERVICE_KEY) {
  console.error("❌ DATA_GO_KR_SERVICE_KEY 환경변수가 설정되지 않았습니다.");
  console.error("   .env 파일에 서비스키를 설정하세요.");
  process.exit(1);
}

// --- 서버별 기본 테스트 파라미터 ---
const DEFAULT_TOOL_PARAMS = {
  "air-quality": {
    get_realtime_air_quality: { stationName: "종로구" },
    get_air_quality_by_region: { sidoName: "서울" },
    get_air_quality_forecast: {},
  },
  "weather-forecast": {
    get_ultra_short_realtime: {
      base_date: getToday(),
      base_time: getRecentHour(),
      nx: 60,
      ny: 127,
    },
    get_ultra_short_forecast: {
      base_date: getToday(),
      base_time: getRecentHalfHour(),
      nx: 60,
      ny: 127,
    },
    get_village_forecast: {
      base_date: getToday(),
      base_time: getRecentVillageFcstTime(),
      nx: 60,
      ny: 127,
    },
  },
};

function getToday() {
  const now = new Date();
  // 최근 발표 데이터가 있을 시간을 보장하기 위해 3시간 전 날짜 사용
  const adjusted = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return adjusted.toISOString().slice(0, 10).replace(/-/g, "");
}

function getRecentHour() {
  const now = new Date();
  const adjusted = new Date(now.getTime() - 1 * 60 * 60 * 1000);
  const hour = adjusted.getHours().toString().padStart(2, "0");
  return `${hour}00`;
}

function getRecentHalfHour() {
  const now = new Date();
  const adjusted = new Date(now.getTime() - 1 * 60 * 60 * 1000);
  const hour = adjusted.getHours().toString().padStart(2, "0");
  return `${hour}30`;
}

function getRecentVillageFcstTime() {
  // 단기예보 발표시각: 0200, 0500, 0800, 1100, 1400, 1700, 2000, 2300
  const times = [2, 5, 8, 11, 14, 17, 20, 23];
  const now = new Date();
  const currentHour = now.getHours();
  // 가장 최근 발표시각 찾기 (현재 시각보다 2시간 이전)
  const safeHour = currentHour - 2;
  let fcstHour = times[0];
  for (const t of times) {
    if (t <= safeHour) fcstHour = t;
  }
  return fcstHour.toString().padStart(2, "0") + "00";
}

// --- JSON-RPC helpers ---
let messageId = 0;

function createRequest(method, params = {}) {
  return {
    jsonrpc: "2.0",
    id: ++messageId,
    method,
    params,
  };
}

function encodeMessage(obj) {
  const body = JSON.stringify(obj);
  return body + "\n";
}

/**
 * STDIO MCP 서버와 통신하여 도구를 호출합니다.
 */
function runCallTest(command, commandArgs, label) {
  return new Promise((resolve) => {
    const result = {
      label,
      success: false,
      toolResults: [],
      errors: [],
    };

    const proc = spawn(command, commandArgs, {
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    let phase = "initialize";
    let toolQueue = [];
    let currentTool = null;
    let timeoutId;

    function fail(message) {
      result.errors.push(message);
      cleanup();
    }

    function cleanup() {
      clearTimeout(timeoutId);
      try {
        proc.kill("SIGTERM");
      } catch {}
      resolve(result);
    }

    // 60초 타임아웃 (실제 API 호출이 느릴 수 있음)
    timeoutId = setTimeout(() => {
      fail("타임아웃: 60초 이내에 테스트를 완료하지 못했습니다.");
    }, 60000);

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.stdout.on("data", (data) => {
      stdout += data.toString();

      const lines = stdout.split("\n");
      stdout = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        let msg;
        try {
          msg = JSON.parse(trimmed);
        } catch {
          continue;
        }

        handleMessage(msg);
      }
    });

    function handleMessage(msg) {
      if (msg.error) {
        if (currentTool) {
          result.toolResults.push({
            name: currentTool,
            success: false,
            error: JSON.stringify(msg.error),
          });
          callNextTool();
        } else {
          fail(`JSON-RPC 에러: ${JSON.stringify(msg.error)}`);
        }
        return;
      }

      if (!msg.result) return;

      if (phase === "initialize") {
        // initialize 응답 → tools/list 요청
        phase = "tools_list";
        const req = createRequest("tools/list");
        proc.stdin.write(encodeMessage(req));
      } else if (phase === "tools_list") {
        // tools/list 응답 → 도구 호출 시작
        const tools = msg.result.tools || [];
        const defaultParams = DEFAULT_TOOL_PARAMS[serverName] || {};

        toolQueue = tools
          .filter((t) => defaultParams[t.name] !== undefined)
          .map((t) => ({
            name: t.name,
            params: defaultParams[t.name],
          }));

        if (toolQueue.length === 0) {
          // 기본 파라미터가 정의되지 않은 서버 → 첫 번째 도구를 빈 파라미터로 시도
          if (tools.length > 0) {
            toolQueue = [{ name: tools[0].name, params: {} }];
          }
        }

        phase = "calling";
        callNextTool();
      } else if (phase === "calling" && currentTool) {
        // 도구 호출 응답
        const content = msg.result.content || [];
        const textContent = content.find((c) => c.type === "text");
        const isError = msg.result.isError === true;

        let itemCount = null;
        if (textContent && !isError) {
          try {
            const parsed = JSON.parse(textContent.text);
            if (Array.isArray(parsed)) {
              itemCount = parsed.length;
            }
          } catch {
            // JSON 파싱 실패 — 텍스트 응답
          }
        }

        result.toolResults.push({
          name: currentTool,
          success: !isError,
          itemCount,
          error: isError ? (textContent?.text || "알 수 없는 에러") : null,
          preview: textContent ? textContent.text.substring(0, 100) : null,
        });

        callNextTool();
      }
    }

    function callNextTool() {
      if (toolQueue.length === 0) {
        // 모든 도구 호출 완료
        phase = "done";
        result.success = result.errors.length === 0 &&
          result.toolResults.every((r) => r.success);
        proc.stdin.end();
        setTimeout(() => cleanup(), 1000);
        return;
      }

      const next = toolQueue.shift();
      currentTool = next.name;

      const req = createRequest("tools/call", {
        name: next.name,
        arguments: next.params,
      });
      proc.stdin.write(encodeMessage(req));
    }

    proc.on("error", (err) => {
      fail(`서버 시작 실패: ${err.message}`);
    });

    proc.on("close", (code) => {
      if (phase !== "done" && code !== 0 && code !== null) {
        fail(`서버가 비정상 종료 (code: ${code})`);
      }
      cleanup();
    });

    // initialize 요청
    const initReq = createRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "call-test", version: "1.0.0" },
    });
    proc.stdin.write(encodeMessage(initReq));
  });
}

/**
 * 결과를 출력합니다.
 */
function printResult(result) {
  const icon = result.success ? "✅" : "❌";
  console.log(`\n${icon} ${result.label}`);

  for (const tr of result.toolResults) {
    if (tr.success) {
      const count = tr.itemCount !== null ? ` 응답 ${tr.itemCount}건` : "";
      console.log(`   ✅ ${tr.name}${count}`);
    } else {
      console.log(`   ❌ ${tr.name}: ${tr.error}`);
    }
  }

  for (const err of result.errors) {
    console.log(`   ✗ ${err}`);
  }
}

// --- Main ---
async function main() {
  console.log(`\n🔍 도구 호출 테스트: ${serverName} (${lang})`);
  console.log("=".repeat(50));

  let command, commandArgs;

  if (lang === "typescript") {
    const tsDir = join(ROOT, "typescript", "packages", "servers", serverName);
    const distIndex = join(tsDir, "dist", "index.js");
    const srcIndex = join(tsDir, "src", "index.ts");

    if (existsSync(distIndex)) {
      command = "node";
      commandArgs = [distIndex];
    } else if (existsSync(srcIndex)) {
      command = "npx";
      commandArgs = ["tsx", srcIndex];
    } else {
      console.error(`❌ TypeScript 서버를 찾을 수 없습니다: ${tsDir}`);
      process.exit(1);
    }
  } else if (lang === "python") {
    const pyDir = join(ROOT, "python", "servers", serverName);
    const serverPy = join(pyDir, "src", "server.py");

    if (!existsSync(serverPy)) {
      console.error(`❌ Python 서버를 찾을 수 없습니다: ${pyDir}`);
      process.exit(1);
    }
    command = "uv";
    commandArgs = ["run", "--directory", pyDir, "python", "-u", serverPy];
  } else {
    console.error("❌ --lang은 typescript 또는 python이어야 합니다.");
    process.exit(1);
  }

  const result = await runCallTest(command, commandArgs, `${lang} - ${serverName}`);
  printResult(result);

  console.log("\n" + "=".repeat(50));
  if (result.success) {
    console.log("✅ 모든 도구 호출 테스트 통과");
  } else {
    console.log("❌ 일부 테스트 실패");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("도구 호출 테스트 실행 오류:", err);
  process.exit(1);
});
