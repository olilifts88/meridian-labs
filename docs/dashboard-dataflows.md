# Dashboard dataflows

These diagrams describe the private app. They omit private identifiers, credentials and personal records. Arrows show reads or explicit writes; a decision does not imply its proposed fix was executed.

## Overall

```mermaid
flowchart LR
 N["Notion reviews, tasks and saved assessments"] --> C["Existing connected collector"]
 L["Retained Mac usage logs · weekly or requested"] --> C
 F["Dated ECB exchange rate"] --> C
 C --> V["Validate source identity, coverage and dates"] --> D["Private app database"]
 D --> U["Six dashboard tabs"]
 U -->|"Explicit decisions and imported receipts"| D
 D -->|"Pending decisions"| C
 C -->|"Revision check, bounded write, readback"| N
 U --> Q["Refresh request and shared-source confirmation"] --> C
```

## Overview

```mermaid
flowchart TD
 R["Saved current reviews"] --> K["Review groups awaiting a response"]
 D["Durable authenticated decisions"] --> K
 T["Original task records · 12-hour mirror"] --> M["Recorded task total"]
 Q["Validated saved answer-quality projection"] --> E["Dated quality findings"]
 A["Validated routing audit projection"] --> J["Dated routing examples"]
 K --> O["Overview"]
 M --> O
 E --> O
 J --> O
 S["Existing weekly bounded inspection"] --> Q
 S --> A
 Q -->|"No new inspection"| P["Retain original review date"]
 A --> P
```

## Review inbox

```mermaid
flowchart TD
 A["Complete Life OS review sections"] --> C["Complete source read and identity validation"]
 B["All Suggested Fixes, including history"] --> C
 C --> R["Current reviews and retained revisions"] --> I["Pending / follow-up / issues / history"]
 I --> H["Explicit authenticated choice"] --> D["Durable decision, source revision and actor"]
 D --> P["Connected collector · 12 hours or requested"]
 P --> X{"Source and existing human choice still match?"}
 X -->|Yes| W["Write exact choice and receipt to original source"] --> V["Read source back"] --> S["Mark synced in app"]
 X -->|No| G["Keep choice; show stale or conflict"]
 W -->|Failure| E["Retain decision; failed sync receipt"]
 V -->|Failure| E
```

## Activity & effort

```mermaid
flowchart TD
 N["Original AI Run Metrics"] --> V["Complete query; dedupe by source identity"]
 V --> T["Task projection with nullable measurements"]
 C["Explicit inspected capability tags"] --> T
 L["Retained Codex logs"] --> G["Existing read-only collector"] --> U["Dated aggregate response/action inventory"]
 T --> H["Search and capability filters"] --> E["Source-linked task detail"]
 U --> A["Activity totals and collection date"]
 E --> P["Activity & effort"]
 A --> P
 X["Missing worker/retry/time/token evidence"] --> Z["Show unavailable; do not infer"] --> P
 R["Manual tab refresh"] -->|"Shared tasks and local usage"| G
 R --> V
```

## Usage & cost

```mermaid
flowchart TD
 L["Retained local usage logs"] --> C["Weekly or explicit requested scan"]
 C --> T["Measured input, cached input and output"]
 T --> B["Fresh input = input minus cached input"]
 T --> R["Versioned model-rate matching"]
 R --> P["Priced subset and USD estimate"]
 R --> U["Unpriced tokens remain excluded"]
 E["ECB reference rates and date"] --> F["GBP per USD"]
 P --> G["GBP estimate; optional USD display"]
 F --> G
 B --> V["Completed-week token breakdown"]
 V --> D["Usage & cost"]
 G --> D
 U --> D
 X["Unavailable new report or FX"] --> S["Retain previous dated family"] --> D
```

## Notion maintenance

```mermaid
flowchart TD
 W["Existing workspace maintenance process"] --> N["Suggested Fixes and Life OS findings"]
 N --> C["Complete 12-hour or requested source mirror"] --> R["Shared review records"]
 R --> M["Notion maintenance proposals"] --> I["Open same item in Review inbox"]
 I --> D["Explicit revision-bound decision"] --> S["Source write and verified receipt"]
 S --> H["Separate approved-fix executor"]
 H -->|"Only after verified application"| A["Applied receipt"]
 P["Homepage, duplicate, freshness and filing checks"] --> E["Configuration disclosure; not a scan result"] --> M
```

## Workflow lab

```mermaid
flowchart TD
 P["Frozen fictional pilot answers"] --> B["Saved original and revised checks"]
 H["Explicit saved human labels"] --> B
 B --> V["Recorded pilot comparison"]
 J["JSON receipts from already completed runs"] --> S["Schema and stable-ID validation"]
 S --> X{"ID already stored?"}
 X -->|"Identical"| N["No duplicate added"]
 X -->|"Different data"| C["Reject conflict; retain original"]
 X -->|"New"| D["Durable lab receipt"] --> R["Saved-data readback"] --> E["Inspectable run evidence"]
 F["Shared dated FX"] --> V
 V --> L["Workflow lab"]
 E --> L
 Q["Refresh now"] --> K["Reread saved lab records and FX"] --> L
```

## Shared sources and refresh impact

| Requested tab | Sources requested | Other tabs that can partly update |
| --- | --- | --- |
| Overview | Reviews, tasks, saved quality/routing evidence | Review inbox, Activity & effort, Notion maintenance |
| Review inbox | Reviews and decisions | Overview, Notion maintenance |
| Activity & effort | Tasks and local usage | Overview, Usage & cost |
| Usage & cost | Local usage and FX | Activity & effort, Workflow lab |
| Notion maintenance | Reviews and decisions | Review inbox, Overview |
| Workflow lab | Saved lab records and FX | Usage & cost |

The server computes this dependency map. A selected group commits through a validated source import; unrelated usage families are preserved. A failed source keeps its previous dated snapshot and the refresh receipt names the failure. A completed receipt requires saved-data readback. Natural timer execution, restart recovery and signed-in device access require separate observed evidence.
