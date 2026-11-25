"""Patches Hiddify Manager to boot unprivileged and offline inside a StartOS subcontainer.

Every replacement must match its expected number of times, or the image build fails.
"""

import pathlib
import sys

ROOT = pathlib.Path("/opt/hiddify-manager")
PANEL = ROOT / ".venv313/lib/python3.13/site-packages/hiddifypanel"
PORT_START = 6100
PORT_COUNT = 500


def patch(path: pathlib.Path, old: str, new: str, count: int = 1) -> None:
    text = path.read_text()
    if text.count(old) != count:
        sys.exit(f"patch.py: expected {count} match(es) in {path} for:\n{old}")
    path.write_text(text.replace(old, new))


install = ROOT / "scripts/install.sh"
patch(install, '        add_task "Common tools and requirements" runsh install.sh scripts/common\n', "")
patch(install, '        add_task "Firewall" install_run services/firewall\n', "")
patch(install, '        add_task "Warp" install_run services/warp 1\n', '        add_task "Warp" install_run services/warp 0\n')
patch(
    install,
    'add_task "Wireguard" install_run services/wireguard "$(hconfig "wireguard_enable")"',
    'add_task "Wireguard" install_run services/wireguard false',
)
patch(install, "export SERVER_IP=$(curl --connect-timeout 1 -s https://v4.ident.me/)", "export SERVER_IP=")
patch(install, "SERVER_IPv6=$(curl --connect-timeout 1 -s https://v6.ident.me/)", "SERVER_IPv6=")

router = ROOT / "services/dns_proxy/hiddify-dnstm-router.service"
patch(router, "User=dns_proxy\nGroup=dns_proxy\n", "User=root\nGroup=root\n")

patch(
    PANEL / "hutils/network/net.py",
    'ip = urllib.request.urlopen(f"https://v{version}.ident.me/", timeout=2).read().decode("utf8")',
    "ip = None",
    count=2,
)

patch(
    PANEL / "proxy_v3/template_catalog/custom_proxy_presets.py",
    "    return 10_000 + mixed\n",
    f"    return {PORT_START} + mixed % {PORT_COUNT}\n",
)

patch(
    PANEL / "proxy_v3/context_vars/ports.py",
    "        return _apply_tcp_udp_filter(_resolved_lists(stable_proxy_port(pid, did)), protocol)\n",
    f"        return _apply_tcp_udp_filter(_resolved_lists({PORT_START} + stable_proxy_port(pid, did) % {PORT_COUNT}), protocol)\n",
)

patch(
    PANEL / "hutils/random.py",
    """def get_random_unused_port():
    port = random.randint(11000, 60000)
    while __is_in_used_port(port):
        port = random.randint(11000, 60000)
    return port
""",
    f"""def get_random_unused_port():
    used = set()
    for k in ConfigEnum:
        if "port" in k:
            for p in str(hconfig(k) or "").split(","):
                if p.strip().isdigit():
                    used.add(int(p))
    try:
        from hiddifypanel.models.custom_proxy import CustomProxy

        for row in CustomProxy.query.all():
            for p in [*(row.server_inbound_tcp_ports or []), *(row.server_inbound_udp_ports or [])]:
                used.add(int(p))
    except Exception:
        pass
    free = [p for p in range({PORT_START}, {PORT_START + PORT_COUNT - 4}) if p not in used]
    return random.choice(free) if free else {PORT_START}
""",
)

# include_path() renders a sidecar with ctx alone, so the params that server.j2 sets never reach it.
DNS = PANEL / "proxy_v3/proxy_templates/dns_proxy"
for name, defaults in (
    ("dnstt/args.j2", "mtu=1232, clientid_size=2, keepalive='2s', idle_timeout='10s', record_type='txt', dnstt_compat=false"),
    ("slipstream/args.j2", "upstream='127.0.0.1:2001'"),
    ("masterdns/server_config.toml.j2", "data_encryption_method=1, forward_ip='127.0.0.1', forward_port=2001"),
):
    path = DNS / name
    text = path.read_text()
    if "params is not defined" in text:
        sys.exit(f"patch.py: {path} already guards params")
    path.write_text(f"{{%- if params is not defined %}}{{%- set params = namespace({defaults}) %}}{{%- endif -%}}\n" + text)

# dnstm listens on the default-route IPv4 address alone; StartOS reaches the container in the client's address family.
patch(
    ROOT / "services/dns_proxy/utils.sh",
    '    jq --arg addr "${ip:-0.0.0.0}:53" \\\n',
    '    jq --arg addr "[::]:53" \\\n',
)
