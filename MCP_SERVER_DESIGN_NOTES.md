# Building an MCP server — design notes and mistakes to avoid

Context handoff for building an MCP server on **Spring Boot**. Written after building one in
TypeScript/Next.js. Everything here is language-agnostic: these are protocol and interface design
lessons, not framework tips.

The audience is an AI agent or engineer starting a fresh MCP server. Read the failure modes first —
they are the expensive part. The structure section is cheap to copy.

---

## 0. What MCP actually is

Three capability types a server exposes to an LLM client:

| Concept | What it is | Protocol methods |
|---|---|---|
| **Tools** | Functions the model can call, with a JSON Schema for arguments | `tools/list`, `tools/call` |
| **Resources** | Addressable read-only content, identified by URI | `resources/list`, `resources/read` |
| **Prompts** | Reusable templates the *user* invokes (often as slash commands) | `prompts/list`, `prompts/get` |

Two things that are not obvious until they bite you:

1. **Many clients are tools-only.** They never surface resources or prompts. So any capability you
   expose *only* as a resource is invisible to a large share of clients. Anything essential must be
   reachable through a tool as well — even if that means one tool that returns the same content as a
   resource.
2. **You do not need an SDK.** MCP over HTTP is JSON request/response. A hand-rolled controller
   dispatching on a `method` field is a legitimate implementation and removes a dependency. In
   Spring Boot this is one `@RestController` with a switch on the method name.

---

## 1. The two failures that mattered most

Both were discovered from real transcripts, not from tests. Both are *interface* bugs, not logic bugs.

### Failure 1 — the server could not express absence

A user asked for the plot of a specific book. The server had no content for it and returned an
empty-ish result. The model, receiving no signal that the lookup had **failed**, produced filler:

> "If you have more questions about the book or related topics, feel free to ask!"

**Root cause:** the model cannot distinguish *"no data exists"* from *"no answer exists"*. Given an
empty payload it assumes it simply has nothing to add, and papers over the gap conversationally.

There was a second, dumber layer to this: the tool returned a hardcoded `chunksAvailable: false`
flag that was never wired to the actual content table. It always reported "not ingested" and always
fell back to a one-line description. **Check that your availability flags are actually derived from
data.** A stub that returns a plausible constant survives code review and typechecking and produces
wrong behaviour forever.

**Fix — typed outcomes on every content-returning tool:**

```
OK                    normal result
NOT_IN_CORPUS         requested entity does not exist; include closest matches
NOT_INGESTED          entity exists as metadata but has no content; say what IS available
NO_MATCH_FOR_QUERY    entity exists, query matched nothing; report what it DOES contain
CAPPED                budget/quota exhausted; say when it resets
```

Rules that made this work:

- **Label on the first line of the response body.** Long tool responses get truncated by clients.
  A status buried at the end does not exist.
- **Never return an empty list or string without a label.** If there is nothing to give, say why.
- **Never fabricate a fallback.** If a topic matched nothing, do *not* silently return the opening
  content instead. The model cannot tell it was substituted and will present it as responsive.
- **Every failure carries at least one concrete next action** — a different id, a different query, a
  different tool. A dead end with no exit is what produces filler.
- Enforce that last rule *in the constructor* of your response object: a non-OK outcome with an
  empty action list should throw. Otherwise it will be forgotten.

**Spring Boot shape:**

```java
public record ToolOutcome<T>(
    Outcome outcome,      // enum, serialized first
    String message,       // MUST begin with outcome.name() + "\n"
    List<String> nextActions,
    T data                // null on failure
) {
    public ToolOutcome {
        if (outcome != Outcome.OK && (nextActions == null || nextActions.isEmpty()))
            throw new IllegalArgumentException(outcome + " requires a next action");
    }
}
```

Use `@JsonPropertyOrder({"outcome","message","nextActions","data"})` so the label survives
serialization order and truncation.

### Failure 2 — the server had no self-description

Asked "what can I ask you about?", the model invented a plausible list of capabilities from the tool
names alone — including things the server could not do.

