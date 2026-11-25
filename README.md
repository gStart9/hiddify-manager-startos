<p align="center">
  <img src="icon.svg" alt="Hiddify Manager Logo" width="21%">
</p>

# Hiddify Manager on StartOS

> Everything not listed in this document should behave the same as upstream
> Hiddify Manager. If a feature, setting, or behavior is not mentioned here,
> the upstream documentation is accurate and fully applicable — see the
> Documentation section of `instructions.md` for links.

[Hiddify Manager](https://github.com/hiddify/Hiddify-Manager) is a multi-protocol proxy server with a web panel. It runs Xray and Hiddify Core, a sing-box fork, behind HAProxy and an SNI router on port 443, and gives every user that the admin creates a subscription link.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

The package runs three subcontainers. The Hiddify image is built from a `Dockerfile` on top of upstream's published image, and the two database images are the official ones, unmodified.

| Subcontainer | Image                                                  | Purpose                                                                     |
| ------------ | ------------------------------------------------------ | --------------------------------------------------------------------------- |
| `hiddify`    | `ghcr.io/hiddify/hiddify-manager`, patched (see below) | The panel, HAProxy, the SNI router, Xray, Hiddify Core, telemt, DNS tunnels |
| `mariadb`    | `mariadb`                                              | The panel database, listening on `127.0.0.1:3306`                           |
| `valkey`     | `valkey/valkey`                                        | The panel cache and sessions, listening on `127.0.0.1:6379`                 |

Architectures: x86_64 and aarch64.

Upstream's container needs `privileged: true` and host networking. The package replaces its entrypoint with `docker/startos-init.sh`, which boots it unprivileged and without internet access at boot. The script installs upstream's `systemctl` replacement, which starts every component as a background process, then runs the panel's database setup, then `docker/apply.py`, and then upstream's `install.sh` in apply mode. A component that fails to start is reported in the log and does not stop the others. The script ends by following the component logs in `data/log`, so they appear in the StartOS log.

`docker/patch.py` changes upstream at image build time:

1. The WARP, kernel WireGuard, firewall and "common tools" boot steps are skipped. These need `NET_ADMIN`, TUN devices, sysctl writes or package downloads.
2. The boot-time `uv pip install -e` of the panel is not run, because the panel is already installed in the image.
3. The boot no longer asks `ident.me` for the server's public IP address, and the panel no longer asks it either.
4. Every port that the panel picks for a protocol that clients reach directly by IP address falls inside 6100-6599. This covers the panel's random port picker, the builtin IP-mode protocols, and the "auto public ports" proxy mode.
5. The DNS tunnel router runs as root, because port 53 is privileged and upstream's systemd capability grant does not apply under the `systemctl` replacement. It listens on `[::]:53` instead of the container's IPv4 address, so that IPv6 clients reach it too.
6. The DNSTT, Slipstream and MasterDnsVPN sidecar templates fall back to the same defaults that their `server.j2` declares. Upstream renders the sidecars without those values, so without this fix no DNS tunnel instance starts.

To look inside the running service, attach to the `hiddify` subcontainer. `hiddify-panel-cli` is on the path there and runs upstream's panel CLI.

## Volume and Data Layout

The package uses two volumes, and both are backed up.

| Volume | Mount point                                     | Contents                                                                            |
| ------ | ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| `main` | `/opt/hiddify-manager/data` (subpath `hiddify`) | Upstream's data directory: `app.cfg`, certificates, panel backups and logs          |
| `main` | not mounted (volume root)                       | `store.json`, the StartOS-side state                                                |
| `db`   | `/var/lib/mysql` in `mariadb`                   | The MariaDB data directory, which holds every panel setting, user, domain and proxy |

Valkey has no volume. Its contents, the panel's cache and sign-in sessions, are lost on every restart.

`/opt/hiddify-manager/generated` is rebuilt on every start from the database.

## File Models

The package owns `store.json` at the root of the `main` volume. Nothing on the panel's side reads it directly: `setupMain` passes its values to the `hiddify` subcontainer as environment variables, and `docker/apply.py` writes them into the panel database on every start.

| Key               | Seeded                       | What it controls                                                                            |
| ----------------- | ---------------------------- | ------------------------------------------------------------------------------------------- |
| `mysqlPassword`   | at install, random           | The `hiddifypanel` MariaDB account and the panel's database URI                             |
| `redisPassword`   | at install, random           | The Valkey password and the panel's cache URI                                               |
| `adminPath`       | at install, random           | The panel's `proxy_path_admin` setting, which is the first segment of the Web Panel address |
| `adminUuid`       | by **Set Admin Credentials** | The owner account's UUID, which is its username and also its API key                        |
| `adminPassword`   | by **Set Admin Credentials** | The owner account's password                                                                |
| `publicAddresses` | by **Set Public Addresses**  | The domains of mode "direct" that the package manages in the panel                          |

`apply.py` re-asserts these on every start:

- The owner UUID and password. A password changed in the panel's own settings is overwritten on the next start.
- The `proxy_path_admin` setting. A change made in the panel is reverted on the next start, and the Web Panel address keeps the stored path.
- One domain of mode "direct" per public address, with its TLS port set to the address's port. Domains that the package added for addresses that were later deselected are deleted. Domains that the user added in the panel are left alone.
- Every REALITY or other camouflage domain whose server domain is empty or a package-managed domain is pointed at the first public address. A camouflage domain whose server domain the user set to their own domain is left alone.

`apply.py` changes two settings only when they hold a specific value:

- `dns_server` is set to the container's resolver from `/etc/resolv.conf` while it holds upstream's default `1.1.1.1`. StartOS drops DNS traffic that leaves the container bridge on port 53, so Hiddify Core cannot resolve names through `1.1.1.1`. A value that the user sets, such as a DNS-over-HTTPS URL, is kept.
- `http_proxy_enable` ("Allow HTTP Connection") is turned off once, on the first start. The user can turn it back on in the panel; see [Limitations](#limitations-and-differences).

`apply.py` keeps two marker files in the data directory: `startos-domains.json`, the list of domains that it manages, and `startos-first-boot-done`.

Upstream's own `app.cfg` is rewritten by upstream's panel setup on every start, with the database and cache URIs from the environment.

## Dependencies

None. MariaDB and Valkey run inside the package.

## Network Access and Interfaces

The package exposes four interfaces on four hosts.

| Interface id | Type  | Internal port   | Protocol                   | Purpose                                                                                                                                                       |
| ------------ | ----- | --------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `panel`      | `ui`  | 80              | HTTP, TLS added by StartOS | HAProxy, which routes the admin path and the user pages to the panel. The address carries `/<adminPath>/<adminUuid>/`.                                        |
| `proxy`      | `p2p` | 443             | raw TCP and UDP            | `rpxy-l4`, the SNI router in front of HAProxy, Xray and Hiddify Core. Serves every domain-based protocol, REALITY and the subscription pages over TLS.        |
| `dns`        | `p2p` | 53              | DNS over UDP               | The `dnstm` router for the DNSTT, Slipstream and MasterDnsVPN tunnels. Nothing listens until a DNS tunnel is set up, and `dnstm` does not serve DNS over TCP. |
| `inbounds`   | `api` | 6100, 500 ports | raw TCP and UDP            | The protocols that clients reach by IP address and their own port: Hysteria2, TUIC, SSH, Snell, WireGuard, Mieru, raw VLESS, VMess and Trojan, Shadowsocks    |

The `panel` interface is masked, because its address contains the owner UUID, which the panel accepts as an API key.

Only the TLS addresses of the `panel` interface reach the panel. HAProxy redirects any request without `X-Forwarded-Proto: https` to `https://<host>/` on port 443, which on StartOS belongs to the OS.

The `inbounds` range maps each external port to the same internal port, so the ports in client configurations are the ones that clients dial. The `proxy` and `dns` interfaces usually get other external ports than 443 and 53 on the LAN, because StartOS holds those ports there.

## Installation and First-Run Flow

Installation seeds the database password, the cache password and the admin path into `store.json`. The owner credentials are not created at install.

Hiddify's own first-run flow, in which the owner signs in with an empty password through a printed link, is replaced: the service cannot start until **Set Admin Credentials** has run, and the owner account always has the generated password.

Upstream discovers the server's public IP address and puts it in client configurations. This package does not, so client configurations contain only the addresses chosen with **Set Public Addresses**, plus any domain the user adds in the panel. Until an address is chosen, REALITY configurations point at the camouflage domain itself and do not work.

The first start takes about two and a half minutes while MariaDB initializes and the panel creates its database. Later starts take about a minute and a half.

## Actions

**Set Admin Credentials** (`set-admin-credentials`)

- When: before the first start, and whenever the owner credentials may have leaked.
- What it changes: generates a new owner UUID and a new strong password and stores both in `store.json`. The service restarts, and `apply.py` writes both into the panel database before the panel serves anything.
- Cost: one restart, about a minute and a half.
- Repeat safety: every run replaces both values. The old Web Panel address, the old password, and any API client that uses the old UUID as its key stop working. Users and their subscriptions are not affected.
- Outputs: the owner UUID (the username) and the password, shown once.

**Set Public Addresses** (`set-public-addresses`)

- When: after the first start, and whenever the addresses that clients use change, for example after adding a public domain or publishing the Proxy Gateway interface on a new gateway.
- What it changes: stores the chosen `host:port` pairs of the Proxy Gateway interface. On the next start, `apply.py` adds a "direct" domain for each one, with its TLS port, removes the domains that it added for deselected addresses, and points unbound camouflage domains at the first address in the list.
- Cost: one restart, about a minute and a half.
- Repeat safety: idempotent for the same selection.
- Outputs: none.

## Tasks

| Task                          | Severity    | Raised while                               | Cleared by                                                                                   |
| ----------------------------- | ----------- | ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Run **Set Admin Credentials** | `critical`  | `store.json` has no owner UUID or password | Running the action. It does not return.                                                      |
| Run **Set Public Addresses**  | `important` | `store.json` has no public address         | Choosing at least one address. It does not return, because the action requires at least one. |

## Health Checks

The `hiddify` daemon is ready when HAProxy listens on port 80, with a grace period of five minutes for a slow first start. Four further checks run after it is ready.

| Check             | Probes                                          | A failure means                                                                                                                        |
| ----------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Web Panel         | HAProxy on port 80                              | The boot script has not reached HAProxy yet, or HAProxy rejected its generated configuration. Read the log for `haproxy`.              |
| Panel Application | The panel's Granian server on port 9000         | The panel crashed or could not reach MariaDB or Valkey. Look for a Python traceback in the log.                                        |
| Port 443 Gateway  | `rpxy-l4` on port 443                           | The SNI router is down, so no domain-based protocol or subscription page works.                                                        |
| Proxy Cores       | A running `hiddify-core` and `xray` process     | A core exited, usually on a configuration it refused. Its error is in `data/log/hiddify-core.err.log` or the log above it.             |
| DNS Tunnels       | Port 53, once a DNS tunnel configuration exists | Reports success with "No DNS tunnel is configured" until a tunnel is set up in the panel. After that, a failure means `dnstm` is down. |

The `mariadb` and `valkey` daemons have hidden readiness checks (`healthcheck.sh --connect --innodb_initialized` and `valkey-cli ping`).

Upstream's `systemctl` replacement does not restart a component that exits. A failed core stays failed until the service restarts.

## Backups and Restore

Both volumes are copied whole with `ofVolumes`: `main`, which holds `store.json` and upstream's data directory, and `db`, the MariaDB data directory. The backup runs on a stopped service, and InnoDB recovers its files the way that it would after a power loss.

Valkey is not backed up, so a restored instance starts with an empty cache and every admin and user is signed out.

A restored instance keeps the owner credentials, the public addresses and every panel setting and user. If the server's addresses differ after the restore, run **Set Public Addresses** again.

## Limitations and Differences

1. WARP is unavailable. Its boot step is skipped, and selecting a WARP mode in the panel does nothing useful.
2. Kernel WireGuard (`wg-quick`) is unavailable. The WireGuard protocol that Hiddify Core serves in user space on a port in 6100-6599 works.
3. The panel's firewall settings have no effect, because the service cannot change the firewall.
4. Plain-HTTP configurations on port 80 cannot connect, because port 80 on StartOS belongs to the OS. "Allow HTTP Connection" starts turned off for this reason.
5. Domain-based protocols advertise the port that each public address carries. Behind StartTunnel, a public address whose port is 443 needs public port 443 forwarded to the Proxy Gateway interface.
6. A protocol that a user creates in the panel on a port outside 6100-6599 runs, but nothing outside the server can reach it.
7. Upstream's update button and automatic updates are off. Update by installing a newer version of this package.
8. The panel's own Let's Encrypt and ZeroSSL issuance keeps running for every domain in the panel. HTTP-01 validation needs the domain's port 80 to reach HAProxy, which StartOS does not route, so on most setups the 443 gateway serves self-signed certificates. The Web Panel interface uses the StartOS certificate.
9. A component that exits is not restarted until the service restarts.
10. The panel and the client configurations are licensed CC BY-NC-SA 4.0, which forbids commercial use. Upstream's manager scripts are GPL-3.0.
11. Upstream still makes outbound requests that the package does not disable: Hiddify Core downloads geo rule sets from GitHub, the panel's REALITY camouflage-domain search and config health checks contact public sites, and ACME contacts the certificate authorities.

---

## Quick Reference for AI Consumers

```yaml
package_id: hiddify-manager
image: ghcr.io/hiddify/hiddify-manager
architectures: [x86_64, aarch64]
subcontainers: [hiddify, mariadb, valkey]
volumes:
  main: /opt/hiddify-manager/data
  db: /var/lib/mysql
file_models:
  - store.json
startos_managed_env_vars:
  - MYSQL_PASSWORD
  - REDIS_PASSWORD
  - HM_ADMIN_UUID
  - HM_ADMIN_PATH
  - HM_ADMIN_PASSWORD
  - HM_PUBLIC_ADDRESSES
dependencies: none
interfaces:
  panel: { type: ui, port: 80 }
  proxy: { type: p2p, port: 443 }
  dns: { type: p2p, port: 53 }
  inbounds: { type: api, port: 6100, port_range: 500 }
actions:
  - set-admin-credentials
  - set-public-addresses
tasks:
  - { action: set-admin-credentials, severity: critical }
  - { action: set-public-addresses, severity: important }
health_checks:
  - hiddify
  - panel-app
  - proxy
  - cores
  - dns-tunnels
```
