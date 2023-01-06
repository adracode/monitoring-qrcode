all: up

up:
	docker-compose -f docker-compose.prod.yml build
	docker-compose -f docker-compose.prod.yml up

down:
	docker-compose down