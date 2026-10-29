# nf-extractor

Foto ou PDF de nota fiscal → dados estruturados revisados → CSV.

Em construção. O README completo (número medido, diagrama e decisões) entra quando o eval rodar.

## Como rodar

```bash
docker compose up
```

App em http://localhost:3000, health check em `/api/health`. Sem `ANTHROPIC_API_KEY`, sobe com o extrator fake.
