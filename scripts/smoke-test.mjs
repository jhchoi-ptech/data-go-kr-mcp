#!/usr/bin/env node

/**
 * L2 스모크 테스트 - API 키 불필요
 *
 * 서버를 STDIO로 spawn하고 JSON-RPC 프로토콜로 통신하여 검증:
 * 1. initialize → 서버 연결 + capability 확인
 * 2. tools/list → 등록된 도구 목록 검증
 * 3. 서버 정상 종료 확인
 *
 * 사용법:
 *   node scripts/smoke-test.mjs --server air-quality --lang typescript
 *   node scripts/smoke-test.mjs --server air-quality --lang python
 *   node scripts/smoke-test.mjs --server air-quality --lang both
 */

import { spawn } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// --- Argument parsing ---
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const serverName = getArg("server");
const lang = getArg("lang") || "both";

if (!serverName) {
  console.error("사용법: node scripts/smoke-test.mjs --server <api-name> [--lang typescript|python|both]");
  process.exit(1);
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
 * STDIO를 통해 MCP 서버와 JSON-RPC 통신을 수행합니다.
 */
function runSmokeTest(command, commandArgs, label) {
  return new Promise((resolve) => {
    const result = {
      label,
      success: false,
      tools: [],
      errors: [],
      warnings: [],
    };

    const proc = spawn(command, commandArgs, {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        // 스모크 테스트에서는 서비스키가 필요 없지만,
        // 클라이언트 생성 시 검증을 우회하기 위해 더미값 설정
        DATA_GO_KR_SERVICE_KEY: process.env.DATA_GO_KR_SERVICE_KEY || "SMOKE_TEST_DUMMY_KEY",
      },
    });

    let stdout = "";
    let stderr = "";
    let phase = "initialize"; // initialize → tools_list → shutdown
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

    // 15초 타임아웃
    timeoutId = setTimeout(() => {
      fail("타임아웃: 서버가 15초 이내에 응답하지 않았습니다.");
    }, 15000);

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.stdout.on("data", (data) => {
      stdout += data.toString();

      // 줄 단위로 JSON-RPC 메시지 파싱
      const lines = stdout.split("\n");
      // 마지막 줄은 아직 완성되지 않았을 수 있으므로 보관
      stdout = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        let msg;
        try {
          msg = JSON.parse(trimmed);
        } catch {
          continue; // JSON이 아닌 라인은 무시
        }

        if (phase === "initialize" && msg.id && msg.result) {
          // initialize 응답 수신 → tools/list 요청
          phase = "tools_list";
          const toolsReq = createRequest("tools/list");
          proc.stdin.write(encodeMessage(toolsReq));
        } else if (phase === "tools_list" && msg.id && msg.result) {
          // tools/list 응답 수신 → 검증
          const tools = msg.result.tools || [];
          result.tools = tools;

          validateTools(tools, result);

          // 서버 종료
          phase = "shutdown";
          result.success = result.errors.length === 0;
          proc.stdin.end();

          // 정상 종료 대기
          setTimeout(() => cleanup(), 1000);
        } else if (msg.error) {
          fail(`JSON-RPC 에러: ${JSON.stringify(msg.error)}`);
        }
      }
    });

    proc.on("error", (err) => {
      fail(`서버 시작 실패: ${err.message}`);
    });

    proc.on("close", (code) => {
      if (phase === "shutdown") {
        // 정상 종료
      } else if (code !== 0 && code !== null) {
        if (stderr.trim()) {
          fail(`서버가 비정상 종료 (code: ${code}): ${stderr.substring(0, 500)}`);
        } else {
          fail(`서버가 비정상 종료 (code: ${code})`);
        }
      }
      cleanup();
    });

    // initialize 요청 전송
    const initReq = createRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "smoke-test", version: "1.0.0" },
    });
    proc.stdin.write(encodeMessage(initReq));
  });
}

/**
 * 도구 목록을 검증합니다.
 */
