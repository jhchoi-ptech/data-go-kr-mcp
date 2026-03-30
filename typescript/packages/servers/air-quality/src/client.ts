import { DataGoKrClient, type DataGoKrResponse } from "@data-go-kr/shared";
import type { AirQualityMeasurement, AirQualityForecast } from "./types.js";

const BASE_URL = "https://apis.data.go.kr/B552584/ArpltnInforInqireSvc";

export class AirQualityClient extends DataGoKrClient {
  constructor(serviceKey?: string) {
    super({ baseUrl: BASE_URL, serviceKey });
  }

  /** 측정소별 실시간 측정정보 조회 */
  async getRealtimeByStation(params: {
    stationName: string;
    dataTerm?: string;
    pageNo?: number;
    numOfRows?: number;
  }): Promise<DataGoKrResponse<AirQualityMeasurement>> {
    return this.fetch<AirQualityMeasurement>("getMsrstnAcctoRltmMesureDnsty", {
      stationName: params.stationName,
      dataTerm: params.dataTerm ?? "DAILY",
      pageNo: params.pageNo ?? 1,
      numOfRows: params.numOfRows ?? 10,
      ver: "1.5",
    });
  }

  /** 시도별 실시간 측정정보 조회 */
  async getRealtimeByRegion(params: {
    sidoName: string;
    pageNo?: number;
    numOfRows?: number;
  }): Promise<DataGoKrResponse<AirQualityMeasurement>> {
    return this.fetch<AirQualityMeasurement>("getCtprvnRltmMesureDnsty", {
      sidoName: params.sidoName,
      pageNo: params.pageNo ?? 1,
      numOfRows: params.numOfRows ?? 100,
      ver: "1.5",
    });
  }

  /** 대기질 예보통보 조회 */
  async getForecast(params: {
    searchDate?: string;
    informCode?: string;
    pageNo?: number;
    numOfRows?: number;
  }): Promise<DataGoKrResponse<AirQualityForecast>> {
    return this.fetch<AirQualityForecast>("getMinuDustFrcstDspth", {
      searchDate: params.searchDate,
      InformCode: params.informCode,
      pageNo: params.pageNo ?? 1,
      numOfRows: params.numOfRows ?? 10,
    });
  }
}
