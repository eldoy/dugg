var fs = require('fs')
var { execSync } = require('child_process')
var { PutObjectCommand, S3Client } = require('@aws-sdk/client-s3')
var Jimp = require('jimp')
var { parse } = require('url')
var { basename } = require('path')
var net = {
  'http:': require('http'),
  'https:': require('https')
}
var mime = require('mime-types')

// Increase memory limit for Jimp jpeg conversion
var jpgDecoder = Jimp.decoders['image/jpeg']
Jimp.decoders['image/jpeg'] = (data) => {
  return jpgDecoder(data, { maxMemoryUsageInMB: 1024 })
}

var TIMEOUT = 10000
var BYTES = 1024

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
module.exports = function (settings = {}) {
  var region = settings.region || 'us-east-1'
  var client = new S3Client({
    region,
    credentials: {
      accessKeyId: settings.key,
      secretAccessKey: settings.secret
    }
  })

  /**
   * Check if file name is an image
   */
  var isImage = function (name) {
    return /\.(gif|jpe?g|tiff|png|bmp)$/i.test(name)
  }

  return {
    /**
     * Upload files to CDN
     */
    upload: async function (files, options = {}) {
      var urls = []

      // Convert files
      var { config } = options || settings
      if (typeof config == 'object') {
        await this.convert(files, config)
      }

      for (var file of files) {
        var { name } = file
        if (options.timestamp) {
          name = Date.now() + '_' + name
        }

        var type = mime.lookup(name) || 'application/octet-stream'
        var bucket = options.bucket || settings.bucket

        var command = new PutObjectCommand({
          Bucket: bucket,
          Key: name,
          Body: fs.createReadStream(file.path),
          ContentType: mime.contentType(type)
        })

        var result = await client.send(command)
        var url = `https://${bucket}.s3.amazonaws.com/${name}`

        file.url = url
        urls.push(url)

        // Log upload
        if (typeof options.log == 'function') {
          options.log(file)
        } else if (options.log === true) {
          console.log(file.url)
        }
      }
      return urls
    },

    /**
     * Download file from URL
     * @options
     * quiet: true | false
     * ondata: function
     * onend: function
     * onerror: function
     */
    download: function (url, path, options = {}) {
      if (typeof path === 'object') {
        options = path
        path = undefined
      }
      var uri = parse(url)
      if (!path) {
        path = basename(uri.path)
      }
      var file = fs.createWriteStream(path)

      if (typeof options.ondata !== 'function') {
        options.ondata = function ({ percent, downloaded }) {
          process.stdout.write(`Downloading ${percent}% ${downloaded} bytes\r`)
        }
      }

      if (typeof options.onend !== 'function') {
        options.onend = function ({ uri, path }) {
          process.stdout.write(`${uri.path} downloaded to: ${path}\n`)
        }
      }

      if (typeof options.onerror !== 'function') {
        options.onerror = function ({ uri, path }) {
          process.stdout.write(
            `${uri.path} error while downloading to ${path}\n`
          )
        }
      }

      return new Promise(function (resolve, reject) {
        var request = net[uri.protocol]
          .get(uri.href)
          .on('response', function (res) {
            var total = parseInt(res.headers['content-length'])
            var totalkb = (total / BYTES).toFixed(2)
            var downloaded = 0
            var downloadedkb = 0
            var percent = 0

            function props() {
              return {
                uri,
                path,
                total,
                totalkb,
                file,
                downloaded,
                downloadedkb,
                percent
              }
            }

            function trigger(name) {
              if (!options.quiet) {
                options[`on${name}`](props())
              }
            }

            file.on('finish', function () {
              file.close(function () {
                resolve(props())
              })
            })

            res
              .on('data', function (chunk) {
                file.write(chunk)
                downloaded += chunk.length
                downloadedkb = (downloaded / BYTES).toFixed(2)
                percent = ((100.0 * downloaded) / total).toFixed(2)
                trigger('data')
              })
              .on('end', function () {
                file.end()
                trigger('end')
              })
              .on('error', function (err) {
                trigger('error')
                reject(err)
              })
          })
        request.setTimeout(TIMEOUT, function () {
          request.abort()
          reject(new Error(`request timeout after ${TIMEOUT / 1000.0}s`))
        })
      })
    },

    /**
     * Convert image file according to config
     * Uses the Jimp lib
     */
    convert: async function (files, config) {
      // Set 'auto' to Jimp.AUTO
      function convertConfig(obj) {
        for (var key in obj) {
          if (obj[key] && typeof obj[key] === 'object') {
            convertConfig(obj[key])
          } else if (obj[key] === 'auto') {
            obj[key] = Jimp.AUTO
          }
        }
      }
      convertConfig(config)

      // Only do for image files
      files = files.filter((f) => isImage(f.name))
      if (!files.length) return

      var reads = []
      for (var file of files) {
        reads.push(Jimp.read(file.path))
      }
      var writes = []
      var images = await Promise.all(reads)
      for (var i = 0; i < files.length; i++) {
        var image = images[i]
        for (var key in config) {
          image[key](...config[key])
        }
        writes.push(image.writeAsync(files[i].path))
      }
      await Promise.all(writes)

      // Update info
      for (var file of files) {
        var stat = fs.statSync(file.path)
        file.size = stat.size
      }
      return files
    },

    /**
     * Get image file info
     * Relies on exiftool being installed
     */
    info: function (path) {
      if (!isImage(path)) {
        return {}
      }
      var x = execSync(`exiftool ${path}`)
        .toString()
        .split('\n')
        .map((x) => x.split(' : ').map((y) => y.trim()))
        .map((x) => (x[0] = x[0].toLowerCase().replace(/\s/, '_')) && x)
        .filter((x) => x[0])
      var result = {}
      for (var data of x) {
        result[data[0]] = data[1]
      }
      return result
    }
  }
}
