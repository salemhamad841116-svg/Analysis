import type { DirectionState, HorizonForecast } from "@/lib/use/types";
import { Panel, pct } from "./primitives";
import { cn } from "@/lib/utils";

const STATE_LABEL: Record<DirectionState, string> = {
  STRONG_BULLISH: "صاعد قوي",
  BULLISH: "صاعد",
  NEUTRAL: "محايد",
  BEARISH: "هابط",
  STRONG_BEARISH: "هابط قوي",
};

const QUALITY_LABEL: Record<string, string> = {
  HIGH: "عالية",
  MEDIUM: "متوسطة",
  LOW: "منخفضة",
  NONE: "غير متاحة",
};

function tone(state: DirectionState): string {
  if (state === "STRONG_BULLISH" || state === "BULLISH") return "text-bull";
  if (state === "STRONG_BEARISH" || state === "BEARISH") return "text-bear";
  return "text-ink";
}

export function DirectionMatrix({ rows }: { rows: HorizonForecast[] }) {
  return (
    <Panel
      title="مصفوفة الاتجاه"
      subtitle="كل فريم يُدرَّب على بياناته الخاصة — لا يتم تمديد توقع فريم صغير إلى فريم كبير."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-right text-xs">
          <thead className="text-ink-soft">
            <tr className="border-b border-glass-border">
              <th className="py-2 font-medium">الفريم</th>
              <th className="py-2 font-medium">الحالة</th>
              <th className="py-2 font-medium">احتمال الاتجاه</th>
              <th className="py-2 font-medium">الثقة</th>
              <th className="py-2 font-medium">قوة الإشارة</th>
              <th className="py-2 font-medium">جودة البيانات</th>
              <th className="py-2 font-medium">العينات</th>
              <th className="py-2 font-medium">دقة خارج العينة</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.timeframe} className="border-b border-glass-border/70 last:border-0">
                <td className="num py-2.5">{r.timeframe}</td>
                <td className={cn("py-2.5 font-semibold", tone(r.state))}>
                  {r.supported ? STATE_LABEL[r.state] : "—"}
                </td>
                <td className="num py-2.5">{r.supported ? pct(r.directionProbability) : "—"}</td>
                <td className="num py-2.5">{r.supported ? pct(r.confidence) : "—"}</td>
                <td className="num py-2.5">{r.supported ? pct(r.signalStrength, 0) : "—"}</td>
                <td className="py-2.5 text-ink">{QUALITY_LABEL[r.dataQuality] ?? r.dataQuality}</td>
                <td className="num py-2.5">{r.sampleSize}</td>
                <td className="num py-2.5">{r.supported ? pct(r.historicalHitRate) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-3 space-y-1 text-[11px] text-ink-soft">
        {rows
          .filter((r) => r.note)
          .map((r) => (
            <li key={`note-${r.timeframe}`}>
              {r.timeframe}: {r.note}
            </li>
          ))}
      </ul>
    </Panel>
  );
}
