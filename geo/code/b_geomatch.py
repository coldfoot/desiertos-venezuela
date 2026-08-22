import pandas as pd
import geopandas as gpd
import json
import re
import unicodedata
from tabulate import tabulate


# NOTES: the correct names are those on the CSV file.
# They, however, still needs to be checked with Dani.

"""
Matches Venezuelan location names from a CSV to their official geographic codes.

The CSV has place names written by hand (states in "estado", municipalities in
"unidade"), and this script figures out which official state and municipality
each row corresponds to, using two reference files (level-1.geojson for states,
level-2.geojson for municipalities).

It does this by cleaning up the names (removing accents, extra words, parentheses,
etc.) so they can be compared directly, then matching them against the reference
files. Some names don't match automatically because of typos or alternate spellings
in the reference data, so those are patched in manually.

Before saving, the script checks that every row got matched, that no rows were
lost or duplicated along the way, and stops with an error if anything looks wrong.

The output is a CSV that adds the official codes as new columns on the original names file, 
so it's a correspondence table between the original names and the official geography.
It is NOT a geojson map file — turning this into a mapped/geojson output is a
separate, later step.

Reads:  ../output/a_consolidado.csv, ../input/level-1.geojson, ../input/level-2.geojson
Writes: ../output/b_geomatched.csv
"""

def normalize(s):
    """
    Cleans up a place name so it can be compared reliably against other names.

    Lowercases the text, strips accents, removes leading words like "Autonomo"
    or "Parroquia", drops punctuation, and collapses extra spaces. This way,
    small differences in how a name was typed (accents, capitalization, extra
    words) won't stop it from matching the correct place.
    """
    
    s = s.strip().lower()
    s = ''.join(c for c in unicodedata.normalize('NFKD', s) if not unicodedata.combining(c))
    s = re.sub(r'^(autonomo|parroquia) ', '', s)
    s = re.sub(r'[^a-z0-9 ]', '', s)
    return re.sub(r'\s+', ' ', s).strip()


def match_level_1(df):
    """
    Adds the official state code to each row by matching the "estado" column.

    Loads the list of official states from level-1.geojson, normalizes both
    the official names and the CSV's state names so they're written the same
    way, then merges them together. One state, "Distrito Capital", is known
    to appear as "Caracas" in the CSV, so that's mapped manually before matching.
    """

    df_ = df.copy()

    # --- load data ---
    level_1 = gpd.read_file("../input/level-1.geojson").drop(columns='geometry') # Geometry not needed as this script only creates a matching key

    # --- level 1: simple normalized merge ---
    # "Caracas" in the old CSV refers to Distrito Capital's parishes – Distrito Capital is the canon name in the Geojson.
    # This was later fixed by the data input tam. We keep empty aliases here in case anything similar arises.
    manual_l1_aliases = {} # {'Distrito Capital': 'Caracas'}

    # Replace based on the mapping dict and normalize
    level_1['name_key'] = level_1['name'].replace(manual_l1_aliases).map(normalize) 

    # Also normalize
    df_['estado_key'] = df_['estado'].map(normalize) 


    # Now that both keys are matching we can simply perform a merge and clean the columns
    df_ = df_.merge(level_1[['name_key', 'code']], left_on='estado_key', right_on='name_key', how='left')
    df_ = df_.rename(columns={'code': 'level_1_code'}).drop(columns='name_key')

    # print(tabulate(df_.sample(10), headers='keys', tablefmt='psql', showindex=False))

    return df_


