# GitHub Actions Firebase bootstrap

This workflow is an opt-in, manually dispatched setup operation for the existing Firebase project `stickerz-922b9`. It deploys only Firestore rules/indexes, seeds missing starter data, and grants the trusted admin claim to an existing Firebase Authentication user.

## What it does

1. Verifies the target project ID is exactly `stickerz-922b9`.
2. Authenticates through GitHub OIDC / Google Workload Identity Federation. No service-account private key or long-lived JSON credential is stored in GitHub.
3. Deploys `firestore.rules` and `firestore.indexes.json`.
4. Creates missing documents only:
   - the ten approved category documents;
   - `settings/public` with the locked storefront settings (240 EGP standard, 190 EGP introductory price, 3600-second display offer, 30 selected artworks, COD and InstaPay).
5. Looks up the existing Firebase Auth account by the supplied email and grants `admin: true`, preserving unrelated custom claims.

It does not create artwork/cover placeholders, shipping fees, customer orders, or payment records. It does not enable Storage, Cloud Functions, Cloud Run, Blaze billing, or any other paid service.

## One-time Google Cloud and GitHub setup

This is the only infrastructure setup required before the workflow can run. It uses short-lived OIDC credentials, not downloadable service-account keys.

1. Confirm the project owner can access Google Cloud project `stickerz-922b9` and that the default Firestore database already exists. The workflow deliberately does not create a database or choose its location.
2. In Google Cloud Console, create a dedicated service account for this workflow (for example, `firebase-bootstrap`). Do not create or download a JSON key.
3. Grant that service account the permissions needed to deploy Firestore rules/indexes, read/write the required Firestore documents, and update Firebase Auth custom claims. Use a dedicated least-privilege custom role if available; otherwise have the project owner review the required Firebase Admin, Cloud Datastore, and Firebase Authentication administration roles before granting them. These roles can be powerful, so do not reuse a personal or general-purpose service account.
4. In Google Cloud IAM → Workload Identity Federation, create a Workload Identity Pool and an OIDC provider for GitHub Actions.
5. Configure the provider attribute mapping at minimum:
   - `google.subject=assertion.sub`
   - `attribute.repository=assertion.repository`
   - `attribute.ref=assertion.ref`
6. Restrict the provider attribute condition to this exact repository and the main branch:
   `assertion.repository == 'stickerz962-bit/Stickerz' && assertion.ref == 'refs/heads/main'`
7. Allow that repository/branch principal to impersonate only the dedicated service account by granting the service account's Workload Identity User role to the matching `principalSet` from the pool.
8. In GitHub repository **Settings → Secrets and variables → Actions → Variables**, add:
   - `GCP_WORKLOAD_IDENTITY_PROVIDER`: full provider resource name, such as `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID`.
   - `GCP_SERVICE_ACCOUNT`: dedicated service-account email.
   These are resource identifiers, not private keys. Do not add JSON credentials or private keys.
9. Ensure Email/Password is enabled in Firebase Authentication and create the intended administrator account if it does not already exist. The workflow does not create a password or expose one in logs.

## Run it

1. Open the repository on GitHub.
2. Select **Actions** → **Firebase Bootstrap**.
3. Choose **Run workflow** on the `main` branch.
4. Enter project ID `stickerz-922b9` and the exact email of the existing admin Auth user.
5. Review the target carefully and check **confirm_live_deploy** only when you explicitly approve the live Firestore rules/index deployment and seed operation.
6. Start the workflow and inspect every step. A successful run reports the number of created and preserved category documents.

The workflow is not triggered by pushes or pull requests. It cannot run its deployment job unless the explicit confirmation input is checked.

## Safety and reruns

- Existing starter category documents are preserved, not overwritten. A conflicting category definition stops the run.
- Existing `settings/public` is preserved only if all locked values match; conflicting values stop the run without overwriting them.
- Unrelated Firebase Auth custom claims are preserved when `admin: true` is added.
- Re-running after a successful run should create zero new documents.
- A rules/index deployment may take time to propagate. Review the Firebase Console after the workflow.
- This bootstrap does not make the storefront safe for real orders. A trusted order/pricing service is still required before accepting payments or customer orders.
