import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Chip, Panel } from "@/components/use/primitives";
import { runCorrelationAnalysis } from "@/lib/use/correlation.functions";

type Sym = { symbol: string };

const f = (v: unknown, d = 2) => (typeof v === "number" && isFinite(v) ? v.toFixed(d) : "n/a");

export function CorrelationAnalyzer({ symbols, timeframes }: { symbols: Sym[]; timeframes: string[] }) {
  const [sym1, setSym1] = useState(symbols[0]?.symbol ?? "");
  const [sym2, setSym2] = useState(symbols[1]?.symbol ?? "");
  const [tf, setTf] = useState("1h");
  const [lb, setLb] = useState(1000);
  const [rw, setRw] = useState(50);

  const analyze = useServerFn(runCorrelationAnalysis);
  const m = useMutation({ mutationFn: async () => (await analyze({ data: { symbol1: sym1, symbol2: sym2, timeframe: tf, lookbackBars: lb, rollingWindow: rw } })) as any });
  const r = m.data;

  const sel = "rounded border border-border bg-background px-2 py-1 text-sm";
  const num = "rounded border border-border bg-background px-2 py-1 text-sm w-24";

  return (
    <Panel title="Cross-Symbol Correlation Analysis — تحليل الترابط الزمني">
      <p className="mb-2 text-xs text-muted-foreground">Find aligned price correlations between any two symbols. Non-overlapping timestamps (e.g. crypto vs weekend-closed forex) are discarded automatically.</p>
      <div className="flex flex-wrap gap-2 items-center">
        <select className={sel} value={sym1} onChange={(e) => setSym1(e.target.value)}>{symbols.map((s) => <option key={s.symbol}>{s.symbol}</option>)}</select>
        <span>VS</span>
        <select className={sel} value={sym2} onChange={(e) => setSym2(e.target.value)}>{symbols.map((s) => <option key={s.symbol}>{s.symbol}</option>)}</select>
        <select className={sel} value={tf} onChange={(e) => setTf(e.target.value)}>{timeframes.map((t) => <option key={t}>{t}</option>)}</select>
        <input type="number" className={num} value={lb} onChange={(e) => setLb(parseInt(e.target.value))} placeholder="Lookback" title="Lookback bars" />
        <input type="number" className={num} value={rw} onChange={(e) => setRw(parseInt(e.target.value))} placeholder="Rolling" title="Rolling window bars" />
        <button className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground disabled:opacity-50" disabled={!sym1 || !sym2 || m.isPending} onClick={() => m.mutate()}>{m.isPending ? "Calculating…" : "Analyze Correlation"}</button>
      </div>

      {m.error && <p className="mt-2 text-sm text-destructive">{(m.error as Error).message}</p>}
      
      {r && (
        <div className="mt-3 space-y-2 text-sm">
          {r.status !== "OK" ? (
            <p className="text-destructive">{r.status}: {r.message}</p>
          ) : (
            <>
              <div className="flex gap-2 flex-wrap">
                <Chip tone={r.overall > 0.7 ? "bull" : r.overall < -0.7 ? "bear" : "neutral"}>
                  Overall Correlation: {f(r.overall, 3)}
                </Chip>
                <span className="text-xs text-muted-foreground self-center">
                  Aligned Bars: {r.alignedBars} · Range: {r.start?.slice(0,10)} → {r.end?.slice(0,10)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Raw coverage: {r.coverage1} bars ({sym1}) vs {r.coverage2} bars ({sym2}).
              </div>
              
              <div className="mt-2">
                <b>Rolling Correlation (Window: {rw})</b>
                <div className="mt-1 flex gap-[1px] h-10 w-full bg-muted/30 overflow-hidden items-end">
                  {r.rolling.filter((x: any) => x !== null).map((v: number, i: number) => {
                    const h = Math.abs(v) * 100;
                    const color = v > 0 ? "bg-bull" : "bg-bear";
                    return <div key={i} className={`flex-1 ${color}`} style={{ height: `${Math.max(2, h)}%`, opacity: 0.5 + (Math.abs(v)*0.5) }} title={v.toFixed(2)}></div>;
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </Panel>
  );
}
