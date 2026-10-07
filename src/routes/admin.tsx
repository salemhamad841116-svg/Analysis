import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Chip, Panel, Stat, numFmt, pct } from "@/components/use/primitives";
import {
  getBootstrap,
  getPredictionLog,
  saveStrategy,
  setStrategyLifecycle,
  deleteStrategy,
} from "@/lib/use/analysis.functions";
import { JobsPanel } from "@/components/use/JobsPanel";
import { DataPanel } from "@/components/use/DataPanel";
import { StrategyCode } from "@/components/use/StrategyCode";
import { SymbolCatalog } from "@/components/use/SymbolCatalog";
import { ProBacktest } from "@/components/use/ProBacktest";
import { PineCodeGenerator, TvStrategyParity } from "@/components/use/TradingViewModules";
import { ConvertToStrategy } from "@/components/use/ConvertToStrategy";
import { ForecastHealth } from "@/components/use/NextCandleForecast";
import { ReliabilityDashboard } from "@/components/use/ReliabilityDashboard";
import { PatternAnalyzer } from "@/components/use/PatternAnalyzer";
import { UniversalEngine } from "@/components/use/UniversalEngine";
import { CorrelationAnalyzer } from "@/components/use/CorrelationAnalyzer";
import { ANALYSIS_TIMEFRAMES } from "@/lib/use/timeframes";
import { ApiProviders } from "@/components/use/ApiProviders";
import { HistoricalDataManager } from "@/components/use/HistoricalDataManager";

