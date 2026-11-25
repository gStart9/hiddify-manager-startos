FROM ghcr.io/hiddify/hiddify-manager:v14.2.0

COPY docker/patch.py /opt/startos/patch.py
RUN /opt/hiddify-manager/.venv313/bin/python -I /opt/startos/patch.py

COPY docker/startos-init.sh docker/hiddify-panel-cli /usr/local/bin/
COPY docker/apply.py /opt/startos/apply.py
RUN chmod 0755 /usr/local/bin/startos-init.sh /usr/local/bin/hiddify-panel-cli \
 && chmod 0644 /opt/startos/apply.py

ENTRYPOINT ["/usr/local/bin/startos-init.sh"]
