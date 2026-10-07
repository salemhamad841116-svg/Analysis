-- Fix: Remove public (anon) read access from sensitive tables
-- 1. use_strategies
DROP POLICY "use_strategies public read" ON public.use_strategies;
CREATE POLICY "use_strategies auth read" ON public.use_strategies FOR SELECT TO authenticated USING (true);

-- 2. use_predictions
DROP POLICY "use_predictions public read" ON public.use_predictions;
CREATE POLICY "use_predictions auth read" ON public.use_predictions FOR SELECT TO authenticated USING (true);

-- 3. use_backtest_runs
DROP POLICY "use_backtest_runs public read" ON public.use_backtest_runs;
CREATE POLICY "use_backtest_runs auth read" ON public.use_backtest_runs FOR SELECT TO authenticated USING (true);

-- 4. use_analysis_runs
DROP POLICY "use_analysis_runs public read" ON public.use_analysis_runs;
CREATE POLICY "use_analysis_runs auth read" ON public.use_analysis_runs FOR SELECT TO authenticated USING (true);

-- 5. use_jobs
DROP POLICY "use_jobs public read" ON public.use_jobs;
CREATE POLICY "use_jobs auth read" ON public.use_jobs FOR SELECT TO authenticated USING (true);
