FROM composer:2.8@sha256:5248900ab8b5f7f880c2d62180e40960cd87f60149ec9a1abfd62ac72a02577c AS composer
FROM php:8.3-apache-bookworm@sha256:a14446c32a3c8aeb9b4dac7fb73b03dfd8006e670d9b43ea7947e4030d3cbae6
RUN apt-get update && apt-get install -y --no-install-recommends libonig-dev libpng-dev libjpeg62-turbo-dev libfreetype6-dev unzip git ca-certificates \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install mysqli mbstring gd && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/*
COPY --from=composer /usr/bin/composer /usr/local/bin/composer
WORKDIR /var/www/html
# MantisBT 2.28.4: fuente oficial fijada por commit y checksum, nunca latest.
RUN curl -fsSL https://codeload.github.com/mantisbt/mantisbt/tar.gz/ceb74c8056753e0d4089af95bde794e47fa2ef53 -o /tmp/mantis.tar.gz \
    && echo '3f26f319b8522d5b3cfaa0eb28e8c762cf41c6d2d78673a67339b85542106aea  /tmp/mantis.tar.gz' | sha256sum -c - \
    && tar -xzf /tmp/mantis.tar.gz --strip-components=1 && rm /tmp/mantis.tar.gz \
    && composer install --no-dev --no-interaction --prefer-dist --no-progress --no-scripts
COPY config_inc.php config/config_inc.php
COPY apache.conf /etc/apache2/conf-enabled/convoca-mantis.conf
COPY instalar.php gestionar.php /opt/a11/
COPY casos.json /opt/a11/casos.json
