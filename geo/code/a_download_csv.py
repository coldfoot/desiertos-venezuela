import requests
import pandas as pd
from pathlib import Path

# Standardized column names for the PUESTOS_Y_MEDIOS_* tabs. Keys are the sheet
# headers lowercased and stripped, so "Estado" and "estado" both map to "estado".
TOTALS_COLUMNS = {
    "estado": "estado",
    "número de puestos periodísticos declarados por estado": "puestos_periodisticos",
    "número de medios por estado": "medios_total",
}


def download_tab_csv(filename, sheet_id, gid, output_dir):
    '''
    This function requires a Google Sheet it and an individual tab id (gid).
    It downloads it to the specified output directory with a fixed filename.
    '''

    filename = output_dir / filename

    url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={gid}"
    r = requests.get(url)
    r.raise_for_status()  # a wrong gid would otherwise save Google's error page as the CSV

    print(filename)

    with open(filename, "wb") as f:
        f.write(r.content)

    return filename


def standardize_totals_csv(path):
    '''
    Cleans a downloaded PUESTOS_Y_MEDIOS_* tab in place so later scripts can rely on it:
    renames the headers to estado / puestos_periodisticos / medios_total, strips stray
    spaces from the state names, and turns the counts into plain integers.

    The counts are checked as digit-only text before converting: a cell formatted in
    the sheet as "2.065" would otherwise be read by pandas as the float 2.065, and
    silently become 2. Anything that isn't a whole number stops the script.
    '''
    df = pd.read_csv(path, dtype=str)

    df.columns = [c.strip().lower() for c in df.columns]
    unexpected = set(df.columns) - set(TOTALS_COLUMNS)
    missing = set(TOTALS_COLUMNS) - set(df.columns)
    if unexpected or missing:
        raise ValueError(
            f"{path}: headers changed in the sheet. "
            f"unexpected: {unexpected}, missing: {missing}"
        )
    df = df.rename(columns=TOTALS_COLUMNS)

    df["estado"] = df["estado"].str.strip()

    for col in ["puestos_periodisticos", "medios_total"]:
        values = df[col].str.strip()
        bad = df[~values.fillna("").str.fullmatch(r"\d+")]
        if len(bad):
            raise ValueError(f"{path}: non-integer values in {col}:\n{bad}")
        df[col] = values.astype(int)

    df.to_csv(path, index=False)


def main():

    # Sets directory to save output
    output_dir = Path("../output/")

    # Create the directory and any missing parent folders safely
    output_dir.mkdir(parents=True, exist_ok=True)

    # Sheet id which the crawler script and tab gids to get
    sheet_id = '15TeYsjwgtutPPrT7R0Hqr77C4-rzw_-OGBGxt1eoR9U'

    # Tabs used as-is: CONSOLIDADO, RESPUESTAS
    gids = ['1376492505', '258815143']
    filenames = [ Path('a_consolidado.csv'), Path("a_respuestas.csv") ]

    for filename, gid in zip(filenames, gids):
        download_tab_csv(filename, sheet_id, gid, output_dir)

    # Tabs with the official (de-duplicated) totals: PUESTOS_Y_MEDIOS_ESTADO,
    # PUESTOS_Y_MEDIOS_VENEZUELA. Standardized right after download.
    totals_gids = ['1595213898', '1483123656']
    totals_filenames = [ Path('a_totales_estado.csv'), Path('a_totales_venezuela.csv') ]

    for filename, gid in zip(totals_filenames, totals_gids):
        path = download_tab_csv(filename, sheet_id, gid, output_dir)
        standardize_totals_csv(path)


if __name__ == "__main__":
    main()