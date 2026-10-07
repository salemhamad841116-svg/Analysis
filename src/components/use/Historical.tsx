import { useState } from "react";

import type { Bucket, HistoricalReport } from "@/lib/use/types";
import { Panel, Stat, numFmt, pct } from "./primitives";

const TABS: { id: keyof HistoricalReport | "stats"; label: string }[] = [
  { id: "stats", label: "ملخص" },
  { id: "byHour", label: "الساعات" },
  { id: "byWeekday", label: "الأيام" },
  { id: "byMonth", label: "الأشهر" },
  { id: "byRegime", label: "أنظمة السوق" },
  { id: "byVolatility", label: "التقلب" },
  { id: "featureCombinations", label: "أنماط مركبة" },
  { id: "aggregates", label: "التغطية الزمنية" },
];

function BucketTable({ rows, showPerf = true }: { rows: Bucket[]; showPerf?: boolean }) {
  if (rows.length === 0) return <p className="text-xs text-ink-soft">لا توجد عينات كافية لهذا التقسيم.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-right text-xs">
        <thead className="text-ink-soft">
          <tr className="border-b border-glass-border">
            <th className="py-2 font-medium">المجموعة</th>
            <th className="py-2 font-medium">العينات</th>
            {showPerf && <th className="py-2 font-medium">نسبة الربح</th>}
            {showPerf && <th className="py-2 font-medium">متوسط العائد</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.key} className="border-b border-glass-border/70 last:border-0">
              <td className="py-2 text-ink">{b.key}</td>
              <td className="num py-2">{b.samples}</td>
              {showPerf && <td className="num py-2">{pct(b.winRate)}</td>}
              {showPerf && <td className="num py-2">{numFmt(b.averageReturn)}%</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Historical({ report }: { report: HistoricalReport }) {
  const [tab, setTab] = useState<string>("stats");
  const s = report.stats;
  return (
    <Panel
      title="التحليل التاريخي"
      subtitle={`${report.periodStart ? new Date(report.periodStart).toLocaleDateString("ar") : "—"} ← ${
        report.periodEnd ? new Date(report.periodEnd).toLocaleDateString("ar") : "—"
      } · ${s.observations} شمعة · ${s.trades} إشارة`}
    >
      <div className="mb-4 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(String(t.id))}
            className={`rounded-full border px-3 py-1 text-[11px] transition ${
              tab === t.id
                ? "border-ink bg-ink text-primary-foreground"
                : "border-glass-border text-ink hover:bg-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "stats" ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="نسبة الربح" value={pct(s.winRate)} tone="bull" />
          <Stat label="نسبة الخسارة" value={pct(s.lossRate)} tone="bear" />
          <Stat label="التوقع الرياضي" value={`${numFmt(s.expectancy)}%`} />
          <Stat label="Profit Factor" value={numFmt(s.profitFactor)} />
          <Stat label="أقصى تراجع" value={`${numFmt(s.maxDrawdown)}%`} tone="bear" />
          <Stat label="متوسط العائد" value={`${numFmt(s.averageReturn)}%`} />
          <Stat label="أقصى حركة مواتية" value={`${numFmt(s.averageFavorableExcursion)}%`} tone="bull" />
          <Stat label="أقصى حركة معاكسة" value={`${numFmt(s.averageAdverseExcursion)}%`} tone="bear" />
          <Stat label="زمن الوصول للهدف" value={`${numFmt(s.averageTimeToTarget, 1)} شمعة`} />
          <Stat label="زمن الوصول للفشل" value={`${numFmt(s.averageTimeToFailure, 1)} شمعة`} />
          <Stat label="شراء (عدد / نجاح)" value={`${s.longTrades} / ${pct(s.longWinRate)}`} />
          <Stat label="بيع (عدد / نجاح)" value={`${s.shortTrades} / ${pct(s.shortWinRate)}`} />
        </div>
      ) : (
        <BucketTable
          rows={(report[tab as keyof HistoricalReport] as Bucket[]) ?? []}
          showPerf={tab !== "aggregates"}
        />
      )}
    </Panel>
  );
}
