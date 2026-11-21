// Comando geocodificar: carga única das coordenadas dos endereços já cadastrados
// (Spec 003). Segue a política do Nominatim para tarefas em lote: um só processo e
// no máximo 4 requisições por minuto. É idempotente: só trata pendentes, e uma
// falha do serviço interrompe para tentar de novo mais tarde.
//
//	go run ./backend/cmd/geocodificar -simular
//	go run ./backend/cmd/geocodificar
//
// A saída tem só contagens, nunca endereços.
package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"time"

	"vec/backend/internal/config"
	"vec/backend/internal/geo"
	"vec/backend/internal/store"
)

const porMinuto = 4

func main() {
	config.LoadEnv()
	simular := flag.Bool("simular", false, "só conta os pendentes, sem consultar o serviço")
	maximo := flag.Int("max", 0, "processa no máximo N endereços (0 = todos)")
	flag.Parse()
	if geo.Desligado() {
		die("GEOCODER=off: geocodificação desligada")
	}
	db, err := config.OpenDB()
	if err != nil {
		die(err.Error())
	}
	fmt.Println("Banco:", config.DBHost())
	st := &store.Store{DB: db}
	ctx := context.Background()

	cliente := geo.Novo("carga")
	cliente.Intervalo = time.Minute / porMinuto
	contagem := map[string]int{}
	feitos := 0
	vistos := map[int64]bool{} // se uma gravação não casar, o mesmo pendente não volta em laço
	for *maximo == 0 || feitos < *maximo {
		lote, err := st.PendentesGeo(ctx, 50)
		if err != nil {
			die(err.Error())
		}
		novos := lote[:0]
		for _, p := range lote {
			if !vistos[p.Linha] {
				novos = append(novos, p)
			}
		}
		if len(novos) == 0 {
			break
		}
		lote = novos
		if *simular {
			fmt.Printf("Pendentes no primeiro lote: %d (no máximo 50 por consulta)\n", len(lote))
			return
		}
		for _, p := range lote {
			if *maximo > 0 && feitos >= *maximo {
				break
			}
			vistos[p.Linha] = true
			r, err := cliente.Geocodificar(ctx, p.Endereco)
			if err != nil {
				fmt.Printf("Parado após %d endereços: %v. Rode de novo mais tarde.\n", feitos, err)
				imprimir(contagem)
				os.Exit(1)
			}
			if _, err := st.GravarCoordenada(ctx, p.Linha, p.Endereco, r.Lat, r.Lng, geo.Fonte, r.Precisao, time.Now()); err != nil {
				die(err.Error())
			}
			contagem[r.Precisao]++
			feitos++
		}
	}
	fmt.Printf("Concluído: %d endereços.\n", feitos)
	imprimir(contagem)
}

func imprimir(c map[string]int) {
	for _, p := range []string{store.GeoRua, store.GeoBairro, store.GeoCidade, store.GeoNaoEncontrado} {
		if c[p] > 0 {
			fmt.Printf("  %s: %d\n", p, c[p])
		}
	}
}

func die(msg string) {
	fmt.Fprintln(os.Stderr, "erro:", msg)
	os.Exit(1)
}
