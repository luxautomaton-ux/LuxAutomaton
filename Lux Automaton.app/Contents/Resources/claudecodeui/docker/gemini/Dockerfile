FROM docker/sandbox-templates:gemini

USER root
COPY shared/install-cloudcli.sh /tmp/install-cloudcli.sh
RUN chmod +x /tmp/install-cloudcli.sh && /tmp/install-cloudcli.sh

USER agent
RUN npm install -g @lux-automaton/lux-cli && luxcli --version

COPY --chown=agent:agent shared/start-cloudcli.sh /home/agent/.luxcli-start.sh
RUN echo '. ~/.luxcli-start.sh' >> /home/agent/.bashrc