.PHONY: all init build up down restart dev password clean clear

all: build up

init:
ifeq ($(wildcard config.json),)
	cp config.json.sample config.json
	@ ./changePassword.sh
else
	@echo "Le fichier config.json est déjà initialisé"
endif
ifeq ($(wildcard .env),)
	cp .env.sample .env
else
	@echo "Le fichier .env est déjà initialisé"
endif

build:
	docker-compose -f docker-compose.prod.yml build

up:
	docker-compose -f docker-compose.prod.yml up -d

down:
	docker-compose -f docker-compose.prod.yml stop

restart:
	docker-compose -f docker.compose.prod.yml restart

dev:
	npm run build && npm run start

password:
	@ ./changePassword.sh

clean:
clear:
	rm -r build
