#!/usr/bin/env node

/**
 * MCP 서버 스캐폴딩 CLI
 *
 * 사용법:
 *   node scripts/create-server.mjs --name <api-name> --lang <typescript|python|both>
 *
 * 예시:
 *   node scripts/create-server.mjs --name bus-arrival --lang both
 *   node scripts/create-server.mjs --name bus-arrival --lang typescript --base-url https://apis.data.go.kr/...
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// --- Argument parsing ---
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

// --- Simple Handlebars-like template engine ---
function renderTemplate(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? "");
}

// --- Readline helper ---
function createPrompt() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return {
    ask(question) {
      return new Promise((resolve) => rl.question(question, resolve));
    },
    close() {
      rl.close();
    },
  };
}

// --- kebab-case to PascalCase ---
function toPascalCase(str) {
  return str
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

// --- Create TypeScript server ---
function createTypeScriptServer(data) {
  const serverDir = join(ROOT, "typescript", "packages", "servers", data.name);

  if (existsSync(serverDir)) {
    console.log(`⚠ TypeScript 서버 디렉토리가 이미 존재합니다: ${serverDir}`);
    return;
  }

  const templateDir = join(ROOT, "templates", "typescript");

  // Create directories
  mkdirSync(join(serverDir, "src"), { recursive: true });

  // Render and write files
  const files = [
    { template: "package.json.hbs", output: "package.json" },
    { template: "tsconfig.json.hbs", output: "tsconfig.json" },
    { template: "src/index.ts.hbs", output: "src/index.ts" },
    { template: "src/client.ts.hbs", output: "src/client.ts" },
    { template: "src/tools.ts.hbs", output: "src/tools.ts" },
    { template: "src/types.ts.hbs", output: "src/types.ts" },
  ];

  for (const file of files) {
    const templatePath = join(templateDir, file.template);
    const template = readFileSync(templatePath, "utf-8");
    const rendered = renderTemplate(template, data);
    writeFileSync(join(serverDir, file.output), rendered);
  }

  // Create .env.example
  writeFileSync(
    join(serverDir, ".env.example"),
    "# data.go.kr 공공데이터포털 서비스키\nDATA_GO_KR_SERVICE_KEY=\n",
  );

  // Create README.md
  writeFileSync(
    join(serverDir, "README.md"),
    `# ${data.koreanName} MCP 서버

${data.koreanName} API를 MCP 서버로 제공합니다.

## 설치 및 실행

\`\`\`bash
cd typescript
npm install
npm run build
\`\`\`

## 환경변수

\`.env\` 파일에 서비스키를 설정하세요:

\`\`\`
DATA_GO_KR_SERVICE_KEY=your_service_key_here
\`\`\`

## Claude Desktop 설정

\`\`\`json
{
  "mcpServers": {
    "${data.name}": {
      "command": "node",
      "args": ["${serverDir}/dist/index.js"],
      "env": {
        "DATA_GO_KR_SERVICE_KEY": "your_service_key_here"
      }
    }
  }
}
\`\`\`
`,
  );

  console.log(`✓ TypeScript 서버 생성 완료: ${serverDir}`);
}

// --- Create Python server ---
function createPythonServer(data) {
  const serverDir = join(ROOT, "python", "servers", data.name);

  if (existsSync(serverDir)) {
    console.log(`⚠ Python 서버 디렉토리가 이미 존재합니다: ${serverDir}`);
    return;
  }

  const templateDir = join(ROOT, "templates", "python");

  // Create directories
  mkdirSync(join(serverDir, "src"), { recursive: true });

  // Render and write files
  const pyprojectTemplate = readFileSync(join(templateDir, "pyproject.toml.hbs"), "utf-8");
  writeFileSync(join(serverDir, "pyproject.toml"), renderTemplate(pyprojectTemplate, data));

  const serverTemplate = readFileSync(join(templateDir, "src/server.py.hbs"), "utf-8");
  writeFileSync(join(serverDir, "src/server.py"), renderTemplate(serverTemplate, data));

  // Create __init__.py
  writeFileSync(join(serverDir, "src/__init__.py"), "");

  // Create .env.example
  writeFileSync(
    join(serverDir, ".env.example"),
    "# data.go.kr 공공데이터포털 서비스키\nDATA_GO_KR_SERVICE_KEY=\n",
  );

  // Create README.md
  writeFileSync(
    join(serverDir, "README.md"),
    `# ${data.koreanName} MCP 서버 (Python)

${data.koreanName} API를 MCP 서버로 제공합니다.

## 설치 및 실행

\`\`\`bash
cd python/servers/${data.name}
pip install -e .
python -m src.server
\`\`\`

## 환경변수

\`.env\` 파일에 서비스키를 설정하세요:

\`\`\`
DATA_GO_KR_SERVICE_KEY=your_service_key_here
\`\`\`

## Claude Desktop 설정

\`\`\`json
{
  "mcpServers": {
    "${data.name}-python": {
      "command": "python",
      "args": ["-m", "src.server"],
      "cwd": "${serverDir}",
      "env": {
        "DATA_GO_KR_SERVICE_KEY": "your_service_key_here"
      }
    }
  }
}
\`\`\`
`,
  );

  console.log(`✓ Python 서버 생성 완료: ${serverDir}`);
}

// --- Main ---
async function main() {
  let name = getArg("name");
  let lang = getArg("lang");
  let baseUrl = getArg("base-url");
  let koreanName = getArg("korean-name");

  const prompt = createPrompt();

  try {
    if (!name) {
      name = await prompt.ask("API 이름 (kebab-case, 예: bus-arrival): ");
    }
    if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) {
      console.error("오류: 유효한 kebab-case API 이름을 입력하세요.");
      process.exit(1);
    }

    if (!koreanName) {
      koreanName = await prompt.ask("한국어 이름 (예: 버스도착정보): ");
    }
    if (!koreanName) {
      console.error("오류: 한국어 이름을 입력하세요.");
      process.exit(1);
    }

    if (!baseUrl) {
      baseUrl = await prompt.ask("베이스 URL (예: https://apis.data.go.kr/...): ");
    }
    if (!baseUrl) {
      baseUrl = "https://apis.data.go.kr/CHANGE_ME";
    }

    if (!lang) {
      lang = await prompt.ask("언어 (typescript / python / both) [both]: ");
      if (!lang) lang = "both";
    }

    const className = toPascalCase(name);
    const data = { name, koreanName, baseUrl, className };

    console.log("");
    console.log(`API 이름: ${name}`);
    console.log(`한국어 이름: ${koreanName}`);
    console.log(`베이스 URL: ${baseUrl}`);
    console.log(`클래스 이름: ${className}`);
    console.log(`언어: ${lang}`);
    console.log("");

    if (lang === "typescript" || lang === "both") {
      createTypeScriptServer(data);
    }
    if (lang === "python" || lang === "both") {
      createPythonServer(data);
    }

    console.log("");
    console.log("다음 단계:");
    console.log("1. 생성된 파일의 TODO 부분을 구현하세요.");
    console.log("2. TypeScript: npm install && npm run build 로 빌드를 검증하세요.");
    console.log("3. 루트 README.md 카탈로그 테이블에 새 API를 추가하세요.");
  } finally {
    prompt.close();
  }
}

main().catch(console.error);
