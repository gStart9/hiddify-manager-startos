#!/bin/bash
cd /opt/hiddify-manager || exit 1
source scripts/common/utils.sh
ensure_hiddify_data_dirs
install -m 0755 services/docker/systemctl /usr/bin/systemctl
install -m 0755 services/docker/journalctl /usr/bin/journalctl

export REDIS_URI_MAIN="redis://:${REDIS_PASSWORD}@127.0.0.1:6379/1"
export SQLALCHEMY_DATABASE_URI="mysql+mysqldb://hiddifypanel:${MYSQL_PASSWORD}@127.0.0.1:3306/hiddifypanel?charset=utf8mb4"
export HIDDIFY_CFG_PATH=/opt/hiddify-manager/data/hiddify-panel/app.cfg
source .venv313/bin/activate

(cd services/panel && bash run.sh) || echo "StartOS: the panel database setup reported an error"
(cd services/panel && python3 -I /opt/startos/apply.py) || echo "StartOS: applying the StartOS settings failed"

DO_NOT_INSTALL=true ./scripts/install.sh docker --no-gui ||
    echo "StartOS: one or more Hiddify components failed to start; see the log above"
echo "StartOS: Hiddify Manager boot finished"

touch data/log/panel.log
exec tail -n 0 -F $(find data/log -maxdepth 1 -type f -name '*.log')
