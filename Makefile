.PHONY: help install dev prod stop clean reset-db backup logs

help:
	@echo ""
	@echo "ð½ï¸  RestaurantOS POS â Available Commands"
	@echo "========================================="
	@echo "  make install    Install all dependencies"
	@echo "  make dev        Start development environment"
	@echo "  make prod       Start production environment"
	@echo "  make stop       Stop all containers"
	@echo "  make clean      Remove containers and volumes"
	@echo "  make reset-db   Reset and reseed database"
	@echo "  make backup     Backup database"
	@echo "  make logs       Show container logs"
	@echo ""

install:
	npm install
	npm run db:generate

dev:
	@bash scripts/start-dev.sh

prod:
	@bash scripts/start-prod.sh

stop:
	docker-compose down

stop-dev:
	docker-compose -f docker-compose.dev.yml down

clean:
	docker-compose down -v --remove-orphans
	docker-compose -f docker-compose.dev.yml down -v --remove-orphans

reset-db:
	@bash scripts/reset-db.sh

backup:
	@bash scripts/backup-db.sh

logs:
	docker-compose logs -f

logs-api:
	docker-compose logs -f api

logs-web:
	docker-compose logs -f web

migrate:
	npm run db:migrate

seed:
	npm run db:seed

studio:
	npm run db:studio
