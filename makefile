.PHONY: build up down dev

all: build up

build:
	docker-compose -f docker-compose.prod.yml build

up:
	docker-compose -f docker-compose.prod.yml up

down:
	docker-compose down

dev:
	npm run build && npm run start

.PHONY: build

clean:
clear:
	rm -r build