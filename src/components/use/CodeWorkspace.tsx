import { useState } from "react";
import { Chip, Panel } from "@/components/use/primitives";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getWorkspaceHistory } from "@/lib/use/workspace.functions";

export function CodeWorkspace({ strategyId, onSelect }: { strategyId: string | null; onSelect?: (id: string) => void }) {
  const [diffMode, setDiffMode] = useState(false);
  const [compareId, setCompareId] = useState<string | null>(null);

  const getHistory = useServerFn(getWorkspaceHistory);
  const q = useQuery({
    queryKey: ["workspace", strategyId],
    queryFn: () => strategyId ? getHistory({ data: { id: strategyId } }) : null,
    enabled: !!strategyId
  });

  if (!strategyId) {
    return (
      <Panel title="AI Code Workspace">
        <p className="mb-2 text-xs text-muted-foreground">Merge codes, edit via chat, view version history and rollback.</p>
        <div className="flex h-[500px] items-center justify-center rounded border border-border bg-muted/30">
          <p className="text-sm text-muted-foreground">Ask the AI to generate/edit Pine Code or save an indicator first.</p>
        </div>
      </Panel>
    );
  }

  if (q.isLoading) return <Panel title="AI Code Workspace"><div className="p-6">Loading workspace...</div></Panel>;
  if (q.error || !q.data) return <Panel title="AI Code Workspace"><div className="p-6 text-destructive">{(q.error as Error)?.message || "Not found"}</div></Panel>;

  const { current, history, children } = q.data;
  const compareNode = diffMode && compareId ? history.find((h: any) => h.id === compareId) || current : null;

  return (
    <Panel title={`Code Workspace: ${current.name}`}>
      <div className="flex flex-col h-[600px] gap-2">
        {/* Toolbar */}
        <div className="flex gap-2 items-center text-sm flex-wrap">
          <button className="rounded bg-primary px-3 py-1 text-primary-foreground" onClick={() => {
            navigator.clipboard.writeText(current.code);
            alert("Code copied to clipboard!");
          }}>Copy Code</button>
          
          <button className="rounded border border-border px-3 py-1" onClick={() => {
            const blob = new Blob([current.code], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${current.name.replace(/\s+/g, "_")}.pine`;
            a.click();
          }}>Download .pine</button>
          
          <button className={`rounded border px-3 py-1 ${diffMode ? 'bg-muted border-primary' : 'border-border'}`} onClick={() => {
            setDiffMode(!diffMode);
            if (!diffMode && history.length > 1) {
              setCompareId(history[history.length - 2].id);
            }
          }}>View Diff</button>

          {diffMode && (
            <select className="rounded border border-border bg-background px-2 py-1 text-sm" value={compareId || ""} onChange={e => setCompareId(e.target.value)}>
              {history.map((h: any, i: number) => (
                <option key={h.id} value={h.id}>v{i+1}: {h.name.slice(0, 20)} {h.id === current.id ? "(Current)" : ""}</option>
              ))}
            </select>
          )}
        </div>

        {/* Info */}
        <div className="flex gap-2 text-xs text-muted-foreground flex-wrap">
          <span>Source Hash: <code className="bg-muted p-1 rounded">{current.source_indicator_hash || "N/A"}</code></span>
          {current.generated_strategy_hash && <span>Gen Hash: <code className="bg-muted p-1 rounded">{current.generated_strategy_hash}</code></span>}
          <Chip tone={current.status === "draft" ? "neutral" : "bull"}>{current.status}</Chip>
        </div>

        {/* Content */}
        <div className="flex-1 flex gap-2 overflow-hidden">
          {diffMode && compareNode ? (
            <>
              <div className="flex-1 flex flex-col border border-border rounded overflow-hidden">
                <div className="bg-muted p-1 text-xs font-bold text-center border-b border-border">Previous ({compareNode.name})</div>
                <textarea className="flex-1 p-2 text-xs font-mono bg-background resize-none outline-none" readOnly value={compareNode.code} />
              </div>
              <div className="flex-1 flex flex-col border border-border rounded overflow-hidden">
                <div className="bg-muted p-1 text-xs font-bold text-center border-b border-border">Current ({current.name})</div>
                <textarea className="flex-1 p-2 text-xs font-mono bg-background resize-none outline-none" readOnly value={current.code} />
              </div>
            </>
          ) : (
            <textarea className="flex-1 p-3 text-xs font-mono border border-border rounded bg-muted/10 resize-none outline-none" readOnly value={current.code} />
          )}
        </div>

        {/* Version History */}
        <div className="h-32 border-t border-border pt-2 overflow-auto">
          <h4 className="text-xs font-bold mb-1">Version History</h4>
          <div className="flex flex-col gap-1">
            {history.map((h: any, i: number) => (
              <div key={h.id} className={`flex justify-between items-center p-1 rounded text-xs ${h.id === current.id ? 'bg-primary/10 border border-primary/30' : 'bg-muted/30 border border-border'}`}>
                <div>
                  <span className="font-bold mr-2">v{i + 1}</span>
                  {h.name} <span className="text-muted-foreground ml-2">{new Date(h.created_at).toLocaleString()}</span>
                </div>
                {h.id !== current.id && onSelect && (
                  <button className="px-2 py-0.5 rounded bg-background border border-border text-[10px]" onClick={() => onSelect(h.id)}>Rollback (Load)</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}
