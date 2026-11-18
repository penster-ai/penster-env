# The Penster env standard

One rule, no exceptions, every service, every stack:

> **An empty environment value is identical to an unset one.**
> Coerce `'' → undefined`/`None` at the single parse boundary, *before* validation.
> Enforce required-ness with the schema (non-optional field) or an explicit
> assert — never by trusting that `''` counts as "present".

## Why this is the only rule that covers 100% of combinations

| variable kind            | empty value becomes | result                         |
| ------------------------ | ------------------- | ------------------------------ |
| optional                 | unset               | passes, feature off            |
| defaulted                | unset               | default applies                |
| enum **with** default    | unset               | default applies (no crash)     |
| required (no default)    | unset               | fails loudly at startup        |

Without the coercion, an enum-with-default set to `""` crashes at boot (the
default only fires on *unset*, not on an invalid empty value), while an optional
string set to `""` silently reads as "present but blank". The coercion removes
every one of those per-variable special cases.

## The two guarantees that make "declare empty = disabled" safe

1. **Empty ≡ unset** (the coercion above). So an env file may declare the same
   key set in every environment, blank where a feature is off. Diffs stay green;
   a genuinely missing key always signals a real mistake.
2. **Required-ness is enforced independently** of whether a value is blank.
   A required secret fails whether it is absent *or* empty — an empty value can
   satisfy an optional var but can never silence a required one.

## Consequence for env files

- Keep the **same key set across prod / staging / preview**.
- Leave a key **blank** where the feature is off (never omit to mean "off").
- Omit a key only when the field has a hardcoded default you want to inherit and
  you deliberately do not track it per-env.
