#!/usr/bin/env python3
"""Confere um dump restaurado (Spec 006): integrity_check e contagens do manifesto.

Uso: verificar.py <banco.db> <manifesto.json>

Imprime só "ok" ou a etapa que falhou, sem nomes de tabelas com valores nem
contagens: os logs do workflow são públicos.
"""
import json
import sqlite3
import sys


def main() -> int:
    banco, manifesto = sys.argv[1], sys.argv[2]
    with open(manifesto, encoding="utf-8") as f:
        esperado = json.load(f)
    if not esperado:
        print("verificação: manifesto vazio")
        return 1
    con = sqlite3.connect(banco)
    try:
        if con.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            print("verificação: integrity_check falhou")
            return 1
        diferentes = 0
        for tabela, n in esperado.items():
            nome = '"' + tabela.replace('"', '""') + '"'
            if con.execute(f"SELECT count(*) FROM {nome}").fetchone()[0] != n:
                diferentes += 1
        if diferentes:
            print(f"verificação: {diferentes} tabela(s) com contagem diferente")
            return 1
        if con.execute("SELECT count(*) FROM schema_migrations").fetchone()[0] == 0:
            print("verificação: schema_migrations vazio")
            return 1
    finally:
        con.close()
    print("verificação: ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
