;; ============================================================================
;; Mock sBTC Token - SIP-010 Compliant (For Testing Only)
;; ============================================================================
;; This contract simulates sBTC for use in Clarinet devnet / unit tests.
;; It implements the full SIP-010 fungible token trait and allows the deployer
;; to mint tokens to any address.  DO NOT deploy this to mainnet.
;; ============================================================================

(impl-trait .sip-010-ft-standard.sip-010-ft)

;; ---------------------------------------------------------------------------
;; Token Definition
;; ---------------------------------------------------------------------------
(define-fungible-token sbtc)

;; ---------------------------------------------------------------------------
;; Constants
;; ---------------------------------------------------------------------------
(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-INSUFFICIENT-BALANCE (err u402))
(define-constant CONTRACT-OWNER tx-sender)

;; ---------------------------------------------------------------------------
;; SIP-010 Interface Implementation
;; ---------------------------------------------------------------------------

(define-public (transfer
    (amount uint)
    (sender principal)
    (recipient principal)
    (memo (optional (buff 34)))
  )
  (begin
    (asserts! (is-eq tx-sender sender) ERR-NOT-AUTHORIZED)
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

;; ---------------------------------------------------------------------------
;; Mint (deployer-only, for testing)
;; ---------------------------------------------------------------------------
(define-public (mint (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (ft-mint? sbtc amount recipient)
  )
)
