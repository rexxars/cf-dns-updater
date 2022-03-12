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
    --ip <someIp> IP to update record with. Defaults to current external IP.
    --zone <zoneId> Zone ID the record belongs to
    --record <recordId> DNS record ID to update
    --api-token <apiToken> API token used for authentication
    --email <email> Email used for authentication (also requires `--api-key`)
    --api-key <apiKey> API key used for authentication (also requires `--email`)
    --list Prints the zones and dns records available for the API key

  Examples
    # Update a record with a specific IP address
    $ cf-dns-updater --zone zoneId --record recordId --ip newIp --api-token myApiToken

    # Update a record with your current external IP
    $ cf-dns-updater --zone zoneId --record recordId --api-token myApiToken

    # List records your API key has access to edit
    $ cf-dns-updater --list --api-token myApiToken

  Environment variables (fallbacks for missing flags)
    --zone = CF_ZONE_ID
    --record = CF_DNS_RECORD_ID
    --api-token = CF_API_TOKEN
    --email = CF_AUTH_EMAIL
    --api-key = CF_API_KEY
```

## Node usage

Requires Node 14 or above.

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

## License

MIT-licensed. See LICENSE.
