# cf-dns-updater

Update a DNS record on CloudFlare with a new IP.  
Want `home.yourdomain.com` to point to your home IP?
This little CLI (and node module) lets you do that easily.

## Installation

```bash
# Install the `cf-dns-updater` binary globally, for CLI-usage
npm install -g cf-dns-updater

# Or, install the module locally to use the API
npm install --save cf-dns-updater
```

## CLI usage

```
$ cf-dns-updater --help

  Update a DNS record on CloudFlare with a new IP

  Usage
    $ cf-dns-updater --zone <zoneId> --record <recordId> --api-token <apiToken>

  Options
    --ip <someIp> IP to update record with. Defaults to current external IP. Cannot be combined with `--interval`.
    --zone <zoneId> Zone ID the record belongs to
    --record <recordId> DNS record ID to update
    --api-token <apiToken> API token used for authentication
    --email <email> Email used for authentication (also requires `--api-key`)
    --api-key <apiKey> API key used for authentication (also requires `--email`)
    --interval <seconds> Keep running, re-checking the external IP every <seconds> and updating when it changes. Cannot be combined with `--ip`.
    --list Prints the zones and dns records available for the API key

  Examples
    # Update a record with a specific IP address
    $ cf-dns-updater --zone zoneId --record recordId --ip newIp --api-token myApiToken

    # Update a record with your current external IP
    $ cf-dns-updater --zone zoneId --record recordId --api-token myApiToken

    # Keep running, checking every 5 minutes and updating when the IP changes
    $ cf-dns-updater --zone zoneId --record recordId --api-token myApiToken --interval 300

    # List records your API key has access to edit
    $ cf-dns-updater --list --api-token myApiToken

  Environment variables (fallbacks for missing flags)
    --zone = CF_ZONE_ID
    --record = CF_DNS_RECORD_ID
    --api-token = CF_API_TOKEN
    --email = CF_AUTH_EMAIL
    --api-key = CF_API_KEY
    --interval = CF_INTERVAL
```

### Watch mode

Pass `--interval <seconds>` (or set `CF_INTERVAL`) to keep the process running: it
checks your external IP immediately, then again on every interval, and updates the
record whenever the IP has changed. A failed check is logged and the loop keeps
going, so a transient network/API error won't take the process down. `SIGINT`/
`SIGTERM` stop it cleanly (so `docker stop` / Ctrl-C exit gracefully).

```bash
# Check every 5 minutes
$ cf-dns-updater --zone zoneId --record recordId --api-token myApiToken --interval 300
[2026-06-20T12:00:00.000Z] Watching zoneId/recordId; checking every 300s
[2026-06-20T12:00:00.500Z] No change (203.0.113.10)
[2026-06-20T12:05:00.800Z] Updated home.example.com -> 203.0.113.42
```

## Node usage

Requires Node 24 or above.

```js
import {update, list} from 'cf-dns-updater'

// Note: Leave `ip` undefined to update use your current external IP
update({
  ip: '193.212.1.10', // IP to update record with
  email: 'you@domain.com', // Cloudflare auth email
  apiKey: 'yourCFApiKey', // Cloudflare API key
  zone: 'cloudFlareZoneId', // Cloudflare zone ID
  record: 'cloudFlareRecordId', // Cloudflare record ID
}).then((newRecord) => {
  console.log('New record:', newRecord)
})
```

Pass `interval` (in **milliseconds**) to run continuously instead of once. The
returned promise resolves only once the optional `signal` aborts. `interval` is
mutually exclusive with `ip`.

```js
import {update} from 'cf-dns-updater'

const controller = new AbortController()

await update({
  apiToken: 'yourCFApiToken',
  zone: 'cloudFlareZoneId',
  record: 'cloudFlareRecordId',
  interval: 5 * 60 * 1000, // check every 5 minutes
  signal: controller.signal, // call controller.abort() to stop
  onUpdate: ({record, changed}) => {
    console.log(changed ? `Updated -> ${record.content}` : `No change (${record.content})`)
  },
  onError: (error) => console.error('Check failed:', error),
})
```

## Docker usage

The `ghcr.io/rexxars/cf-dns-updater:latest` [Docker image](https://github.com/rexxars/cf-dns-updater/pkgs/container/cf-dns-updater) can be used to update a DNS record. In this case, you'll want to use environment variables to configure the tool:

```bash
docker run \
  -e CF_ZONE_ID=yourZoneId \
  -e CF_DNS_RECORD_ID=yourRecordId \
  -e CF_API_TOKEN=yourApiToken \
  ghcr.io/rexxars/cf-dns-updater:latest
```

Set `CF_INTERVAL` (seconds) to run it as a long-lived container that keeps the
record in sync with your changing IP:

```bash
docker run -d --restart unless-stopped \
  -e CF_ZONE_ID=yourZoneId \
  -e CF_DNS_RECORD_ID=yourRecordId \
  -e CF_API_TOKEN=yourApiToken \
  -e CF_INTERVAL=300 \
  ghcr.io/rexxars/cf-dns-updater:latest
```

## License

MIT © [Espen Hovlandsdal](https://espen.codes/)
