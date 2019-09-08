const fs = require('fs')
const { execSync } = require('child_process')
const AWS = require('aws-sdk')
const Jimp = require('jimp')
const { parse } = require('url')
const https = require('https')
const http = require('http')
const { basename } = require('path')

const TIMEOUT = 10000

/**
 * Setup function
 * @settings
 * {
 *   key: 'amazon_key',
 *   secret: 'amazon_secret',
 *   bucket: 'amazon_bucket',
 *   config: {
 *     thumb: {
 *       resize: [120, 120],
 *       greyscale: []
 *     }
 *   }
 * }
 */
module.exports = function(settings = {}) {
  AWS.config.update({ accessKeyId: settings.key, secretAccessKey: settings.secret })

  /**
   * Check if file name is an image
   */
  const isImage = function(name) {
    return (/\.(gif|jpe?g|tiff|png)$/i).test(name)
  }

  return {
    /**
     * Upload files to CDN
     */
    upload: async function(files, options = {}) {
      const cdn = new AWS.S3()
      const urls = []

      // Convert files
      const { config } = options || settings || {}
      if (config) {
        await this.convert(files, config)
      }

      for (const file of files) {
        let { name } = file
        if (options.timestamp) {
          name = Date.now() + '_' + name
        }
        const params = {
          Bucket: options.bucket || settings.bucket,
          Key: name,
          Body: fs.createReadStream(file.path)
        }
        const result = await cdn.upload(params, { queueSize: 1 }).promise()
        urls.push(result['Location'])
      }
      return urls
    },

    /**
     * Download file from URL
     */
    download: function(url, path) {
      const uri = parse(url)
      if (!path) {
        path = basename(uri.path)
      }
      const file = fs.createWriteStream(path)

      return new Promise(function(resolve, reject) {
        const request = http.get(uri.href).on('response', function(res) {
          const len = parseInt(res.headers['content-length'], 10)
          let downloaded = 0
          let percent = 0
          res
            .on('data', function(chunk) {
              file.write(chunk)
              downloaded += chunk.length
              percent = (100.0 * downloaded / len).toFixed(2)
              process.stdout.write(`Downloading ${percent}% ${downloaded} bytes\r`)
            })
            .on('end', function() {
              file.end()
              console.log(`${uri.path} downloaded to: ${path}`)
              resolve(path)
            })
            .on('error', function (err) {
              reject(err)
            })
        })
        request.setTimeout(TIMEOUT, function() {
          request.abort()
          reject(new Error(`request timeout after ${TIMEOUT / 1000.0}s`))
        })
      })
    },

    /**
     * Convert image file according to config
     * Uses the Jimp lib
     */
    convert: async function(files, config) {
      const reads = []
      const writes = []
      // Only do for image files
      files = files.filter(f => isImage(f.name))
      if (!files.length) {
        return
      }
      for (const file of files) {
        reads.push(Jimp.read(file.path))
      }
      const images = await Promise.all(reads)
      for (let i = 0; i < files.length; i++) {
        const image = images[i]
        for (const key in config) {
          image[key](...config[key])
        }
        writes.push(image.writeAsync(files[i].path))
      }
      return Promise.all(writes)
    },

    /**
     * Get image file info
     * Relies on exiftool being installed
     */
    info: function(path) {
      if (!isImage(path)) {
        return {}
      }
      const x = execSync(`exiftool ${path}`)
        .toString()
        .split('\n')
        .map(x => x.split(' : ').map(y => y.trim()))
        .map(x => (x[0] = x[0].toLowerCase().replace(/\s/, '_')) && x)
        .filter(x => x[0])
      const result = {}
      for (const data of x) {
        result[data[0]] = data[1]
      }
      return result
    }
  }
}
