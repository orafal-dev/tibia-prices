# Changesets

This project uses [Changesets](https://github.com/changesets/changesets) for versioning and changelogs.

## Workflow

1. **Add a changeset** when you make a change that should appear in the changelog:
   ```bash
   npm run changeset
   ```
   or `npx changeset`. Choose the version type (patch/minor/major) and write a short summary.

2. **When ready to release**, consume changesets and bump versions:
   ```bash
   npm run version
   ```
   This updates `package.json` and `CHANGELOG.md` based on the changesets in `.changeset/`.

3. **Publish** (if you publish to a registry):
   ```bash
   npm run release
   ```
   For this private package, you can skip this or use it with a private registry.

See the [intro guide](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md) and [common questions](https://github.com/changesets/changesets/blob/main/docs/common-questions.md) for more.