**Root cause:** nothing described the actual corpus. Given only tool names like `search_books`, the
model extrapolates. It is not lying; it has nothing else to go on.

**Fix — a self-description generated from live data**, exposed as *both* a resource and a tool
(remember: tools-only clients). It must contain:

- Real counts, read from the database on every call. **Never a hardcoded string** — it will drift
  and then it is worse than nothing.
- What is *readable* versus what is only *catalogued*. These differ and the distinction is invisible
  to the model otherwise.
- **An explicit list of what the system does NOT contain.** This is the part everyone omits and the
  part that prevents the most hallucination.
- Per tool: one example question it answers well, one it does not.
- Honest statement of degraded modes (e.g. "no embeddings — keyword matching only, paraphrased
  queries will miss").

**Report absence explicitly; never synthesise to fill a gap.** When our topic taxonomy did not
exist, the correct output was *"No topic taxonomy has been generated; topic coverage cannot be
reported"* — not categories inferred from titles. A fabricated taxonomy in the one resource that
exists to stop guessing is self-defeating.

Then **reference it in the server instructions / system prompt**: *"Call `describe_corpus` before
describing what this server covers. Never invent a capability list from tool names."*

---

## 2. Tool descriptions are prompts, not documentation

A model that has never seen your codebase decides, from the description string alone, whether to
call the tool. Vague descriptions are the single biggest cause of wrong-tool selection.

Every description should state:

1. What it does, concretely.
2. **When to prefer it over the neighbouring tool.** ("Prefer this when the user names a specific
   book; use `search_books` when they name a subject.")
3. **One example of a question it does NOT answer**, naming the tool that does.

Keep a structured `examples` pair (`answersWell`, `doesNotAnswer`) as a field on the tool definition
and generate the self-description from the live registry. Then the guide cannot drift from the tools
actually exposed.

**Cap the tool count at roughly a dozen.** Past that, selection accuracy degrades measurably. If a
capability can be a *parameter* on an existing tool rather than a new tool, make it a parameter.

---

## 3. Structure that held up

```
mcp/
  types/            Tool, ToolSpec, Resource, Prompt interfaces
  registry/         assembles the three registries; implements list/call/get
  resources/<use-case>
  prompts/<use-case>
  tools/<use-case>
core/               domain layer — all logic, framework-agnostic
```

Principles that paid off:

- **One file per use case, per layer.** A capability like `list-books` may exist as a resource (owns
  the data access), a prompt (renders from the resource), and a tool (adds arguments). Same use
  case, three faces, three files. Nothing duplicates the query.
- **Tools stay thin: validate → call domain → format.** No business logic in a tool. The web API
  needs the same capabilities, and if logic lives in the tool the two surfaces drift and return
  different answers to the same question. In Spring: tools are `@Component`s wrapping a
  `@Service`.
- **Separate the executable definition from the serializable spec.** Your tool object holds an
  execute function; `tools/list` must not leak it. Keep a `ToolSpec` type that is the definition
  minus the callable, and derive the list payload from it. Verify with an integration test that no
  handler field appears in the wire format.
- **A registry, not a switch statement.** `tools/call` should be a lookup by name over a collection.
  In Spring, inject `List<McpTool>` and index by `name()` — adding a tool becomes adding a bean.

---

## 4. Content and safety concerns worth building in from day one

### Provenance / AI-generated content marking

If any content is AI-generated or otherwise not what it appears to be, mark it at **every layer**,
from **one predicate**:

- **Database:** a `CHECK` constraint making an unmarked synthetic row *impossible to insert*. This
  is the only layer that cannot be bypassed by forgetting a call site.
- **Domain:** a single `isSynthetic(entity)` predicate backed by a *set* of non-real sources, not an
  equality check against one literal. Adding a source later then updates every call site for free.
- **Tool output:** the warning must be inside the response text, because LLM clients never see your
  UI. Put it at the **top and bottom** — a long response may be truncated from either end.
- **Per-item marking on mixed responses.** If a result set mixes real and synthetic, mark each item;
  a wrapper alone is ambiguous once the model quotes one item.
- **Tool description suffix**, so the model is warned *before* it ever calls: *"Some records are
  synthetic and flagged `synthetic: true`; never present their content as factual."*

If you serve web pages too: omit `schema.org` structured markup for fabricated records entirely
rather than emitting it with a modified field — valid markup propagates into third-party
aggregators. Add `noindex, nofollow` and exclude them from `sitemap.xml`. Relevant to EU AI Act
Art. 50, which requires machine-readable *and* human-readable disclosure.

### Token budgets

Any tool returning content needs a budget parameter with a sane default and a hard maximum, applied
in reading order. When the budget truncates, say so and return `CAPPED` rather than silently
delivering less than was asked for. Make clear whether the cap is per call or a persistent quota —
the model will tell the user, so it must be accurate.

---

## 5. Mistakes to avoid, condensed

1. **Hardcoded availability flags.** Derive from data. A stub returning a plausible constant is the
   worst kind of bug — invisible and permanent.
2. **Empty results with no status.** The model fills the silence with pleasantries.
3. **Status at the end of a long response.** Truncation eats it. First line.
4. **A dead end with no next action.** Always give the model somewhere to go.
5. **Silent fallbacks.** Returning "something related" when the query matched nothing is worse than
   returning nothing, because it is indistinguishable from a real answer.
6. **Resource-only capabilities.** Tools-only clients cannot see them.
7. **Vague tool descriptions.** State when *not* to use each tool, and name the alternative.
8. **More than ~12 tools.** Selection accuracy degrades; prefer parameters over new tools.
9. **Logic inside tools.** The web surface and MCP surface will diverge.
10. **A hardcoded self-description.** It drifts, and it is the one place drift is fatal.
11. **Synthesising data to fill a gap** (a fabricated taxonomy, an inferred category). Report the
    absence — it is a real finding.
12. **Leaking the execute handler into `tools/list`.** Keep spec and definition as separate types.
13. **Claiming capabilities you do not have** — in tool descriptions or docs. The model repeats
    them to users as fact.
14. **Not surfacing degraded modes.** If semantic search is unavailable and you silently fall back
    to keyword matching, the model will confidently report a miss as "not in the corpus".

---

## 6. Spring Boot specifics

- **Transport:** one `@RestController` at `POST /mcp`, dispatching on the `method` field. Return
  `tools/list` from the registry; do not maintain a parallel list.
- **Validation:** Bean Validation (`@Valid`, `@NotBlank`, `@Min`/`@Max`) on argument records is the
  analogue of Zod. Convert violations into an `INVALID_ARGUMENTS` outcome with the same envelope
  shape as every other failure — never a raw 400 with a stack trace, which the model cannot act on.
- **Schema generation:** generate the JSON Schema for `inputSchema` from the argument record
  (e.g. `victools/jsonschema-generator`) rather than hand-writing it. Hand-written schemas drift
  from the record and the model then sends arguments you reject.
- **Registry:** `interface McpTool { String name(); String description(); JsonNode inputSchema();
  ToolExamples examples(); ToolOutcome<?> execute(Map<String,Object> args); }`, then inject
  `List<McpTool>` and index by name.
- **Streaming:** if you need incremental output, `SseEmitter` or `StreamingResponseBody`. Emit
  newline-delimited JSON events rather than raw text so the client can distinguish tool calls,
  results, and tokens.
- **Testing:** the highest-value tests are one per outcome label — assert the first line of
  `message` equals the label and that `nextActions` is non-empty. These catch the failure modes that
  actually occurred.

---

## 7. Build order that would have saved time

1. Registry + transport + one trivial tool end to end.
2. **The outcome envelope, before any real tool.** Retrofitting status labels across finished tools
   is significantly more work than starting with them.
3. Domain layer with real data access; verify availability flags against actual rows.
4. The self-description tool/resource, generated from live counts.
5. Content tools, each thin over the domain layer.
6. Provenance/safety marking, driven from one predicate.
7. Prompts last — they compose tools, so they need the tools to be stable.
