import requests
from pathlib import Path

def download_tab_csv(filename, sheet_id, gid, output_dir):
    '''
    This function requires a Google Sheet it and an individual tab id (gid). 
    It downloads it to the specified output directory with a fixed filename.
    '''
    
    filename = output_dir / filename

    url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={gid}"
    r = requests.get(url)

    print(filename)

    with open(filename, "wb") as f:
        f.write(r.content)


def main():

    # Sets directory to save output
    output_dir = Path("../output/")

    # Create the directory and any missing parent folders safely
    output_dir.mkdir(parents=True, exist_ok=True)

    # Sheet id which the crawler script and tab gids to get
    sheet_id = '15TeYsjwgtutPPrT7R0Hqr77C4-rzw_-OGBGxt1eoR9U'
    gids = ['1376492505', '258815143']
    filenames = [ Path('a_consolidado.csv'), Path("a_respuestas.csv") ]

    for filename, gid in zip(filenames, gids):
        download_tab_csv(filename, sheet_id, gid, output_dir)


if __name__ == "__main__":
    main()