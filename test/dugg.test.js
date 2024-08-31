jest.setTimeout(20000)
var fs = require('fs')
var fspath = require('path')
var { tmpdir } = require('os')
var duggConfig = require('../.dugg.config.js')
var dugg = require('../index.js')(duggConfig)

var path = fspath.join(__dirname, 'images')
function p(name) {
  return fspath.join(path, name)
}

// File paths
var n = {
  original: 'sirloin-logo.png',
  retina: 'sirloin-logo@2x.png',
  upload: 'upload_ea975ea24a208492f9a325b73fac579d',
  url: '1423202872_carassius_carassius_prague_vltava_2.jpg'
}

// Example file
var file = {
  size: 165888,
  path: p(n.original),
  name: n.original,
  type: 'image/png',
  lastModifiedDate: new Date('2019-07-31T08:00:19.944Z')
}

describe('convert', () => {
  beforeAll(() => {
    // Delete processed files
    var paths = [p(n.original), p(n.retina)]
    for (var f of paths) {
      if (fs.existsSync(f)) {
        fs.unlinkSync(f)
      }
    }
    // Recreate original from upload
    fs.copyFileSync(p(n.upload), p(n.original))
  })

  it('should show file info', async () => {
    var info = dugg.info(p(n.original))
    expect(info.file_name).toBe(n.original)
  })

  it('should resize image', async () => {
    var config = {
      resize: [120, 120],
      greyscale: []
    }
    var files = [file, file]
    var f = await dugg.convert(files, config)
    var stat = fs.statSync(p(n.original))
    expect(f[0].size).toEqual(stat.size)
    var info = dugg.info(p(n.original))
    expect(info.image_size).toBe('120x120')
  })

  it('should download a file', async () => {
    var tmp = `${tmpdir()}/${n.url}`
    var result = await dugg.download(
      `https://7ino.s3.amazonaws.com/sirloin-logo.png`,
      tmp
    )
    expect(result.path).toBe(tmp)
    var info = dugg.info(result.path)
    expect(info.file_name).toBe(n.url)
    expect(info.file_size).toBe('11 kB')
  })

  it('should upload a file', async () => {
    var urls = await dugg.upload([file])
    var url = `https://7ino.s3.amazonaws.com/${file.name}`
    expect(urls[0]).toBe(url)
    expect(file.url).toBe(url)
  })
})
