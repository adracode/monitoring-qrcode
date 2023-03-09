.PHONY: build up down dev password

all: build up

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
