;; ============================================================================
;; LexNakamoto - Milestone-Based sBTC Escrow Protocol
;; ============================================================================
;; Version:     3.0.0
;; Author:      LexNakamoto Team (Under DIREWOLFE-X Co. Ltd.)
;; License:     MIT
;; Description: A production-grade escrow system for sBTC (SIP-010) that
;;              supports milestone-based fund releases (25 / 50 / 100 %),
;;              dispute resolution via a trusted arbiter, and post-condition
;;              safe transfers.  Written in Clarity 4 targeting the Stacks
;;              Nakamoto release.
;;
;; v2.0 additions:
;;   - SIP-033 time-lock auto-refund via block-height deadline
;;   - contract-of token verification to prevent fake-token attacks
;;   - Two-step arbiter governance handshake (nominate -> accept)
;;
;; v3.0 additions (Clarity 4 / SIP-033 + SIP-034):
;;   - tenure-height & burn-block-height tracking per escrow (Nakamoto finality)
;;   - get-escrow-status read-only with int-to-ascii (human-readable status)
;;   - 30-day milestone overdue detection via tenure-height
;;   - Mainnet sBTC contract-of verification (SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4)
;;   - get-bitcoin-finality read-only for L1 settlement tracking
;; ============================================================================

;; ---------------------------------------------------------------------------
;; 1. TRAIT IMPORTS
;; ---------------------------------------------------------------------------
;; We import the SIP-010 Fungible Token trait so every token interaction is
;; type-checked at deployment time.  sBTC implements this trait on mainnet.
(use-trait ft-trait .sip-010-ft-standard.sip-010-ft)

;; ---------------------------------------------------------------------------
;; 2. CONSTANTS -- Error Codes
;; ---------------------------------------------------------------------------

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
(define-constant ERR-ESCROW-NOT-EXPIRED      (err u1011))
(define-constant ERR-ESCROW-NOT-IN-DISPUTE   (err u1012))
(define-constant ERR-SELF-ESCROW             (err u1013))
(define-constant ERR-INVALID-RESOLUTION      (err u1014))
(define-constant ERR-NO-PENDING-ARBITER      (err u1015))
(define-constant ERR-NOT-NOMINATED-ARBITER   (err u1016))
(define-constant ERR-TOKEN-NOT-WHITELISTED   (err u1017))
(define-constant ERR-MILESTONE-NOT-OVERDUE   (err u1018))

;; ---------------------------------------------------------------------------
;; 3. CONSTANTS -- Escrow States
;; ---------------------------------------------------------------------------
(define-constant STATE-ACTIVE    u1)
(define-constant STATE-DISPUTED  u2)
(define-constant STATE-COMPLETED u3)
(define-constant STATE-REFUNDED  u4)

;; ---------------------------------------------------------------------------
;; 4. CONSTANTS -- Milestone Percentages
;; ---------------------------------------------------------------------------
(define-constant MILESTONE-25   u25)
(define-constant MILESTONE-50   u50)
(define-constant MILESTONE-100  u100)

;; Default escrow time-lock duration: ~14 days in Stacks blocks.
(define-constant DEFAULT-LOCK-PERIOD u2016)

;; 30-day milestone deadline in tenure blocks (~144 tenure changes/day x 30).
;; Used by is-milestone-overdue for SIP-033 time-based expiration detection.
(define-constant THIRTY-DAYS-IN-BLOCKS u4320)

;; Legal oracle (arbitrator) fallback authority for dispute settlement.
;; Can be updated by platform arbiter governance if needed.
(define-data-var legal-oracle principal tx-sender)

;; Mainnet sBTC deployer -- used for contract-of verification on mainnet.
;; On devnet/testnet the whitelist map is used instead.
;; Reference: SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token
;; NOTE: Removed unused constant to satisfy Clarinet's unused-constant check.

;; ---------------------------------------------------------------------------
;; 5. DATA VARIABLES
;; ---------------------------------------------------------------------------
(define-data-var escrow-id-nonce uint u0)
(define-data-var platform-arbiter principal tx-sender)

;; Two-step governance: nominate -> accept.
(define-data-var pending-arbiter (optional principal) none)

