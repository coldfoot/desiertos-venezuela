'''
Reads the CSV with the direct questionnaire answers 
and cleans them, saving it in a standardized data format
that can be read by e_make_data_json.py and adequately parsed.
'''

import pandas as pd
import json

PATH = "../output/a_respuestas.csv"

COLS_CORRESP = {
    "formato": "Marque todas las plataformas",
    "naturaleza_legal": "¿Cuál es la naturaleza legal",
    "tematicas": "¿Cuáles son las temáticas",
    "ingresos": "¿Cuáles son las fuentes de ingresos",
    "censura": "¿El proyecto u organización periodística que refiere ha enfrentado",
}

COLS_VALID_ANSWERS = {

    # Taken from the sample form: https://docs.google.com/forms/u/1/d/1f3ulgC39xavlATvw_zISD2SZcEer8T7sVt6sUAINPgs/viewform?edit_requested=true
    "formato": [
        # Multiple answer, other answers allowed
        "Canal o grupo de mensajería en Whatsapp",
        "Canal o grupo de mensajería en Telegram",
        "Cuenta en Instagram",
        "Cuenta en Facebook",
        "Cuenta en TikTok",
        "Cuenta en X",
        "Cuenta en Youtube",
        "Periódico (impreso)",
        "Periodismo cara a cara",
        "Podcast",
        "Portal web de noticias",
        "Radio (AM o FM)",
        "Radio transmitida vía web",
        "TV (señal abierta o cable)",
        "TV transmitida vía web",
        "No se maneja esta información",
    ],
    "naturaleza_legal": [
        # Single answer, other answers allowed, comma in provided answer
        "Comunitario",
        "Estatal",
        "Privado",
        "Organización sin fines de lucro (asociación civil, fundación, ONG)",
        "Cooperativa",
        "Proyecto u organización sin figura jurídica",
        "No sabe / Prefiere no responder",
        "No se maneja esta información",
    ],
    "tematicas": [
        # Multiple answer, other answers allowed    
        "Arte y cultura local",
        "Deporte local",
        "Economía y desarrollo local",
        "Gobierno y política local",
        "Investigación y vigilancia al poder",
        "Medio ambiente y sostenibilidad",
        "Sucesos, seguridad y convivencia ciudadana",
        "Temas sociales locales (como salud, educación, transporte, servicios públicos)",
        "No se maneja esta información",
    ], 
    "ingresos": [
        # Multiple answer, other answers allowed, comma in provided answer
        "Aportes monetarios de los fundadores y/o el equipo",
        "Campañas de financiamiento colectivo (crowdfunding)",
        "Contenidos puntuales patrocinados",
        "Donaciones de la audiencia, membresías o suscripciones",
        "Donaciones de empresas",
        "Eventos",
        "Fondos gubernamentales",
        "Publicidad",
        "Subvenciones o financiamiento internacional",
        "Talleres / Capacitaciones",
        "Venta de productos y servicios",
        "No hay ninguna fuente de ingresos",
        "No sabe / Prefiere no responder",
        "No se maneja esta información",
    ],
    "censura": [   
        # Multiple answer, other answers allowed, comma in provided answer
        "Restricciones o impedimentos externos para cubrir ciertos temas (censura directa)",
        "Decisiones de no cubrir ciertos contenidos por precaución (autocensura)",
        "Presiones indirectas que influyen en la cobertura (por ejemplo, económicas, políticas o de seguridad)",
        "No ha enfrentado este tipo de situaciones",
        "Prefiere no responder",
        "No se maneja esta información",
    ]
}


def get_surveyable_states(path="../output/c_level_1.geojson"):
    """
    Loads the state names from c_level_1.geojson, which already excludes
    Dependencias Federales. This is the exact set of states "estado" should contain.
    """
    with open(path) as f:
        features = json.load(f)["features"]
    return {f["properties"]["name"] for f in features}


