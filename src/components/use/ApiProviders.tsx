import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getApiProviders, saveApiProvider, testApiProvider } from "@/lib/use/settings.functions";
import { Panel, Chip, numFmt } from "./primitives";

const PROVIDERS = ["openai", "twelvedata", "databento", "binance"];
const STATUS_COLORS: Record<string, string> = {
  CONNECTED: "bg-green-500/20 text-green-500",
  NOT_CONFIGURED: "bg-muted text-muted-foreground",
  INVALID_KEY: "bg-red-500/20 text-red-500",
  RATE_LIMITED: "bg-orange-500/20 text-orange-500",
  DEGRADED: "bg-yellow-500/20 text-yellow-500",
  BLOCKED: "bg-red-500/20 text-red-500",
  DELAYED_BY_PLAN: "bg-blue-500/20 text-blue-500"
};

export function ApiProviders() {
  const qc = useQueryClient();
  const { data: providers = [], isLoading } = useQuery({
    queryKey: ["apiProviders"],
    queryFn: () => getApiProviders()
  });

  const [editing, setEditing] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [settingsInput, setSettingsInput] = useState("");

  const saveMut = useMutation({
    mutationFn: saveApiProvider,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["apiProviders"] });
      setEditing(null);
    }
  });

  const testMut = useMutation({
    mutationFn: testApiProvider,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["apiProviders"] })
  });

  const handleEdit = (p: string, currentSettings: any) => {
    setEditing(p);
    setKeyInput("");
    setSettingsInput(currentSettings ? JSON.stringify(currentSettings, null, 2) : "{}");
  };

  const handleSave = (provider: string) => {
    let parsedSettings = {};
    try {
      parsedSettings = JSON.parse(settingsInput);
    } catch (e) {
      alert("Invalid JSON settings");
      return;
    }
    saveMut.mutate({
      provider,
      key: keyInput || undefined,
      settings: parsedSettings
    });
  };

  if (isLoading) return <div>Loading providers...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">API Keys & Providers</h2>
          <p className="text-muted-foreground text-sm">مفاتيح API ومزودو الخدمات</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {PROVIDERS.map(p => {
          const config = providers.find(x => x.provider === p);
          const status = config?.status || "NOT_CONFIGURED";

          return (
            <Panel key={p} className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold capitalize">{p}</h3>
                <Chip className={STATUS_COLORS[status] || "bg-muted"}>{status}</Chip>
              </div>

              {editing === p ? (
                <div className="space-y-3 mt-2 border-t border-border pt-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">API Key (leave blank to keep current)</label>
                    <input 
                      type="password" 
                      className="w-full bg-background border border-border p-2 rounded text-sm" 
                      value={keyInput} 
                      onChange={e => setKeyInput(e.target.value)}
                      placeholder="sk-..."
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Settings (JSON: limits, model, timeout)</label>
                    <textarea 
                      className="w-full bg-background border border-border p-2 rounded text-sm font-mono h-20" 
                      value={settingsInput}
                      onChange={e => setSettingsInput(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm disabled:opacity-50"
                      onClick={() => handleSave(p)}
                      disabled={saveMut.isPending}
                    >
                      {saveMut.isPending ? "Saving..." : "Save"}
                    </button>
                    <button 
                      className="px-3 py-1.5 border border-border rounded text-sm"
                      onClick={() => setEditing(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-sm font-mono bg-muted/50 p-2 rounded">
                    {config?.masked_key || "No key set"}
                  </div>
                  
                  {config?.last_error && (
                    <div className="text-xs text-red-500 bg-red-500/10 p-2 rounded break-all">
                      {config.last_error}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground grid grid-cols-2 gap-2 mt-auto">
                    <div>Last Success: {config?.last_success_at ? new Date(config.last_success_at).toLocaleString() : 'Never'}</div>
                    <div>Updated: {config?.updated_at ? new Date(config.updated_at).toLocaleString() : 'Never'}</div>
                  </div>

                  <div className="flex gap-2 mt-2 pt-3 border-t border-border">
                    <button 
                      className="text-xs bg-muted hover:bg-muted/80 px-3 py-1.5 rounded transition disabled:opacity-50"
                      onClick={() => handleEdit(p, config?.settings)}
                    >
                      Update
                    </button>
                    <button 
                      className="text-xs bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 px-3 py-1.5 rounded transition disabled:opacity-50"
                      onClick={() => testMut.mutate({ provider: p })}
                      disabled={testMut.isPending && testMut.variables?.provider === p}
                    >
                      {testMut.isPending && testMut.variables?.provider === p ? "Testing..." : "Test Connection"}
                    </button>
                    {status !== "NOT_CONFIGURED" && (
                       <button 
                         className="text-xs bg-red-500/10 text-red-500 hover:bg-red-500/20 px-3 py-1.5 rounded transition ml-auto"
                         onClick={() => saveMut.mutate({ provider: p, status: "NOT_CONFIGURED" })}
                       >
                         Disable
                       </button>
                    )}
                  </div>
                </>
              )}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
