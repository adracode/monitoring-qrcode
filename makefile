all: build up

build:
	docker-compose -f docker-compose.prod.yml build

up:
	docker-compose -f docker-compose.prod.yml up

down:
	docker-compose down