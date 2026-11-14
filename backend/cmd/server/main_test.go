package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestVersionHandler(t *testing.T) {
	handler := versionHandler("42")

	res := httptest.NewRecorder()
	handler.ServeHTTP(res, httptest.NewRequest(http.MethodGet, "/version", nil))

	if res.Code != http.StatusOK || res.Body.String() != "42" {
		t.Fatalf("GET /version = %d %q", res.Code, res.Body.String())
	}
	if res.Header().Get("Cache-Control") != "no-store" {
		t.Errorf("Cache-Control = %q", res.Header().Get("Cache-Control"))
	}

	res = httptest.NewRecorder()
	handler.ServeHTTP(res, httptest.NewRequest(http.MethodPost, "/version", nil))
	if res.Code != http.StatusMethodNotAllowed || res.Header().Get("Allow") != http.MethodGet {
		t.Errorf("POST /version = %d, Allow %q", res.Code, res.Header().Get("Allow"))
	}
}