def count_answers(responses, options):
    """
    Goes through a pandas Series of raw Google Forms answers and counts how
    many times each known checkbox option shows up. Whatever text is left
    over after removing all matched options gets counted under "Otro" and
    saved next to the original response, so it can be reviewed by hand
    afterwards.

    responses: a pandas Series of raw answer strings, indexed by their
        original row number in the source dataframe (so this works whether
        you pass in the whole dataset or a filtered subset, like one state).
    options: list of known checkbox options to look for.

    Returns a tuple (counts, flagged):
        counts is a dict of {option: how many times it appeared}, plus an
        "Otro" key counting how many responses had leftover custom text.
        flagged is a list of (index, original_response, leftover_text) tuples,
        where index is the real row number from the source dataframe.
    """
    counts = {option: 0 for option in options}
    counts["Otro"] = 0
    flagged = []

    # Longest first, so a short option can't eat part of a longer one
    sorted_options = sorted(options, key=len, reverse=True)

    # .items() on a Series gives (original_index, value) pairs, so row
    # numbers stay correct even if this Series is a filtered subset
    for index, response in responses.items():
        remaining = response
        for option in sorted_options:
            if option in remaining:
                counts[option] += 1
                remaining = remaining.replace(option, "")

        leftover = remaining.strip(" ,")
        if leftover:
            counts["Otro"] += 1
            flagged.append((index, response, leftover))

    return counts, flagged


def parse(df):
    """
    Runs count_answers on every question column in the dataframe, producing
    one combined count. Works the same whether df is the entire dataset or
    a filtered subset (e.g. one state), since row numbers are tracked using
    the dataframe's own index rather than a fresh count.

    df: the questionnaire dataframe (whole dataset or a filtered slice).

    Returns a dict of {slug: {option: count}}, one entry per question.
    """
    final_count = {}

    for slug, column in COLS_CORRESP.items():

        # Pass the column as a Series (not .tolist()) so the original row
        # numbers travel with it into count_answers
        entries = df[column]

        valid_answers = COLS_VALID_ANSWERS[slug]

        try:
            counts, flagged = count_answers(entries, valid_answers)
        except Exception as e:
            # Something in this column's answers broke count_answers (e.g. a
            # blank answer read in by pandas as NaN instead of an empty
            # string). Print exactly where it happened before letting the
            # error crash the script.
            for i, entry in entries.items():
                print(f"column: {column!r}, original row: {i}, input: {entry!r}")
            raise

        final_count[slug] = counts

        if flagged:
            print(f"There are entries with custom answers for {slug}")
            for index, response, leftover in flagged:
                print(f"original row {index}: leftover: {leftover!r}")

    return final_count


def compute_percentages(final_count, total_responses):
    """
    Takes the counts produced by parse() and turns each one into a
    percentage of the total number of responses. Since these are
    multi-select questions, percentages per question can add up to more
    than 100%, since one person can pick more than one option.

    final_count: dict of {slug: {option: count}}, as produced by parse().
    total_responses: total number of people who answered (the number of
        rows in the dataframe that was passed into parse()).

    Returns a dict of {slug: {option: percentage}}, out of 100, rounded to
    one decimal place.
    """
    percentages = {}

    for slug, counts in final_count.items():
        percentages[slug] = {
            option: round(count / total_responses * 100, 1)
            for option, count in counts.items()
        }

    return percentages


def save_json(data, path):
    """
    Saves a dict as a JSON file, keeping accented Spanish characters
    readable instead of escaping them.
    """
    with open(path, "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def main():

    # Read the source file
    df = pd.read_csv(PATH)

    surveyable_states = get_surveyable_states()
    survey_states = set(df.estado.unique())
    assert survey_states == surveyable_states, (
        f"missing states: {surveyable_states - survey_states}, "
        f"unexpected states: {survey_states - surveyable_states}"
    )

    # --- Venezuela (whole country) ---
    national_counts = parse(df)
    national_percentages = compute_percentages(national_counts, len(df))

    save_json(national_counts, "../output/d_answers/Venezuela_totales.json")
    save_json(national_percentages, "../output/d_answers/Venezuela_porcentajes.json")

    # --- One pair of JSONs per state ---
    for state in df.estado.unique():
        df_state = df[df.estado == state]

        state_counts = parse(df_state)
        state_percentages = compute_percentages(state_counts, len(df_state))

        save_json(state_counts, f"../output/d_answers/{state}_totales.json")
        save_json(state_percentages, f"../output/d_answers/{state}_porcentajes.json")


if __name__ == "__main__":
    main()