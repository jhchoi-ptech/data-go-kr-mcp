# Claude Desktop 설정 가이드

Claude Desktop에서 공공데이터 포털 MCP 서버를 사용하는 방법을 안내합니다.

## 설정 파일 위치

| OS | 경로 |
|----|------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |

## TypeScript 서버 설정

### 사전 준비

```bash
cd typescript
npm install
npm run build
```

### 설정 예시

```json
{
  "mcpServers": {
    "air-quality": {
      "command": "node",
      "args": ["/절대경로/data-go-kr-mcp/typescript/packages/servers/air-quality/dist/index.js"],
      "env": {
        "DATA_GO_KR_SERVICE_KEY": "발급받은_서비스키"
      }
    },
    "weather-forecast": {
      "command": "node",
      "args": ["/절대경로/data-go-kr-mcp/typescript/packages/servers/weather-forecast/dist/index.js"],
      "env": {
        "DATA_GO_KR_SERVICE_KEY": "발급받은_서비스키"
      }
    }
  }
}
```

### npx tsx로 실행 (빌드 없이)

개발 중에는 빌드 없이 바로 실행할 수 있습니다:

```json
{
  "mcpServers": {
    "air-quality": {
      "command": "npx",
      "args": ["tsx", "/절대경로/data-go-kr-mcp/typescript/packages/servers/air-quality/src/index.ts"],
      "env": {
        "DATA_GO_KR_SERVICE_KEY": "발급받은_서비스키"
      }
    }
  }
}
```

## Python 서버 설정

### 사전 준비

```bash
cd python/servers/air-quality
pip install -e .
```

### 설정 예시

```json
{
  "mcpServers": {
    "air-quality-python": {
      "command": "python",
      "args": ["-m", "src.server"],
      "cwd": "/절대경로/data-go-kr-mcp/python/servers/air-quality",
      "env": {
        "DATA_GO_KR_SERVICE_KEY": "발급받은_서비스키"
      }
    },
    "weather-forecast-python": {
      "command": "python",
      "args": ["-m", "src.server"],
      "cwd": "/절대경로/data-go-kr-mcp/python/servers/weather-forecast",
      "env": {
        "DATA_GO_KR_SERVICE_KEY": "발급받은_서비스키"
      }
    }
  }
}
```

### uv로 실행

[uv](https://github.com/astral-sh/uv)를 사용하면 가상환경 없이 바로 실행할 수 있습니다:

```json
{
  "mcpServers": {
    "air-quality-python": {
      "command": "uv",
      "args": ["run", "--directory", "/절대경로/data-go-kr-mcp/python/servers/air-quality", "python", "-m", "src.server"],
      "env": {
        "DATA_GO_KR_SERVICE_KEY": "발급받은_서비스키"
      }
    }
  }
}
```

## 여러 서버 동시 사용

여러 API 서버를 동시에 등록할 수 있습니다. 각 서버에 같은 서비스키를 사용하거나 API별로 다른 키를 사용할 수 있습니다.

```json
{
  "mcpServers": {
    "air-quality": {
      "command": "node",
      "args": ["/절대경로/data-go-kr-mcp/typescript/packages/servers/air-quality/dist/index.js"],
      "env": {
        "DATA_GO_KR_SERVICE_KEY": "서비스키_1"
      }
    },
    "weather-forecast": {
      "command": "node",
      "args": ["/절대경로/data-go-kr-mcp/typescript/packages/servers/weather-forecast/dist/index.js"],
      "env": {
        "DATA_GO_KR_SERVICE_KEY": "서비스키_2"
      }
    }
  }
}
```

## 서비스키 발급

1. [공공데이터 포털](https://www.data.go.kr) 회원가입
2. 사용할 API 검색 → 활용신청
3. 마이페이지에서 **일반 인증키(Encoding)** 복사
4. Claude Desktop 설정의 `DATA_GO_KR_SERVICE_KEY`에 입력

> **주의**: 서비스키에 `+`, `=` 등 특수문자가 포함되어 있으면 API 호출 시 문제가 발생할 수 있습니다. 이 경우 공공데이터포털에서 키를 재발급 받으세요.

## 검증

Claude Desktop을 재시작한 후, 대화에서 다음과 같이 테스트할 수 있습니다:

- "서울의 현재 대기질 알려줘"
- "종로구 측정소의 미세먼지 농도는?"
- "서울 날씨 알려줘" (격자 좌표: nx=60, ny=127)

## MCP Inspector로 테스트

서버를 Claude Desktop에 등록하기 전에 MCP Inspector로 먼저 테스트할 수 있습니다:

```bash
npx @modelcontextprotocol/inspector node typescript/packages/servers/air-quality/dist/index.js
```
