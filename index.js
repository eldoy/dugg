const fs = require('fs')
const AWS = require('aws-sdk')

class Dugg {
  constructor (file) {
    this.file = file
  }

  // Set key and secret
  static config (options = {}) {
    AWS.config.update({
      accessKeyId: options.key,
      secretAccessKey: options.secret
    })
  }

  // Upload to Amazon S3
  s3 (options = {}) {
    const bucket = new AWS.S3()
    const key = Date.now() + '_' + this.file.name

    const params = {
      Bucket: options.bucket,
      Key: key,
      Body: fs.createReadStream(this.file.path)
    }

    const config = {
      queueSize: 1
    }

    return bucket.upload(params, config).promise()
  }
}

module.exports = Dugg
