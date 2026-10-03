// Comando importar: copia as respostas da planilha do Google (aba "Respostas",
// exportada como CSV) para o banco. Pode rodar mais de uma vez: o que já foi
// importado é ignorado.
//
//	go run ./cmd/importar -arquivo dados/respostas.csv
//	go run ./cmd/importar -arquivo dados/respostas.csv -simular
package main

import (
	"context"
	"encoding/csv"
	"flag"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"vec/internal/config"
	"vec/internal/store"
)

var fusoBR = time.FixedZone("-03", -3*60*60)

// Cabeçalhos da aba "Respostas" do Apps Script (sem acentos, minúsculos).
var cabecalhos = map[string]string{
	"data/hora": "dataHora", "nome completo": "nome", "data de nascimento": "nascimento",
	"recebeu jesus": "recebeuJesus", "cafe com pastor": "cafePastor", "estacao dna": "estacaoDNA",
	"acomp. inicial": "acompInicial", "nova criatura": "novaCriatura", "batismo": "batismo",
	"batismo no espirito": "batismoEspirito", "setor": "setor", "celula": "celula",
	"frequenta cultos": "frequentaCultos", "serve ministerio": "serveMinisterio",
	"qual ministerio": "ministerioNome", "expresso 01": "expresso01", "expresso 02": "expresso02",
	"tlc": "tlc", "encontro com deus": "encontroDeus", "tadel": "tadel", "discipulador": "discipulador",
	"interesse discipulado": "interesseDiscipulado", "interesse cuidar": "interesseCuidar",
	"interesse lider": "interesseLider", "interesse anfitriao": "interesseAnfitrao", "sugestao": "sugestao",
}

var tiraAcentos = strings.NewReplacer(
	"á", "a", "à", "a", "â", "a", "ã", "a", "ä", "a", "é", "e", "ê", "e", "è", "e", "ë", "e",
	"í", "i", "î", "i", "ì", "i", "ó", "o", "ô", "o", "õ", "o", "ò", "o", "ö", "o",
	"ú", "u", "û", "u", "ù", "u", "ü", "u", "ç", "c",
)

func normaliza(s string) string {
	s = strings.TrimPrefix(s, "\ufeff")
	return strings.TrimSpace(tiraAcentos.Replace(strings.ToLower(strings.TrimSpace(s))))
}

func main() {
	config.LoadDotEnv(".env")
	arquivo := flag.String("arquivo", "", "CSV exportado da aba Respostas")
	simular := flag.Bool("simular", false, "só mostra o que seria importado, sem gravar")
	flag.Parse()
	if *arquivo == "" {
		die("informe -arquivo caminho/do/respostas.csv")
	}

	f, err := os.Open(*arquivo)
	if err != nil {
		die(err.Error())
	}
	defer f.Close()

	rs, avisos, err := ler(f)
	if err != nil {
		die(err.Error())
	}
	for _, a := range avisos {
		fmt.Println("aviso:", a)
	}
	fmt.Printf("%d respostas válidas no arquivo.\n", len(rs))
	if *simular || len(rs) == 0 {
		fmt.Println("Nada foi gravado (modo simulação ou arquivo vazio).")
		return
	}

	db, err := config.OpenDB()
	if err != nil {
		die(err.Error())
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()
	novas, err := (&store.Store{DB: db}).ImportarRespostas(ctx, rs)
	if err != nil {
		die(err.Error())
	}
	fmt.Printf("%d novas respostas gravadas; %d já existiam e foram ignoradas.\n", novas, len(rs)-novas)
}

func ler(r io.Reader) ([]store.Resposta, []string, error) {
	bruto, err := io.ReadAll(r)
	if err != nil {
		return nil, nil, err
	}
	texto := strings.TrimPrefix(string(bruto), "\ufeff")
	// O Google Planilhas exporta com vírgula; o Excel em português usa ponto e vírgula.
	primeira, _, _ := strings.Cut(texto, "\n")
	sep := ','
	if strings.Count(primeira, ";") > strings.Count(primeira, ",") {
		sep = ';'
	}
	cr := csv.NewReader(strings.NewReader(texto))
	cr.FieldsPerRecord = -1
	cr.LazyQuotes = true
	cr.Comma = sep
	todas, err := cr.ReadAll()
	if err != nil {
		return nil, nil, fmt.Errorf("lendo CSV: %w", err)
	}
	if len(todas) < 2 {
		return nil, nil, fmt.Errorf("o arquivo não tem linhas de dados")
	}

	col := map[string]int{} // chave do campo -> posição
	for i, h := range todas[0] {
		if k, ok := cabecalhos[normaliza(h)]; ok {
			col[k] = i
		}
	}
	for _, obrigatoria := range []string{"dataHora", "nome", "nascimento"} {
		if _, ok := col[obrigatoria]; !ok {
			return nil, nil, fmt.Errorf("coluna obrigatória não encontrada no cabeçalho: %q", obrigatoria)
		}
	}

	var out []store.Resposta
	var avisos []string
	for n, linha := range todas[1:] {
		get := func(k string) string {
			i, ok := col[k]
			if !ok || i >= len(linha) {
				return ""
			}
			return strings.TrimSpace(linha[i])
		}
		nome := tiraApostrofo(get("nome"))
		if nome == "" {
			continue
		}
		quando, ok := parseDataHora(get("dataHora"))
		if !ok {
			avisos = append(avisos, fmt.Sprintf("linha %d (%s): data/hora inválida %q, linha ignorada", n+2, nome, get("dataHora")))
			continue
		}
		v := map[string]string{}
		for _, c := range store.Campos {
			val := tiraApostrofo(get(c.Chave))
			if c.SN {
				val = normalizaSN(val)
			}
			v[c.Chave] = val
		}
		v["nome"] = nome
		nasc, ok := parseNascimento(get("nascimento"))
		if !ok && get("nascimento") != "" {
			avisos = append(avisos, fmt.Sprintf("linha %d (%s): nascimento %q não reconhecido, importado em branco", n+2, nome, get("nascimento")))
		}
		v["nascimento"] = nasc
		out = append(out, store.Resposta{CriadoEm: quando.UTC().Format(time.RFC3339), V: v})
	}
	return out, avisos, nil
}

func tiraApostrofo(s string) string {
	// O Apps Script antigo protegia textos que começam com = + - @ com um apóstrofo.
	if len(s) > 1 && s[0] == '\'' && strings.ContainsRune("=+-@", rune(s[1])) {
		return s[1:]
	}
	return s
}

func normalizaSN(s string) string {
	switch normaliza(s) {
	case "s", "sim":
		return "S"
	case "n", "nao":
		return "N"
	}
	return ""
}

func parseDataHora(s string) (time.Time, bool) {
	for _, layout := range []string{"02/01/2006 15:04:05", "2/1/2006 15:04:05", "02/01/2006 15:04", "2006-01-02 15:04:05"} {
		if t, err := time.ParseInLocation(layout, s, fusoBR); err == nil {
			return t, true
		}
	}
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t, true
	}
	return time.Time{}, false
}

func parseNascimento(s string) (string, bool) {
	if s == "" {
		return "", false
	}
	for _, layout := range []string{"2006-01-02", "02/01/2006", "2/1/2006"} {
		if t, err := time.Parse(layout, s); err == nil && t.Year() >= 1900 {
			return t.Format("2006-01-02"), true
		}
	}
	return "", false
}

func die(msg string) {
	fmt.Fprintln(os.Stderr, "erro:", msg)
	os.Exit(1)
}
