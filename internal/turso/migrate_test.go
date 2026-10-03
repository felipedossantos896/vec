package turso

import (
	"reflect"
	"testing"
)

func TestSplitStatements(t *testing.T) {
	script := `
-- comentário no começo
CREATE TABLE a (id INTEGER PRIMARY KEY, nome TEXT); -- comentário no fim
/* bloco
   de comentário */
INSERT INTO a (nome) VALUES ('ponto; e vírgula'), ('aspa '' dupla');
INSERT INTO a (nome) VALUES ("com;aspas duplas");

`
	got, err := SplitStatements(script)
	if err != nil {
		t.Fatal(err)
	}
	want := []string{
		"CREATE TABLE a (id INTEGER PRIMARY KEY, nome TEXT)",
		"INSERT INTO a (nome) VALUES ('ponto; e vírgula'), ('aspa '' dupla')",
		`INSERT INTO a (nome) VALUES ("com;aspas duplas")`,
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("\n got: %q\nwant: %q", got, want)
	}
}

func TestSplitStatementsVazio(t *testing.T) {
	got, err := SplitStatements("-- só comentário\n;;\n")
	if err != nil || len(got) != 0 {
		t.Errorf("esperava vazio, veio %q (%v)", got, err)
	}
}

func TestSplitStatementsRejeitaTrigger(t *testing.T) {
	_, err := SplitStatements("CREATE TRIGGER t AFTER INSERT ON a BEGIN SELECT 1; END;")
	if err == nil {
		t.Error("CREATE TRIGGER deveria ser recusado")
	}
}
