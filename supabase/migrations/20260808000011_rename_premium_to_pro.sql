alter table public.user_plans drop constraint user_plans_plan_check;
update public.user_plans set plan = 'pro' where plan = 'premium';
alter table public.user_plans add constraint user_plans_plan_check check (plan = any (array['free'::text, 'pro'::text]));
