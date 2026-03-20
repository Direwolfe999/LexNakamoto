;; ============================================================================
;; LexNakamoto - Milestone-Based sBTC Escrow Contract
;; ============================================================================
;; Version:     1.0.0
;; Author:      LexNakamoto Team
;; License:     MIT
;; Description: A production-grade escrow system for sBTC (SIP-010) that
;;              supports milestone-based fund releases (25 / 50 / 100 %),
;;              dispute resolution via a trusted arbiter, and post-condition
;;              safe transfers.  Written in Clarity 4 targeting the Stacks
;;              Nakamoto release.
;; ============================================================================

;; ---------------------------------------------------------------------------
;; 1. TRAIT IMPORTS
;; ---------------------------------------------------------------------------
;; We import the SIP-010 Fungible Token trait so every token interaction is
;; type-checked at deployment time.  sBTC implements this trait on mainnet.
(use-trait ft-trait .sip-010-ft-standard.sip-010-ft)

;; ---------------------------------------------------------------------------
;; 2. CONSTANTS - Error Codes
;; ---------------------------------------------------------------------------
;; Keeping error codes as named constants improves auditability and makes
;; the contract self-documenting.

(define-constant ERR-NOT-AUTHORIZED          (err u1000))
(define-constant ERR-ESCROW-NOT-FOUND        (err u1001))
(define-constant ERR-ESCROW-ALREADY-EXISTS   (err u1002))
(define-constant ERR-INVALID-AMOUNT          (err u1003))
(define-constant ERR-INVALID-MILESTONE       (err u1004))
(define-constant ERR-ESCROW-NOT-ACTIVE       (err u1005))
(define-constant ERR-ESCROW-IN-DISPUTE       (err u1006))
(define-constant ERR-ESCROW-ALREADY-COMPLETE (err u1007))
(define-constant ERR-MILESTONE-EXCEEDS-TOTAL (err u1008))
(define-constant ERR-TRANSFER-FAILED         (err u1009))
(define-constant ERR-ESCROW-EXPIRED          (err u1010))
(define-constant ERR-ESCROW-NOT-EXPIRED      (err u1011))
(define-constant ERR-ESCROW-NOT-IN-DISPUTE   (err u1012))
(define-constant ERR-SELF-ESCROW             (err u1013))
(define-constant ERR-INVALID-RESOLUTION      (err u1014))

;; ---------------------------------------------------------------------------
;; 3. CONSTANTS - Escrow States
;; ---------------------------------------------------------------------------
(define-constant STATE-ACTIVE    u1)
(define-constant STATE-DISPUTED  u2)
(define-constant STATE-COMPLETED u3)
(define-constant STATE-REFUNDED  u4)

;; ---------------------------------------------------------------------------
;; 4. CONSTANTS - Milestone Percentages
;; ---------------------------------------------------------------------------
;; The public API accepts friendly percentage values: 25, 50, or 100.
(define-constant MILESTONE-25   u25)
(define-constant MILESTONE-50   u50)
(define-constant MILESTONE-100  u100)

;; Default escrow time-lock duration: ~14 days in Stacks blocks.
;; At ~10-min Nakamoto blocks ~ 144 blocks/day x 14 days = 2016 blocks.
(define-constant DEFAULT-LOCK-PERIOD u2016)




;; ---------------------------------------------------------------------------
;; 5. DATA VARIABLES
;; ---------------------------------------------------------------------------
;; Global auto-incrementing escrow ID counter.
(define-data-var escrow-id-nonce uint u0)

;; Platform arbiter - can be set to a DAO contract in production.
(define-data-var platform-arbiter principal tx-sender)

;; ---------------------------------------------------------------------------
;; 6. DATA MAPS
;; ---------------------------------------------------------------------------
;; Primary escrow storage.  Each escrow is keyed by a unique uint ID.
(define-map escrows
  uint
  {
    buyer:             principal,
    seller:            principal,
    token-contract:    principal,
    total-amount:      uint,
    released-amount:   uint,
    state:             uint,
    created-at:        uint,
    expires-at:        uint,
    arbiter:           principal
  }
)

