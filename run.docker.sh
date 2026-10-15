
#!/bin/bash

docker run -d \
  --name PesquisaSatisfacao \
  --restart unless-stopped \
  -v /var/www/PesquisadeSatisfacao:/app \
  -w /app \
  -p 4046:4046 \
  node:jod-trixie-slim \
  npm run start






