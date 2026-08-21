"""
Configuração do pipeline para a nossa tabela espelho.
Lê a planilha de origem do IPYS e copia colunas escolhidas pra abas da
nossa planilha.
"""

"""
Configuração do pipeline de espelho.

Lê a planilha de origem do IPYS e copia colunas escolhidas pra abas da
nossa planilha destino. A CONSOLIDADO renomeia as colunas pros nomes
antigos (snake_case), pra não quebrar o código que consome essa base.
"""

import os
from dotenv import load_dotenv

load_dotenv()

CREDENTIALS_FILE = os.getenv("CREDENTIALS_FILE", "credentials.json")
ORIGEM_SHEET_ID = os.getenv("ORIGEM_SHEET_ID", "")
DESTINO_SHEET_ID = os.getenv("DESTINO_SHEET_ID", "").strip()

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

ESPELHOS = [
    {
        "origem": "Categorización total",
        "destino": "CONSOLIDADO",
        "chave_linha": "estado",
        "colunas": [
            ("Estado", "estado"),
            ("Municipio/Parroquia", "unidade"),
            ("Población (Encovi 2021)", "poblacion"),
            ("Tamaño municipio", "tamano"),
            ("Número de medios que cubren el municipio", "medios_total"),
            ("Número de medios que cubre sus zonas urbanas", "medios_urbanos"),
            ("Número de medios que cubre sus zonas rurales", "medios_rurales"),
            ("plurales con al menos 1 fuente", "medios_plurales_1fuente"),
            ("plurales con al menos 2 fuentes", "medios_plurales_2fuentes"),
            ("Categorización definitiva", "categoria_definitiva"),
        ],
    },
    {
        "origem": "Respuestas ",  # atenção: tem um espaço no fim do nome
        "destino": "RESPUESTAS",
        "chave_linha": None,
        "colunas": [
            ("Estado", "estado"),
            ("5. Marque todas las plataformas", "Marque todas las plataformas"),
            ("6. ¿Cuál es la naturaleza legal", "¿Cuál es la naturaleza legal"),
            ("15. ¿Cuáles son las temáticas", "¿Cuáles son las temáticas"),
            ("10. ¿Cuáles son las fuentes de ingresos", "¿Cuáles son las fuentes de ingresos"),
            ("17. ¿El proyecto u organización periodística que refiere ha enfrentado", "¿El proyecto u organización periodística que refiere ha enfrentado"),
        ],
    },
]