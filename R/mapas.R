library(sf)
library(tidyverse)
library(geojsonsf)
library(rmapshaper)
library(jsonlite)

venezuela_lv2 <- sf::read_sf("./geo/output/c_level_2.geojson")

ggplot(venezuela_lv2) + geom_sf()

venezuela <- rmapshaper::ms_dissolve(venezuela_lv2)

ggplot(venezuela) + geom_sf()

zer <- sf::read_sf("./geo/input/zer.geojson")

venezuela_con_zer <- sf::st_union(venezuela, zer)

ggplot(venezuela_con_zer) + geom_sf()

venezuela_completa <- rmapshaper::ms_dissolve(venezuela_con_zer)

ggplot(venezuela_completa) + geom_sf()

ven <- rmapshaper::ms_simplify(venezuela_completa) %>%
  sf::st_reverse()

ggplot(ven) + geom_sf()

write(geojsonsf::sf_geojson(ven, digits = 6), "./ven.geojson")

# level 2

ven_level_2 <- rmapshaper::ms_simplify(venezuela_lv2) %>%
  sf::st_reverse()

ggplot(ven_level_2) + geom_sf()

write(geojsonsf::sf_geojson(ven_level_2, digits = 6), "./ven_level_2.geojson")
