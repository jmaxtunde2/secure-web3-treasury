# Secure Web3 Treasury

A security-focused Web3 treasury application implementing **2-of-3 threshold authorization**, **EIP-712 typed signatures**, and secure on-chain transaction execution.

The project demonstrates practical smart-contract security engineering across Solidity, EVM authorization, cryptographic signatures, Foundry testing, fuzz testing, and a production-style Next.js Web3 frontend.

## Live Demo

**Production application:**
https://secure-web3-treasury.vercel.app/

**Network:** Ethereum Sepolia

**Smart contract:**
`0x8621D2F90346d40862aF0ba265b383D3C95Fc908`

## Overview

Secure Web3 Treasury allows a set of authorized treasury signers to collectively authorize transactions before they are executed on-chain.

The current configuration uses:

* **3 authorized signers**
* **2 required approvals**
* **EIP-712 typed transaction signatures**
* **ECDSA signature recovery and validation**
* **Per-proposal nonces**
* **Duplicate-signer protection**
* **On-chain execution-state protection**
* **Native ETH transfers**
* **Arbitrary contract calls**
* **ERC-20 token transfers**
* **Foundry security and fuzz testing**
* **Next.js + wagmi + viem frontend**

The core security principle is:

> Authorization is ultimately enforced by the smart contract. Frontend validation is only a pre-flight usability check.

---

## Architecture

```text
                         ┌──────────────────────┐
                         │      Web Browser      │
                         │                      │
                         │ Next.js Frontend     │
                         │ React + TypeScript   │
                         │ wagmi + viem         │
                         └──────────┬───────────┘
                                    │
                             Wallet Connection
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   Ethereum Sepolia   │
                         │                      │
                         │   SecureTreasury     │
                         │                      │
                         │  2-of-3 authorization │
                         │  EIP-712 signatures  │
                         │  ECDSA validation    │
                         │  Transaction execute │
                         └──────────────────────┘
```

The frontend communicates directly with the deployed smart contract through the user's Web3 wallet and Sepolia RPC infrastructure.

---

## Authorization Flow

A typical transaction follows this flow:

```text
1. Create proposal
        │
        ▼
2. Proposal receives unique ID / nonce
        │
        ▼
3. Transaction is represented using EIP-712
        │
        ▼
4. Treasury signers sign the typed transaction
        │
        ▼
5. Signatures are recovered on-chain
        │
        ▼
6. Non-signers are rejected
        │
        ▼
7. Duplicate signatures are not counted twice
        │
        ▼
8. Threshold >= 2 is required
        │
        ▼
9. Proposal marked executed
        │
        ▼
10. Target transaction is executed
```

The contract performs the final authorization check regardless of what the frontend reports.

---

## Smart Contract Security Model

### 1. Threshold Authorization

The treasury is configured with three authorized signers and a threshold of two.

A transaction cannot be executed unless at least two distinct registered signers provide valid signatures.

### 2. EIP-712 Typed Signatures

Transactions are signed using EIP-712 typed structured data.

The signed transaction includes:

```text
to
value
data
nonce
```

The EIP-712 domain also provides separation through the contract's domain configuration.

This prevents a signature generated for one authorization context from being treated as an equivalent authorization for another context.

### 3. ECDSA Signer Recovery

The contract recovers the signer address from every submitted signature and verifies that the recovered address belongs to the configured treasury signer set.

### 4. Duplicate Signer Protection

Submitting multiple signatures from the same signer cannot satisfy multiple portions of the threshold.

The contract tracks recovered signers during validation and counts each authorized signer at most once.

### 5. Proposal Execution Protection

Every proposal contains an `executed` state.

Once execution succeeds, the proposal cannot be executed again.

The contract also sets the execution state before making the external call, providing protection against repeated execution through reentrant control flow.

### 6. Failed Execution Handling

If the target transaction fails, the contract reverts the transaction.

Because the entire transaction reverts, the proposal does not remain permanently marked as executed after a failed execution.

### 7. Transaction Data Integrity

The transaction calldata is included in the signed transaction hash.

Changing the calldata therefore produces a different transaction digest and invalidates signatures generated for the original transaction.

### 8. Value Integrity

The ETH value transferred by a proposal is also part of the signed transaction.

Changing the value changes the transaction digest.

### 9. Contract / Chain Domain Separation

The EIP-712 domain binds signatures to the treasury contract and chain context.

