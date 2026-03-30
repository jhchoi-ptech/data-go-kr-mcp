# 대기오염정보 MCP 서버 (Air Quality)

한국환경공단 에어코리아 대기오염정보 조회 API를 MCP 서버로 제공합니다.

- **데이터 출처**: [공공데이터포털](https://www.data.go.kr/) - 한국환경공단 에어코리아
- **API 베이스 URL**: `https://apis.data.go.kr/B552584/ArpltnInforInqireSvc`

## 제공 도구 (Tools)

| 도구 이름 | 설명 | 주요 파라미터 |
|-----------|------|--------------|
| `get_realtime_air_quality` | 측정소별 실시간 대기오염 측정 정보 조회 | `station_name` (측정소 이름) |
| `get_air_quality_by_region` | 시도별 실시간 대기오염 측정 정보 조회 | `sido_name` (시도 이름) |
| `get_air_quality_forecast` | 대기질 예보통보 조회 | `search_date`, `inform_code` |

## 설치

```bash
cd python/servers/air-quality
uv sync
```

## 환경 변수 설정

[공공데이터포털](https://www.data.go.kr/)에서 API 서비스키를 발급받아 설정합니다.

```bash
cp .env.example .env
# .env 파일에 서비스키 입력
```

또는 프로젝트 루트의 `.env` 파일에 설정할 수 있습니다:

```
DATA_GO_KR_SERVICE_KEY=발급받은_서비스키
```

## 실행

```bash
# uv로 실행
uv run air-quality-server

# 또는 직접 실행
uv run python -m src.server
```

## Claude Desktop 설정

`claude_desktop_config.json`에 다음을 추가합니다:

```json
{
  "mcpServers": {
    "air-quality": {
      "command": "uv",
      "args": [
        "--directory",
        "/absolute/path/to/python/servers/air-quality",
        "run",
        "air-quality-server"
      ],
      "env": {
        "DATA_GO_KR_SERVICE_KEY": "발급받은_서비스키"
      }
    }
  }
}
```

## 사용 예시

- "종로구 실시간 대기오염 정보 알려줘"
- "서울시 전체 대기질 현황 조회해줘"
- "오늘 미세먼지 예보 확인해줘"
- "내일 초미세먼지(PM2.5) 예보 알려줘"
