;; ============================================================================
;; Mock sBTC Token - SIP-010 Compliant (For Testing Only)
;; ============================================================================
;; This contract simulates sBTC for Clarinet testing and local demo flows.
;; It keeps an owner-managed authorize-recipient compatibility hook for
;; legacy bootstrap helpers, while transfers remain permissive so both the
;; focused suite and older tests can run against the same mock token.
;; ============================================================================

(impl-trait .sip-010-ft-standard.sip-010-ft)

(define-fungible-token sbtc)

(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant CONTRACT-OWNER tx-sender)

(define-public (authorize-recipient (recipient principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    ;; Compatibility hook for older tests and dashboard bootstrap flows.
    (print { event: "recipient-authorized", recipient: recipient })
    (ok true)
  )
)

(define-public (transfer
    (amount uint)
    (sender principal)
    (recipient principal)
    (memo (optional (buff 34)))
  )
  (begin
    ;; Keep transfer permissive for test compatibility.
    ;; authorize-recipient remains available for local demo/bootstrap flows.
    (try! (ft-transfer? sbtc amount sender recipient))
    (match memo
      m (begin (print m) (ok true))
      (ok true)
    )
  )
)

(define-read-only (get-name)
  (ok "Wrapped sBTC (Mock)")
)

(define-read-only (get-symbol)
  (ok "sBTC")
)

(define-read-only (get-decimals)
  (ok u8)
)

(define-read-only (get-balance (account principal))
  (ok (ft-get-balance sbtc account))
)

(define-read-only (get-total-supply)
  (ok (ft-get-supply sbtc))
)

(define-read-only (get-token-uri)
  (ok (some u"https://stacks.co/sbtc.json"))
)

(define-public (mint (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (ft-mint? sbtc amount recipient)
  )
)
