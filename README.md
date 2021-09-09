# iHospital API service
## for restart PM2 service

Process by reading the value `1` in the `auto-load` file and changing it to `0` after restarting PM2.

## Usage
`
    node index.js <command>
`

## Command
```
- pm2-restart-all
- pm2-restart [pm2Name]
- pm2-list [pm2Name]
```
## Example
```
# list PM2 process "pm2 status"
    node index.js pm2-list

# restart PM2 "pm2 restart <nnn=pm2_id>"
    node index.js pm2-restart myAPI

# restart all PM2 "pm2 restart all"
    node index.js pm2-restart-all

```

## set auto start with crontab (linux, MacOS)
```
# add to crontab for restart every 2 minute

    > sudo crontab -e
    add ->  */2 * * * * node index.js pm2-restart-all

```
