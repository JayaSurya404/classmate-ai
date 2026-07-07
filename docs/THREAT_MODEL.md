# Foundation threat model

The page, extension contexts, API, providers, loopback services, database, and rendered model output are separate trust boundaries. Capture is explicit. Page-derived content is bounded, stripped of interactive/form nodes, schema validated, and placed only in delimited untrusted source blocks. Cross-context messages are versioned and sender checked. Privileged capture checks active-tab access and requests the narrow origin at the moment of use.

Credentials remain in device-local extension storage, never sync storage, URLs, logs, telemetry, or exports. Cloud calls require TLS; Ollama accepts explicit HTTP loopback only. API tokens have fixed algorithms, issuer/audience validation, short access lifetime, hashed refresh records, and generic authentication errors. Database access is owner-scoped through repositories. Logs accept only safe identifiers, classifications, timings, and status fields.

Model output has no tool authority. Markdown is allowlist-sanitized, external links are protocol checked, and Shiki receives already extracted code text. Feature flags default off. Service-worker durability is provided by IndexedDB operation intent rather than memory. Security reviews must cover message spoofing, hostile DOM, prompt injection, XSS, token reuse, ownership bypass, rate limits, dependency provenance, and secret scanning.
