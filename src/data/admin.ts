import type {
  AdminMission,
  AdminOrder,
  AdminProduct,
  AdminReward,
  AdminUser,
  Kpi,
  OrderStatus,
} from './types'

/** SAMPLE DATA — order book. */
export const adminOrders: AdminOrder[] = [
  { no: 'SV-2609-4821', date: '09-14 10:42', name: 'Yuki Tanaka', country: '🇯🇵 Japan', amt: 74, carrier: 'DHL', tracking: '—', status: 'paid' },
  { no: 'SV-2609-4820', date: '09-14 09:15', name: 'Li Wei', country: '🇨🇳 China', amt: 51, carrier: 'EMS', tracking: '—', status: 'preparing' },
  { no: 'SV-2609-4818', date: '09-13 22:03', name: 'Ploy S.', country: '🇹🇭 Thailand', amt: 98, carrier: 'DHL', tracking: 'DHL 4402 8871', status: 'shipped' },
  { no: 'SV-2609-4815', date: '09-13 18:37', name: 'Emma Chen', country: '🇸🇬 Singapore', amt: 42, carrier: 'EMS', tracking: 'EM 552 918 KR', status: 'shipped' },
  { no: 'SV-2609-4809', date: '09-12 14:11', name: 'Sarah Kim', country: '🇺🇸 USA', amt: 126, carrier: 'DHL', tracking: 'DHL 4402 6650', status: 'delivered' },
  { no: 'SV-2609-4801', date: '09-11 20:49', name: 'Aiko Mori', country: '🇯🇵 Japan', amt: 37, carrier: 'EMS', tracking: '—', status: 'cancelled' },
]

/** SAMPLE DATA — inventory view of the catalogue. */
export const adminProducts: AdminProduct[] = [
  { id: 'p1', brand: 'LUMIVE', name: 'Hyaluron Barrier Serum', kind: 'Serum', ml: '50ml', price: 28, stock: 142, sold: 312, active: true, g: 'linear-gradient(150deg,#DDEAE3,#8FBCA6)' },
  { id: 'p2', brand: 'HANJUN', name: 'Cica Calming Cream', kind: 'Cream', ml: '60ml', price: 24, stock: 87, sold: 268, active: true, g: 'linear-gradient(150deg,#E7EBDD,#A9B98A)' },
  { id: 'p3', brand: 'ONYU', name: 'Green Tea Pore Toner', kind: 'Toner', ml: '200ml', price: 19, stock: 4, sold: 190, active: true, g: 'linear-gradient(150deg,#E3EDE0,#93B58E)' },
  { id: 'p4', brand: 'SOLBIT', name: 'Vitamin C Glow Ampoule', kind: 'Ampoule', ml: '30ml', price: 32, stock: 56, sold: 241, active: true, g: 'linear-gradient(150deg,#F4E8D7,#DBB27A)' },
  { id: 'p5', brand: 'MIREU', name: 'Rice Ceramide Sleep Mask', kind: 'Mask', ml: '80ml', price: 22, stock: 0, sold: 154, active: false, g: 'linear-gradient(150deg,#F0EBE1,#C9BA9B)' },
  { id: 'p6', brand: 'HAERIM', name: 'Sun Barrier Fluid SPF50+', kind: 'SPF', ml: '50ml', price: 18, stock: 203, sold: 388, active: true, g: 'linear-gradient(150deg,#F3E9DC,#E0C08E)' },
]

/** SAMPLE DATA — members. */
export const adminUsers: AdminUser[] = [
  { id: 'u1', name: 'Yuki Tanaka', email: 'yuki.t@mail.jp', country: '🇯🇵 Japan', level: 'Radiant', pts: 1240, activity: '12회 / 5건' },
  { id: 'u2', name: 'Li Wei', email: 'liwei88@mail.cn', country: '🇨🇳 China', level: 'Dewy', pts: 820, activity: '8회 / 3건' },
  { id: 'u3', name: 'Ploy S.', email: 'ploy.s@mail.th', country: '🇹🇭 Thailand', level: 'Luminary', pts: 4310, activity: '31회 / 14건' },
  { id: 'u4', name: 'Emma Chen', email: 'emma.c@mail.sg', country: '🇸🇬 Singapore', level: 'Dewy', pts: 655, activity: '6회 / 2건' },
  { id: 'u5', name: 'Sarah Kim', email: 'sarahk@mail.us', country: '🇺🇸 USA', level: 'Glow Starter', pts: 180, activity: '2회 / 1건' },
  { id: 'u6', name: 'Aiko Mori', email: 'aiko.m@mail.jp', country: '🇯🇵 Japan', level: 'Radiant', pts: 2050, activity: '19회 / 7건' },
]

