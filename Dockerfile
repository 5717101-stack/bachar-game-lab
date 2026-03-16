FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html manifest.json sw.js games.json /usr/share/nginx/html/
COPY icons/ /usr/share/nginx/html/icons/
COPY games/ /usr/share/nginx/html/games/
