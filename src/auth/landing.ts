/**
 * What the URL said when the page opened.
 *
 * Supabase puts the outcome of an email link in the hash fragment —
 * `#access_token=…&type=signup`, or `#error=…&error_description=…` when the
 * link has expired — and then the client library consumes it and wipes the
 * hash. That happens before React renders, so by the time any screen could
 * look, the evidence is gone.
 *
 * Read once at module load, which is early enough to win that race. Everything
 * here is a fact about how the visitor arrived, not about who they are.
 */

function readHash(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams()
  // Supabase uses the fragment; some flows fall back to the query string.
  const fragment = window.location.hash.replace(/^#/, '')
  const query = window.location.search.replace(/^\?/, '')
  return new URLSearchParams(fragment || query)
}

const params = readHash()

/**
 * Which email link brought them here: `signup`, `recovery`, `email_change`,
 * or empty for an ordinary visit.
 */
export const arrivedFrom = params.get('type') ?? ''

/**
 * Why the link did not work, if it did not.
 *
 * Almost always an expired or already-used token. Without this the customer
 * clicks a link, lands on the home page, and is given no reason to think
 * anything went wrong — so they wait for an account that will never appear.
 */
export const arrivalError = params.get('error_description') ?? params.get('error') ?? ''

/** True when the link confirmed a new account. */
export const confirmedSignup = arrivedFrom === 'signup' || arrivedFrom === 'email_change'
