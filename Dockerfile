FROM ubuntu:18.04

RUN apt-get update && apt-get -y install cron curl unzip
RUN curl -fsSL https://deno.land/x/install/install.sh | sh

WORKDIR /workdir
COPY . .

RUN chmod 0644 cronfile
RUN crontab cronfile

RUN mkdir -p /var/cron_log

CMD ["cron", "-f"]
