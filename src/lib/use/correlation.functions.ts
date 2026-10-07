import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const input = z.object({
  symbol1: z.string().min(1),
  symbol2: z.string().min(1),
  timeframe: z.string().min(1).max(10),
  lookbackBars: z.number().min(100).max(5000).default(1000),
  rollingWindow: z.number().min(10).max(500).default(50)
});

export const runCorrelationAnalysis = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { fetchHistorical, resolveProvider } = await import("./data/providers.server");
    const { marketOf } = await import("./market-data.server");
    const { aggregateCandles } = await import("./aggregate");
    const { getTimeframe } = await import("./timeframes");
    const { correlation, rollingCorrelation } = await import("./analysis/quant");

    if (data.symbol1 === data.symbol2) return { status: "IDENTICAL_SYMBOLS", message: "Select two different symbols." };

    const { data: sym1 } = await db.from("use_symbols").select("*").eq("symbol", data.symbol1).single();
    const { data: sym2 } = await db.from("use_symbols").select("*").eq("symbol", data.symbol2).single();
    if (!sym1 || !sym2) throw new Error("Symbol not in catalog");

    const spec = getTimeframe(data.timeframe)!;
    const end = Date.now();
    const start = end - (data.lookbackBars * spec.seconds * 1000 * 2); // fetch 2x to account for weekends

    const m1 = marketOf(sym1 as never);
    const m2 = marketOf(sym2 as never);

    const f1 = await fetchHistorical({ symbol: sym1.symbol, providerSymbol: sym1.provider_symbol, market: m1, timeframe: data.timeframe, start, end });
    const f2 = await fetchHistorical({ symbol: sym2.symbol, providerSymbol: sym2.provider_symbol, market: m2, timeframe: data.timeframe, start, end });

    if (!f1.candles.length || !f2.candles.length) {
      return { status: "NO_DATA", message: "Failed to fetch sufficient historical data." };
    }

    // Use synchronized timestamps only
    const dict1 = new Map(f1.candles.map(c => [c.ts, c.close]));
    const dict2 = new Map(f2.candles.map(c => [c.ts, c.close]));

    const commonTs = [...dict1.keys()].filter(ts => dict2.has(ts)).sort((a, b) => a - b).slice(-data.lookbackBars);
    
    if (commonTs.length < 10) {
      return { status: "NO_OVERLAP", message: "Not enough overlapping sessions between these markets." };
    }

    const c1 = commonTs.map(ts => dict1.get(ts)!);
    const c2 = commonTs.map(ts => dict2.get(ts)!);

    // Calculate Returns
    const r1 = [];
    const r2 = [];
    for (let i = 1; i < commonTs.length; i++) {
      r1.push((c1[i]! - c1[i - 1]!) / c1[i - 1]!);
      r2.push((c2[i]! - c2[i - 1]!) / c2[i - 1]!);
    }

    const overallCorr = correlation(r1, r2);
    const rolling = rollingCorrelation(r1, r2, data.rollingWindow);

    return {
      status: "OK",
      overall: overallCorr,
      rolling,
      alignedBars: commonTs.length,
      coverage1: f1.candles.length,
      coverage2: f2.candles.length,
      start: new Date(commonTs[0]).toISOString(),
      end: new Date(commonTs[commonTs.length - 1]).toISOString()
    };
  });
