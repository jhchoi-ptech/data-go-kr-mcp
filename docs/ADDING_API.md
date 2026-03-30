# 새 API 추가 가이드

이 문서는 새로운 공공데이터 포털 API를 MCP 서버로 추가하는 방법을 설명합니다.

## 방법 1: CLI 스캐폴딩

```bash
node scripts/create-server.mjs --name <api-name> --lang <typescript|python|both>
```

### 예시

```bash
# TypeScript + Python 모두 생성
node scripts/create-server.mjs --name bus-arrival --lang both

# TypeScript만 생성
node scripts/create-server.mjs --name bus-arrival --lang typescript \
  --base-url "https://apis.data.go.kr/..." \
  --korean-name "버스도착정보"
```

생성된 파일의 `TODO` 부분을 구현한 후 빌드를 검증하세요.

## 방법 2: 수동 생성

기존 서버를 복사하여 수정합니다.

### Step 1: TypeScript 서버 생성

`typescript/packages/servers/air-quality/`를 참조하여 동일한 구조로 생성합니다.

```
typescript/packages/servers/<api-name>/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
└── src/
    ├── index.ts       # 서버 엔트리포인트
    ├── tools.ts       # 도구 정의 (Zod 스키마)
    ├── client.ts      # API 클라이언트
    └── types.ts       # 응답 타입
```

#### package.json

```json
{
  "name": "@data-go-kr/<api-name>",
  "version": "0.1.0",
  "description": "<한국어 이름> MCP 서버",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "npx tsx src/index.ts"
  },
  "dependencies": {
    "@data-go-kr/shared": "*",
    "@modelcontextprotocol/sdk": "^1.12.0",
    "dotenv": "^16.4.7",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0"
  }
}
```

#### src/client.ts

`DataGoKrClient`를 상속하여 API별 엔드포인트 메서드를 구현합니다.

```typescript
import { DataGoKrClient, type DataGoKrResponse } from "@data-go-kr/shared";

export class MyApiClient extends DataGoKrClient {
  constructor(serviceKey?: string) {
    super({ baseUrl: "https://apis.data.go.kr/...", serviceKey });
  }

  async getData(params: { ... }): Promise<DataGoKrResponse<MyType>> {
    return this.fetch<MyType>("endpointName", { ... });
  }
}
```

#### src/tools.ts

`registerTools(server)` 함수에서 Zod 스키마로 도구를 정의합니다.

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { extractItems } from "@data-go-kr/shared";

export function registerTools(server: McpServer): void {
  server.tool(
    "get_resource_action",      // snake_case 이름
    "도구 설명 (한국어)",         // 한국어 설명
    {
      param: z.string().describe("파라미터 설명 (한국어)"),
    },
    async (params) => { ... },
  );
}
```

### Step 2: Python 서버 생성

`python/servers/air-quality/`를 참조합니다.

```
python/servers/<api-name>/
├── pyproject.toml
├── .env.example
├── README.md
└── src/
    ├── __init__.py
    └── server.py      # FastMCP 서버
```

#### src/server.py

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("data-go-kr-<api-name>")

@mcp.tool()
async def get_resource_action(param: str) -> str:
    """도구 설명 (한국어).

    Args:
        param: 파라미터 설명 (한국어)
    """
    ...
```

### Step 3: 빌드 검증 (L1)

```bash
npm --prefix typescript install
npm --prefix typescript run build
```

### Step 4: 스모크 테스트 (L2)

API 키 없이 서버가 정상 기동되고 도구가 올바르게 등록되는지 검증합니다:

```bash
node scripts/smoke-test.mjs --server <api-name> --lang both
```

### Step 5: 도구 호출 테스트 (L3, 선택)

`.env`에 서비스키가 설정되어 있으면 실제 API 호출을 테스트할 수 있습니다:

```bash
node scripts/call-test.mjs --server <api-name> --lang typescript
node scripts/call-test.mjs --server <api-name> --lang python
```

### Step 6: README 업데이트

루트 `README.md`의 API 카탈로그 테이블에 새 API를 추가합니다.

## 규칙 요약

| 항목 | 규칙 |
|------|------|
| 도구 이름 | `get_{resource}_{action}` snake_case |
| 도구 설명 | 한국어 |
| 파라미터 설명 | 한국어 |
| 에러 메시지 | 한국어 |
| serviceKey | 인코딩/디코딩 없음 |
| 응답 형식 | JSON 요청 |
| 전송 방식 | STDIO |
