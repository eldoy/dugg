# Dugg file sending and manipulation

Upload, download, convert and analyze files toolkit for NodeJS.

### INSTALLATION
```npm i dugg```

### USAGE
On your Node.js server:
```javascript
/**
 * Setup. Showing default options
 */
var dugg = require('dugg')({
  key: 'amazon_key',
  secret: 'amazon_secret',
  bucket: 'amazon_bucket'
})

// Example file structure
// Get this from a file upload in the browser or from your hard drive
var files = [{
  size: 165888,
  path: 'filepath',
  name: 'filename',
  type: 'image/png',
  lastModifiedDate: new Date('2019-07-31T08:00:19.944Z')
}]

/**
 * Upload file
 */
var urls = await dugg.upload(files)

/**
 * Download file
 */
var result = await dugg.download('http://url-to/your-file.jpg')

/**
 * Convert file
 */

// Jimp options, use 'auto' for Jimp.AUTO
var config = {
  resize: [120, 120],
  greyscale: []
}
await dugg.convert(files, config)

/**
 * Get file info
 * Needs exiftool installed
 */
var info = dugg.info('path')
```
Enjoy! MIT Licensed.
