FROM node:24-bookworm-slim AS dashboard
WORKDIR /build/dashboard
COPY dashboard/package*.json ./
RUN npm ci --no-audit --no-fund
COPY dashboard/ ./
RUN npm run build

FROM node:24-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates git tini \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m venv /opt/semgrep \
    && /opt/semgrep/bin/pip install --no-cache-dir semgrep==1.180.0
ENV PATH="/opt/semgrep/bin:${PATH}" NODE_ENV=production PORT=8787 AGENT_RUNTIME=local TARGET_PROVIDER=neon
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --include=dev --no-audit --no-fund
COPY --chown=node:node server/ /app/server/
COPY --chown=node:node targets/ /app/targets/
COPY --chown=node:node rules/ /app/rules/
COPY --chown=node:node kb/ /app/kb/
COPY --from=dashboard --chown=node:node /build/dashboard/dist /app/dashboard/dist
RUN mkdir -p /app/sandbox /app/rules/learned /app/kb/learned && chown -R node:node /app
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e 'fetch("http://localhost:"+process.env.PORT+"/health").then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))'
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["./node_modules/.bin/tsx", "src/hosted-entry.ts"]
