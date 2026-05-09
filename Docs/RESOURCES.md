# MISTHOS — Consolidated Solana Resources

A curated set of references we'll use while building Misthos. Each entry has a short summary and how it maps to the project.

- **https://www.solanaskills.com/**
  - Summary: Community-maintained directory of agent "skills" (Claude/Codex/agent integrations) and protocol guides (LI.FI, Helius, Phantom, Jupiter, etc.).
  - Use for: Agent prompt patterns, Solana-specific LLM skills, MCP server patterns, and quick examples for integrating partner SDKs.

- **https://solana.com/skills**
  - Summary: Solana Foundation's official Skills index linking to maintained skill repos (common-errors, payments, testing, security, frontend patterns).
  - Use for: Authoritative references, security checklist, testing guidance, and IDL/codegen recommendations.

- **https://github.com/solana-foundation/solana-dev-skill**
  - Summary: The Foundation-maintained skill repo (references, testing, compatibility, codegen, frontend patterns).
  - Use for: Local/offline reference for best-practices (Anchor, Surfpool, LiteSVM), example prompts for AI agents, and a knowledge base for debugging toolchain issues.

- **https://www.solana.new/**
  - Summary: SendAI / Superteam builder platform — CLI and agentic toolset that scaffolds and automates Solana app builds using skills.
  - Use for: Fast prototyping, optional scaffolding and agent tooling; helpful for rapid idea→prototype cycles during hackathon.

- **https://github.com/rtk-ai/rtk**
  - Summary: (GitHub repo) — review required. RTK may contain AI tooling/agents; we couldn't fully fetch content automatically.
  - Use for: Investigate for AI agent tooling (if relevant to Claude/Noah integration).

- **https://solana.com/docs/intro/quick-start**
  - Summary: Solana Quick Start and Playground guide — explains Solana Playground (beta.solpg.io), wallets, airdrops, and deploying simple programs.
  - Use for: Rapid devnet experimentation, tutorial steps for team onboarding, and Playground-based demos when local setup is slow.

- **https://superteam.fun/build/developer-tools**
  - Summary: Superteam developer stack, grants, hackathon advice, and curated builder resources.
  - Use for: Grant programs, hackathon-winning tactics, community office hour links, and potential Superteam support.

- **https://beta.solpg.io/**
  - Summary: Solana Playground (browser IDE) — create projects, compile/deploy to devnet, quick wallet integration.
  - Use for: Fast iteration for the Anchor program on devnet and quick PoC deployments when under time pressure.

- **https://solana.com/docs/intro/installation**
  - Summary: Official install script and dependency instructions (Solana CLI, Anchor, Node, Rust, Surfpool, etc.).
  - Use for: Team local dev setup checklist and reproducible environment for building and deploying the Anchor program.

- **https://solana.com/x402**
  - Summary: Docs and toolkit for the x402 HTTP-native payments standard on Solana (tooling, templates, MCP guidance).
  - Use for: Implementing `pay_x402`, generating x402 links for invoices, and ensuring Misthos qualifies for the x402 bonus track.

- **https://docs.privy.io/welcome**
  - Summary: Privy docs — embedded wallets, REST APIs for provisioning wallets, policies, and agentic wallets for custodial/managed integrations.
  - Use for: Consider as an embedded wallet/onramp option (agent wallets, treasury wallets) or to provision payer-facing wallets safely.

- **https://github.com/StockpileLabs/awesome-solana-oss**
  - Summary: Curated list of Solana OSS tools (Anchor, Solana Kit, Solana Playground, testing tools, clients, infra). Good starter list and dev tooling catalog.
  - Use for: Discovering libraries, testing frameworks, SDKs, and client-side tools to speed development and avoid reinventing components.

---

Recommended immediate actions

- Add these into our developer onboarding `README.md` and link `Docs/RESOURCES.md` so team members can find examples and code snippets quickly.
- Prioritize reading: `solana.com/intro/installation`, `solana.com/skills`, `solana.com/x402`, and `beta.solpg.io` (these are most directly useful for Misthos MVP).
- Next task: generate a short set of Claude prompt templates and MCP usage patterns derived from `solanaskills` + `solana-dev-skill` for invoice drafting and agent reminders.

File created: [Docs/RESOURCES.md](Docs/RESOURCES.md)
