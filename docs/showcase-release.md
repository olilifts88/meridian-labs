# AI Workflows download and release

## Placement

The small demo ZIP belongs in **GitHub Releases**, not in Git's source history and not behind a hosted app. The first release uses `ai-workflows-v1.0.0`.

- Release page: https://github.com/olilifts88/meridian-labs/releases/tag/ai-workflows-v1.0.0
- Named asset: `meridian-ai-workflows.zip`
- Direct download: https://github.com/olilifts88/meridian-labs/releases/download/ai-workflows-v1.0.0/meridian-ai-workflows.zip
- Checksum asset: `meridian-ai-workflows.zip.sha256`

The README's primary link uses the versioned asset. That avoids silently switching the demo link to a later release for a different project in this repository. Update the link when a new demo release is published. [GitHub's release-link documentation](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases) describes direct asset links.

The named ZIP and checksum are attached to the versioned release above. Release verification checks the public download against the locally built artifact and repeats setup from the downloaded ZIP.

## Visitor journey

README introduction → Download AI Workflows ZIP → extract → open a terminal in the extracted folder → `python3 showcase_demo.py` (Windows: `py showcase_demo.py`) → open the printed localhost address.

GitHub also generates “Source code” archives. Those contain the full repository; the named `meridian-ai-workflows.zip` is the small package intended for visitors. It has one README and the required demo code and examples. Python 3.9+ must already be installed; there are no extra packages or model credentials to configure.

## Prepare the artifact locally

```sh
python3 scripts/build-workflow-showcase.py
```

Outputs:

- `dist/meridian-ai-workflows.zip`
- `dist/meridian-ai-workflows.zip.sha256`

The builder uses an explicit source allowlist and creates an internal file manifest. Private data, authentication, local telemetry, unrelated projects and Git history are excluded. Stable ZIP metadata makes repeated builds from the same input files byte-identical in the same runtime. The external checksum covers the entire archive.

Before publishing, extract it into a fresh temporary folder and verify the exact setup instructions there. Confirm the five workflows, estimates, routing and saved-result view work; confirm no model calls occur. Keep the small ZIP separate from the full source archive.

## Publish after approval

No new schedule or automatic publishing job is introduced. Publishing is an explicit step because the repository is public and publication was previously held.

1. Review and commit the authorised demo implementation, tests, documentation and public-safe assets. Keep unrelated local work and ignored private records out of the commit. The tag must point to a commit containing the source that actually built this ZIP, not the earlier repository HEAD.
2. Build from that reviewed commit and repeat the extraction smoke check. Preserve the artifact hash with the verification notes.
3. Push the reviewed changes through the repository's review process. Create the version tag from the accepted source commit; do not replace an existing tag or asset silently.
4. Create a draft release titled **AI Workflows v1.0.0**. Attach the named ZIP and checksum, with the prepared release notes in `docs/releases/workflow-showcase-v1.0.0.md`.
5. Check the release source/tag, named assets and README links. Publish after Oli's approval.
6. Verify the direct download and checksum without a signed-in GitHub session. Extract that downloaded artifact and repeat the visitor setup. Only then describe the public download as live.

Source code remains available in GitHub. Publishing the ZIP does not host a model endpoint or give visitors access to Oli's AI allowance. GitHub profile and CV-library updates remain a later, separate sharing step.
