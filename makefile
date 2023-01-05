all: up

up:
	docker-compose up

prod:
	docker-compose -f docker-compose.prod.yml up

down:
	docker-compose down