/*
 * Why a refund does not simply undo a purchase.
 *
 * These rules were argued out when the refund path was built, and the place
 * they need to be readable is next to the function that applies them — not in
 * a commit message nobody will find in a year. Three things can come back out
 * of an order and they do not all come back in every case.
 */
comment on function public.reverse_checkout(text, text, numeric, text, text) is
$doc$결제를 되돌립니다. 결제사 웹훅(service_role)만 호출할 수 있습니다.

p_kind:
  refund    환불 — 부분 환불이면 금액만큼만 처리하고 'partly_refunded'로 둡니다
  reversal  분쟁 패소(chargeback) — 은행이 대금을 회수해 간 경우
  denied    승인 거절 — 대금이 실제로 들어온 적이 없는 경우

되돌리는 세 가지와 그 판단 근거:

  적립 포인트  항상 회수합니다. 부분 환불이면 환불 누적액에 비례해서 회수하므로,
              세 번에 나눠 전액 환불해도 한 번에 전액 환불한 것과 총액이 같습니다.
              회원 잔액이 모자라면 0에서 멈추고 부족분을 pointsShort로 기록합니다
              — 마이너스 잔액은 회계 기록이 아니라 고객 문의이기 때문입니다.

  사용 포인트  refund와 denied에서는 돌려주고, reversal에서는 돌려주지 않습니다.
              분쟁 패소는 고객이 이미 은행을 통해 대금 전액을 가져간 상태라,
              포인트까지 돌려주면 할인분을 두 번 지급하는 셈이 됩니다. 정당한
              분쟁이라고 판단되면 운영자가 grant_points()로 수동 지급하면 되고,
              그 사실이 감사 로그에 남습니다.

  재고        denied에서만 복구합니다. 승인 거절은 애초에 출고된 적이 없으니
              재고가 실제로 선반에 그대로 있습니다. 반면 환불·분쟁은 물건이
              어디 있는지 말해주지 않습니다 — 분쟁이면 대개 돌아오지 않고,
              반품이면 상자를 열어본 뒤에야 확인됩니다. 자동으로 더하면 없는
              재고를 만들어내는 것이고, 다음 고객이 보낼 수 없는 물건을 삽니다.
              운영자가 물건을 받은 뒤 직접 조정합니다.

p_ref는 결제사가 부여한 이 사건의 id입니다. 웹훅은 재전송되므로, 같은 ref가
다시 오면 audit_log를 조회해 아무것도 하지 않고 duplicate=true를 반환합니다.$doc$;

comment on function private.guard_payment_status() is
$doc$주문 상태 중 결제 관련 상태는 결제사 웹훅만 기록할 수 있도록 막는 트리거입니다.

authenticated에게 orders(status, tracking) update 권한이 있어 운영자 콘솔이
배송준비·발송완료로 주문을 진행시킵니다. 그 권한은 'refunded' 같은 값도 똑같이
쓸 수 있으므로, 손으로 입력한 '환불완료'는 돈은 그대로 있는데 장부만 나갔다고
말하게 됩니다. 반대로 환불된 주문을 'paid'로 되돌리는 것도 막습니다.

호출자 판별에 current_user를 쓰면 안 됩니다 — 이 함수는 SECURITY DEFINER라
내부에서 current_user가 항상 소유자(postgres)로 보이고, 그래서 처음 작성했을 때는
모든 호출자를 통과시켰습니다. role GUC는 SECURITY DEFINER의 영향을 받지 않고
PostgREST가 요청마다 설정하므로 이쪽이 정직한 답입니다.$doc$;

comment on column public.orders.refunded_at is
  '마지막으로 환불·분쟁·거절이 기록된 시각. 부분 환불이 여러 번이면 마지막 건 기준입니다.';
