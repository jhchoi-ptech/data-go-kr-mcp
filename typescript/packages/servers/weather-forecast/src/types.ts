/** 초단기실황/초단기예보/단기예보 공통 항목 */
export interface WeatherForecastItem {
  baseDate: string;
  baseTime: string;
  category: string;
  fcstDate: string;
  fcstTime: string;
  fcstValue: string;
  nx: number;
  ny: number;
}

/** 초단기실황 항목 (fcstDate/fcstTime 없음) */
export interface UltraSrtNcstItem {
  baseDate: string;
  baseTime: string;
  category: string;
  obsrValue: string;
  nx: number;
  ny: number;
}
