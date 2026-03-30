import { DataGoKrClient, type DataGoKrResponse } from "@data-go-kr/shared";
import type { WeatherForecastItem, UltraSrtNcstItem } from "./types.js";

const BASE_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0";

export class WeatherForecastClient extends DataGoKrClient {
  constructor(serviceKey?: string) {
    super({ baseUrl: BASE_URL, serviceKey });
  }

  /** 초단기실황조회 */
  async getUltraSrtNcst(params: {
    baseDate: string;
    baseTime: string;
    nx: number;
    ny: number;
    pageNo?: number;
    numOfRows?: number;
  }): Promise<DataGoKrResponse<UltraSrtNcstItem>> {
    return this.fetch<UltraSrtNcstItem>("getUltraSrtNcst", {
      base_date: params.baseDate,
      base_time: params.baseTime,
      nx: params.nx,
      ny: params.ny,
      pageNo: params.pageNo ?? 1,
      numOfRows: params.numOfRows ?? 100,
    });
  }

  /** 초단기예보조회 */
  async getUltraSrtFcst(params: {
    baseDate: string;
    baseTime: string;
    nx: number;
    ny: number;
    pageNo?: number;
    numOfRows?: number;
  }): Promise<DataGoKrResponse<WeatherForecastItem>> {
    return this.fetch<WeatherForecastItem>("getUltraSrtFcst", {
      base_date: params.baseDate,
      base_time: params.baseTime,
      nx: params.nx,
      ny: params.ny,
      pageNo: params.pageNo ?? 1,
      numOfRows: params.numOfRows ?? 1000,
    });
  }

  /** 단기예보조회 */
  async getVilageFcst(params: {
    baseDate: string;
    baseTime: string;
    nx: number;
    ny: number;
    pageNo?: number;
    numOfRows?: number;
  }): Promise<DataGoKrResponse<WeatherForecastItem>> {
    return this.fetch<WeatherForecastItem>("getVilageFcst", {
      base_date: params.baseDate,
      base_time: params.baseTime,
      nx: params.nx,
      ny: params.ny,
      pageNo: params.pageNo ?? 1,
      numOfRows: params.numOfRows ?? 1000,
    });
  }
}
