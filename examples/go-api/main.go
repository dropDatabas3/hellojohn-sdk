// Example: Go API protected with HelloJohn
//
// This demonstrates how to use the HelloJohn Go SDK
// to protect API endpoints with JWT verification and RBAC middleware.
//
// Run:
//   go run main.go
//
// Test:
//   curl -H "Authorization: Bearer <token>" http://localhost:3001/api/profile
//   curl -H "Authorization: Bearer <token>" http://localhost:3001/api/admin
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	hj "github.com/dropDatabas3/hellojohn-go"
)

func main() {
	domain := os.Getenv("HELLOJOHN_DOMAIN")
	if domain == "" {
		domain = "http://localhost:8080"
	}

	// 1. Create HelloJohn client
	client, err := hj.New(hj.Config{
		Domain: domain,
	})
	if err != nil {
		log.Fatalf("Failed to create HelloJohn client: %v", err)
	}

	mux := http.NewServeMux()

	// 2. Public endpoint — no auth required
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 200, map[string]string{"status": "ok"})
	})

	// 3. Protected endpoint — requires valid JWT
	mux.Handle("/api/profile", client.RequireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := hj.ClaimsFromContext(r.Context())
		writeJSON(w, 200, map[string]interface{}{
			"user_id":   claims.UserID,
			"tenant_id": claims.TenantID,
			"scopes":    claims.Scopes,
			"roles":     claims.Roles,
		})
	})))

	// 4. Role-protected endpoint — requires "admin" role
	adminHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := hj.ClaimsFromContext(r.Context())
		writeJSON(w, 200, map[string]interface{}{
			"message": "Welcome, admin!",
			"user_id": claims.UserID,
		})
	})
	mux.Handle("/api/admin", client.RequireAuth(
		client.RequireRole("admin")(adminHandler),
	))

	// 5. Scope-protected endpoint
	dataHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 200, map[string]interface{}{
			"data": []string{"item1", "item2", "item3"},
		})
	})
	mux.Handle("/api/data", client.RequireAuth(
		client.RequireScope("data:read")(dataHandler),
	))

	// 6. M2M example — service-to-service call
	mux.HandleFunc("/api/m2m-demo", func(w http.ResponseWriter, r *http.Request) {
		m2mID := os.Getenv("M2M_CLIENT_ID")
		m2mSecret := os.Getenv("M2M_CLIENT_SECRET")
		if m2mID == "" || m2mSecret == "" {
			writeJSON(w, 200, map[string]string{
				"message": "Set M2M_CLIENT_ID and M2M_CLIENT_SECRET to test M2M",
			})
			return
		}

		m2m, err := hj.NewM2MClient(hj.M2MConfig{
			Domain:       domain,
			ClientID:     m2mID,
			ClientSecret: m2mSecret,
		})
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}

		result, err := m2m.GetToken(r.Context(), hj.TokenRequest{
			Scopes: []string{"data:read"},
		})
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}

		writeJSON(w, 200, map[string]interface{}{
			"message":    "M2M token acquired!",
			"expires_at": result.ExpiresAt,
		})
	})

	addr := ":3001"
	fmt.Printf("Go API listening on %s\n", addr)
	fmt.Printf("  GET  /api/health       — public\n")
	fmt.Printf("  GET  /api/profile      — requires auth\n")
	fmt.Printf("  GET  /api/admin        — requires 'admin' role\n")
	fmt.Printf("  GET  /api/data         — requires 'data:read' scope\n")
	fmt.Printf("  GET  /api/m2m-demo     — M2M token demo\n")
	log.Fatal(http.ListenAndServe(addr, mux))
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
