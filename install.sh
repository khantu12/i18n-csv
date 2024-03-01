#!/bin/bash

docker build -t i18n-csv .

docker run -v .:/mnt/i18n-csv -it --rm i18n-csv /bin/bash -c 'deno compile --output mnt/i18n-csv/ctj -A mnt/i18n-csv/csv-to-json/main.ts && deno compile --output mnt/i18n-csv/jtc -A mnt/i18n-csv/json-to-csv/main.ts'

sudo mv ./ctj /usr/local/bin
sudo mv ./jtc /usr/local/bin