const LIFECYCLE = [
  { id: "draft", label: "مسودة" },
  { id: "validated", label: "تم التحقق" },
  { id: "backtested", label: "اختبار تاريخي" },
  { id: "walk_forward", label: "Walk-Forward" },
  { id: "paper", label: "تداول ورقي" },
  { id: "approved", label: "معتمدة" },
  { id: "published", label: "منشورة" },
] as const;

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "قسم الإدارة — Universal Strategy Engine" },
      {
        name: "description",
        content:
          "إدارة الاستراتيجيات: إضافة كود، تحقق أمني، دورة حياة من المسودة إلى النشر، وسجل تدقيق التوقعات.",
      },
      { property: "og:title", content: "قسم الإدارة — Universal Strategy Engine" },
      {
        property: "og:description",
        content: "تحقق أمني للكود، دورة حياة الاستراتيجية، وسجل تدقيق التوقعات.",
      },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const qc = useQueryClient();
  const bootstrapFn = useServerFn(getBootstrap);
  const logFn = useServerFn(getPredictionLog);
  const saveFn = useServerFn(saveStrategy);
  const lifecycleFn = useServerFn(setStrategyLifecycle);

  const bootstrap = useQuery({ queryKey: ["use", "bootstrap"], queryFn: () => bootstrapFn() });
  const log = useQuery({ queryKey: ["use", "prediction-log"], queryFn: () => logFn() });

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [symbols, setSymbols] = useState<string[]>([]);
  const [timeframes, setTimeframes] = useState<string[]>(["15m"]);

  const save = useMutation({
    mutationFn: () =>
      saveFn({ data: { name, description: "", code, symbols, timeframes } }),
    onSuccess: () => {
      setName("");
      setCode("");
      void qc.invalidateQueries({ queryKey: ["use", "bootstrap"] });
    },
  });

  const lifecycle = useMutation({
    mutationFn: (v: { id: string; status: (typeof LIFECYCLE)[number]["id"]; enabled?: boolean }) =>
      lifecycleFn({ data: v }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["use", "bootstrap"] }),
  });

  const deleteFn = useServerFn(deleteStrategy);
  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: (r) => {
      if (!r.ok && r.reason) window.alert(r.reason);
      void qc.invalidateQueries({ queryKey: ["use", "bootstrap"] });
    },
    onError: (e) => window.alert((e as Error).message),
  });

  const toggle = (list: string[], v: string, set: (x: string[]) => void) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const validation = save.data?.validation;
  const representation = save.data?.representation;

  return (
    <div dir="rtl" className="shell-gradient min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="glass flex flex-wrap items-start justify-between gap-4 rounded-2xl p-5">
          <div>
            <h1 className="text-lg font-semibold text-ink">قسم الإدارة</h1>
            <p className="mt-1 text-xs text-ink-soft">
              الكود الجديد لا يتحكم في أي أمر حقيقي: النشر يمنح صلاحية التحليل فقط.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/analyst" className="rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-primary-foreground">
              محلل الاستراتيجيات الذكي
            </Link>
            <Link to="/" className="rounded-full border border-glass-border px-4 py-1.5 text-xs text-ink hover:bg-muted">
              مساحة التحليل
            </Link>
          </div>
        </header>

        <ApiProviders />
        <HistoricalDataManager />

        <Panel title="إضافة استراتيجية" subtitle="يتم تحديد اللغة تلقائياً (Pine / MQL5 / JS / TS / Python) مع تحقق أمني قبل الحفظ.">
          <div className="grid gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسم الاستراتيجية"
              className="w-full rounded-xl border border-glass-border bg-background/70 px-3 py-2 text-sm text-ink"
            />
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={10}
              placeholder="الصق كود الاستراتيجية هنا"
              className="num w-full rounded-xl border border-glass-border bg-background/70 px-3 py-2 text-xs"
              dir="ltr"
            />
            <div>
              <div className="mb-1.5 text-[11px] text-ink-soft">الرموز</div>
              <div className="flex flex-wrap gap-1.5">
                {(bootstrap.data?.symbols ?? []).map((s) => (
                  <button
                    key={s.symbol}
                    type="button"
                    onClick={() => toggle(symbols, s.symbol, setSymbols)}
                    className={`rounded-full border px-3 py-1 text-[11px] ${
                      symbols.includes(s.symbol)
                        ? "border-ink bg-ink text-primary-foreground"
                        : "border-glass-border text-ink hover:bg-muted"
                    }`}
                  >
                    {s.display_name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-[11px] text-ink-soft">الفريمات</div>
              <div className="flex flex-wrap gap-1.5">
                {ANALYSIS_TIMEFRAMES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggle(timeframes, t, setTimeframes)}
                    className={`num rounded-full border px-3 py-1 text-[11px] ${
                      timeframes.includes(t)
                        ? "border-ink bg-ink text-primary-foreground"
                        : "border-glass-border hover:bg-muted"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              disabled={name.length < 2 || code.length < 10 || save.isPending}
              onClick={() => save.mutate()}
              className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {save.isPending ? "جاري التحقق والحفظ…" : "تحقق وحفظ"}
            </button>
            {!save.isPending && (name.trim().length < 2 || code.length < 10) && (
              <p className="text-xs text-muted-foreground">
                {name.trim().length < 2 ? "اكتب اسم الاستراتيجية (حرفان على الأقل) لتفعيل الزر." : "الصق الكود لتفعيل الزر."}
              </p>
            )}
            {save.isError && (
              <p className="text-xs text-bear">تعذر الحفظ: {(save.error as Error).message}</p>
            )}
          </div>

          {validation && (
            <div className="mt-4 space-y-2 rounded-xl border border-glass-border bg-background/60 p-3">
              {validation.validity && (
                <div className="space-y-1 text-xs text-ink" dir="ltr">
                  <div className="flex flex-wrap gap-1.5">
                    <Chip tone={validation.validity === "INVALID_CODE" ? "bear" : "bull"}>
                      {validation.validity === "INVALID_CODE" ? "Code Invalid ✗" : "Code Valid ✓"}
                    </Chip>
                    <Chip tone="bull">Saved ✓</Chip>
                    <Chip>Type: {validation.scriptType === "UNKNOWN" ? "—" : validation.scriptType}</Chip>
                    <Chip>{validation.validity}</Chip>
                  </div>
                  <div>
                    Backtest:{" "}
                    {validation.backtestExecutable ? "ENABLED" : `NOT EXECUTABLE — ${validation.scriptType === "INDICATOR" ? "no trading orders" : validation.notExecutableReason}`}
                  </div>
                  {(validation.diagnostics ?? []).map((d, i) => (
                    <div key={i} className="font-mono text-[11px] text-ink-soft">{d.code} · {d.construct} · line {d.line}:{d.col}</div>
                  ))}
                  {validation.scriptType === "INDICATOR" && save.data?.id && (
                    <Link to="/" search={{ indicator: save.data.id }} className="inline-block rounded-xl bg-ink px-4 py-2 text-xs font-semibold text-primary-foreground" dir="auto">
                      Open Next Candle Forecast / تشغيل توقع الشمعة القادمة
                    </Link>
                  )}
                  {validation.scriptType === "INDICATOR" && save.data?.id && <ConvertToStrategy strategyId={save.data.id} />}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                <Chip>{validation.language}</Chip>
                <Chip tone={validation.safe ? "bull" : "warn"}>
                  {validation.safe ? "آمن للتحليل" : "يحتاج مراجعة"}
                </Chip>
                {validation.sandboxRequired && <Chip tone="warn">يتطلب Sandbox</Chip>}
              </div>
              <ul className="space-y-1 text-[11px] text-ink-soft">
                {validation.findings.map((f, i) => (
                  <li key={i}>
                    [{f.severity}] {f.rule} — {f.detail}
                  </li>
                ))}
              </ul>
              {representation && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Stat label="المؤشرات" value={String(representation.indicators.length)} />
                  <Stat label="المعلمات" value={String(representation.parameters.length)} />
                  <Stat label="قواعد الدخول" value={String(representation.entryRules.length)} />
                  <Stat label="قواعد المخاطر" value={String(representation.riskRules.length)} />
                </div>
              )}
            </div>
          )}
        </Panel>

        <Panel title="الاستراتيجيات ودورة الحياة" subtitle="Draft → Validate → Backtest → Walk-Forward → Paper → Approved → Published">
          <div className="space-y-3">
            {(bootstrap.data?.strategies ?? []).map((s) => (
              <div key={s.id} className="rounded-xl border border-glass-border bg-background/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-ink">{s.name}</div>
                    <div className="mt-0.5 text-[11px] text-ink-soft">
                      {s.language} · v{s.version} · {s.status} · {s.enabled ? "مفعّلة" : "معطّلة"}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => lifecycle.mutate({ id: s.id, status: s.status as "draft", enabled: !s.enabled })}
                      className="rounded-full border border-glass-border px-3 py-1 text-[11px] text-ink hover:bg-muted"
                    >
                      {s.enabled ? "تعطيل" : "تفعيل"}
                    </button>
                    <button
                      type="button"
                      disabled={remove.isPending}
                      onClick={() => {
                        if (window.confirm(`حذف "${s.name}" نهائيًا؟`)) remove.mutate(s.id);
                      }}
                      className="rounded-full border border-destructive/50 px-3 py-1 text-[11px] text-destructive hover:bg-destructive/10"
                    >
                      حذف
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {LIFECYCLE.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => lifecycle.mutate({ id: s.id, status: l.id })}
                      className={`rounded-full border px-3 py-1 text-[11px] ${
                        s.status === l.id
                          ? "border-ink bg-ink text-primary-foreground"
                          : "border-glass-border text-ink hover:bg-muted"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
                <StrategyCode id={s.id} />
                {(s as { validation?: { scriptType?: string } | null }).validation?.scriptType === "INDICATOR" && <div className="mt-2 space-y-2"><Link to="/" search={{ indicator: s.id }} className="inline-block rounded-xl bg-ink px-4 py-2 text-xs font-semibold text-primary-foreground">Open Next Candle Forecast / تشغيل توقع الشمعة القادمة</Link><ConvertToStrategy strategyId={s.id} /></div>}
                {(s as { parent_indicator_id?: string | null }).parent_indicator_id && <p className="mt-1 text-[11px] text-ink-soft" dir="ltr">Generated from indicator {(s as { parent_indicator_id?: string }).parent_indicator_id} · DRAFT / UNVERIFIED until backtest & approval</p>}
              </div>
            ))}
            {(bootstrap.data?.strategies ?? []).length === 0 && (
              <p className="text-xs text-ink-soft">لا توجد استراتيجيات محفوظة بعد.</p>
            )}
          </div>
        </Panel>

        <SymbolCatalog />
        <ProBacktest symbols={bootstrap.data?.symbols ?? []} strategies={bootstrap.data?.strategies ?? []} />
        <UniversalEngine symbols={bootstrap.data?.symbols ?? []} strategies={(bootstrap.data?.strategies ?? []) as never} timeframes={ANALYSIS_TIMEFRAMES as unknown as string[]} />
        <CorrelationAnalyzer symbols={bootstrap.data?.symbols ?? []} timeframes={ANALYSIS_TIMEFRAMES as unknown as string[]} />
        <PineCodeGenerator symbols={bootstrap.data?.symbols ?? []} strategies={(bootstrap.data?.strategies ?? []) as never} />
        <PatternAnalyzer symbols={bootstrap.data?.symbols ?? []} strategies={(bootstrap.data?.strategies ?? []) as never} />
        <TvStrategyParity />
        <DataPanel symbols={bootstrap.data?.symbols ?? []} />
        <ForecastHealth />
        <ReliabilityDashboard symbols={bootstrap.data?.symbols ?? []} strategies={(bootstrap.data?.strategies ?? []) as never} />
        <JobsPanel symbols={bootstrap.data?.symbols ?? []} strategies={bootstrap.data?.strategies ?? []} />

        <Panel title="سجل تدقيق التوقعات" subtitle="كل توقع يُسجَّل مع إصدار النموذج ونظام السوق لتقييم مدى تنبؤية المحرك لاحقاً.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-right text-xs">
              <thead className="text-ink-soft">
                <tr className="border-b border-glass-border">
                  <th className="py-2 font-medium">الوقت</th>
                  <th className="py-2 font-medium">الرمز</th>
                  <th className="py-2 font-medium">الفريم</th>
                  <th className="py-2 font-medium">الاتجاه</th>
                  <th className="py-2 font-medium">صعود</th>
                  <th className="py-2 font-medium">هبوط</th>
                  <th className="py-2 font-medium">الثقة</th>
                  <th className="py-2 font-medium">النموذج</th>
                  <th className="py-2 font-medium">النظام</th>
                  <th className="py-2 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {(log.data ?? []).map((p) => (
                  <tr key={p.id} className="border-b border-glass-border/70 last:border-0">
                    <td className="num py-2">{new Date(p.created_at).toLocaleString("ar")}</td>
                    <td className="num py-2">{p.symbol}</td>
                    <td className="num py-2">{p.timeframe}</td>
                    <td className="py-2 text-ink">{p.direction}</td>
                    <td className="num py-2">{pct(p.bullish_probability)}</td>
                    <td className="num py-2">{pct(p.bearish_probability)}</td>
                    <td className="num py-2">{pct(p.confidence)}</td>
                    <td className="num py-2">{p.model_version}</td>
                    <td className="py-2 text-ink">{p.market_regime ?? "—"}</td>
                    <td className="py-2 text-ink">
                      {p.evaluation_status}
                      {p.actual_result ? ` · ${p.actual_result}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(log.data ?? []).length === 0 && (
            <p className="mt-2 text-xs text-ink-soft">لا توجد توقعات مسجلة بعد — شغّل تحليلاً من الصفحة الرئيسية.</p>
          )}
          <p className="mt-3 text-[11px] text-ink-soft">
            متوسط الثقة المسجلة: {numFmt(((log.data ?? []).reduce((a, p) => a + (p.confidence ?? 0), 0) / Math.max((log.data ?? []).length, 1)) * 100, 1)}%
          </p>
        </Panel>
      </div>
    </div>
  );
}
