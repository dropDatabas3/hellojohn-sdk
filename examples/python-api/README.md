# Python FastAPI Quickstart

Minimal FastAPI example for the `hellojohn` Python SDK.

## Run

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 4001
```

Test:

```bash
curl http://localhost:4001/api/public
curl -H "Authorization: Bearer <token>" http://localhost:4001/api/profile
```
