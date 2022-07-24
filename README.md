# Dugg file sending and manipulation

Upload, download, convert and analyze files toolkit for NodeJS.

### INSTALLATION
```npm i dugg``` or ```yarn add dugg```

### USAGE
On your Node.js server:
```javascript
/**
 * Setup. Showing default options
 */
const dugg = require('dugg')({
  key: 'amazon_key',
  secret: 'amazon_secret',
  bucket: 'amazon_bucket'
})

// Example file structure
// Get this from a file upload in the browser or from your hard drive
const files = [{
  size: 165888,
  path: 'filepath',
  name: 'filename',
  type: 'image/png',
  lastModifiedDate: new Date('2019-07-31T08:00:19.944Z')
}]

/**
 * Upload file
 */
const urls = await dugg.upload(files)

/**
 * Download file
 */
const result = await dugg.download('http://url-to/your-file.jpg')

/**
 * Convert file
 */

// Jimp options, use 'auto' for Jimp.AUTO
const config = {
  resize: [120, 120],
  greyscale: []
}
await dugg.convert(files, config)

/**
 * Get file info
 * Needs exiftool installed
 */
const info = dugg.info('path')
```
Enjoy! MIT Licensed.
