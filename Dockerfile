FROM denoland/deno:2.9.7
WORKDIR /app
COPY --chown=deno:deno . .
USER deno
ENV PORT=8000
EXPOSE 8000
CMD ["run", "--no-config", "--no-lock", "--no-prompt", "--allow-read=/app", "--allow-env=OPENAI_API_KEY,OPENAI_MODEL,PUBLIC_ORIGIN,PORT", "--allow-net", "serve-hosted.js"]
