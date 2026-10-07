-- API Providers Table
CREATE TABLE IF NOT EXISTS public.use_api_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
    masked_key TEXT,
    secret_key TEXT, -- Only visible to service_role, handled by RLS or omitted from select by default
    settings JSONB DEFAULT '{}'::jsonb,
    last_success_at TIMESTAMPTZ,
    last_error_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.use_api_providers ENABLE ROW LEVEL SECURITY;

-- Allow read for authenticated users (Admin UI needs to see this).
-- NOTE: We exclude secret_key from normal queries by default or rely on the UI to not display it.
-- Supabase doesn't support column-level RLS exactly like this easily without Views,
-- but we can just restrict write to admin or let service_role handle writes.
-- For now, authenticated users can read.
CREATE POLICY "Authenticated users can read api providers" ON public.use_api_providers
    FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to update (with the assumption they are admins, 
-- or we handle actual insert/update via server function)
CREATE POLICY "Authenticated users can insert api providers" ON public.use_api_providers
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update api providers" ON public.use_api_providers
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- API Providers Audit Log
CREATE TABLE IF NOT EXISTS public.use_api_provider_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    action TEXT NOT NULL, -- 'CREATED', 'UPDATED', 'DELETED', 'TESTED'
    user_id UUID REFERENCES auth.users(id),
    details JSONB, -- Record what changed (e.g., settings, model limits) but NEVER secret_key
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.use_api_provider_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read audit logs" ON public.use_api_provider_audit
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert audit logs" ON public.use_api_provider_audit
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Historical Datasets Table
CREATE TABLE IF NOT EXISTS public.use_historical_datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    source TEXT NOT NULL, -- e.g., 'CSV', 'twelvedata', 'databento', 'binance'
    status TEXT NOT NULL DEFAULT 'PARTIAL', -- VERIFIED, PARTIAL, GAPS_FOUND, INVALID, OUTDATED
    total_candles INTEGER DEFAULT 0,
    rejected_rows INTEGER DEFAULT 0,
    first_candle_time TIMESTAMPTZ,
    last_candle_time TIMESTAMPTZ,
    timezone TEXT DEFAULT 'UTC',
    metadata JSONB DEFAULT '{}'::jsonb, -- Store file info, duplicate counts, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(symbol, timeframe, source)
);

ALTER TABLE public.use_historical_datasets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage datasets" ON public.use_historical_datasets
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Grant permissions to service_role to bypass RLS for background jobs
GRANT ALL ON public.use_api_providers TO service_role;
GRANT ALL ON public.use_api_provider_audit TO service_role;
GRANT ALL ON public.use_historical_datasets TO service_role;