function validateTools(tools, result) {
  if (tools.length === 0) {
    result.errors.push("등록된 도구가 없습니다.");
    return;
  }

  for (const tool of tools) {
    const name = tool.name;

    // 1. get_ 접두사 + snake_case 검증
    if (!name.startsWith("get_")) {
      result.warnings.push(`도구 "${name}": get_ 접두사가 없습니다.`);
    }
    if (name !== name.toLowerCase() || /[^a-z0-9_]/.test(name)) {
      result.warnings.push(`도구 "${name}": snake_case 형식이 아닙니다.`);
    }

    // 2. 한국어 설명 확인
    const desc = tool.description || "";
    const hasKorean = /[\uAC00-\uD7AF]/.test(desc);
    if (!hasKorean) {
      result.warnings.push(`도구 "${name}": 한국어 설명이 없습니다.`);
    }

    // 3. inputSchema 존재 확인
    if (!tool.inputSchema) {
      result.errors.push(`도구 "${name}": inputSchema가 정의되지 않았습니다.`);
    }
  }
}

/**
 * 결과를 출력합니다.
 */
function printResult(result) {
  const icon = result.success ? "✅" : "❌";
  console.log(`\n${icon} ${result.label}`);

  if (result.tools.length > 0) {
    console.log(`   도구 ${result.tools.length}개 등록 확인:`);
    for (const tool of result.tools) {
      console.log(`     - ${tool.name}: ${(tool.description || "").substring(0, 50)}...`);
    }
  }

  for (const warn of result.warnings) {
    console.log(`   ⚠ ${warn}`);
  }
  for (const err of result.errors) {
    console.log(`   ✗ ${err}`);
  }
}

// --- Main ---
async function main() {
  console.log(`\n🔍 스모크 테스트: ${serverName}`);
  console.log("=".repeat(50));

  const results = [];
  let hasFailure = false;

  // TypeScript 테스트
  if (lang === "typescript" || lang === "both") {
    const tsDir = join(ROOT, "typescript", "packages", "servers", serverName);
    const distIndex = join(tsDir, "dist", "index.js");
    const srcIndex = join(tsDir, "src", "index.ts");

    if (!existsSync(tsDir)) {
      console.log(`\n⏭ TypeScript 서버 없음: ${tsDir}`);
    } else if (existsSync(distIndex)) {
      const result = await runSmokeTest("node", [distIndex], `TypeScript (빌드: ${serverName})`);
      results.push(result);
    } else if (existsSync(srcIndex)) {
      const result = await runSmokeTest("npx", ["tsx", srcIndex], `TypeScript (개발: ${serverName})`);
      results.push(result);
    } else {
      console.log(`\n⏭ TypeScript 서버 엔트리포인트 없음`);
    }
  }

  // Python 테스트
  if (lang === "python" || lang === "both") {
    const pyDir = join(ROOT, "python", "servers", serverName);
    const serverPy = join(pyDir, "src", "server.py");

    if (!existsSync(pyDir)) {
      console.log(`\n⏭ Python 서버 없음: ${pyDir}`);
    } else if (existsSync(serverPy)) {
      // uv run을 사용하여 의존성이 설치된 환경에서 실행
      const result = await runSmokeTest(
        "uv",
        ["run", "--directory", pyDir, "python", "-u", serverPy],
        `Python (${serverName})`,
      );
      results.push(result);
    } else {
      console.log(`\n⏭ Python 서버 엔트리포인트 없음`);
    }
  }

  // 결과 출력
  for (const result of results) {
    printResult(result);
    if (!result.success) hasFailure = true;
  }

  console.log("\n" + "=".repeat(50));
  if (results.length === 0) {
    console.log("⚠ 테스트 대상 서버를 찾을 수 없습니다.");
    process.exit(1);
  } else if (hasFailure) {
    console.log("❌ 일부 테스트 실패");
    process.exit(1);
  } else {
    console.log("✅ 모든 스모크 테스트 통과");
  }
}

main().catch((err) => {
  console.error("스모크 테스트 실행 오류:", err);
  process.exit(1);
});
