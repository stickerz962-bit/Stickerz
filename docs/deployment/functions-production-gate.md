# Production Cloud Functions deployment gate

This workflow is intentionally manual and is not a deployment authorization by itself.

## Required approvals before enabling the workflow

1. Confirm the Firebase project billing plan and attach a billing account only if the owner separately approves it.
2. Review current Google Cloud IAM assignments. Grant only the documented deployment permissions to the dedicated GitHub Workload Identity service account; do not use Owner or Editor as a shortcut.
3. Configure the GitHub Actions environment named `firebase-production` with required reviewers and prevent self-review where available.
4. Configure repository variables:
   - `GCP_WORKLOAD_IDENTITY_PROVIDER`
   - `GCP_SERVICE_ACCOUNT`
   - `FIREBASE_FUNCTIONS_DEPLOY_APPROVED=true` only after the above checks and explicit owner approval.
5. Merge the reviewed workflow to the default branch before it can be reliably selected from the Actions UI.

## Runtime gates

A run requires both the manual `confirm_live_deploy=true` input and the repository approval variable. It targets only `stickerz-922b9`, runs application, Firestore emulator, and Functions tests first, authenticates with GitHub OIDC, then deploys `functions` only.

## Explicit non-scope

This workflow does not enable billing, upgrade Firebase, change IAM, deploy Firestore rules/indexes, deploy Hosting, or deploy Storage. Those actions require separate review and approval. If the production environment has no required reviewers configured, the environment name alone is not a security gate.
