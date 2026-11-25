# Updating the upstream version

Upstream is the `ghcr.io/hiddify/hiddify-manager` image that [hiddify/Hiddify-Manager](https://github.com/hiddify/Hiddify-Manager) publishes for each release. `Dockerfile` builds on it, and `docker/patch.py` edits files inside it. The MariaDB and Valkey sidecars are separate images pinned by tag in `startos/manifest/index.ts`.

## Determining the upstream version

The pin is the `FROM` line in `Dockerfile`. Find the latest stable release, skipping betas:

```bash
gh release list -R hiddify/Hiddify-Manager --exclude-pre-releases --limit 1
```

Confirm that the image tag exists for both architectures:

```bash
docker manifest inspect ghcr.io/hiddify/hiddify-manager:<tag> \
  | jq -r '.manifests[].platform.architecture'
```

## Applying the bump

1. Set the tag in the `FROM` line of `Dockerfile`.
2. Build the image. `docker/patch.py` stops the build when any string that it replaces no longer matches upstream. For each failure, find the new upstream code and update the replacement so that the patch still does the same thing.
3. Read upstream's `scripts/docker-init.sh` and `scripts/install.sh` for new boot steps, and mirror any that `docker/startos-init.sh` needs.
4. Read the panel's `get_random_unused_port`, `_stable_public_port` and `resolve_inbound_ports` for new ways of choosing public ports, and keep every public port inside the range in `startos/utils.ts`.
5. Set `version` in `startos/versions/current.ts` to the tag without the `v`, followed by `:0`.

To bump a sidecar, change its `dockerTag` in `startos/manifest/index.ts`. Keep MariaDB on a version that can read the data directory that the previous version wrote.