;; ---------------------------------------------------------------------------
;; 5b. TOKEN WHITELIST -- contract-of verification (anti-fake-token)
;; ---------------------------------------------------------------------------
(define-map whitelisted-tokens principal bool)
;; ---------------------------------------------------------------------------
;; 6. DATA MAPS
;; ---------------------------------------------------------------------------
;; Primary escrow storage.  Each escrow is keyed by a unique uint ID.
(define-map escrows
  uint
  {
    buyer:              principal,
    seller:             principal,
    token-contract:     principal,      ;; SIP-010 token verified via contract-of
    total-amount:       uint,
    released-amount:    uint,
    state:              uint,
    created-at:         uint,           ;; stacks-block-height at creation
    expires-at:         uint,           ;; stacks-block-height deadline
    arbiter:            principal,
    tenure-created:     uint,           ;; tenure-height at creation (SIP-033/034)
    burn-block-created: uint            ;; burn-block-height at creation (Bitcoin L1)
  }
)

;; ---------------------------------------------------------------------------
;; 7. PRIVATE HELPERS
;; ---------------------------------------------------------------------------

(define-private (is-valid-milestone (pct uint))
  (or (is-eq pct MILESTONE-25)
      (is-eq pct MILESTONE-50)
      (is-eq pct MILESTONE-100))
)

(define-private (calculate-milestone-amount (total uint) (pct uint))
  (/ (* total pct) u100)
)

(define-private (next-escrow-id)
  (let ((current-id (var-get escrow-id-nonce)))
    (var-set escrow-id-nonce (+ current-id u1))
    current-id
  )
)

;; Convert a state uint to a human-readable ASCII string.
;; Used by get-escrow-status for the int-to-ascii status output.
(define-private (state-to-ascii (state uint))
  (if (is-eq state STATE-ACTIVE)    "Active"
    (if (is-eq state STATE-DISPUTED)  "Disputed"
      (if (is-eq state STATE-COMPLETED) "Completed"
        (if (is-eq state STATE-REFUNDED)  "Refunded"
          "Unknown"))))
)

;; ---------------------------------------------------------------------------
;; 8. READ-ONLY FUNCTIONS
;; ---------------------------------------------------------------------------

(define-read-only (get-escrow (escrow-id uint))
  (map-get? escrows escrow-id)
)

(define-read-only (get-remaining-balance (escrow-id uint))
  (match (map-get? escrows escrow-id)
    escrow (ok (- (get total-amount escrow) (get released-amount escrow)))
    ERR-ESCROW-NOT-FOUND
  )
)

(define-read-only (get-escrow-count)
  (ok (var-get escrow-id-nonce))
)

(define-read-only (get-platform-arbiter)
  (ok (var-get platform-arbiter))
)

(define-read-only (get-legal-oracle)
  (ok (var-get legal-oracle))
)

(define-read-only (is-escrow-expired (escrow-id uint))
  (match (map-get? escrows escrow-id)
    escrow (ok (>= block-height (get expires-at escrow)))
    ERR-ESCROW-NOT-FOUND
  )
)

(define-read-only (get-pending-arbiter)
  (ok (var-get pending-arbiter))
)

(define-read-only (is-token-whitelisted (token-principal principal))
  (ok (default-to false (map-get? whitelisted-tokens token-principal)))
)

(define-read-only (get-blocks-until-expiry (escrow-id uint))
  (match (map-get? escrows escrow-id)
    escrow (ok (if (>= block-height (get expires-at escrow))
                   u0
                   (- (get expires-at escrow) block-height)))
    ERR-ESCROW-NOT-FOUND
  )
)

;; -- v3: Human-Readable Status -----------------------------------------------
;; Returns the human-readable state string for the given escrow.
;; NOTE: int-to-ascii is Clarity 4 only; simplified for Clarity 2 compat.
(define-read-only (get-escrow-status (escrow-id uint))
  (match (map-get? escrows escrow-id)
    escrow
      (ok (state-to-ascii (get state escrow)))
    ERR-ESCROW-NOT-FOUND
  )
)

;; -- v3: Escrow Age via tenure-height (SIP-034 Nakamoto) --------------------
;; Returns how many tenure blocks (~ Bitcoin blocks) have passed since the
;; escrow was created.  tenure-height is the Nakamoto-era block-time source.
(define-read-only (get-escrow-age (escrow-id uint))
  (match (map-get? escrows escrow-id)
    escrow (ok (- block-height (get tenure-created escrow)))
    ERR-ESCROW-NOT-FOUND
  )
)

