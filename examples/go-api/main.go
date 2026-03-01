package main

import (
	"encoding/json"
	"log"
	"net/http"

	hellojohn "github.com/dropDatabas3/hellojohn-go"
)

func main() {
	client, err := hellojohn.New(hellojohn.Config{
		Domain: "http://localhost:8080",
	})
	if err != nil {
		log.Fatalf("failed to init HelloJohn client: %v", err)
	}

	mux := http.NewServeMux()
	mux.Handle("GET /api/public", publicHandler())
	mux.Handle("GET /api/profile", client.RequireAuth(profileHandler()))

	log.Println("go-api quickstart listening on :4000")
	log.Fatal(http.ListenAndServe(":4000", mux))
}

func publicHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"message": "Public endpoint"})
	})
}

func profileHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := hellojohn.ClaimsFromContext(r.Context())
		writeJSON(w, http.StatusOK, map[string]string{
			"user_id":   claims.UserID,
			"tenant_id": claims.TenantID,
		})
	})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

