/** 측정소별 실시간 측정정보 */
export interface AirQualityMeasurement {
  stationName: string;
  mangName: string;
  dataTime: string;
  so2Value: string;
  coValue: string;
  o3Value: string;
  no2Value: string;
  pm10Value: string;
  pm25Value: string;
  khaiValue: string;
  khaiGrade: string;
  so2Grade: string;
  coGrade: string;
  o3Grade: string;
  no2Grade: string;
  pm10Grade: string;
  pm25Grade: string;
  pm10Flag: string | null;
  pm25Flag: string | null;
}

/** 대기질 예보통보 */
export interface AirQualityForecast {
  informCode: string;
  informOverall: string;
  informCause: string;
  informGrade: string;
  informData: string;
  actionKnack: string | null;
  imageUrl1: string;
  imageUrl2: string;
  imageUrl3: string;
  imageUrl4: string;
  imageUrl5: string;
  imageUrl6: string;
  dataTime: string;
}