def match_level_2(df):
    """
    Adds the official municipality code to each row by matching "unidade".

    Loads the list of official municipalities from level-2.geojson, strips off
    any parenthetical text in the CSV's municipality names (like a capital city
    name added in parentheses), and normalizes both sides before merging. The
    match is scoped to the state found in match_level_1, so a municipality name
    only matches within its correct state.

    A number of municipalities can't be matched this way because of typos or
    alternate spellings in the geojson (documented next to each one below), so
    those are filled in manually as a fallback. These manual fixes are marked
    as pending human review.
    """

    df_ = df.copy()

    level_2 = pd.DataFrame(
        f['properties'] for f in 
        json.load(open('../input/level-2.geojson'))['features']
    )

    # --- level 2: simple normalized merge, scoped to the matched state ---
    # csv unidade names look like "Official Name (Capital City)" -> strip the part in parenthesis so we only 
    # merge on the base name. This might fix most inconsistencies
    df_['unidade_key'] = df_['unidade'].str.replace(r'\s*\(.*\)\.?$', '', regex=True).map(normalize)
    level_2['name_key'] = level_2['name'].map(normalize)

    df_ = df_.merge(
        level_2[['parent_code', 'name_key', 'code']], 
        left_on=['level_1_code', 'unidade_key'], # Merges on the level_1_code determined on the previous function and on the normalized key
        right_on=['parent_code', 'name_key'], # Using the parent code and the name key
        how='left'
    )
    df_ = df_.rename(columns={'code': 'level_2_code'}).drop(columns=['name_key', 'parent_code'])

    # TO DO: verify matches
    # --- manual fixes for entries the simple merge can't resolve ---
    # (typos/alternate spellings in the source geojson, or municipios named after their capital city)
    manual_l2_fixes = {
        'Mario Briceño Iragorry (El Limón)': 'VE0508',                     # geojson typo: "Iragorri"                       # Human check: PENDING
        'Ocumare de la Costa': 'VE0518',                                   # geojson: "Ocumare de la Costa de Oro"          # Human check: PENDING
        'Zamora (Villa de Cura)': 'VE0516',                                # geojson: "Ezequiel Zamora"                     # Human check: PENDING
        'San Bernardino': 'VE010115',                            # geojson typo: "San Bernandino"                 # Human check: PENDING
        'Falcón (Tinaquillo)': 'VE0902',                                   # geojson uses capital city name "Tinaquillo"    # Human check: PENDING
        'Antonio Díaz Curiapo (Curiapo)': 'VE1001',                        # geojson: "Antonio Díaz"                        # Human check: PENDING
        'Esteros de Camaguan': 'VE1201',                                   # geojson: "Camaguan"                            # Human check: PENDING
        'Adriani (El Vigía)': 'VE1401',                                    # geojson: "Alberto Adriani"                     # Human check: PENDING
        'Briceño (Torondoy)': 'VE1411',                                    # geojson: "Justo Briceño"                       # Human check: PENDING
        'Chacón (Canaguá)': 'VE1405',                                      # geojson: "Arzobispo Chacón"                    # Human check: PENDING
        'Dávila (Bailadores)': 'VE1418',                                   # geojson: "Rivas Dávila"                        # Human check: PENDING
        'Febres Cordero (Nueva Bolivia)': 'VE1422',                        # geojson: "Tulio Febres Cordero"                # Human check: PENDING
        'Noguera (Santa María de Caparo)': 'VE1415',                       # geojson: "Padre Noguera"                       # Human check: PENDING
        'Parra Olmedo (Tucaní)': 'VE1407',                                 # geojson: "Caracciolo Parra Olmedo"             # Human check: PENDING
        'Pinto Salinas (Santa Cruz de Mora)': 'VE1403',                    # geojson: "Antonio Pinto Salinas"               # Human check: PENDING
        'Quintero (Santo Domingo)': 'VE1408',                              # geojson: "Cardenal Quintero"                   # Human check: PENDING
        'Ramos de Lora (Santa Elena de Arenales)': 'VE1414',               # geojson: "Obispo Ramos de Lora"                # Human check: PENDING
        'Salas (Arapuey)': 'VE1410',                                       # geojson typo: "Julio Cesar Sala"               # Human check: PENDING
        'Marquina (Tabay)': 'VE1419',                                      # geojson: "Santos Marquina"                     # Human check: PENDING
        'Guaicaipuro (Los Teques)': 'VE1510',                              # geojson: "Bolivariano Guaicaipuro"             # Human check: PENDING
        'Santa Bárbara': 'VE1611',                                         # geojson typo: "Santa Babara"                   # Human check: PENDING
        'Zamora (Punta de Mata)': 'VE1606',                                # geojson: "Ezequiel Zamora"                     # Human check: PENDING
        'Península de Macanao (Boca de Río)': 'VE1709',                    # geojson: "Macanao"                             # Human check: PENDING
        'Monseñor José Vicenti de Unda (Chabasquén de Unda)': 'VE1806',    # geojson: "Monseñor José Vicente de Und"        # Human check: PENDING
        'Bolívar (Tía Juana)': 'VE2319',                                   # geojson: "Simón Bolívar"                       # Human check: PENDING
        'Guajira (Sinamaica)': 'VE2315',                                   # geojson: "Indígena Bolivariano Guajira"        # Human check: PENDING
        'Padilla (El Toro)': 'VE2301',                                     # geojson: "Almirante Padilla"                   # Human check: PENDING
        'Pulgar (Pueblo Nuevo-El Chivo)': 'VE2306',                        # geojson: "Francisco Javier Pulgar"             # Human check: PENDING
        'Lossada (La Concepción)': 'VE2307',                               # geojson: "Jesús Enrique Lossada"               # Human check: PENDING
        'Semprún (Casigua El Cubo)': 'VE2308',                             # geojson: "Jesús María Semprum"                 # Human check: PENDING
        'Machiques': 'VE2311',                                             # geojson: "Machiques de Perija"                 # Human check: PENDING
        'Rosario (La Villa del Rosario)': 'VE2316',                        # geojson: "Rosario de Perija"                   # Human check: PENDING
        
        # --- Anzoátegui: municipios named for historical figures, CSV uses a short form + capital city ---
        'Bolívar (Barcelona)': 'VE0318',                    # geojson: "Simón Bolívar"                          # Human check: PENDING
        'Bruzual (Clarines)': 'VE0312',                     # geojson: "Manuel Ezequiel Bruzual"                # Human check: PENDING
        'Cajigal (Onoto)': 'VE0309',                        # geojson: "Juan Manuel Cajigal"                    # Human check: PENDING
        'Freites (Cantaura)': 'VE0313',                     # geojson: "Pedro María Freites"                    # Human check: PENDING
        'Guanipa (San José de Guanipa)': 'VE0315',          # geojson uses capital city name "San José de Guanipa"  # Human check: PENDING
        'McGregor (El Chaparro)': 'VE0320',                 # geojson: "Sir Arthur Mc Gregor"                   # Human check: PENDING
        'Monagas (San Diego de Cabrutica)': 'VE0310',       # geojson: "José Gregorio Monagas"                  # Human check: PENDING
        'Carvajal (Valle de Guanape)': 'VE0304',            # geojson: "Francisco del Carmen Carvajal"          # Human check: PENDING
        'Peñalver (Puerto Píritu)': 'VE0303',               # geojson: "Fernando de Peñalver"                   # Human check: PENDING
        'Sotillo (Puerto La Cruz)': 'VE0308',                # geojson: "Juan Antonio Sotillo"                   # Human check: PENDING
    
        # --- Bolívar ---
        'Heres (Ciudad Bolívar)': 'VE0705',                 # geojson: "Angostura del Orinoco" — Ciudad Bolívar was
                                                              # historically named Angostura; this is Heres municipio
                                                              # under that old name                              # Human check: PENDING
        'Angostura (Ciudad Piar)': 'VE0707',                # geojson: "Bolivariano Angostura" — renamed in 2009
                                                              # from Raúl Leoni Municipality                       # Human check: PENDING
        'Padre Pedro Chen (El Palmar)': 'VE0711',           # geojson typo: "Padre Pedro Chien"                  # Human check: PENDING
    
        # --- Trujillo ---
        'Campos Elías': 'VE2108',                           # geojson: "Juan Vicente Campo Elías" (CSV pluralizes) # Human check: PENDING
        'Carvajal (Carvajal)': 'VE2116',                    # geojson: "San Rafael de Carvajal"                 # Human check: PENDING
        'Márquez Cañizales (El Paradero)': 'VE2107',        # geojson: "José Felipe Márquez Cañizal" (singular)  # Human check: PENDING
        'Rangel (Betijoque)': 'VE2115',                     # geojson: "Rafael Rangel"                          # Human check: PENDING
    
        # --- Yaracuy ---
        'Monge (Yumare)': 'VE2208',                         # geojson: "Manuel Monge"                           # Human check: PENDING
        'Páez (Sabana de Parra)': 'VE2206',                 # geojson: "José Antonio Páez"                      # Human check: PENDING
    }
    

    df_['level_2_code'] = df_['level_2_code'].fillna(df['unidade'].map(manual_l2_fixes))

    df_ = df_.drop(columns=['estado_key', 'unidade_key'])

    #print(tabulate(df_.sample(10), headers='keys', tablefmt='psql', showindex=False))

    return df_


