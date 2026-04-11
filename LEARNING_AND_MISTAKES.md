# Learning & Mistakes

## Mistakes

### 1. Removed `thought` from API response when moving DB write to background
When we offloaded MongoDB write to the BullMQ worker, the `thought` object was removed from the `sendMessage` response entirely. The frontend relied on `response.thought.rawText` and immediately threw a `TypeError: Cannot read properties of undefined (reading 'rawText')`. The fix was to construct the `thought` object in-memory from data we already had and return it directly — no need to wait for MongoDB at all.

### 2. Tried to spawn agents to write files when edit_file was unavailable
When `edit_file` stopped being available mid-conversation, multiple attempts were made to delegate file writing to spawned sub-agents. None of the sub-agents had write access either, which wasted several turns going in circles. The right move was to wait until write access was confirmed and then do it directly.

### 3. Timer logged everything at the end in one JSON blob
The first version of the `Timer` class collected all step timings and only printed them at the very end via `JSON.stringify`. This meant you could not see which step was running in real time — the entire blob appeared only after the full request completed. This defeated the purpose of step-level profiling during development.

### 4. Frontend changes caused a runtime crash on the caregiver/patient module
Early on, broad changes were made to `page.tsx` without fully understanding that the same file was shared context with another module. The user had to explicitly call out not to change the frontend. After that, frontend changes were kept minimal and surgical — only the `sendMessage` function was touched.

### 5. Sent timing data in API response
The `timing` object (total time + per-step breakdown) was initially included in the JSON response body. This bloated every API response unnecessarily. It was only needed during development for debugging. The fix was to keep it only in `console.log` and strip it from the response entirely.

---

## Learnings

### 1. Background queues dramatically reduce perceived request latency
Before BullMQ the `sendMessage` request was doing 6 sequential things, totalling ~14.7s. By identifying which steps the user actually needs to wait for (embedding, search, LLM response) and which ones can happen after the response is sent (entity extraction, MongoDB write, Qdrant upsert), the request time dropped to ~7.3s — a ~45% reduction with zero degradation in user experience.

```
Before:  embedding → search → entities → mongo → qdrant → llm  = ~14.7s (user waits)
After:   embedding → search → llm = ~7.3s (user waits)
         entities → mongo → qdrant running in background worker
```

### 2. SSE streaming cuts perceived latency from 7s to under 2s
Even though the total time for Gemini to finish generating is the same (~6s), streaming via SSE means the user sees the first words in ~300-500ms. Perceived latency is almost entirely determined by time-to-first-token, not total generation time. This is a UX optimization that costs nothing on the backend.

### 3. Measure before you optimize
The Timer utility made it immediately obvious where time was being lost. Without per-step timing it would have been guesswork. The output:
```
✔ embedding:generate     → 1151ms
✔ qdrant:search          → 845ms
✔ gemini:extractEntities → 6286ms   ← obvious target
✔ mongodb:storeThought   → 57ms
✔ qdrant:storeVector     → 403ms
✔ gemini:chatResponse    → 6038ms   ← obvious target
```
made the decision to move entity extraction and storage to the background completely clear.

### 4. Log timing per-step immediately, not as a final dump
When the timer only printed at the end, you couldn't see progress during a slow request. Printing immediately after each `measure()` call lets you watch steps appear in the console in real time, which is far more useful during development and debugging.

### 5. React Native cannot use fetch ReadableStream for SSE
On the web client, SSE streaming was implemented using `fetch` + `response.body.getReader()`. In React Native, `response.body` is `null` — the Hermes JS engine does not expose the ReadableStream API. The correct approach for React Native is the `react-native-sse` package, which wraps `EventSource` with support for custom HTTP methods, headers, and a request body — all of which the native `EventSource` spec does not support.

### 6. Managed Redis providers almost always require TLS
When connecting BullMQ to a hosted Redis provider (Upstash, Redis Cloud, Railway, etc.), the connection will silently fail or timeout without `tls: {}` in the connection options. An empty object is all that is needed — the provider handles certificate validation. A CA cert is only required in rare self-hosted setups.

### 7. SSE requires `res.flushHeaders()` before streaming begins
Setting SSE headers alone is not enough. Without calling `res.flushHeaders()` immediately after setting `Content-Type: text/event-stream`, Express may buffer the response and the client will not receive any events until the connection closes. `flushHeaders()` opens the connection immediately so chunks flow as they are written.

### 8. BullMQ workers should handle partial failure gracefully
Entity extraction is optional context — the thought is still valid without it. The worker was designed to catch entity extraction failures, log them, and continue with empty entities rather than failing the entire job. This prevents a flaky Gemini call from blocking the MongoDB write and Qdrant upsert that actually matter.

### 9. Git commits should be grouped by concern, not by file
Grouping commits by logical change (reminder fix, timer, BullMQ, SSE backend, SSE frontend) makes the history readable and each commit independently revertable. Committing all changed files in one shot would make it impossible to bisect or roll back a specific feature.