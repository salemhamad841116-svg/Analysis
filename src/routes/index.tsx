import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { DirectionMatrix } from "@/components/use/DirectionMatrix";
import { Historical } from "@/components/use/Historical";
import { Evidence, ModelQuality, NextCandle } from "@/components/use/NextCandle";
import { Chip, Panel } from "@/components/use/primitives";
import { NextCandleForecast } from "@/components/use/NextCandleForecast";
import { getBootstrap, runAnalysis, type AnalysisResult } from "@/lib/use/analysis.functions";
import { ANALYSIS_TIMEFRAMES } from "@/lib/use/timeframes";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Universal Strategy Engine — محلل بيانات الاستراتيجيات" },
      {
        name: "description",
        content:
          "محرك تحليل استراتيجيات حقيقي: مصفوفة اتجاه لكل فريم، توقع الشمعة القادمة باحتمالات معايرة، تحليل تاريخي وتفسير للتوقع.",
      },
      { property: "og:title", content: "Universal Strategy Engine — محلل بيانات الاستراتيجيات" },
      {
        property: "og:description",
        content:
          "مصفوفة اتجاه متعددة الفريمات، الشمعة القادمة باحتمالات، تحليل تاريخي وتفسير التوقع — بيانات حقيقية بلا أرقام عشوائية.",
      },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { indicator?: string } => (typeof s['indicator'] === "string" ? { indicator: s['indicator'] } : {}),
  component: AnalysisPage,
});

function AnalysisPage() {
  const { indicator: initialIndicator } = Route.useSearch();
  const bootstrapFn = useServerFn(getBootstrap);
  const analyseFn = useServerFn(runAnalysis);

  const bootstrap = useQuery({
    queryKey: ["use", "bootstrap"],
    queryFn: () => bootstrapFn(),
  });

  const [mode, setMode] = useState<"forecast" | "analysis">("forecast");
  const [symbol, setSymbol] = useState<string>("");
  const [timeframe, setTimeframe] = useState<string>("1m");
  const [strategyId, setStrategyId] = useState<string>("");

  const symbols = bootstrap.data?.symbols ?? [];
  const strategies = bootstrap.data?.strategies ?? [];
  const activeSymbol = symbol || symbols[0]?.symbol || "";

  const analysis = useMutation<AnalysisResult>({
    mutationFn: () =>
      analyseFn({
        data: {
          symbol: activeSymbol,
          timeframe,
          strategyId: strategyId || null,
        },
      }),
  });

  const result = analysis.data;

  return (
    <div dir="rtl" className="shell-gradient min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="glass flex flex-wrap items-start justify-between gap-4 rounded-2xl p-5">
          <div>
            <h1 className="text-lg font-semibold text-ink">Universal Strategy Engine</h1>
            <p className="mt-1 text-xs text-ink-soft">
              تحليل فقط — لا يُرسل أي أمر شراء أو بيع. كل الأرقام محسوبة من بيانات السوق المحققة.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/analyst" className="rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-primary-foreground">
              محلل الاستراتيجيات الذكي
            </Link>
            <Link to="/admin" className="rounded-full border border-glass-border px-4 py-1.5 text-xs text-ink hover:bg-muted">
              قسم الإدارة
            </Link>
          </div>
        </header>

        <div className="glass flex gap-1 rounded-2xl p-1.5">
          {([["forecast", "Next Candle Forecast · الشمعة القادمة"], ["analysis", "التحليل الشامل"]] as const).map(([m, l]) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold ${mode === m ? "bg-ink text-primary-foreground" : "text-ink hover:bg-muted"}`}>{l}</button>
          ))}
        </div>

        {mode === "forecast" && (
          <>
            <Panel title="الرمز والفريم" subtitle="كل فريم مستقل: توقع 1m يستهدف شمعة 1m التالية فقط.">
              <div className="grid gap-3 sm:grid-cols-2">
                <select value={activeSymbol} onChange={(e) => setSymbol(e.target.value)} className="w-full rounded-xl border border-glass-border bg-background/70 px-3 py-2 text-sm text-ink">
                  {symbols.map((s) => <option key={s.symbol} value={s.symbol}>{s.display_name} · {s.provider}</option>)}
                </select>
                <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="w-full rounded-xl border border-glass-border bg-background/70 px-3 py-2 text-sm text-ink">
                  {ANALYSIS_TIMEFRAMES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </Panel>
            <NextCandleForecast key={`${activeSymbol}-${timeframe}`} symbol={activeSymbol} timeframe={timeframe} strategies={strategies} initialIndicatorId={initialIndicator} />
          </>
        )}

        {mode === "analysis" && (<>
        <Panel title="مساحة التحليل" subtitle="اختر الرمز والفريم والاستراتيجية ثم اضغط زر التحليل.">

          <div className="grid gap-3 sm:grid-cols-4">
            <label className="space-y-1">
              <span className="text-[11px] text-ink-soft">الرمز</span>
              <select
                value={activeSymbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full rounded-xl border border-glass-border bg-background/70 px-3 py-2 text-sm text-ink"
              >
                {symbols.map((s) => (
                  <option key={s.symbol} value={s.symbol}>
                    {s.display_name} · {s.provider}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-ink-soft">الفريم الأساسي</span>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full rounded-xl border border-glass-border bg-background/70 px-3 py-2 text-sm text-ink"
              >
                {ANALYSIS_TIMEFRAMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-ink-soft">الاستراتيجية (اختياري)</span>
              <select
                value={strategyId}
                onChange={(e) => setStrategyId(e.target.value)}
                className="w-full rounded-xl border border-glass-border bg-background/70 px-3 py-2 text-sm text-ink"
              >
                <option value="">بدون استراتيجية (خصائص السوق فقط)</option>
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.status}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                disabled={!activeSymbol || analysis.isPending}
                onClick={() => analysis.mutate()}
                className="w-full rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {analysis.isPending ? "جاري التحليل…" : "تحليل"}
              </button>
            </div>
          </div>
          {analysis.isPending && (
            <p className="mt-3 text-[11px] text-ink-soft">
              يتم سحب البيانات لكل فريم، بناء الخصائص، والتدريب بتقسيم زمني — قد يستغرق دقيقة.
            </p>
          )}
          {analysis.isError && (
            <p className="mt-3 text-xs text-bear">
              تعذر إكمال التحليل: {(analysis.error as Error).message}
            </p>
          )}
        </Panel>

        {result && (
          <>
            <Panel title={`${result.displayName} · ${result.timeframe}`} subtitle={`مصدر البيانات: ${result.dataSource} · ${new Date(result.generatedAt).toLocaleString("ar")}`}>
              <div className="flex flex-wrap gap-1.5">
                <Chip>{result.symbol}</Chip>
                {result.strategy && <Chip>{result.strategy.name}</Chip>}
                {result.nextCandle?.overfittingRisk && <Chip tone="warn">OVERFITTING RISK</Chip>}
              </div>
              {result.warnings.length > 0 && (
                <ul className="mt-3 space-y-1 text-[11px] text-ink-soft">
                  {result.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
            </Panel>

            <DirectionMatrix rows={result.matrix} />
            {result.nextCandle && <NextCandle f={result.nextCandle} />}
            {result.nextCandle && (
              <div className="grid gap-5 lg:grid-cols-2">
                <Evidence f={result.nextCandle} />
                <ModelQuality f={result.nextCandle} />
              </div>
            )}
            {result.historical && <Historical report={result.historical} />}
          </>
        )}
        </>)}
      </div>
    </div>
  );
}
