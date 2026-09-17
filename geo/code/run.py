import a_download_csv
import b_geomatch
import c_namefix_geojson
import d_parse_answers
import e_make_data_json

def main():
	a_download_csv.main()
	print("a succesful")
	
	b_geomatch.main()
	print("b succesful")

	c_namefix_geojson.main()
	print("c succesful")

	d_parse_answers.main()
	print("d succesful")

	e_make_data_json.main()
	print("e succesful")


if __name__ == "__main__":
	main()