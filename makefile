.PHONY: build up down dev password

all: build up

build:
	docker-compose -f docker-compose.prod.yml build

up:
	docker-compose -f docker-compose.prod.yml up

down:
	docker-compose down

dev:
	npm run build && npm run start

password:
	node ./build/change-password.js

clean:
clear:
	rm -r build