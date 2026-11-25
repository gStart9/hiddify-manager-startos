# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

## Package notes

- Build with an OCI-capable buildx builder (`BUILDX_BUILDER=<builder> make x86`); the default `docker` driver fails at export.
- `docker/patch.py` edits upstream files by exact string and fails the image build when one no longer matches. Fix the replacement against the new upstream code; never loosen the match count.
- Keep the port block in `docker/patch.py` (`PORT_START`/`PORT_COUNT`) equal to `inboundRangeStart`/`inboundRangeSize` in `startos/utils.ts`. The block must stay below 10000, because the panel binds loopback gateway ports from 10000 to 50000, and StartOS hands out dynamic external ports from 49152.
