// Comando segredo: gera um valor aleatório para SESSION_SECRET.
//
//	go run ./backend/cmd/segredo
package main

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
)

func main() {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		fmt.Fprintln(os.Stderr, "erro:", err)
		os.Exit(1)
	}
	fmt.Println(hex.EncodeToString(b))
}
