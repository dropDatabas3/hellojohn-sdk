# Go API Quickstart

Minimal `net/http` API protected with `sdks/go`.

## Run

```bash
go run main.go
```

Test:

```bash
curl http://localhost:4000/api/public
curl -H "Authorization: Bearer <token>" http://localhost:4000/api/profile
```
