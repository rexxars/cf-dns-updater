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
    $ cf-dns-updater --zone <zoneId> --record <recordId> --api-key <apiKey>

  Options
    --ip <someIp> IP to update record with. Defaults to current external IP.
    --zone <zoneId> Zone ID the record belongs to
    --record <recordId> DNS record ID to update
    --email <email> Email used for authentication
    --api-key <apiKey> API key used for authentication
    --list Prints the zones and dns records available for the API key

  Examples
    # Update a record with a specific IP address
    $ cf-dns-updater --zone zoneId --record recordId --ip newIp --api-key myApiKey --email me@gmail.com

    # Update a record with your current external IP
    $ cf-dns-updater --zone zoneId --record recordId --api-key myApiKey --email me@gmail.com

    # List records your API key has access to edit
    $ cf-dns-updater --list --api-key myApiKey --email me@gmail.com

  Environment variables (fallbacks for missing flags)
    --zone = CF_ZONE_ID
    --record = CF_DNS_RECORD_ID
    --email = CF_AUTH_EMAIL
    --api-key = CF_API_KEY
```

## Node usage

Requires Node 4 or above.

```js
const cf = require('cf-dns-updater')

// Note: Leave `ip` undefined to update use your current external IP
cf.update({
  ip: '193.212.1.10',          // IP to update record with
  email: 'you@domain.com',     // Cloudflare auth email
  apiKey: 'yourCFApiKey',      // Cloudflare API key
  zone: 'cloudFlareZoneId',    // Cloudflare zone ID
  record: 'cloudFlareRecordId' // Cloudflare record ID
}).then(newRecord => {
  console.log('New record:', newRecord)
})
```

## License

MIT-licensed. See LICENSE.
