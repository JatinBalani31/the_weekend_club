alter table public.registrations
add column if not exists razorpay_order_id text unique;