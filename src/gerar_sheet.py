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

def gerar_puestos_medios(gc):
    """
    Pega, direto da aba Categorización total, os dois números que o IPYS
    já calcula por estado: puestos periodísticos declarados e número de
    medios.
    """
    ag = config.PUESTOS_MEDIOS
    origem = gc.open_by_key(config.ORIGEM_SHEET_ID)
    destino = gc.open_by_key(config.DESTINO_SHEET_ID)

    ws_o = origem.worksheet(ag["origem"])
    valores = ws_o.get_all_values()
    header = valores[0]

    col_estado = achar_coluna(header, ag["coluna_estado"])
    col_puestos = achar_coluna(header, ag["coluna_puestos"])
    col_medios = achar_coluna(header, ag["coluna_medios"])
    if None in (col_estado, col_puestos, col_medios):
        raise SystemExit("Não achei as colunas de puestos/medios na Categorización total.")

    dados = {}
    for linha in valores[1:]:
        estado = linha[col_estado] if col_estado < len(linha) else ""
        if vazio(estado):
            continue
        estado = estado.strip()
        if estado in dados:
            continue
        p = linha[col_puestos] if col_puestos < len(linha) else ""
        m = linha[col_medios] if col_medios < len(linha) else ""
        if vazio(p) and vazio(m):
            continue
        dados[estado] = (p, m)

    saida = [[header[col_estado], header[col_puestos], header[col_medios]]]
    for estado in sorted(dados):
        p, m = dados[estado]
        saida.append([estado, p, m])

    try:
        ws_d = destino.worksheet(ag["destino"])
    except gspread.WorksheetNotFound:
        ws_d = destino.add_worksheet(title=ag["destino"], rows=len(saida) + 10, cols=5)
    ws_d.clear()
    ws_d.update(range_name="A1", values=saida, value_input_option="RAW")
    print(f"{ag['destino']}: {len(saida) - 1} linhas")

    return dados, header[col_puestos], header[col_medios]


def gerar_total_venezuela(gc, dados, nome_puestos, nome_medios):
    """
    Soma os valores de puestos e medios de todos os estados e escreve
    numa aba só com o total da Venezuela.
    """
    destino = gc.open_by_key(config.DESTINO_SHEET_ID)

    tot_puestos = 0
    tot_medios = 0
    for p, m in dados.values():
        try:
            tot_puestos += float(p)
        except (TypeError, ValueError):
            pass
        try:
            tot_medios += float(m)
        except (TypeError, ValueError):
            pass

    saida = [
        ["estado", nome_puestos, nome_medios],
        ["Venezuela", int(tot_puestos), int(tot_medios)],
    ]

    nome_aba = "PUESTOS_Y_MEDIOS_VENEZUELA"
    try:
        ws_d = destino.worksheet(nome_aba)
    except gspread.WorksheetNotFound:
        ws_d = destino.add_worksheet(title=nome_aba, rows=10, cols=5)
    ws_d.clear()
    ws_d.update(range_name="A1", values=saida, value_input_option="RAW")
    print(f"{nome_aba}: total Venezuela ({int(tot_puestos)} puestos, {int(tot_medios)} medios)")

def main():
    if not config.DESTINO_SHEET_ID:
        raise SystemExit("Falta DESTINO_SHEET_ID no .env")
    gc = conectar()
    espelhar(gc)
    dados, nome_puestos, nome_medios = gerar_puestos_medios(gc)
    gerar_total_venezuela(gc, dados, nome_puestos, nome_medios)
    print("\nPronto. Confere CONSOLIDADO, RESPUESTAS, PUESTOS_Y_MEDIOS_ESTADO e PUESTOS_Y_MEDIOS_VENEZUELA.")


if __name__ == "__main__":
    main()