"""
Espelha colunas escolhidas da planilha de origem do IPYS nas abas da
nossa planilha destino.
"""

import re
import sys
import unicodedata
from pathlib import Path

import gspread
from google.oauth2.service_account import Credentials

sys.path.insert(0, str(Path(__file__).resolve().parent))

import config


def norm(txt):
    if txt is None:
        return ""
    t = str(txt).replace("\n", " ").strip().lower()
    t = "".join(c for c in unicodedata.normalize("NFKD", t)
                if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", t)


def vazio(x):
    """True para None, string vazia ou só espaços."""
    return x is None or str(x).strip() == ""


def conectar():
    creds = Credentials.from_service_account_file(
        config.CREDENTIALS_FILE, scopes=config.SCOPES
    )
    return gspread.authorize(creds)


def achar_coluna(header, chave):
    nk = norm(chave)
    for i, h in enumerate(header):
        if nk in norm(h):
            return i
    return None


def espelhar(gc):
    origem = gc.open_by_key(config.ORIGEM_SHEET_ID)
    destino = gc.open_by_key(config.DESTINO_SHEET_ID)

    for esp in config.ESPELHOS:
        ws_o = origem.worksheet(esp["origem"])
        valores = ws_o.get_all_values()
        if not valores:
            print(f"Aviso: aba de origem '{esp['origem']}' está vazia.")
            continue

        header = valores[0]

        idxs, nomes_destino = [], []
        for trecho, nome in esp["colunas"]:
            i = achar_coluna(header, trecho)
            if i is None:
                raise SystemExit(
                    f"Coluna não encontrada em '{esp['origem']}': {trecho}"
                )
            idxs.append(i)
            nomes_destino.append(nome if nome else header[i])

        chave_pos = None
        if esp.get("chave_linha") and esp["chave_linha"] in nomes_destino:
            chave_pos = nomes_destino.index(esp["chave_linha"])

        saida = [nomes_destino]
        for linha in valores[1:]:
            selec = [linha[i] if i < len(linha) else "" for i in idxs]
            if chave_pos is not None:
                if vazio(selec[chave_pos]):
                    continue
            else:
                if all(vazio(x) for x in selec):
                    continue
            saida.append(selec)

        try:
            ws_d = destino.worksheet(esp["destino"])
        except gspread.WorksheetNotFound:
            ws_d = destino.add_worksheet(
                title=esp["destino"],
                rows=max(len(saida) + 10, 100),
                cols=max(len(nomes_destino) + 2, 10),
            )
        ws_d.clear()
        ws_d.update(range_name="A1", values=saida, value_input_option="RAW")
        print(f"{esp['destino']}: {len(saida) - 1} linhas, {len(nomes_destino)} colunas")


def main():
    if not config.DESTINO_SHEET_ID:
        raise SystemExit("Falta DESTINO_SHEET_ID no .env")
    gc = conectar()
    espelhar(gc)
    print("\nPronto. Confere as abas CONSOLIDADO e RESPUESTAS na planilha destino.")


if __name__ == "__main__":
    main()