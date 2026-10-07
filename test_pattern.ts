import { analyzeHistoricalPattern } from "./src/lib/use/pattern.functions";

async function main() {
  const code = `
//@version=5
indicator("ATR/Pivot", overlay=true)
pivot = ta.sma(close, 20)
atr = ta.atr(14)
R3 = pivot + atr * 3
S1 = pivot - atr * 1
plot(R3, "R3")
plot(S1, "S1")
`;
  const res = await analyzeHistoricalPattern({
    data: {
      strategyId: "00000000-0000-0000-0000-000000000000",
      code,
      symbol: "EUR/USD",
      timeframe: "5m",
      sourceCondition: "close >= R3",
      targetCondition: "close <= S1",
      windowBars: 12, // 60 minutes / 5m = 12 bars
      freezeNow: false
    }
  });
  console.log(JSON.stringify(res, null, 2));
}
main().catch(console.error);
