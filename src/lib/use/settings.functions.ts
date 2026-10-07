import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Providers
export const getApiProviders = createServerFn()
  .handler(async () => {
    const { data, error } = await (supabaseAdmin as any)
      .from("use_api_providers")
      .select("id, provider, status, masked_key, settings, last_success_at, last_error_at, last_error, updated_at");
      
    if (error) throw new Error(error.message);
    return data as any[];
  });

export const saveApiProvider = createServerFn()
  .validator(z.object({
    provider: z.string(),
    key: z.string().optional(),
    settings: z.any().optional(),
    status: z.string().optional()
  }))
  .handler(async ({ data: { provider, key, settings, status } }) => {
    // Only update key if provided
    const payload: any = { provider, updated_at: new Date().toISOString() };
    if (key) {
      payload.secret_key = key;
      // Mask key (keep first 4 and last 4 if long enough, else just mask)
      if (key.length > 8) {
        payload.masked_key = `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
      } else {
        payload.masked_key = "••••••••";
      }
    }
    if (settings) payload.settings = settings;
    if (status) payload.status = status;

    const { data, error } = await (supabaseAdmin as any)
      .from("use_api_providers")
      .upsert(payload, { onConflict: "provider" })
      .select("id, provider, status, masked_key, settings, last_success_at, last_error_at, last_error, updated_at")
      .single();

    if (error) throw new Error(error.message);

    // Audit log (don't log the key)
    await (supabaseAdmin as any).from("use_api_provider_audit").insert({
      provider,
      action: key ? "UPDATED_KEY" : "UPDATED_SETTINGS",
      details: { settings }
    });

    return data as any;
  });

export const testApiProvider = createServerFn()
  .validator(z.object({ provider: z.string() }))
  .handler(async ({ data: { provider } }) => {
    // Fetch key
    const { data: row } = await (supabaseAdmin as any)
      .from("use_api_providers")
      .select("secret_key")
      .eq("provider", provider)
      .single();
      
    if (!row?.secret_key) throw new Error("No API key configured for this provider.");

    // Simple test logic based on provider
    let success = false;
    let errMessage = "";
    try {
      if (provider === "openai") {
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${row.secret_key}` }
        });
        if (!res.ok) throw new Error(`OpenAI error: ${res.statusText}`);
        success = true;
      } else if (provider === "twelvedata") {
        const res = await fetch(`https://api.twelvedata.com/time_series?symbol=AAPL&interval=1min&apikey=${row.secret_key}`);
        const data = await res.json();
        if (data.code && data.code !== 200) throw new Error(data.message || "Twelve Data error");
        success = true;
      } else if (provider === "databento") {
        // Just checking /metadata
        const res = await fetch("https://hist.databento.com/v0/metadata.list_datasets", {
           headers: { Authorization: `Basic ${btoa(`${row.secret_key}:`)}` }
        });
        if (!res.ok) throw new Error(`Databento error: ${res.statusText}`);
        success = true;
      } else if (provider === "binance") {
        // Binance doesn't strictly require API key for public endpoints, but we test the ping
        const res = await fetch("https://api.binance.com/api/v3/ping");
        if (!res.ok) throw new Error(`Binance error: ${res.statusText}`);
        success = true;
      } else {
        throw new Error("Unknown provider test logic");
      }
    } catch (e: any) {
      errMessage = e.message;
    }

    // Update status
    await (supabaseAdmin as any).from("use_api_providers").update({
      status: success ? "CONNECTED" : "INVALID_KEY",
      last_error: success ? null : errMessage,
      last_error_at: success ? null : new Date().toISOString(),
      last_success_at: success ? new Date().toISOString() : undefined,
    }).eq("provider", provider);

    await (supabaseAdmin as any).from("use_api_provider_audit").insert({
      provider,
      action: "TESTED",
      details: { success, error: errMessage }
    });

    if (!success) {
      throw new Error(errMessage);
    }
    return { success: true };
  });

// Historical Datasets
export const getHistoricalDatasets = createServerFn()
  .handler(async () => {
    const { data, error } = await (supabaseAdmin as any)
      .from("use_historical_datasets")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data as any[];
  });

export const deleteHistoricalDataset = createServerFn()
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data: { id } }) => {
    const { error } = await (supabaseAdmin as any).from("use_historical_datasets").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  });
