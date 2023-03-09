#!/bin/bash
id=$(docker ps -qf name=qrcode-monitoring-app)
docker exec -it $id node ./build/change-password.js
docker-compose -f docker-compose.prod.yml restart