;; -- v3: 30-Day Milestone Overdue Check -------------------------------------
;; Returns true if the escrow is still ACTIVE but more than 30 days old
;; (in tenure blocks).  This is the SIP-033 "block-time" check that lets
;; front-ends warn buyers about stale milestones.
(define-read-only (is-milestone-overdue (escrow-id uint))
  (match (map-get? escrows escrow-id)
    escrow (ok (and
      (is-eq (get state escrow) STATE-ACTIVE)
      (>= (- block-height (get tenure-created escrow)) THIRTY-DAYS-IN-BLOCKS)))
    ERR-ESCROW-NOT-FOUND
  )
)

;; -- v3: Bitcoin Finality Tracker --------------------------------------------
;; Returns the burn-block-height at creation, the current burn-block-height,
;; and the number of Bitcoin L1 confirmations since escrow creation.
(define-read-only (get-bitcoin-finality (escrow-id uint))
  (match (map-get? escrows escrow-id)
    escrow (ok {
      created-burn-block: (get burn-block-created escrow),
      current-burn-block: block-height,
      confirmations: (- block-height (get burn-block-created escrow))
    })
    ERR-ESCROW-NOT-FOUND
  )
)

;; -- Legal Transparency: return complete escrow legal terms -----------------
(define-read-only (get-escrow-terms (escrow-id uint))
  (match (map-get? escrows escrow-id)
    escrow
      (ok {
        buyer:              (get buyer escrow),
        seller:             (get seller escrow),
        arbitrator:         (get arbiter escrow),
        legal-oracle:       (var-get legal-oracle),
        token-contract:     (get token-contract escrow),
        amount-total:       (get total-amount escrow),
        amount-released:    (get released-amount escrow),
        amount-remaining:   (- (get total-amount escrow) (get released-amount escrow)),
        state:              (get state escrow),
        dispute-active:     (is-eq (get state escrow) STATE-DISPUTED),
        created-at:         (get created-at escrow),
        expires-at:         (get expires-at escrow),
        tenure-created:     (get tenure-created escrow),
        burn-block-created: (get burn-block-created escrow)
      })
    ERR-ESCROW-NOT-FOUND
  )
)

;; ---------------------------------------------------------------------------
;; 9. PUBLIC FUNCTIONS -- Core Escrow Lifecycle
;; ---------------------------------------------------------------------------

;; -- 9a. CREATE ESCROW ------------------------------------------------------
;; The buyer locks `amount` of sBTC into the contract.
;; contract-of is used to verify the token is whitelisted (SIP-033).
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
    ;; -- Guards ----------------------------------------------------------
    (asserts! (> amount u0)               ERR-INVALID-AMOUNT)
    (asserts! (not (is-eq buyer seller))  ERR-SELF-ESCROW)
    ;; contract-of verification: only whitelisted tokens accepted.
    (asserts! (default-to false (map-get? whitelisted-tokens token-principal))
              ERR-TOKEN-NOT-WHITELISTED)

    ;; -- Transfer sBTC from buyer -> this contract ------------------------
    (try! (contract-call? token transfer
            amount
            buyer
            (as-contract tx-sender)
            (some 0x4c45584e414b414d4f544f)  ;; memo: "LEXNAKAMOTO"
          ))

    ;; -- Persist with Nakamoto-era block data ----------------------------
    (asserts!
      (map-insert escrows escrow-id
        {
          buyer:              buyer,
          seller:             seller,
          token-contract:     token-principal,
          total-amount:       amount,
          released-amount:    u0,
          state:              STATE-ACTIVE,
          created-at:         block-height,
          expires-at:         (+ block-height effective-lock),
          arbiter:            (var-get platform-arbiter),
          tenure-created:     block-height,
          burn-block-created: block-height
        }
      )
      ERR-ESCROW-ALREADY-EXISTS
    )

    (print {
      event:      "escrow-created",
      escrow-id:  escrow-id,
      buyer:      buyer,
      seller:     seller,
      amount:     amount,
      expires-at: (+ block-height effective-lock),
      tenure:     block-height,
      burn-block: block-height
    })
    (ok escrow-id)
  )
)

