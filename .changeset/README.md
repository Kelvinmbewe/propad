# Changesets Workflow

This repository uses [Changesets](https://github.com/changesets/changesets) to manage versioned package releases. The `scripts/deps-doctor.sh` helper generates or updates changesets whenever dependency bumps affect published packages. When running the doctor manually:

1. Review the generated markdown file in `.changeset/` and adjust the summary if needed.
2. Commit the changeset alongside dependency updates.
3. Merge to main; the release pipeline will consume the changeset to publish new versions.

If you add a new package that should be published, ensure it has `"private": false` and is referenced in the changeset when dependencies change.