The test suite explicitly verifies that transaction digests differ across treasury contracts and chain IDs.

---

## Testing

The smart contract was developed using **Foundry** with unit tests, negative tests, fuzz tests, and attack-oriented security tests.

Current result:

```text
Suite result: ok
36 passed
0 failed
0 skipped
```

### Security-relevant tests include

* Valid EIP-712 signatures
* Signature recovery
* Invalid signatures
* Malformed signatures
* Empty signatures
* Non-signer rejection
* Duplicate signer protection
* Duplicate signature threshold bypass prevention
* Signature ordering independence
* Modified transaction data rejection
* Modified transaction value rejection
* Nonce changes
* Cross-treasury digest separation
* Chain ID digest separation
* Cannot execute without threshold
* Cannot execute twice
* Reentrancy execution protection
* Failed execution state rollback
* ERC-20 transfer execution
* Reverting token behavior
* False-returning token behavior

### Fuzz testing

The project includes fuzz tests verifying properties such as:

```text
A duplicate signer must never increase the valid signer count.

A non-signer must never increase the valid signer count.
```

Each of these tests was executed with Foundry's fuzzing framework across 256 runs.

---

## Technology Stack

### Smart Contract

* Solidity
* OpenZeppelin Contracts
* EIP-712
* ECDSA
* SafeERC20
* Foundry
* Anvil

### Frontend

* Next.js
* React
* TypeScript
* wagmi
* viem
* Tailwind CSS

### Blockchain

* Ethereum Sepolia
* Ethereum-compatible EVM

### Deployment

* Vercel
* Foundry deployment scripts

---

## Project Structure

```text
secure-web3-treasury/
│
├── src/
│   └── SecureTreasury.sol
│
├── test/
│   └── SecureTreasury.t.sol
│
├── script/
│   ├── Deploy.s.sol
│   └── readme.txt
│
├── frontend/
│   ├── app/
│   │   ├── components/
│   │   ├── globals.css
│   │   └── page.tsx
│   │
│   ├── config/
│   │   ├── treasury.ts
│   │   └── wagmi.ts
│   │
│   └── package.json
│
├── backend/
│   └── ...
│
├── broadcast/
│
├── foundry.toml
├── package.json
└── README.md
```

---

## Deployment

The current production contract is deployed on Ethereum Sepolia.

```text
Contract:
0x8621D2F90346d40862aF0ba265b383D3C95Fc908

Network:
Ethereum Sepolia

Chain ID:
11155111
```

The frontend is deployed on Vercel:

```text
https://secure-web3-treasury.vercel.app/
```

The production frontend has been verified against the deployed Sepolia contract and successfully reads:

* Treasury threshold
* Authorized signers
* Proposal count
* Treasury balance
* Proposal execution state
* Connected wallet authorization status

---

## Security Considerations

This project is an educational and portfolio-oriented security engineering implementation.

It has not undergone an independent professional security audit and should not be treated as production financial infrastructure.

The implementation intentionally focuses on demonstrating:

* Secure authorization design
* Signature-based transaction authorization
* Replay/domain separation concepts
* External-call safety
* Reentrancy reasoning
* Fuzz testing
* Adversarial testing
* Failure-state handling
* Smart-contract security engineering practices

---

## Engineering Lessons

This project was built around a security-first development process:

```text
Threat Model
     ↓
Security Requirements
     ↓
Implementation
     ↓
Unit Tests
     ↓
Fuzz Tests
     ↓
Attack Simulation
     ↓
Mitigation
     ↓
Regression Tests
     ↓
Frontend Integration
     ↓
Sepolia Deployment
     ↓
Production Verification
```

The objective was not simply to implement a multisignature treasury, but to reason about how authorization can fail and then encode those security properties into automated tests.

---

## Author

**Jean-Marie Babatounde BIAOU**

Software Engineering | Blockchain Security | AI Systems

Research interests include:

* Blockchain security
* Smart-contract security
* AI systems
* Software security
* Edge AI

GitHub:
https://github.com/jmaxtunde2

LinkedIn:
https://www.linkedin.com/in/jmaxtunde2/

---

## Status

**Project 1 — Secure Web3 Treasury: Completed**

Core smart-contract implementation, security testing, frontend integration, Sepolia deployment, and production deployment are complete.

The project serves as a portfolio demonstration of practical **EVM, Solidity, Web3, and smart-contract security engineering**.