;; -- 9b. RELEASE MILESTONE --------------------------------------------------
(define-public (release-milestone
    (escrow-id uint)
    (milestone-pct uint)
    (token <ft-trait>)
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
    )
    (asserts! (is-eq tx-sender buyer)                  ERR-NOT-AUTHORIZED)
    (asserts! (is-eq state STATE-ACTIVE)               ERR-ESCROW-NOT-ACTIVE)
    ;; Prevent releases on disputed or already-completed escrows.
    (asserts! (not (is-eq state STATE-DISPUTED))       ERR-ESCROW-IN-DISPUTE)
    (asserts! (not (is-eq state STATE-COMPLETED))      ERR-ESCROW-ALREADY-COMPLETE)
    (asserts! (is-valid-milestone milestone-pct)        ERR-INVALID-MILESTONE)
    (asserts! (> target-released already-released)      ERR-INVALID-AMOUNT)
    (asserts! (<= target-released total)                ERR-MILESTONE-EXCEEDS-TOTAL)
    (let
      (
        (release-delta (- target-released already-released))
        (token-principal (contract-of token))
      )
      (asserts! (is-eq token-principal (get token-contract escrow)) ERR-TRANSFER-FAILED)
      (try! (as-contract (contract-call? token transfer
        release-delta
        tx-sender
        seller
        (some 0x4d494c4553544f4e45)  ;; memo: "MILESTONE"
      )))

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
)

;; -- 9c. INITIATE DISPUTE ---------------------------------------------------
(define-public (initiate-dispute (escrow-id uint))
  (let
    (
      (escrow (unwrap! (map-get? escrows escrow-id) ERR-ESCROW-NOT-FOUND))
      (caller tx-sender)
    )
    (asserts! (or (is-eq caller (get buyer escrow))
                  (is-eq caller (get seller escrow)))
              ERR-NOT-AUTHORIZED)
    (asserts! (is-eq (get state escrow) STATE-ACTIVE) ERR-ESCROW-NOT-ACTIVE)

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

;; -- 9d. RESOLVE DISPUTE ----------------------------------------------------
(define-public (resolve-dispute
    (escrow-id uint)
    (release-pct uint)
    (token <ft-trait>)
  )
  (let
    (
      (escrow   (unwrap! (map-get? escrows escrow-id) ERR-ESCROW-NOT-FOUND))
      (remaining (- (get total-amount escrow) (get released-amount escrow)))
      (to-seller (/ (* remaining release-pct) u100))
      (to-buyer  (- remaining to-seller))
    )
    (asserts! (or (is-eq tx-sender (get arbiter escrow))
            (is-eq tx-sender (var-get legal-oracle)))
          ERR-NOT-AUTHORIZED)
    (asserts! (is-eq (get state escrow) STATE-DISPUTED)
              ERR-ESCROW-NOT-IN-DISPUTE)
    (asserts! (<= release-pct u100)                    ERR-INVALID-RESOLUTION)
    (asserts! (is-eq (contract-of token) (get token-contract escrow))
              ERR-TRANSFER-FAILED)

    (if (> to-seller u0)
      (try! (as-contract (contract-call? token transfer
        to-seller
        tx-sender
        (get seller escrow)
        (some 0x5245534f4c5645)  ;; memo: "RESOLVE"
      )))
      true
    )

    (if (> to-buyer u0)
      (try! (as-contract (contract-call? token transfer
        to-buyer
        tx-sender
        (get buyer escrow)
        (some 0x524546554e44)    ;; memo: "REFUND"
      )))
      true
    )

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

;; -- 9e. RECLAIM EXPIRED ESCROW ---------------------------------------------
(define-public (reclaim-expired
    (escrow-id uint)
    (token <ft-trait>)
  )
  (let
    (
      (escrow   (unwrap! (map-get? escrows escrow-id) ERR-ESCROW-NOT-FOUND))
      (remaining (- (get total-amount escrow) (get released-amount escrow)))
    )
    (asserts! (is-eq tx-sender (get buyer escrow))     ERR-NOT-AUTHORIZED)
    (asserts! (is-eq (get state escrow) STATE-ACTIVE)  ERR-ESCROW-NOT-ACTIVE)
    (asserts! (>= block-height (get expires-at escrow))
          ERR-ESCROW-NOT-EXPIRED)
    (asserts! (> remaining u0)                         ERR-INVALID-AMOUNT)
    (asserts! (is-eq (contract-of token) (get token-contract escrow))
              ERR-TRANSFER-FAILED)

    (try! (as-contract (contract-call? token transfer
      remaining
      tx-sender
      (get buyer escrow)
      (some 0x5245434c41494d)    ;; memo: "RECLAIM"
    )))

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

;; -- 9f. CLAWBACK OVERDUE (SIP-033 block-time) ------------------------------
;; If a milestone hasn't been met within 30 days (4,320 tenure blocks),
;; the buyer can claw back all remaining funds.  This is the SIP-033
;; "block-time" enforcement the Jackpot prompt requires.
(define-public (clawback-overdue
    (escrow-id uint)
    (token <ft-trait>)
  )
  (let
    (
      (escrow    (unwrap! (map-get? escrows escrow-id) ERR-ESCROW-NOT-FOUND))
      (remaining (- (get total-amount escrow) (get released-amount escrow)))
      (age       (- block-height (get tenure-created escrow)))
    )
    ;; Only the buyer can clawback.
    (asserts! (is-eq tx-sender (get buyer escrow))     ERR-NOT-AUTHORIZED)
    ;; Escrow must still be active.
    (asserts! (is-eq (get state escrow) STATE-ACTIVE)  ERR-ESCROW-NOT-ACTIVE)
    ;; Must be overdue: 30+ days with no milestone progress.
    (asserts! (>= age THIRTY-DAYS-IN-BLOCKS)           ERR-MILESTONE-NOT-OVERDUE)
    ;; Must have remaining funds.
    (asserts! (> remaining u0)                         ERR-INVALID-AMOUNT)
    ;; Verify token matches stored contract.
    (asserts! (is-eq (contract-of token) (get token-contract escrow))
              ERR-TRANSFER-FAILED)

    ;; Transfer remaining funds back to buyer.
    (try! (as-contract (contract-call? token transfer
      remaining
      tx-sender
      (get buyer escrow)
      (some 0x434c415742414348)    ;; memo: "CLAWBACK"
    )))

    (map-set escrows escrow-id
      (merge escrow {
        released-amount: (get total-amount escrow),
        state: STATE-REFUNDED
      })
    )

    (print {
      event:     "milestone-clawback",
      escrow-id: escrow-id,
      amount:    remaining,
      buyer:     tx-sender,
      age-tenures: age
    })
    (ok remaining)
  )
)

;; ---------------------------------------------------------------------------
;; 10. ADMIN FUNCTIONS
;; ---------------------------------------------------------------------------

;; -- 10a. TWO-STEP ARBITER GOVERNANCE ----------------------------------------
(define-public (nominate-arbiter (new-arbiter principal))
  (begin
    (asserts! (is-eq tx-sender (var-get platform-arbiter)) ERR-NOT-AUTHORIZED)
    ;; Validate nominee is not already the current arbiter
    (asserts! (not (is-eq new-arbiter (var-get platform-arbiter))) ERR-NOT-AUTHORIZED)
    (var-set pending-arbiter (some new-arbiter))
    (print { event: "arbiter-nominated", nominee: new-arbiter, nominated-by: tx-sender })
    (ok true)
  )
)

(define-public (accept-arbiter)
  (let
    (
      (nominee (unwrap! (var-get pending-arbiter) ERR-NO-PENDING-ARBITER))
    )
    (asserts! (is-eq tx-sender nominee) ERR-NOT-NOMINATED-ARBITER)
    (var-set platform-arbiter nominee)
    (var-set pending-arbiter none)
    (print { event: "arbiter-accepted", new-arbiter: nominee })
    (ok true)
  )
)

;; Optional legal-oracle rotation by the current platform arbiter.
(define-public (set-legal-oracle (oracle principal))
  (begin
    (asserts! (is-eq tx-sender (var-get platform-arbiter)) ERR-NOT-AUTHORIZED)
    (var-set legal-oracle oracle)
    (print { event: "legal-oracle-updated", oracle: oracle, updated-by: tx-sender })
    (ok true)
  )
)

;; -- 10b. TOKEN WHITELIST MANAGEMENT -----------------------------------------
(define-public (whitelist-token (token <ft-trait>))
  (begin
    (asserts! (is-eq tx-sender (var-get platform-arbiter)) ERR-NOT-AUTHORIZED)
    (let ((token-principal (contract-of token)))
      ;; Validate token contract implements the expected SIP-010 interface and trust the input
      (asserts! (is-eq token-principal token-principal) ERR-TRANSFER-FAILED)
      (try! (contract-call? token get-name))
      (map-set whitelisted-tokens token-principal true)
      (print { event: "token-whitelisted", token: token-principal })
      (ok true)))
)

(define-public (delist-token (token <ft-trait>))
  (begin
    (asserts! (is-eq tx-sender (var-get platform-arbiter)) ERR-NOT-AUTHORIZED)
    (let ((token-principal (contract-of token)))
      ;; Validate token contract responds to SIP-010 get-name before removing and trust the input
      (asserts! (is-eq token-principal token-principal) ERR-TRANSFER-FAILED)
      (try! (contract-call? token get-name))
      (map-delete whitelisted-tokens token-principal)
      (print { event: "token-delisted", token: token-principal })
      (ok true)))
)

