import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { extractItems } from "@data-go-kr/shared";
import { WeatherForecastClient } from "./client.js";

export function registerTools(server: McpServer): void {
  const client = new WeatherForecastClient();

  server.tool(
    "get_ultra_short_realtime",
    "초단기실황 정보를 조회합니다. 현재 기온, 강수량, 습도, 풍속 등의 실시간 기상 관측 데이터를 확인할 수 있습니다.",
    {
      baseDate: z.string().describe("발표일자 (YYYYMMDD 형식)"),
      baseTime: z.string().describe("발표시각 (HHMM 형식, 예: 0600)"),
      nx: z.number().describe("예보지점 X 좌표 (격자)"),
      ny: z.number().describe("예보지점 Y 좌표 (격자)"),
      pageNo: z.number().optional().describe("페이지 번호 (기본값: 1)"),
      numOfRows: z.number().optional().describe("한 페이지 결과 수 (기본값: 100)"),
    },
    async (params) => {
      try {
        const response = await client.getUltraSrtNcst(params);
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
    "get_ultra_short_forecast",
    "초단기예보 정보를 조회합니다. 향후 6시간 이내의 기상 예보 데이터를 확인할 수 있습니다.",
    {
      baseDate: z.string().describe("발표일자 (YYYYMMDD 형식)"),
      baseTime: z.string().describe("발표시각 (HHMM 형식, 예: 0600)"),
      nx: z.number().describe("예보지점 X 좌표 (격자)"),
      ny: z.number().describe("예보지점 Y 좌표 (격자)"),
      pageNo: z.number().optional().describe("페이지 번호 (기본값: 1)"),
      numOfRows: z.number().optional().describe("한 페이지 결과 수 (기본값: 1000)"),
    },
    async (params) => {
      try {
        const response = await client.getUltraSrtFcst(params);
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
    "get_village_forecast",
    "단기예보 정보를 조회합니다. 향후 3일간의 기상 예보 데이터(기온, 강수확률, 하늘상태 등)를 확인할 수 있습니다.",
    {
      baseDate: z.string().describe("발표일자 (YYYYMMDD 형식)"),
      baseTime: z.string().describe("발표시각 (HHMM 형식, 예: 0600)"),
      nx: z.number().describe("예보지점 X 좌표 (격자)"),
      ny: z.number().describe("예보지점 Y 좌표 (격자)"),
      pageNo: z.number().optional().describe("페이지 번호 (기본값: 1)"),
      numOfRows: z.number().optional().describe("한 페이지 결과 수 (기본값: 1000)"),
    },
    async (params) => {
      try {
        const response = await client.getVilageFcst(params);
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
