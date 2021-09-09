# iHospital API
## for restart PM2 service

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
