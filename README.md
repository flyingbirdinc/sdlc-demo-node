# SDLC Demo Node App

A small Node.js service used to demonstrate a Git → Jira → CI → release → deployment flow.

## Local development

```sh
npm ci
npm test
npm run check
npm start
curl http://127.0.0.1:8080/healthz
```

## SDLC flow

1. Create a Jira issue, for example `DEMO-1`.
2. Create a branch such as `DEMO-1-add-healthcheck`.
3. Commit and open a pull request referencing `DEMO-1`.
4. GitHub Actions runs `ci.yml`.
5. Merge to `main`, then create a semantic version tag such as `v1.0.0`.
6. `release.yml` publishes a self-contained tarball and SHA-256 checksum as a GitHub Release.
7. `deploy.yml` authenticates with GitHub OIDC, copies the tarball through an IAP tunnel, and performs an atomic deployment on the private VM.

The Jira project uses the free GitHub for Jira integration so commits, branches, pull requests, and deployments can be shown in the issue Development panel.

## Rollback

List deployed releases over IAP SSH, then roll back to a known-good release:

```sh
gcloud compute ssh sdlc-demo-vm --zone=us-central1-a --tunnel-through-iap \
  --command='sudo ls -1 /opt/sdlc-demo/releases && sudo /opt/sdlc-demo/bin/rollback.sh v1.0.0'
```

## Cost and cleanup

The existing project already has an e2-micro, so this second VM may not be within the Always Free allowance. Stop it when not demonstrating and delete it, its disk, the deploy identity, the Workload Identity pool/provider, and any demo-only firewall rules when finished. A GCP budget alert is recommended; it is an alert, not a hard spending cap.
