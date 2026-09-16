-- Customer support, with a keyword bot in front of the queue.
--
-- A member asks a question; the bot matches it against `support_faqs` and
-- answers instantly when it can. Anything it cannot answer becomes an open
-- thread for an operator. Every exchange is one `support_threads` row with its
-- `support_messages`, so the bot's answer and the human's reply sit in the same
-- transcript and the member sees one continuous conversation.

create table public.support_faqs (
  id uuid primary key default gen_random_uuid(),
  -- Lower-cased match terms. Any one of them hitting the question is a match.
  keywords text[] not null default '{}',
  title jsonb not null default '{}'::jsonb,
  answer jsonb not null default '{}'::jsonb,
  category text not null default '기타',
  active boolean not null default true,
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.support_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null default '',
  category text not null default '기타',
  -- bot: answered automatically · open: waiting on a human · answered · closed
  status text not null default 'open' check (status in ('bot', 'open', 'answered', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index support_threads_status_idx on public.support_threads (status, updated_at desc);
create index support_threads_user_idx on public.support_threads (user_id, updated_at desc);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_threads(id) on delete cascade,
  sender text not null check (sender in ('member', 'bot', 'admin')),
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index support_messages_thread_idx on public.support_messages (thread_id, created_at);

-- ── row level security ────────────────────────────────────────────────────
alter table public.support_faqs     enable row level security;
alter table public.support_threads  enable row level security;
alter table public.support_messages enable row level security;

-- The FAQ is the bot's script; anyone may read the live entries.
create policy "anyone reads live faqs" on public.support_faqs for select
  to anon, authenticated using (active or private.is_admin());
create policy "admin writes faqs" on public.support_faqs for all
  to authenticated using (private.is_admin()) with check (private.is_admin());

-- A member sees only their own conversations; operators see the queue.
create policy "own threads read"   on public.support_threads for select using ((select auth.uid()) = user_id);
create policy "own threads insert" on public.support_threads for insert with check ((select auth.uid()) = user_id);
create policy "admin reads threads"   on public.support_threads for select using (private.is_admin());
create policy "admin updates threads" on public.support_threads for update using (private.is_admin()) with check (private.is_admin());

-- Messages inherit their thread's ownership.
create policy "own messages read" on public.support_messages for select
  using (exists (select 1 from public.support_threads t where t.id = thread_id and t.user_id = (select auth.uid())));
create policy "own messages insert" on public.support_messages for insert
  with check (
    exists (select 1 from public.support_threads t where t.id = thread_id and t.user_id = (select auth.uid()))
    -- A member may write as themselves or record the bot's reply, never as staff.
    and sender in ('member', 'bot')
  );
create policy "admin reads messages"  on public.support_messages for select using (private.is_admin());
create policy "admin writes messages" on public.support_messages for insert with check (private.is_admin());

create trigger support_faqs_touch before update on public.support_faqs
  for each row execute function public.touch_updated_at();
create trigger support_threads_touch before update on public.support_threads
  for each row execute function public.touch_updated_at();

-- A new message bumps its thread, so the operator queue sorts by real activity.
create function public.touch_thread_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.support_threads set updated_at = now() where id = new.thread_id;
  return new;
end;
$$;

revoke all on function public.touch_thread_on_message() from public, anon, authenticated;

create trigger support_messages_touch_thread
  after insert on public.support_messages
  for each row execute function public.touch_thread_on_message();

-- ── seed the bot's script ─────────────────────────────────────────────────
insert into public.support_faqs (keywords, category, title, answer, sort) values
(array['배송','언제','도착','택배','운송장','tracking','shipping','delivery','发货','物流','ส่ง','จัดส่ง'],
 '배송',
 '{"ko":"배송 기간이 얼마나 걸리나요?","en":"How long does shipping take?","zh":"配送需要多久？","th":"จัดส่งใช้เวลานานแค่ไหน?"}',
 '{"ko":"DHL Express는 영업일 기준 3–5일, K-Packet/EMS는 7–14일 걸립니다. 모두 서울에서 발송되며 운송장 번호는 발송 완료 시 마이페이지 주문 내역에서 확인하실 수 있습니다.","en":"DHL Express takes 3–5 business days and K-Packet/EMS takes 7–14. Everything ships from Seoul, and your tracking number appears in My Page under Orders once the parcel leaves.","zh":"DHL Express 需 3–5 个工作日，K-Packet/EMS 需 7–14 个工作日。全部从首尔发货，发货后可在「我的页面」订单中查看物流单号。","th":"DHL Express ใช้เวลา 3–5 วันทำการ และ K-Packet/EMS ใช้เวลา 7–14 วันทำการ ทุกรายการส่งจากโซล และเลขพัสดุจะแสดงในหน้าของฉัน > คำสั่งซื้อ เมื่อจัดส่งแล้ว"}',
 1),
(array['통관','관세','세금','customs','duty','tax','清关','关税','ศุลกากร','ภาษี'],
 '배송',
 '{"ko":"관세나 통관은 어떻게 되나요?","en":"What about customs and duties?","zh":"清关和关税怎么办？","th":"เรื่องศุลกากรและภาษีเป็นอย่างไร?"}',
 '{"ko":"DHL Express로 보내시면 통관 대행이 포함됩니다. 관세와 부가세는 국가별 기준에 따라 수취인께 부과될 수 있으며, 이는 주문 금액에 포함되어 있지 않습니다.","en":"DHL Express includes customs handling. Import duty and VAT are set by your country and may be charged to you on delivery — they are not included in the order total.","zh":"选择 DHL Express 时包含清关代办。关税和增值税由目的地国家规定，可能在签收时向您收取，不含在订单金额中。","th":"DHL Express รวมบริการผ่านพิธีการศุลกากรแล้ว ภาษีนำเข้าและ VAT เป็นไปตามกฎของประเทศปลายทาง และอาจเรียกเก็บจากผู้รับ ไม่รวมอยู่ในยอดสั่งซื้อ"}',
 2),
(array['포인트','적립','사용','할인','point','points','discount','积分','兑换','แต้ม','ส่วนลด'],
 '포인트',
 '{"ko":"포인트는 어떻게 쌓고 쓰나요?","en":"How do points work?","zh":"积分怎么获得和使用？","th":"แต้มใช้งานอย่างไร?"}',
 '{"ko":"구매 금액 $1당 포인트가 적립되고, 데일리·위클리 미션을 완료해도 받을 수 있습니다. 결제 시 주문 금액의 최대 30%까지 포인트로 할인받을 수 있어요 (100P = $1).","en":"You earn points on every dollar spent, and by completing daily and weekly missions. At checkout points can cover up to 30% of the order (100 P = $1).","zh":"每消费 1 美元可获得积分，完成每日和每周任务也能获得。结算时积分最多可抵扣订单金额的 30%（100积分 = 1美元）。","th":"คุณจะได้รับแต้มจากทุก 1 ดอลลาร์ที่ใช้จ่าย และจากการทำภารกิจรายวัน/รายสัปดาห์ ตอนชำระเงินใช้แต้มลดได้สูงสุด 30% ของยอดสั่งซื้อ (100 แต้ม = $1)"}',
 3),
(array['환불','취소','반품','refund','cancel','return','退款','取消','退货','คืนเงิน','ยกเลิก','คืนสินค้า'],
 '결제',
 '{"ko":"주문 취소나 환불이 가능한가요?","en":"Can I cancel or get a refund?","zh":"可以取消订单或退款吗？","th":"ยกเลิกหรือขอคืนเงินได้ไหม?"}',
 '{"ko":"발송 전에는 전액 취소가 가능합니다. 발송 후에는 상품 하자나 오배송의 경우 수령 후 7일 이내에 문의해주시면 처리해 드립니다. 개봉한 화장품은 위생상 단순 변심 반품이 어렵습니다.","en":"Before dispatch we can cancel in full. After dispatch, contact us within 7 days of delivery for a faulty or wrong item. Opened cosmetics cannot be returned for a change of mind, for hygiene reasons.","zh":"发货前可全额取消。发货后如遇商品瑕疵或错发，请在签收后 7 天内联系我们。出于卫生考虑，已拆封的化妆品不接受无理由退货。","th":"ก่อนจัดส่งสามารถยกเลิกได้เต็มจำนวน หลังจัดส่งแล้ว หากสินค้ามีตำหนิหรือส่งผิด กรุณาติดต่อภายใน 7 วันหลังได้รับ เครื่องสำอางที่เปิดใช้แล้วไม่สามารถคืนได้ด้วยเหตุผลด้านสุขอนามัย"}',
 4),
(array['분석','스캔','피부','ai','결과','정확','scan','analysis','skin','扫描','分析','肌肤','สแกน','วิเคราะห์','ผิว'],
 '분석',
 '{"ko":"AI 피부 분석은 어떻게 작동하나요?","en":"How does the AI skin analysis work?","zh":"AI 肌肤分析如何运作？","th":"การวิเคราะห์ผิวด้วย AI ทำงานอย่างไร?"}',
 '{"ko":"6개 항목(수분·탄력·모공·색소침착·주름·민감도)을 점수화하고, 거주 지역의 습도와 UV까지 반영해 맞춤 루틴과 제품을 추천합니다. 회원은 횟수 제한 없이 분석하고 변화를 기록으로 남길 수 있어요. 의학적 진단은 아니며 참고용입니다.","en":"It scores six axes — hydration, elasticity, pores, pigmentation, fine lines and sensitivity — then factors in your local humidity and UV to build a routine and match products. Members can scan as often as they like and keep the history. It is guidance, not a medical diagnosis.","zh":"它对六个维度评分（水分、弹性、毛孔、色素沉着、细纹、敏感度），并结合当地湿度和紫外线生成护肤方案与产品推荐。会员可无限次扫描并保存记录。仅供参考，非医学诊断。","th":"ระบบให้คะแนน 6 ด้าน (ความชุ่มชื้น ความยืดหยุ่น รูขุมขน จุดด่างดำ ริ้วรอย ความบอบบาง) แล้วนำความชื้นและ UV ในพื้นที่ของคุณมาสร้างรูทีนและแนะนำสินค้า สมาชิกสแกนได้ไม่จำกัดและเก็บประวัติได้ นี่เป็นคำแนะนำ ไม่ใช่การวินิจฉัยทางการแพทย์"}',
 5),
(array['결제','paypal','카드','페이팔','payment','card','支付','付款','银行卡','ชำระเงิน','บัตร'],
 '결제',
 '{"ko":"결제는 어떻게 하나요?","en":"How do I pay?","zh":"如何付款？","th":"ชำระเงินอย่างไร?"}',
 '{"ko":"현재 PayPal로 결제하실 수 있으며, PayPal 계정이 없어도 신용카드로 진행할 수 있습니다. 결제 통화는 USD입니다.","en":"We take PayPal, and you can pay by card through PayPal without an account. All prices are in USD.","zh":"目前支持 PayPal 付款，没有 PayPal 账户也可以用信用卡支付。结算货币为美元。","th":"รองรับการชำระผ่าน PayPal และสามารถจ่ายด้วยบัตรเครดิตผ่าน PayPal ได้แม้ไม่มีบัญชี ราคาทั้งหมดเป็นสกุลเงิน USD"}',
 6);