def verify(original_df, processed_df):
    """
    Checks that the matching process didn't lose, duplicate, or fail to match rows.

    Compares the row count before and after matching, counts how many rows are
    missing a state or municipality code, and checks for duplicate state/municipality
    combinations. Prints a summary of all of this, and stops the script with an
    error if anything looks wrong, since a silent bad match would be worse than
    a loud failure here.
    """

    original_shape = original_df.shape
    processed_shape = processed_df.shape
    row_diff = original_shape[0] - processed_shape[0]
    missing_lv1_code = processed_df['level_1_code'].isna().sum()
    missing_lv2_code = processed_df['level_2_code'].isna().sum()
    duplicated_lv2 = processed_df.duplicated(['level_1_code','level_2_code']).sum()

    print("original shape:", original_shape)
    print("processed shape:", processed_shape)
    print("row difference:", row_diff)
    print('missing level_1_code:', missing_lv1_code)
    print('missing level_2_code:', missing_lv2_code)
    print('duplicate level 2 entries:', duplicated_lv2)

    if any([row_diff, missing_lv1_code, missing_lv2_code, duplicated_lv2]):
        show_problem_rows(processed_df)
        raise ValueError("The merge is invalid. Check keys.")

    return

def show_problem_rows(df):
    """
    Prints the rows that failed to match cleanly, so they're easy to inspect.

    Shows any row missing a state code, missing a municipality code, or sharing
    the same state/municipality combination as another row (a duplicate). Each
    group is printed separately with a label, so it's clear which problem
    applies to which rows.
    """

    missing_lv1 = df[df['level_1_code'].isna()]
    missing_lv2 = df[df['level_2_code'].isna()]
    duplicates = df[df.duplicated(['level_1_code', 'level_2_code'], keep=False)]

    if len(missing_lv1):
        print("\n--- rows missing level_1_code ---")
       #print(tabulate(missing_lv1, headers='keys', tablefmt='psql', showindex=False))
        display(missing_lv1)

    if len(missing_lv2):
        print("\n--- rows missing level_2_code ---")
        #print(tabulate(missing_lv2, headers='keys', tablefmt='psql', showindex=False))
        display(missing_lv2)

    if len(duplicates):
        print("\n--- duplicated level_1_code/level_2_code rows ---")
        #print(tabulate(duplicates, headers='keys', tablefmt='psql', showindex=False))
        display(duplicates)
    

def save(df):
    """
    Saves the matched data as a CSV correspondence table between the original
    names and their official state/municipality codes.
    """
    
    # Saves a data.json dictionary to the likeness of the FOPEA / Gabo project
    df.to_csv('../output/b_geomatched.csv', index=False)


def main():
    """
    Runs the full matching pipeline: load the CSV, match states, match
    municipalities, verify the results, then save the output CSV.
    """

    original_df = pd.read_csv('../output/a_consolidado.csv')
    processed_df = match_level_1(original_df)
    processed_df = match_level_2(processed_df)

    verify(original_df, processed_df)

    save(processed_df)


if __name__ == "__main__":
    main()
