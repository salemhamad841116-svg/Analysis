import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const input = z.object({ strategyId: z.string().uuid(), symbol: z.string().min(1).max(40), timeframe: z.string().min(1).max(10), windows: z.number().default(4) });

export const runWalkForwardOptimization = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { buildIR } = await import("./strategy/ir");
    const { runProfessionalBacktest } = await import("./strategy/backtester");
    const { performance } = await import("./analysis/quant");
    const { fetchHistorical, resolveProvider } = await import("./data/providers.server");
    const { marketOf } = await import("./market-data.server");
    const { aggregateCandles } = await import("./aggregate");
    const { getTimeframe } = await import("./timeframes");
    const { sweepValues, MAX_SWEEP_INPUTS } = await import("./analysis/sensitivity");

    const { data: s } = await db.from("use_strategies").select("id,code,language,version").eq("id", data.strategyId).single();
    if (!s) throw new Error("Strategy not found");
    const { data: run } = await db.from("use_backtest_runs").select("id,settings,period_start,period_end,dataset_hash")
      .eq("strategy_id", s.id).eq("symbol", data.symbol).eq("timeframe", data.timeframe).like("status", "COMPLETED%")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!run) return { status: "BLOCKED_NO_BACKTEST", message: "Run a Professional Backtest for this strategy/symbol/timeframe first." };
    const { data: sym } = await db.from("use_symbols").select("symbol,asset_class,provider_symbol,dataset").eq("symbol", data.symbol).single();
    if (!sym) throw new Error("Symbol not in catalog");
    const spec = getTimeframe(data.timeframe)!;
    const market = marketOf(sym as never);
    const baseTf = resolveProvider(market, data.timeframe).prov?.supports(market, data.timeframe) ? data.timeframe : (spec.aggregateFrom ?? data.timeframe);
    const f = await fetchHistorical({ symbol: sym.symbol, providerSymbol: sym.provider_symbol, market, timeframe: baseTf, start: Date.parse(run.period_start), end: Date.parse(run.period_end) });
    if (!f.candles.length) return { status: "BLOCKED_INCOMPLETE_HISTORICAL_DATA", message: f.coverage.error ?? f.coverage.status };
    const candles = baseTf === data.timeframe ? f.candles : aggregateCandles(f.candles, data.timeframe);
    const ir = await buildIR(s.code, { strategyId: s.id, version: s.version, language: s.language });
    const st = run.settings as Record<string, unknown>;
    const settings = { ...st, fillPolicy: "CONSERVATIVE_SL_FIRST", params: (st["params"] as Record<string, unknown>) ?? {} } as any;

    const numeric = ir.inputs.filter((i) => typeof i.default === "number" && Number.isFinite(i.default) && i.default !== 0).slice(0, MAX_SWEEP_INPUTS);
    if (!numeric.length) return { status: "NO_NUMERIC_INPUTS", message: "Strategy has no numeric inputs to optimize." };

    // Walk-Forward Logic
    const numWindows = data.windows;
    const step = Math.floor(candles.length / (numWindows + 1));
    const windows = [];
    const meta = { tickerid: sym.symbol, timeframe: data.timeframe, periodsPerYear: market === "crypto" ? 365 : 252, market, chartStepMs: spec.seconds * 1000 };

    for (let i = 0; i < numWindows; i++) {
      const trainCandles = candles.slice(i * step, (i + 1) * step);
      const valCandles = candles.slice((i + 1) * step, (i + 2) * step);
      
      // Random/grid search in train
      let bestParams = { ...settings.params };
      let bestNet = -Infinity;
      let trainRes = null;

      // Simple 1D sweep combination (true grid would be factorial, so we just do a simplified coordinate ascent or greedy selection for WFO demo)
      // To keep it simple and performant, we just take the best variant from each parameter independently.
      const localParams = { ...settings.params };
      for (const inp of numeric) {
        const def = inp.default as number;
        const isInt = inp.kind === "input.int" || (Number.isInteger(def) && inp.kind !== "input.float");
        let bestVal = def;
        let localBestNet = -Infinity;
        for (const value of sweepValues(def, isInt)) {
          try {
            const r = runProfessionalBacktest(ir, trainCandles, { ...settings, params: { ...localParams, [inp.name]: value } }, meta);
            const p = performance(r.trades, settings.initialCapital);
            if (p.netPnl > localBestNet) {
              localBestNet = p.netPnl;
              bestVal = value;
            }
          } catch {}
        }
        localParams[inp.name] = bestVal;
      }
      bestParams = localParams;

      // Validate
      let valNet = 0;
      let valPf = 0;
      let valTrades = 0;
      try {
        const r = runProfessionalBacktest(ir, valCandles, { ...settings, params: bestParams }, meta);
        const p = performance(r.trades, settings.initialCapital);
        valNet = p.netPnl;
        valPf = p.profitFactor ?? 0;
        valTrades = r.trades.length;
      } catch {}

      windows.push({
        trainStart: trainCandles[0]?.ts ? new Date(trainCandles[0].ts).toISOString() : "",
        trainEnd: trainCandles[trainCandles.length - 1]?.ts ? new Date(trainCandles[trainCandles.length - 1].ts).toISOString() : "",
        valStart: valCandles[0]?.ts ? new Date(valCandles[0].ts).toISOString() : "",
        valEnd: valCandles[valCandles.length - 1]?.ts ? new Date(valCandles[valCandles.length - 1].ts).toISOString() : "",
        selectedParams: bestParams,
        valNet,
        valPf,
        valTrades
      });
    }

    const totalOosNet = windows.reduce((a, w) => a + w.valNet, 0);

    return { status: "OK", windows, totalOosNet, provider: f.coverage.actualProvider };
  });
