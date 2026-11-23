---
description: Generate a detailed but concise commit message in the chat
---

Generate a commit message for the current changes and present it in the chat. Do not stage or commit anything; only write the message.

1. Inspect the changes:
   - `git status --short` to see what is modified, staged, and untracked.
   - `git diff --cached` when something is staged, otherwise `git diff` for unstaged work.
   - For a large diff, read it per path with `git diff -- <path>` instead of one huge output.
   - `git log --oneline -10` to match the style of previous messages.
2. If there are no changes, say so and stop.
3. Write the message:
   - Subject line in Conventional Commits style: `type(scope): summary` — imperative mood, lowercase after the colon, at most 72 characters. Pick `type` from feat, fix, chore, refactor, docs, test, build, ci.
   - A blank line, then 3-6 body bullets: what changed and why it matters, each under 80 characters. Mention breaking changes and follow-ups when they exist.
   - No AI attributions, no signatures, no trailing junk.
4. Present exactly one message inside a plain code block, then stop. If several unrelated changes are pending, propose one commit per logical change and say which files belong to each.