/** SAMPLE DATA — mission reward configuration. */
export const adminMissions: AdminMission[] = [
  { id: 'm1', label: '아침 루틴 완료', cat: '일일', pts: 20, on: true },
  { id: 'm2', label: '선크림 바르기', cat: '일일', pts: 10, on: true },
  { id: 'm3', label: '물 1.5L 마시기', cat: '일일', pts: 10, on: true },
  { id: 'm4', label: '저녁 루틴 완료', cat: '일일', pts: 20, on: true },
  { id: 'w1', label: '시트 마스크 2회 사용', cat: '주간', pts: 50, on: true },
  { id: 'w2', label: '주간 AI 피부 스캔', cat: '주간', pts: 30, on: true },
]

/** SAMPLE DATA — redeemable reward stock. */
export const adminRewards: AdminReward[] = [
  { id: 'r1', name: '시카 크림 샘플 5ml', cost: 300, stock: 42 },
  { id: 'r2', name: '글로우 앰플 샘플 3ml', cost: 500, stock: 18 },
  { id: 'r3', name: '시트 마스크 3매', cost: 800, stock: 3 },
  { id: 'r4', name: '$5 할인 쿠폰', cost: 500, stock: 999 },
]

/** SAMPLE DATA — point rules as configured in the console. */
export const adminPointRules = { earnRate: 5, useCap: 30, streakBonus: 0 }

/** SAMPLE DATA — dashboard headline figures. */
export const adminKpis: Kpi[] = [
  { label: '오늘 매출', value: '$1,284', delta: '+18%', deltaColor: '#2E6B58' },
  { label: '오늘 주문', value: '23건', delta: '+4건', deltaColor: '#2E6B58' },
  { label: 'AI 스캔 (오늘)', value: '147회', delta: '+31%', deltaColor: '#2E6B58' },
  { label: '신규 가입', value: '38명', delta: '−5%', deltaColor: '#C25E43' },
]

/** SAMPLE DATA — 7-day sales by country, highest first (drives the bar widths). */
export const adminCountrySales: [string, number][] = [
  ['🇯🇵 Japan', 3120],
  ['🇨🇳 China', 2440],
  ['🇹🇭 Thailand', 1180],
  ['🇸🇬 Singapore', 960],
  ['🇺🇸 USA', 870],
]

/** SAMPLE DATA — scan-to-purchase funnel, widest step first. */
export const adminFunnel: [string, number][] = [
  ['방문', 4820],
  ['AI 스캔 완료', 1930],
  ['장바구니 담기', 742],
  ['구매 완료', 481],
]

/** SAMPLE DATA — footnote under the funnel. */
export const adminFunnelNote = { rate: '24.9%', multiple: '3.1×' }

/** Dashboard date line. */
export const adminToday = '2026년 9월 14일 (일) · 오늘 기준'

/** Signed-in operator shown in the sidebar. */
export const adminOperator = { initial: '관', name: '운영자', email: 'admin@skinverse.kr' }

/** Label, text colour and chip background for each order status. */
export const orderStatusMeta: Record<OrderStatus, [string, string, string]> = {
  paid: ['결제완료', '#B08133', '#FBF3E4'],
  preparing: ['배송준비', '#6B4B78', '#F1EAF3'],
  shipped: ['발송완료', '#2E6B58', '#EAF1EC'],
  delivered: ['배송완료', '#6E6252', '#F1EEE6'],
  cancelled: ['취소', '#C25E43', '#FBE9E3'],
  // Written by the payment webhook only. Red, because each one means money has
  // left and somebody needs to look at the order.
  partly_refunded: ['부분환불', '#B4622F', '#FBEFE3'],
  refunded: ['환불완료', '#C25E43', '#FBE9E3'],
  reversed: ['지급거절(분쟁)', '#A33B3B', '#FAE4E4'],
  payment_failed: ['결제실패', '#8A7D6C', '#F1EEE6'],
}

/**
 * What the operator may choose in the console.
 *
 * Only the fulfilment states. The payment states are missing on purpose: an
 * order is refunded because PayPal says so, and offering "환불완료" in a
 * dropdown would let the books say the money went back when it never did. The
 * database refuses those writes too — this list is the half of that rule the
 * operator can see.
 */
export const orderStatusOrder: OrderStatus[] = ['paid', 'preparing', 'shipped', 'delivered', 'cancelled']
