# Hiddify Manager

## Documentation

- [Hiddify Manager guide](https://hiddify.com/manager/*) — the upstream guide to the panel, its protocols, troubleshooting, and the client apps.

## What you get on StartOS

- **Web Panel** — the Hiddify Manager administration panel. Its address contains a secret path and your owner UUID, so treat the address like a password.
- **Proxy Gateway** — TCP and UDP port 443 inside the service. Every protocol that uses a domain or REALITY shares this port, and so do your users' subscription pages.
- **Direct Protocol Ports** — the 500 TCP and UDP ports from 6100 to 6599, for the protocols that clients reach by IP address and their own port, such as Hysteria2, TUIC, SSH, Snell, WireGuard and Mieru.
- **DNS Tunnels** — UDP port 53, for the DNSTT, Slipstream and MasterDnsVPN tunnels. Nothing answers on port 53 until you set up a DNS tunnel in the panel.

## Getting set up

1. Run **Set Admin Credentials** and save the username and password that it shows you.
2. Open the service's **Outbound Traffic** tab and set **Gateway** to the gateway that your clients will connect through, usually your StartTunnel. Your users' traffic then leaves from that gateway's address instead of your home IP address. See [Outbound traffic](#outbound-traffic).
3. Open **Interfaces**, then **Proxy Gateway**. On that same gateway, click **Add Domain**, select **Public Domain**, and add your domain. On your StartTunnel, forward public port 443 to the port shown for **Proxy Gateway**, and forward the range 6100-6599 to **Direct Protocol Ports**.
4. Run **Set Public Addresses** and choose that domain from the list, with port 443 if you forwarded public port 443. Hiddify Manager restarts to apply the change if it is running.
5. Start the service and open the **Web Panel** interface. The username is already filled in. Sign in with the password from step 1.
6. Create a user in the panel. Open the user's page to get the subscription link or QR code, and import it into the Hiddify app or another client.

## Using Hiddify Manager

### Actions

- **Set Admin Credentials** — generates a new owner UUID and a new password. The Web Panel address changes with the UUID, and the old address and password stop working. Run it again whenever you think that the credentials have leaked. Your users and their subscriptions are not affected.
- **Set Public Addresses** — chooses the addresses that Hiddify Manager puts in client configurations and subscription links. Run it again whenever those addresses change. Hiddify Manager adds one domain to the panel for each address. Domains that you add yourself in the panel are kept.

### Ports

The port of each address that you choose with **Set Public Addresses** is the port that domain-based protocols advertise. If you forward public port 443 to the **Proxy Gateway** interface, choose the address with port 443.

Protocols that clients reach by their own port only work on ports 6100 to 6599. A protocol that you create in the panel on any other port runs, but nothing outside the server can reach it.

### DNS tunnels

A DNS tunnel needs a domain whose NS record points at a name that resolves to your server, and public port 53 forwarded to the **DNS Tunnels** interface. Set up the tunnel in the panel; the upstream guide explains the DNS records.

### Settings that Hiddify Manager controls

Hiddify Manager writes some of the panel's settings on every start, so a change that you make to them in the panel does not last:

- the owner's UUID and password, which **Set Admin Credentials** sets;
- the admin path, which is part of the **Web Panel** address;
- the domains that **Set Public Addresses** manages.

### Outbound traffic

Traffic that your users send through Hiddify Manager leaves from this server, so the sites they visit see the server's outbound address. If you publish Hiddify Manager through a tunnel to keep your home IP private, send the server's outbound traffic through that tunnel too. If you use the tunnel for another reason, such as a port that your router cannot forward, there is nothing to change.

Hiddify Manager also contacts public services on its own: it downloads routing rule sets from GitHub, it tests configurations and camouflage domains against public sites, and it asks Let's Encrypt and ZeroSSL for certificates for the domains in the panel.

## Limitations

- WARP and the panel's firewall settings do not work on StartOS.
- WireGuard works through the **Direct Protocol Ports** interface, but kernel WireGuard is not available.
- Plain-HTTP connections on port 80 cannot work, because StartOS uses port 80 itself. "Allow HTTP Connection" starts turned off for that reason.
- The panel usually cannot get Let's Encrypt certificates for its domains, so the **Proxy Gateway** serves self-signed certificates. Hiddify's client configurations allow them.
- Updating from inside the panel is turned off. Update by installing a newer version of this service.
