all: build up

build:
	docker-compose -f docker-compose.prod.yml build

up:
	docker-compose -f docker-compose.prod.yml up

down:
	docker-compose down

backdev:
	npm run dev

frontdev:
	npm run build && npm run start

.PHONY: build

clean:
clear:
	rm -r build