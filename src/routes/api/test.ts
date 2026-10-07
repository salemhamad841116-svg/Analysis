import { createFileRoute } from "@tanstack/react-router";
import { analyzeHistoricalPattern } from "../../lib/use/pattern.functions";
import { supabaseAdmin } from "../../integrations/supabase/client.server";

export const Route = createFileRoute("/api/test")({
  server: {
    handlers: {
      POST: async ({ request }) => {
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
        
        // Insert strategy
        const { data: strat } = await supabaseAdmin.from("use_strategies").insert({
          name: "Test ATR/Pivot",
          code,
          language: "pinescript"
        }).select("id").single();
        
        if (!strat) return new Response("Failed to create strat", { status: 500 });
        
        // Run analysis
        try {
            const res = await analyzeHistoricalPattern({ data: {
              strategyId: strat.id,
              symbol: "EUR/USD",
              timeframe: "5m",
              source: "R3",
              target: "S1",
              window: { kind: "MINUTES", minutes: 60 },
              minConfidence: 0.55,
              freeze: false
            }});
            return new Response(JSON.stringify(res), {
              headers: { "Content-Type": "application/json" }
            });
        } catch (e: any) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
      }
    }
  }
});
