"""Applies the StartOS-owned owner credential, admin path, public addresses and resolver to the panel database."""

import json
import os
import pathlib

from hiddifypanel import create_app_wsgi

MANAGED = pathlib.Path("/opt/hiddify-manager/data/startos-domains.json")
FIRST_BOOT_DONE = pathlib.Path("/opt/hiddify-manager/data/startos-first-boot-done")

app = create_app_wsgi()
with app.app_context():
    from hiddifypanel.database import db
    from hiddifypanel.models import AdminUser, ConfigEnum, Domain, DomainType, FakeMode, hconfig, set_hconfig

    owner = AdminUser.get_super_admin()
    uuid = os.environ["HM_ADMIN_UUID"]
    password = os.environ.get("HM_ADMIN_PASSWORD", "")
    if owner.uuid != uuid:
        owner.uuid = uuid
    if password and owner.password != password:
        owner.password = password
    db.session.commit()

    resolver = next(
        (line.split()[1] for line in pathlib.Path("/etc/resolv.conf").read_text().splitlines() if line.startswith("nameserver ")),
        None,
    )
    if resolver and (hconfig(ConfigEnum.dns_server) or "1.1.1.1") == "1.1.1.1":
        set_hconfig(ConfigEnum.dns_server, resolver)

    if not FIRST_BOOT_DONE.exists():
        set_hconfig(ConfigEnum.http_proxy_enable, False)
        FIRST_BOOT_DONE.touch()

    admin_path = os.environ["HM_ADMIN_PATH"]
    if hconfig(ConfigEnum.proxy_path_admin) != admin_path:
        set_hconfig(ConfigEnum.proxy_path_admin, admin_path)

    wanted = {a["host"]: a["port"] for a in json.loads(os.environ.get("HM_PUBLIC_ADDRESSES") or "[]")}
    previous = set(json.loads(MANAGED.read_text())) if MANAGED.exists() else set()
    for host in previous - wanted.keys():
        for d in Domain.query.filter(Domain.domain == host, Domain.child_id == 0).all():
            db.session.delete(d)
    for host, port in wanted.items():
        tls_port = None if port == 443 else port
        d = Domain.query.filter(Domain.domain == host, Domain.child_id == 0).first()
        if d is None:
            d = Domain(domain=host, mode=DomainType.direct, child_id=0)
            db.session.add(d)
        if d.tls_port != tls_port:
            d.tls_port = tls_port
    db.session.flush()

    managed = {d.domain: d for d in Domain.query.filter(Domain.child_id == 0, Domain.domain.in_(list(wanted))).all()}
    primary = next((managed[h] for h in wanted if h in managed), None)
    for d in Domain.query.filter(Domain.child_id == 0, Domain.fake_mode != FakeMode.valid).all():
        current = d.server_domain.domain if d.server_domain else None
        if current is not None and current not in previous | wanted.keys():
            continue
        d.server_domain = primary
        d.tls_port = primary.tls_port if primary else None
    db.session.commit()
    MANAGED.write_text(json.dumps(sorted(wanted)))

    from hiddifypanel.cache import cache

    cache.invalidate_all_cached_functions()
    print(f"StartOS: owner, admin path and {len(wanted)} public address(es) applied")
