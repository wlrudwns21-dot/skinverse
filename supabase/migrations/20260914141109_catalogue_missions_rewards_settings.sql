-- The catalogue and the reward economy move out of src/data and into Postgres,
-- so the console's stock and mission edits actually persist and the storefront
-- reads the same rows the operator just changed.
--
-- Localised copy stays as jsonb keyed by language rather than four columns: the
-- set of languages is a product decision that changes, and a column-per-language
-- schema turns adding one into a migration.

create table public.products (
  id text primary key,
  brand text not null,
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  tag text not null,
  -- Which scan axis this answers to; 'uv' matches on local UV index instead.
  metric text not null,
  ml text not null,
  kind text not null,
  gradient text not null,
  ingredients text not null,
  sub jsonb not null default '{}'::jsonb,
  why jsonb not null default '{}'::jsonb,
  stock integer not null default 0 check (stock >= 0),
  sold integer not null default 0 check (sold >= 0),
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.missions (
  id text primary key,
  kind text not null check (kind in ('daily', 'weekly')),
  points integer not null default 0 check (points >= 0),
  label jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.rewards (
  id text primary key,
  cost integer not null check (cost >= 0),
  stock integer not null default 0 check (stock >= 0),
  label jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Single row: the `id` check pins it so a second settings row cannot appear.
create table public.store_settings (
  id boolean primary key default true check (id),
  earn_per_dollar integer not null default 5 check (earn_per_dollar >= 0),
  use_cap_pct integer not null default 30 check (use_cap_pct between 0 and 100),
  streak_bonus integer not null default 0 check (streak_bonus >= 0),
  updated_at timestamptz not null default now()
);

-- ── row level security ────────────────────────────────────────────────────
alter table public.products       enable row level security;
alter table public.missions       enable row level security;
alter table public.rewards        enable row level security;
alter table public.store_settings enable row level security;

-- The storefront is public, so anonymous visitors read the catalogue too. Rows
-- switched off are visible only to operators, so an unreleased product does not
-- leak through the API before it is meant to.
create policy "anyone reads live products" on public.products for select
  to anon, authenticated using (active or private.is_admin());
create policy "anyone reads live missions" on public.missions for select
  to anon, authenticated using (active or private.is_admin());
create policy "anyone reads live rewards"  on public.rewards  for select
  to anon, authenticated using (active or private.is_admin());
create policy "anyone reads settings"      on public.store_settings for select
  to anon, authenticated using (true);

-- Day-to-day catalogue work is open to any operator.
create policy "admin writes products" on public.products for all
  to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "admin writes missions" on public.missions for all
  to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "admin writes rewards"  on public.rewards  for all
  to authenticated using (private.is_admin()) with check (private.is_admin());

-- The point economy decides how much money the platform gives away, so it sits
-- with the master rather than with every operator.
create policy "master writes settings" on public.store_settings for update
  to authenticated using (private.is_master()) with check (private.is_master());

-- ── updated_at ────────────────────────────────────────────────────────────
create trigger products_touch  before update on public.products       for each row execute function public.touch_updated_at();
create trigger missions_touch  before update on public.missions       for each row execute function public.touch_updated_at();
create trigger rewards_touch   before update on public.rewards        for each row execute function public.touch_updated_at();
create trigger settings_touch  before update on public.store_settings for each row execute function public.touch_updated_at();

-- ── seed ──────────────────────────────────────────────────────────────────
insert into public.store_settings (id) values (true) on conflict (id) do nothing;

insert into public.products (id, brand, name, price, tag, metric, ml, kind, gradient, ingredients, sub, why, stock, sold, active, sort) values
('p1','LUMIVE','Hyaluron Barrier Serum',28,'Hydration','hydration','50ml','Serum','linear-gradient(150deg,#DDEAE3,#8FBCA6)','Hyaluronic Acid 5-complex · Panthenol · Beta-Glucan',
 '{"en":"Barrier hydration serum","ko":"히알루론 배리어 세럼","zh":"玻尿酸屏障精华","th":"เซรั่มเติมน้ำเสริมเกราะผิว"}',
 '{"en":"Layers five molecular weights of hyaluronic acid to refill the moisture your scan flagged as depleted.","ko":"다섯 가지 분자량의 히알루론산을 층층이 채워, 스캔에서 부족하다고 나온 수분을 보충합니다.","zh":"五种分子量的玻尿酸层层补水，补足扫描显示不足的水分。","th":"ไฮยาลูรอน 5 ขนาดโมเลกุลเติมความชุ่มชื้นที่ผลสแกนระบุว่าขาด"}',
 142,312,true,1),
('p2','HANJUN','Cica Calming Cream',24,'Soothing','sensitivity','60ml','Cream','linear-gradient(150deg,#E7EBDD,#A9B98A)','Centella 71% · Madecassoside · Ceramide NP',
 '{"en":"Centella calming cream","ko":"시카 진정 크림","zh":"积雪草舒缓面霜","th":"ครีมใบบัวบกปลอบประโลมผิว"}',
 '{"en":"Centella-dense formula calms the reactivity pattern the scan detected across your cheeks.","ko":"고농축 센텔라 성분이 스캔에서 감지된 볼 부위의 민감 반응을 진정시킵니다.","zh":"高浓度积雪草配方，舒缓扫描在脸颊检测到的敏感反应。","th":"สูตรใบบัวบกเข้มข้นช่วยลดความไวของผิวบริเวณแก้มที่สแกนพบ"}',
 87,268,true,2),
('p3','ONYU','Green Tea Pore Toner',19,'Pore','pores','200ml','Toner','linear-gradient(150deg,#E3EDE0,#93B58E)','Green Tea Water 80% · PHA 2% · Zinc PCA',
 '{"en":"PHA pore-care toner","ko":"그린티 모공 토너","zh":"绿茶毛孔爽肤水","th":"โทนเนอร์ชาเขียวดูแลรูขุมขน"}',
 '{"en":"Mild PHA keeps T-zone congestion clear without stripping — matched to your pore score.","ko":"순한 PHA가 자극 없이 T존 막힘을 관리해요 — 모공 점수에 맞춘 추천.","zh":"温和PHA疏通T区堵塞而不刺激 — 匹配你的毛孔评分。","th":"PHA อ่อนโยนช่วยให้ทีโซนโล่งโดยไม่ทำร้ายผิว — จับคู่กับคะแนนรูขุมขนของคุณ"}',
 4,190,true,3),
('p4','SOLBIT','Vitamin C Glow Ampoule',32,'Brightening','pigmentation','30ml','Ampoule','linear-gradient(150deg,#F4E8D7,#DBB27A)','Ascorbic Acid 12% · Ferulic Acid · Niacinamide 2%',
 '{"en":"Vitamin C brightening ampoule","ko":"비타민C 글로우 앰플","zh":"维C焕亮安瓶","th":"แอมพูลวิตามินซีผิวโกลว์"}',
 '{"en":"Targets the uneven-tone zones your scan mapped along the cheekbones.","ko":"스캔이 광대 부위에 표시한 톤 불균형 구역을 집중 케어합니다.","zh":"针对扫描在颧骨区域标记的肤色不均。","th":"จัดการโทนสีผิวไม่สม่ำเสมอบริเวณโหนกแก้มตามที่สแกนพบ"}',
 56,241,true,4),
('p5','MIREU','Rice Ceramide Sleep Mask',22,'Hydration','hydration','80ml','Mask','linear-gradient(150deg,#F0EBE1,#C9BA9B)','Rice Extract · Ceramide NP · Squalane',
 '{"en":"Overnight barrier mask","ko":"라이스 세라마이드 슬리핑 마스크","zh":"大米神经酰胺睡眠面膜","th":"สลีปปิ้งมาสก์ข้าว-เซราไมด์"}',
 '{"en":"Overnight occlusive layer that locks in your PM routine while barrier recovery peaks.","ko":"장벽 회복이 가장 활발한 밤 시간, 저녁 루틴을 밀봉해 지켜줍니다.","zh":"夜间封闭层锁住晚间护肤，在屏障修护高峰期发挥作用。","th":"ชั้นล็อกความชุ่มชื้นข้ามคืน เก็บรูทีนกลางคืนไว้ขณะผิวฟื้นฟูสูงสุด"}',
 0,154,false,5),
('p6','HAERIM','Sun Barrier Fluid SPF50+',18,'SPF','uv','50ml','SPF','linear-gradient(150deg,#F3E9DC,#E0C08E)','Hybrid filters · PA++++ · No white cast',
 '{"en":"Daily fluid sunscreen","ko":"선 배리어 플루이드 SPF50+","zh":"轻盈防晒乳 SPF50+","th":"กันแดดเนื้อฟลูอิด SPF50+"}',
 '{"en":"The UV index in your city is high — daily broad-spectrum protection is non-negotiable.","ko":"거주 도시의 UV 지수가 높아요 — 매일의 광범위 자외선 차단은 필수입니다.","zh":"你所在城市UV指数偏高 — 每日广谱防晒不可省略。","th":"ดัชนี UV ในเมืองของคุณสูง — กันแดดแบบครอบคลุมทุกวันคือสิ่งจำเป็น"}',
 203,388,true,6);

insert into public.missions (id, kind, points, label, sort) values
('m1','daily',20,'{"en":"Complete AM routine","ko":"아침 루틴 완료","zh":"完成早间护肤","th":"ทำรูทีนเช้าครบ"}',1),
('m2','daily',10,'{"en":"Apply SPF 50+","ko":"선크림 바르기","zh":"涂抹 SPF50+","th":"ทากันแดด SPF50+"}',2),
('m3','daily',10,'{"en":"Drink 1.5L water","ko":"물 1.5L 마시기","zh":"喝水1.5升","th":"ดื่มน้ำ 1.5 ลิตร"}',3),
('m4','daily',20,'{"en":"Complete PM routine","ko":"저녁 루틴 완료","zh":"完成晚间护肤","th":"ทำรูทีนเย็นครบ"}',4),
('w1','weekly',50,'{"en":"Use sheet mask 2×","ko":"시트 마스크 2회 사용","zh":"敷面膜2次","th":"มาสก์แผ่น 2 ครั้ง"}',5),
('w2','weekly',30,'{"en":"Weekly AI skin scan","ko":"주간 AI 피부 스캔","zh":"每周AI肌肤扫描","th":"สแกนผิว AI รายสัปดาห์"}',6);

insert into public.rewards (id, cost, stock, label, sort) values
('r1',300,42,'{"en":"Cica Cream Sample 5ml","ko":"시카 크림 샘플 5ml","zh":"积雪草面霜小样 5ml","th":"เทสเตอร์ครีมซิก้า 5ml"}',1),
('r2',500,18,'{"en":"Glow Ampoule Sample 3ml","ko":"글로우 앰플 샘플 3ml","zh":"焕亮安瓶小样 3ml","th":"เทสเตอร์แอมพูล 3ml"}',2),
('r3',800,3,'{"en":"Sheet Mask 3-Pack","ko":"시트 마스크 3매","zh":"面膜3片装","th":"มาสก์แผ่น 3 ชิ้น"}',3),
('r4',500,999,'{"en":"$5 Off Coupon","ko":"5달러 할인 쿠폰","zh":"5美元优惠券","th":"คูปองลด $5"}',4);
