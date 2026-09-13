# Verve

Strip AI tells from prose and put a human voice back, in **British English**,
without changing what the text says.

> Renamed from `humanize` in July 2026. The skill still triggers on
> "humanise this" and "make this sound human"; only the name and the
> directory changed.

## Why two halves

Removing AI tells gets you clean prose that still reads as machine-made,
because nothing is behind it. So the workflow does both: a pattern sweep that
cuts the tells, then a voice pass that puts opinions, rhythm and specificity
back, inside whatever tone you asked for.

The constraint that governs everything: meaning does not change. No invented
statistics, no dropped claims, no compressing three points into one punchy
line.

## How it works

Entirely in the conversation. No extra API calls, no cost, nothing to install.

1. **Triage** - returns already-human text unchanged rather than mangling it.
2. **Tone** - neutral / casual / professional / academic, held throughout.
3. **Pattern sweep** - five groups of tells (content, language, style,
   assistant artefacts, filler) with before/after for each.
4. **Voice pass** - opinions, rhythm variance, specificity, within the tone.
5. **Quick checks** - a 14-item pre-flight list.
6. **Score** - six dimensions, with Fidelity as a veto rather than an average.

## Setup

None. The skill is instructions, not tooling.

## Usage

```
"verve this: [text]"
"verve draft.md"
"verve my clipboard"
"verve draft.md in a casual tone"
"verve draft.md with heavy rewriting"
"verve essay.md and explain what you changed"
"verve draft.md and save to output.md"
```

## Options

| Option | Values | Default |
|--------|--------|---------|
| Tone | neutral, casual, professional, academic | neutral |
| Strength | light, moderate, heavy | moderate |
| Explain | on / off | off |
| Output | conversation, save to file | conversation |

## Structure

```
verve/
├── SKILL.md                    # Workflow, constraints, quick checks, scoring
└── references/
    ├── patterns.md             # The tell catalogue, before/after for each
    ├── wordlist.md             # Flat scannable word and phrase lists
    ├── voice.md                # Tone presets and restoring voice
    └── examples.md             # Worked passages
```

## Requirements

A Claude Code or Codex session. Nothing else - no packages, no virtualenv, no
credentials, no network.

## What this will not do

Route your text through a detector-evasion service. An optional commercial API
for that shipped with earlier versions and was removed in July 2026: the point
is prose a human judgement shaped, not text tuned to score well against a
classifier.

## Acknowledgements

Several patterns - false agency, vague declaratives, narrator-from-a-distance,
meta-commentary, emphasis crutches, telling-instead-of-showing - and the idea of
a scored exit gate come from [stop-slop](https://github.com/hardikpandya/stop-slop)
by Hardik Pandya (MIT).
