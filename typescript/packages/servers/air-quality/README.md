# @data-go-kr/air-quality

한국환경공단 에어코리아 대기오염정보 MCP 서버

[공공데이터포털 API 상세](https://www.data.go.kr/data/15073861/openapi.do)

## 제공 도구 (Tools)

| 도구 이름 | 설명 |
|-----------|------|
| `get_realtime_air_quality` | 측정소별 실시간 대기오염 측정 정보를 조회합니다. 특정 측정소의 미세먼지, 초미세먼지, 오존, 일산화탄소 등의 수치를 확인할 수 있습니다. |
| `get_air_quality_by_region` | 시도별 실시간 대기오염 측정 정보를 조회합니다. 특정 시도의 모든 측정소 데이터를 확인할 수 있습니다. |
| `get_air_quality_forecast` | 대기질 예보통보를 조회합니다. 미세먼지(PM10), 초미세먼지(PM2.5), 오존(O3) 예보 정보를 확인할 수 있습니다. |

## 환경 변수

`.env` 파일을 생성하고 [공공데이터포털](https://www.data.go.kr/)에서 발급받은 서비스키를 설정하세요.

```bash
cp .env.example .env
```

```
DATA_GO_KR_SERVICE_KEY=your_service_key_here
```

## 빌드 및 실행

```bash
# 빌드
npm run build

# 실행
npm run start

# 개발 모드
npm run dev
```

## Claude Desktop 설정

`claude_desktop_config.json`에 아래 내용을 추가하세요.

```json
{
  "mcpServers": {
    "air-quality": {
      "command": "node",
      "args": ["/absolute/path/to/typescript/packages/servers/air-quality/dist/index.js"],
      "env": {
        "DATA_GO_KR_SERVICE_KEY": "your_service_key_here"
      }
    }
  }
}
```
