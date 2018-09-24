# Dugg Amazon S3 File Uploader

Upload your files to Amazon S3.

### INSTALLATION
```npm i dugg``` or ```yarn add dugg```

### USAGE
On your Node.js server:
```javascript
const Dugg = require('dugg)

Dugg.config({
  key: 'amazon_key',
  secret: 'amazon_secret'
})

// Create new Dugg upload
const upload = new Dugg(file)

// res is whatever S3 returns
const res = await upload.s3({ bucket: '7ino' })

// URL of uploaded file
res['Location']
```
Enjoy! MIT Licensed.
