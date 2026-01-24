-- =========================================================
-- KAIROS · FASE 7 · ETAPA 3
-- RLS FIX — padronizar policies para TO authenticated
-- =========================================================

-- subscriptions
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
on public.subscriptions
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "subscriptions_insert_own" on public.subscriptions;
create policy "subscriptions_insert_own"
on public.subscriptions
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "subscriptions_update_own" on public.subscriptions;
create policy "subscriptions_update_own"
on public.subscriptions
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "subscriptions_delete_own" on public.subscriptions;
create policy "subscriptions_delete_own"
on public.subscriptions
for delete
to authenticated
using (user_id = auth.uid());

-- subscription_events (append-only)
drop policy if exists "subscription_events_select_own" on public.subscription_events;
create policy "subscription_events_select_own"
on public.subscription_events
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "subscription_events_insert_own" on public.subscription_events;
create policy "subscription_events_insert_own"
on public.subscription_events
for insert
to authenticated
with check (user_id = auth.uid());
