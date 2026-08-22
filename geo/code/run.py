import a_download_csv
import b_geomatch
import c_namefix_geojson
import d_parse_answers
import e_make_data_json

def main():
	#a_download_csv.main()
	b_geomatch.main()
	c_namefix_geojson.main()
	d_parse_answers.main()
	e_make_data_json.main()

if __name__ == "__main__":
	main()