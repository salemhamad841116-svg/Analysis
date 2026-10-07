import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getHistoricalDatasets, deleteHistoricalDataset } from "@/lib/use/settings.functions";
import { Panel, Chip, numFmt } from "./primitives";

const STATUS_COLORS: Record<string, string> = {
  VERIFIED: "bg-green-500/20 text-green-500",
  PARTIAL: "bg-yellow-500/20 text-yellow-500",
  GAPS_FOUND: "bg-orange-500/20 text-orange-500",
  INVALID: "bg-red-500/20 text-red-500",
  OUTDATED: "bg-blue-500/20 text-blue-500",
};

export function HistoricalDataManager() {
  const qc = useQueryClient();
  const { data: datasets = [], isLoading } = useQuery({
    queryKey: ["historicalDatasets"],
    queryFn: () => getHistoricalDatasets()
  });

  const delMut = useMutation({
    mutationFn: deleteHistoricalDataset,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["historicalDatasets"] })
  });

  const [importOpen, setImportOpen] = useState(false);

  if (isLoading) return <div>Loading historical data...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Historical Data Manager</h2>
          <p className="text-muted-foreground text-sm">إدارة البيانات التاريخية</p>
        </div>
        <div className="flex gap-2">
          <button 
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded text-sm hover:bg-secondary/80 transition"
            onClick={() => alert("Provider sync triggered. This will run in the background.")}
          >
            Auto API Sync
          </button>
          <button 
            className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 transition"
            onClick={() => setImportOpen(true)}
          >
            Import File (CSV/Parquet/XLSX)
          </button>
        </div>
      </div>

      {importOpen && (
        <Panel className="p-4 border-primary">
          <h3 className="font-bold mb-2">Import Workflow</h3>
          <ol className="list-decimal pl-5 text-sm space-y-1 mb-4 text-muted-foreground">
            <li>Upload File</li>
            <li>Detect columns & Map OHLCV</li>
            <li>Select symbol, timeframe & timezone</li>
            <li>Validate, Deduplicate & Gap check</li>
            <li>Store to Database</li>
          </ol>
          <div className="flex gap-2">
            <input type="file" accept=".csv,.xlsx,.parquet" className="text-sm border border-border p-1 rounded" />
            <button className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm" onClick={() => alert("Not implemented in this demo")}>Next Step</button>
            <button className="px-3 py-1.5 border border-border rounded text-sm" onClick={() => setImportOpen(false)}>Cancel</button>
          </div>
        </Panel>
      )}

      <div className="grid gap-4">
        {datasets.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground bg-muted/30 rounded border border-dashed border-border">
            No historical datasets stored yet.
          </div>
        ) : datasets.map(d => (
          <Panel key={d.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-lg">{d.symbol}</h3>
                <Chip className="bg-muted">{d.timeframe}</Chip>
                <Chip className={STATUS_COLORS[d.status] || "bg-muted"}>{d.status}</Chip>
                <span className="text-xs text-muted-foreground border border-border px-2 py-0.5 rounded-full">{d.source}</span>
              </div>
              <div className="text-sm text-muted-foreground mt-2 grid grid-cols-4 gap-4">
                <div>Candles: <span className="text-foreground">{numFmt.format(d.total_candles)}</span></div>
                <div>Rejected: <span className="text-red-500">{numFmt.format(d.rejected_rows)}</span></div>
                <div>First: {d.first_candle_time ? new Date(d.first_candle_time).toLocaleDateString() : '-'}</div>
                <div>Last: {d.last_candle_time ? new Date(d.last_candle_time).toLocaleDateString() : '-'}</div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button className="text-xs bg-muted hover:bg-muted/80 px-3 py-1.5 rounded transition">
                Sync Missing
              </button>
              <button 
                className="text-xs bg-red-500/10 text-red-500 hover:bg-red-500/20 px-3 py-1.5 rounded transition"
                onClick={() => {
                  if (confirm("Delete this dataset?")) delMut.mutate({ id: d.id });
                }}
              >
                Delete
              </button>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
