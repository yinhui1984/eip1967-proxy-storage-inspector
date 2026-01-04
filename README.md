
## EIP-1967 Proxy Storage Inspector

Human-readable EVM storage inspection for proxy contracts

Automatically resolve proxy contracts (EIP-1967), follow implementations, and decode on-chain storage into readable state.



### Overview

Smart contract storage inspection is still unnecessarily painful:
- Is this contract a proxy?
- Where is the real implementation?
- How do I calculate mapping / array storage slots?
- Why is everything just bytes32?

Proxy Storage Inspector is a developer & auditor–oriented CLI tool that answers these questions automatically.

You give it a contract address.
It gives you interpretable storage state, not raw hex.



## What This Tool Solves (Audit Pain Points)

- Automatically detects EIP-1967 proxies
- Resolves implementation / beacon contracts
- No manual slot calculation
- No guessing proxy patterns
- Outputs human-readable storage, not bytes32

Example output:

```
owner: 0x1234...
admin: 0x5678...
balances[0x9abc...]: 1000
implementation: 0xdef0...
```



This is designed for:
- Smart contract auditors
- Security researchers
- Protocol developers debugging production contracts
- Incident response & post-mortem analysis


### Design Philosophy

This tool is intentionally:
- Read-only (safe by default)
- RPC-agnostic
- Minimal abstraction
- Auditor-friendly

It does not attempt to be a full framework.
It does one thing: make on-chain storage understandable.


### Supported Proxy Patterns

Currently supported:
- EIP-1967 Transparent Proxy
- EIP-1967 Beacon Proxy

Storage slots handled:
- implementation
- admin
- beacon

Future extensions are intentionally conservative.



### Installation

```shell
git clone https://github.com/yinhui1984/eip1967-proxy-storage-inspector.git
cd eip1967-proxy-storage-inspector
npm install
```



### Usage

```shell
node index.js <contract-address>
```

**Example:**
```shell
node index.js 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eb48
```

**Example Output**

```
Analyzing contract: 0x...

Proxy detected: EIP-1967

Implementation: 0x...
Admin: 0x...

Summary:
implementation: 0x...
admin: 0x...
beacon: (empty)
```





### Note

#### Intended Audience

This project is not optimized for beginners.

It assumes familiarity with:
- EVM storage model
- Proxy patterns
- Solidity / EVM fundamentals

If you are an auditor or protocol engineer, this tool should feel obvious — not magical.



#### Limitations & Non-Goals

This tool intentionally does not:
- Perform vulnerability detection
- Infer business logic
- Replace manual audit reasoning
- Guess non-standard proxy patterns

Those are human responsibilities.



### Roadmap (Conservative)

Planned (only if justified):
- Mapping / array slot decoding helpers
- ABI-assisted storage decoding
- Multi-chain support (L2s)

No plans for:
- UI dashboards
- Over-automation
- "AI auditing"


### Security Considerations

- Read-only RPC calls only
- No private key usage
- No transaction signing
- Safe to run on untrusted contracts


### About

Author

Yinhui Zhou
Senior Software Engineer (15+ years)
Focus: EVM internals, proxy patterns, audit tooling

GitHub: https://github.com/yinhui1984

License MIT


Why This Exists

During audits, time spent decoding storage is pure waste.
This tool exists to remove that friction — nothing more.

