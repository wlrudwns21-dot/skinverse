import { useEffect, useRef, useState } from 'react'
import { loadPaypalSdk, paypalEnabled } from '../payments/paypal'
import { s } from '../lib/css'
import { useStore } from '../store/StoreContext'

/**
 * The PayPal button, or an honest explanation of why there isn't one.
 *
 * Everything financial happens on the other side of `st.beginPayment` and
 * `st.capturePayment` — this component's whole job is to be a button and to
 * report what the customer did with it.
 */
export function PaypalButtons() {
  const st = useStore()
  const host = useRef<HTMLDivElement | null>(null)
  const [blocked, setBlocked] = useState(false)

  // The SDK renders once and then owns its subtree. Reading the callbacks
  // through a ref keeps a re-render of the checkout from tearing down a button
  // the customer may be halfway through using.
  const store = useRef(st)
  store.current = st

  useEffect(() => {
    if (!paypalEnabled) return
    let dead = false
    let buttons: ReturnType<NonNullable<typeof window.paypal>['Buttons']> | null = null

    void loadPaypalSdk()
      .then(() => {
        if (dead || !host.current || !window.paypal) return

        buttons = window.paypal.Buttons({
          style: { layout: 'vertical', shape: 'pill', height: 48, label: 'paypal' },

          // Reserve the stock and the points first, then tell PayPal what to
          // charge. The amount is decided entirely server-side; this returns
          // only PayPal's id for it.
          createOrder: async () => {
            const id = await store.current.beginPayment()
            if (!id) throw new Error('could not start the order')
            return id
          },

          onApprove: async () => {
            await store.current.capturePayment()
          },

          // Abandoning is a real outcome, not an error: the reservation has to
          // go back on the shelf or the next customer cannot buy it.
          onCancel: () => {
            void store.current.abandonPayment('customer_cancelled')
          },

          onError: (err: unknown) => {
            console.error('[skinverse] PayPal 오류', err)
            void store.current.abandonPayment('paypal_error')
          },
        })

        void buttons.render(host.current).catch((err) => {
          console.error('[skinverse] PayPal 버튼을 그리지 못했습니다', err)
          if (!dead) setBlocked(true)
        })
      })
      .catch(() => {
        if (!dead) setBlocked(true)
      })

    return () => {
      dead = true
      try {
        buttons?.close()
      } catch {
        /* Already gone with the page. */
      }
    }
  }, [])

  if (!paypalEnabled) {
    return (
      <div style={s('background:#FBF3E4;border:1px solid #EBD9B8;border-radius:14px;padding:14px 16px;margin-top:16px;font-size:12.5px;color:#8A6D32;line-height:1.6')}>
        <b>결제가 아직 연결되지 않았습니다.</b>
        <br />
        PayPal 클라이언트 ID가 설정되면 이 자리에 결제 버튼이 나타납니다.
      </div>
    )
  }

  if (blocked) {
    return (
      <div style={s('background:#FBE9E3;border:1px solid #EFCFC3;border-radius:14px;padding:14px 16px;margin-top:16px;font-size:12.5px;color:#A64B32;line-height:1.6')}>
        결제 모듈을 불러오지 못했습니다. 광고 차단 프로그램을 끄거나 다른 네트워크에서 다시
        시도해주세요.
      </div>
    )
  }

  return (
    <div style={s('margin-top:16px')}>
      {/* The SDK draws into this. Nothing else should touch it. */}
      <div ref={host} style={s('min-height:52px')} />

      {st.state.ppBusy && (
        <div style={s('display:flex;align-items:center;justify-content:center;gap:10px;padding:12px')}>
          <div style={s('width:18px;height:18px;border-radius:50%;border:2.5px solid #E4DCCB;border-top-color:#0B3D91;animation:spin .8s linear infinite')} />
          <span style={s('font-size:13px;font-weight:600;color:#0B3D91')}>{st.t.processing}</span>
        </div>
      )}
    </div>
  )
}
