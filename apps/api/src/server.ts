import Fastify from "fastify";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ ok: true }));

app.listen({ port: 4000, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