;; ---------------------------------------------------------------------------
;; 7. PRIVATE HELPERS
;; ---------------------------------------------------------------------------

;; Validate that a milestone percentage is one of the allowed values.
(define-private (is-valid-milestone (pct uint))
  (or (is-eq pct MILESTONE-25)
      (is-eq pct MILESTONE-50)
      (is-eq pct MILESTONE-100))
)

;; Calculate the amount of tokens for a given percentage of the total.
;; Uses integer division - any dust stays in escrow until the final release.
(define-private (calculate-milestone-amount (total uint) (pct uint))
  (/ (* total pct) u100)
)

;; Return the next escrow ID and increment the nonce atomically.
(define-private (next-escrow-id)
  (let ((current-id (var-get escrow-id-nonce)))
    (var-set escrow-id-nonce (+ current-id u1))
    current-id
  )
)

;; Internal transfer helper: sends tokens FROM this contract to a recipient.
;; Uses the concrete mock-sbtc contract reference to avoid the
;; trait-inside-as-contract limitation in Clarity.
;; NOTE: For mainnet deployment, replace .mock-sbtc with the actual sBTC
;; contract reference (e.g. 'SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.token-sbtc).
(define-private (transfer-from-escrow (amount uint) (recipient principal) (memo (buff 34)))
  (as-contract
    (contract-call? .mock-sbtc transfer
      amount
      tx-sender
      recipient
      (some memo)
    )
  )
)

;; ---------------------------------------------------------------------------
;; 8. READ-ONLY FUNCTIONS
;; ---------------------------------------------------------------------------

;; Fetch full escrow details by ID.  Returns none if the escrow does not exist.
(define-read-only (get-escrow (escrow-id uint))
  (map-get? escrows escrow-id)
)

;; Convenience getter: how much is still locked inside an escrow?
(define-read-only (get-remaining-balance (escrow-id uint))
  (match (map-get? escrows escrow-id)
    escrow (ok (- (get total-amount escrow) (get released-amount escrow)))
    ERR-ESCROW-NOT-FOUND
  )
)

;; Return the current global escrow counter (useful for front-ends).
(define-read-only (get-escrow-count)
  (ok (var-get escrow-id-nonce))
)

;; Return the current platform arbiter.
(define-read-only (get-platform-arbiter)
  (ok (var-get platform-arbiter))
)

;; Check whether an escrow has expired based on the current block height.
;; Uses Clarity 4 stacks-block-height (SIP-033 compatible).
(define-read-only (is-escrow-expired (escrow-id uint))
  (match (map-get? escrows escrow-id)
    escrow (ok (>= stacks-block-height (get expires-at escrow)))
    ERR-ESCROW-NOT-FOUND
  )
)

;; ---------------------------------------------------------------------------
;; 9. PUBLIC FUNCTIONS - Core Escrow Lifecycle
;; ---------------------------------------------------------------------------

;; -- 9a. CREATE ESCROW ------------------------------------------------------
;; The buyer locks `amount` of sBTC into the contract.  The funds are held
;; until the buyer releases milestones or a dispute is resolved.
;;
;; Post-condition note: callers MUST attach a post-condition that limits the
;; SIP-010 transfer to exactly `amount` so the contract can never pull more
;; tokens than the user intended.
(define-public (create-escrow
    (seller principal)
    (amount uint)
    (lock-period uint)
    (token <ft-trait>)
  )
  (let
    (
      (buyer tx-sender)
      (escrow-id (next-escrow-id))
      (effective-lock (if (> lock-period u0) lock-period DEFAULT-LOCK-PERIOD))
      (token-principal (contract-of token))
    )
    ;; Guards
    (asserts! (> amount u0)               ERR-INVALID-AMOUNT)
    (asserts! (not (is-eq buyer seller))  ERR-SELF-ESCROW)

    ;; Transfer sBTC from buyer into this contract.
    ;; The actual transfer is guarded by Stacks post-conditions at the tx
    ;; level; here we simply call the SIP-010 transfer function.
    (try! (contract-call? token transfer
            amount
            buyer
            (as-contract tx-sender)
            (some 0x4c45584e414b414d4f544f)  ;; memo: "LEXNAKAMOTO" in hex
          ))

    ;; Persist the escrow record.
    (asserts!
      (map-insert escrows escrow-id
        {
          buyer:           buyer,
          seller:          seller,
          token-contract:  token-principal,
          total-amount:    amount,
          released-amount: u0,
          state:           STATE-ACTIVE,
          created-at:      stacks-block-height,
          expires-at:      (+ stacks-block-height effective-lock),
          arbiter:         (var-get platform-arbiter)
        }
      )
      ERR-ESCROW-ALREADY-EXISTS
    )

    ;; Emit an on-chain event for indexers and front-ends.
    (print {
      event:     "escrow-created",
      escrow-id: escrow-id,
      buyer:     buyer,
      seller:    seller,
      amount:    amount,
      expires-at: (+ stacks-block-height effective-lock)
    })
    (ok escrow-id)
  )
)

;; -- 9b. RELEASE MILESTONE ---------------------------------------------------
;; The buyer releases a portion of the locked funds to the seller.
;; Valid milestone values: 25, 50, or 100 (percent of *total* escrow amount).
;;
;; The function calculates the absolute token amount for the requested
;; percentage, subtracts what has already been released, and transfers only
;; the *delta* to the seller.  This prevents double-spending.
(define-public (release-milestone
    (escrow-id uint)
    (milestone-pct uint)
  )
  (let
    (
      (escrow (unwrap! (map-get? escrows escrow-id) ERR-ESCROW-NOT-FOUND))
      (buyer            (get buyer          escrow))
      (seller           (get seller         escrow))
      (total            (get total-amount   escrow))
      (already-released (get released-amount escrow))
      (state            (get state           escrow))
      (target-released  (calculate-milestone-amount total milestone-pct))
      (release-delta    (if (> target-released already-released) (- target-released already-released) u0))
    )
    ;; Guards
    (asserts! (is-eq tx-sender buyer)                  ERR-NOT-AUTHORIZED)
    (asserts! (is-eq state STATE-ACTIVE)               ERR-ESCROW-NOT-ACTIVE)
    (asserts! (is-valid-milestone milestone-pct)        ERR-INVALID-MILESTONE)
    (asserts! (> release-delta u0)                      ERR-INVALID-AMOUNT)
    (asserts! (<= target-released total)                ERR-MILESTONE-EXCEEDS-TOTAL)

    ;; Transfer the delta from the contract to the seller.
    (try! (transfer-from-escrow release-delta seller 0x4d494c4553544f4e45))

    ;; Update state - mark completed if 100% released.
    (map-set escrows escrow-id
      (merge escrow {
        released-amount: target-released,
        state: (if (is-eq target-released total) STATE-COMPLETED STATE-ACTIVE)
      })
    )

    (print {
      event:         "milestone-released",
      escrow-id:     escrow-id,
      milestone-pct: milestone-pct,
      amount:        release-delta,
      new-total-released: target-released
    })
    (ok release-delta)
  )
)

;; -- 9c. INITIATE DISPUTE ----------------------------------------------------
;; Either the buyer or seller can flag an active escrow as disputed.
;; While disputed, no milestones can be released and the buyer cannot
;; reclaim funds.  Only the arbiter can resolve the dispute.
(define-public (initiate-dispute (escrow-id uint))
  (let
    (
      (escrow (unwrap! (map-get? escrows escrow-id) ERR-ESCROW-NOT-FOUND))
      (caller tx-sender)
    )
    ;; Only buyer or seller may raise a dispute.
    (asserts! (or (is-eq caller (get buyer escrow))
                  (is-eq caller (get seller escrow)))
              ERR-NOT-AUTHORIZED)
    ;; Must be in ACTIVE state to dispute.
    (asserts! (is-eq (get state escrow) STATE-ACTIVE) ERR-ESCROW-NOT-ACTIVE)

    ;; Freeze the escrow.
    (map-set escrows escrow-id
      (merge escrow { state: STATE-DISPUTED })
    )

    (print {
      event:     "dispute-initiated",
      escrow-id: escrow-id,
      raised-by: caller
    })
    (ok true)
  )
)

;; -- 9d. RESOLVE DISPUTE -----------------------------------------------------
;; The arbiter decides how to resolve a disputed escrow:
;;   * release-pct = 100 -> all remaining funds go to the seller
;;   * release-pct = 0   -> all remaining funds refunded to the buyer
;;   * release-pct = 25/50 -> partial release to seller, rest to buyer
;;
;; This gives the arbiter (DAO / admin) full flexibility.
(define-public (resolve-dispute
    (escrow-id uint)
    (release-pct uint)
  )
  (let
    (
      (escrow   (unwrap! (map-get? escrows escrow-id) ERR-ESCROW-NOT-FOUND))
      (remaining (- (get total-amount escrow) (get released-amount escrow)))
      (to-seller (/ (* remaining release-pct) u100))
      (to-buyer  (- remaining to-seller))
    )
    ;; Guards
    (asserts! (is-eq tx-sender (get arbiter escrow))  ERR-NOT-AUTHORIZED)
    (asserts! (is-eq (get state escrow) STATE-DISPUTED)
              ERR-ESCROW-NOT-IN-DISPUTE)
    (asserts! (<= release-pct u100)                    ERR-INVALID-RESOLUTION)

    ;; Disburse to seller (if any).
    (if (> to-seller u0)
      (try! (transfer-from-escrow to-seller (get seller escrow) 0x5245534f4c5645))
      true
    )

    ;; Refund to buyer (if any).
    (if (> to-buyer u0)
      (try! (transfer-from-escrow to-buyer (get buyer escrow) 0x524546554e44))
      true
    )

    ;; Finalise state.
    (map-set escrows escrow-id
      (merge escrow {
        released-amount: (get total-amount escrow),
        state: (if (is-eq release-pct u100) STATE-COMPLETED STATE-REFUNDED)
      })
    )

    (print {
      event:       "dispute-resolved",
      escrow-id:   escrow-id,
      to-seller:   to-seller,
      to-buyer:    to-buyer,
      resolved-by: tx-sender
    })
    (ok true)
  )
)

;; -- 9e. RECLAIM EXPIRED ESCROW -----------------------------------------------
;; If the escrow has passed its expires-at block height and is still active
;; (no dispute), the buyer can reclaim all remaining funds.
(define-public (reclaim-expired (escrow-id uint))
  (let
    (
      (escrow   (unwrap! (map-get? escrows escrow-id) ERR-ESCROW-NOT-FOUND))
      (remaining (- (get total-amount escrow) (get released-amount escrow)))
    )
    ;; Guards
    (asserts! (is-eq tx-sender (get buyer escrow))     ERR-NOT-AUTHORIZED)
    (asserts! (is-eq (get state escrow) STATE-ACTIVE)  ERR-ESCROW-NOT-ACTIVE)
    (asserts! (>= stacks-block-height (get expires-at escrow))
              ERR-ESCROW-NOT-EXPIRED)
    (asserts! (> remaining u0)                         ERR-INVALID-AMOUNT)

    ;; Transfer remaining funds back to buyer.
    (try! (transfer-from-escrow remaining (get buyer escrow) 0x5245434c41494d))

    ;; Finalise.
    (map-set escrows escrow-id
      (merge escrow {
        released-amount: (get total-amount escrow),
        state: STATE-REFUNDED
      })
    )

    (print {
      event:     "escrow-reclaimed",
      escrow-id: escrow-id,
      amount:    remaining,
      buyer:     tx-sender
    })
    (ok remaining)
  )
)

;; ---------------------------------------------------------------------------
;; 10. ADMIN FUNCTIONS
;; ---------------------------------------------------------------------------

;; Transfer arbiter role.  Only the current arbiter can reassign this.
(define-public (set-platform-arbiter (new-arbiter principal))
  (begin
    (asserts! (is-eq tx-sender (var-get platform-arbiter)) ERR-NOT-AUTHORIZED)
    (var-set platform-arbiter new-arbiter)
    (print { event: "arbiter-updated", new-arbiter: new-arbiter })
    (ok true)
  )
)
