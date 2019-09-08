jest.setTimeout(20000)
const fs = require('fs')
const fspath = require('path')
const { tmpdir } = require('os')
const duggConfig = require('../.dugg.config.js')
const dugg = require('../index.js')(duggConfig)

const path = fspath.join(__dirname, 'images')
function p(name) {
  return fspath.join(path, name)
}

// File paths
const n = {
  original: 'sirloin-logo.png',
  retina: 'sirloin-logo@2x.png',
  upload: 'upload_ea975ea24a208492f9a325b73fac579d',
  url: '1423202872_carassius_carassius_prague_vltava_2.jpg'
}

// Example file
const file = {
  size: 165888,
  path: p(n.original),
  name: n.original,
  type: 'image/png',
  lastModifiedDate: new Date('2019-07-31T08:00:19.944Z')
}

describe('convert', () => {
  beforeAll(() => {
    // Delete processed files
    const paths = [p(n.original), p(n.retina)]
    for (const f of paths) {
      if (fs.existsSync(f)) {
        fs.unlinkSync(f)
      }
    }
    // Recreate original from upload
    fs.copyFileSync(p(n.upload), p(n.original))
  })

  it('should show file info', async () => {
    const info = dugg.info(p(n.original))
    expect(info.file_name).toBe(n.original)
  })

  it('should resize image', async () => {
    const config = {
      resize: [120, 120],
      greyscale: []
    }
    const files = [file, file]
    await dugg.convert(files, config)
    const info = dugg.info(p(n.original))
    expect(info.image_size).toBe('120x120')
  })

  it('should download a file', async () => {
    const tmp = `${tmpdir()}/${n.url}`
    const path = await dugg.download(`http://f.o4.no/${n.url}`, tmp)
    expect(path).toBe(tmp)
    const info = dugg.info(path)
    expect(info.file_name).toBe(n.url)
    expect(info.file_size).toBe('79 kB')
  })
})
