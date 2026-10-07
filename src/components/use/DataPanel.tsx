import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Chip, Panel, Stat } from "@/components/use/primitives";
import { fetchCoverage, getProviderHealth } from "@/lib/use/data.functions";

const t = (v: string | null | undefined) => (v ? v.replace("T", " ").slice(0, 19) : "—");

export function DataPanel({ symbols }: { symbols: { symbol: string }[] }) {
  const qc = useQueryClient();
  const health = useServerFn(getProviderHealth);
  const cov = useServerFn(fetchCoverage);
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTf] = useState("1h");
  const [days, setDays] = useState(30);
  const [provider, setProvider] = useState("");
  const [instrument, setInstrument] = useState("");
  const [market, setMarket] = useState("");
  const h = useQuery({ queryKey: ["provider-health"], queryFn: () => health() });
  const run = useMutation({
    mutationFn: () =>
      cov({
        data: {
          symbol, timeframe, days,
          ...(provider ? { provider } : {}),
          ...(instrument ? { providerSymbol: instrument } : {}),
          ...(market ? { market: market as "crypto" } : {}),
        },
      }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["provider-health"] }),
  });
  const r = run.data;
  return (
    <Panel title="مصادر البيانات والتغطية" subtitle="المسار الوحيد للبيانات التاريخية — نفس المسار المستخدم في مساحة التحليل">
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-xs" data-testid="provider-health">
          <thead className="text-ink-soft">
            <tr>
              {["المزود", "النوع", "الحالة", "آخر نجاح", "آخر فشل", "زمن الاستجابة", "HTTP", "الطلبات", "النجاح", "الفشل", "حد المعدل", "آخر خطأ"].map((c) => <th key={c} className="p-1 text-start">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {(h.data?.providers ?? []).map((p) => (
              <tr key={p.id} className="border-t border-border num">
                <td className="p-1 font-bold">{p.label}</td>
                <td className="p-1">{p.tier}</td>
                <td className="p-1"><Chip>{!p.configured ? "NOT_CONFIGURED" : (p.health?.last_status ?? "لم يُختبر")}</Chip></td>
                <td className="p-1">{t(p.health?.last_success_at)}</td>
                <td className="p-1">{t(p.health?.last_failure_at)}</td>
                <td className="p-1">{p.health?.last_latency_ms != null ? `${p.health.last_latency_ms}ms` : "—"}</td>
                <td className="p-1">{p.health?.last_http_status ?? "—"}</td>
                <td className="p-1">{p.health?.request_count ?? 0}</td>
                <td className="p-1">{p.health?.success_count ?? 0}</td>
                <td className="p-1">{p.health?.failure_count ?? 0}</td>
                <td className="p-1">{p.health?.rate_limit_state ?? "—"}</td>
                <td className="p-1 max-w-64 truncate" title={p.health?.last_error ?? ""}>{p.health?.last_error ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2 items-end mb-4">
        <select aria-label="الرمز" className="glass rounded px-2 py-1" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
          {symbols.map((s) => <option key={s.symbol}>{s.symbol}</option>)}
        </select>
        <select aria-label="الفريم" className="glass rounded px-2 py-1" value={timeframe} onChange={(e) => setTf(e.target.value)}>
          {["1m", "5m", "15m", "30m", "1h", "4h", "1D", "1W", "1M"].map((x) => <option key={x}>{x}</option>)}
        </select>
        <select aria-label="المزود" className="glass rounded px-2 py-1" value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="">تلقائي (المحلّل)</option>
          {(h.data?.providers ?? []).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <input aria-label="رمز المزود" placeholder="رمز المزود (اختياري)" className="glass rounded px-2 py-1 w-40" value={instrument} onChange={(e) => setInstrument(e.target.value)} />
        <select aria-label="السوق" className="glass rounded px-2 py-1" value={market} onChange={(e) => setMarket(e.target.value)}>
          <option value="">سوق الرمز</option>
          {["crypto", "forex", "metal", "futures", "stock"].map((m) => <option key={m}>{m}</option>)}
        </select>
        <input aria-label="الأيام" type="number" className="glass rounded px-2 py-1 w-20" value={days} min={1} max={365} onChange={(e) => setDays(+e.target.value)} />
        <span className="text-sm">يوم</span>
        <button className="rounded bg-primary text-primary-foreground px-3 py-1" disabled={run.isPending} onClick={() => run.mutate()}>
          {run.isPending ? "جارٍ الفحص…" : "فحص التغطية"}
        </button>
      </div>
      {run.error && <div className="text-destructive text-sm">{(run.error as Error).message}</div>}
      {r && (
        <div className="space-y-3" data-testid="coverage-report">
          <div className="flex flex-wrap gap-2 items-center">
            <Chip>{r.status}</Chip><Chip>Provider Match: {r.providerMatch}</Chip><Chip>{r.exchange}</Chip>
            {r.providerState && <Chip>{r.providerState}</Chip>}
            {r.error && <span className="text-destructive text-sm">{r.error}</span>}
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            <Stat label="المزود المطلوب" value={r.requestedProvider} />
            <Stat label="المزود الفعلي" value={r.actualProvider ?? "—"} />
            <Stat label="الشموع المغلقة المتوقعة" value={String(r.expectedBars)} />
            <Stat label="المحمّل" value={String(r.loadedBars)} />
            <Stat label="الناقص" value={String(r.missingBars)} />
            <Stat label="مكرر" value={String(r.duplicateBars)} />
            <Stat label="التغطية %" value={String(r.coveragePercent)} />
            <Stat label="خارج التقويم" value={String(r.unexpectedBars)} />
            <Stat label="أول شمعة" value={t(r.actualFirstBar)} />
            <Stat label="آخر شمعة" value={t(r.actualLastBar)} />
          </div>
          {r.providerChanges.length > 0 && <div className="text-sm">تغييرات المصدر: {r.providerChanges.join("، ")}</div>}
          <div className="text-sm max-h-48 overflow-auto">
            <div className="font-bold mb-1">الفترات الناقصة</div>
            {r.missingRanges.length === 0 ? <div>لا يوجد</div> : r.missingRanges.map((m, i) => <div key={i} className="num">{t(m.from)} → {t(m.to)} ({m.bars})</div>)}
          </div>
        </div>
      )}
    </Panel>
  );
}
