;; ============================================================================
;; SIP-010: Standard Trait Definition for Fungible Tokens
;; ============================================================================
;; Reference: https://github.com/stacksgov/sips/blob/main/sips/sip-010
;; This trait is used to interface with sBTC and any SIP-010 compliant token.
;; ============================================================================

(define-trait sip-010-ft
  (
    ;; Transfer tokens from sender to recipient. `memo` is an optional on-chain note.
    (transfer (uint principal principal (optional (buff 34))) (response bool uint))

    ;; Returns the human-readable name of the token.
    (get-name () (response (string-ascii 32) uint))

    ;; Returns the ticker symbol of the token.
    (get-symbol () (response (string-ascii 32) uint))

    ;; Returns the number of decimal places used by the token.
    (get-decimals () (response uint uint))

    ;; Returns the balance of a specific account.
    (get-balance (principal) (response uint uint))

    ;; Returns the total supply of the token in circulation.
    (get-total-supply () (response uint uint))

    ;; Returns the URI for off-chain token metadata (JSON schema).
    (get-token-uri () (response (optional (string-utf8 256)) uint))
  )
)
