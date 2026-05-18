import type { Candle, TechnicalPoint } from "@/lib/types";

function sma(values: number[], period: number) {
  return values.map((_, index) => {
    if (index + 1 < period) return null;
    const slice = values.slice(index + 1 - period, index + 1);
    return slice.reduce((sum, value) => sum + value, 0) / period;
  });
}

function ema(values: number[], period: number) {
  const multiplier = 2 / (period + 1);
  const result: number[] = [];

  values.forEach((value, index) => {
    if (index === 0) {
      result.push(value);
      return;
    }

    result.push((value - result[index - 1]) * multiplier + result[index - 1]);
  });

  return result;
}

function rsi(values: number[], period = 14) {
  const result: Array<number | null> = Array(values.length).fill(null);
  if (values.length <= period) return result;

  let gains = 0;
  let losses = 0;

  for (let index = 1; index <= period; index += 1) {
    const change = values[index] - values[index - 1];
    if (change >= 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let index = period + 1; index < values.length; index += 1) {
    const change = values[index] - values[index - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[index] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return result;
}

export function buildTechnicalSeries(candles: Candle[]): TechnicalPoint[] {
  const closes = candles.map((item) => item.close);
  const ma5 = sma(closes, 5);
  const ma20 = sma(closes, 20);
  const ma60 = sma(closes, 60);
  const rsi14 = rsi(closes);
  const fast = ema(closes, 12);
  const slow = ema(closes, 26);
  const macd = fast.map((value, index) => value - slow[index]);
  const signal = ema(macd, 9);

  return candles.map((item, index) => ({
    ...item,
    ma5: ma5[index],
    ma20: ma20[index],
    ma60: ma60[index],
    rsi: rsi14[index],
    macd: macd[index],
    macdSignal: signal[index],
    macdHistogram: macd[index] - signal[index]
  }));
}

export function getIndicatorBias(point: TechnicalPoint) {
  const trend =
    point.ma20 && point.close > point.ma20
      ? "상승 우위"
      : point.ma20 && point.close < point.ma20
        ? "하락 경계"
        : "중립";

  const momentum =
    point.rsi === null
      ? "중립"
      : point.rsi >= 70
        ? "과열"
        : point.rsi <= 30
          ? "침체"
          : "정상";

  const macd = point.macd > point.macdSignal ? "매수 신호" : "매도 경계";

  return { trend, momentum, macd };
}
