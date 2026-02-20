# ✈️ Travel Mode Specification Package

> **Student Name**: Denys Usenko  
> **Date Submitted**: February 9, 2026  
> **AI Tools Used**: GitHub Copilot

---

## 📋 Project Overview

Specification-driven design for a self-service Travel Mode feature enabling cardholders to temporarily allow international transactions for selected countries.

## Rationale

The specification follows the provided template structure to enable AI-assisted implementation. Key design decisions:

1. **8 Low-Level Tasks** decompose the feature into logical units (types → services → integration → API → UI → tests), allowing incremental implementation with clear dependencies.

2. **Three time range variants** (date-only, date+time+timezone, indefinite) balance flexibility with implementation complexity—covering 95% of real-world travel scenarios.

3. **Authorization integration as a separate task** ensures the critical path (transaction approval) receives focused attention and performance requirements.

4. **Separation of agents.md and copilot-instructions.md**: agents.md defines *what* the AI should know about the domain (tech stack, compliance rules), while copilot-instructions.md defines *how* to write code (naming, patterns, anti-patterns).

## Industry Best Practices

| Practice | Location in Specification |
|----------|--------------------------|
| **Audit trail** | Mid-Level Objectives; Implementation Notes → Compliance; Tasks 2-6 |
| **UTC storage** | Implementation Notes → Data Handling; Task 1 type definitions |
| **PII protection** | Implementation Notes → Data Handling, Security; agents.md |
| **Soft-delete** | Implementation Notes → Data Handling; Task 2 delete method |
| **Rate limiting** | Implementation Notes → Security; Task 6 API endpoints |
| **7-year retention** | Implementation Notes → Compliance; agents.md |
| **Decimal for money** | agents.md → Domain Rules |
| **ISO country codes** | Task 1 type definitions; agents.md |
| **Performance SLA** | Implementation Notes → Performance; Task 3 authorization |
| **Input validation** | Task 6 API endpoints; copilot-instructions.md |
