import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { extractItems } from "@data-go-kr/shared";
import { AirQualityClient } from "./client.js";

export function registerTools(server: McpServer): void {
  const client = new AirQualityClient();

  server.tool(
    "get_realtime_air_quality",
    "측정소별 실시간 대기오염 측정 정보를 조회합니다. 특정 측정소의 미세먼지, 초미세먼지, 오존, 일산화탄소 등의 수치를 확인할 수 있습니다.",
    {
      stationName: z.string().describe("측정소 이름 (예: 종로구, 강남구, 서초구)"),
      dataTerm: z.enum(["DAILY", "MONTH", "3MONTH"]).default("DAILY").describe("조회 기간 (DAILY: 1일, MONTH: 1개월, 3MONTH: 3개월)"),
      pageNo: z.number().optional().describe("페이지 번호 (기본값: 1)"),
      numOfRows: z.number().optional().describe("한 페이지 결과 수 (기본값: 10)"),
    },
    async (params) => {
      try {
        const response = await client.getRealtimeByStation(params);
        const items = extractItems(response.response.body);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(items, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `에러: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "get_air_quality_by_region",
    "시도별 실시간 대기오염 측정 정보를 조회합니다. 특정 시도의 모든 측정소 데이터를 확인할 수 있습니다.",
    {
      sidoName: z.string().describe("시도 이름 (예: 서울, 부산, 대구, 인천, 광주, 대전, 울산, 경기, 강원, 충북, 충남, 전북, 전남, 경북, 경남, 제주, 세종)"),
      pageNo: z.number().optional().describe("페이지 번호 (기본값: 1)"),
      numOfRows: z.number().optional().describe("한 페이지 결과 수 (기본값: 100)"),
    },
    async (params) => {
      try {
        const response = await client.getRealtimeByRegion(params);
        const items = extractItems(response.response.body);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(items, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `에러: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "get_air_quality_forecast",
    "대기질 예보통보를 조회합니다. 미세먼지(PM10), 초미세먼지(PM2.5), 오존(O3) 예보 정보를 확인할 수 있습니다.",
    {
      searchDate: z.string().optional().describe("조회 날짜 (YYYY-MM-DD 형식, 기본값: 오늘)"),
      informCode: z.enum(["PM10", "PM25", "O3"]).optional().describe("통보 코드 (PM10: 미세먼지, PM25: 초미세먼지, O3: 오존)"),
      pageNo: z.number().optional().describe("페이지 번호 (기본값: 1)"),
      numOfRows: z.number().optional().describe("한 페이지 결과 수 (기본값: 10)"),
    },
    async (params) => {
      try {
        const response = await client.getForecast(params);
        const items = extractItems(response.response.body);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(items, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `에러: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );
}
