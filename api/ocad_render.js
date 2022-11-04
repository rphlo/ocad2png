const { ocadToSvg } = require('ocad2geojson')
const sharp = require('sharp')
const DOMImplementation = global.DOMImplementation
  ? global.DOMImplementation
  : new (require('xmldom').DOMImplementation)()
const XMLSerializer = global.XMLSerializer
  ? global.XMLSerializer
  : require('xmldom').XMLSerializer

const defaultDOMImplementation = DOMImplementation

const renderSvg = (tiler, extent, resolution, options = {}) => {
    const DOMImplementation = defaultDOMImplementation
    const document = DOMImplementation.createDocument(null, 'xml', null)
    const svg = ocadToSvg(tiler.ocadFile, {
      objects: tiler.getObjects(extent, (options.buffer || 256) * resolution),
      document,
    })
    fixIds(svg)
    return svg
}

function render(tiler, extent, resolution, options = {}) {
  const crs = tiler.ocadFile.getCrs()
  const svgResolution = Math.min(resolution, 1 * (crs.scale / 15000))
  const svg = renderSvg(tiler, extent, svgResolution, options)
  
  const extentWidth = extent[2] - extent[0]
  const extentHeight = extent[3] - extent[1]

  svg.setAttributeNS(
    'http://www.w3.org/2000/svg',
    'width',
    extentWidth / svgResolution + 'px'
  )
  svg.setAttributeNS(
    'http://www.w3.org/2000/svg',
    'height',
    extentHeight / svgResolution + 'px'
  )
  const xml = new XMLSerializer().serializeToString(svg)
  const result = sharp(Buffer.from(xml)).resize(
    Math.round(extentWidth / resolution),
    Math.round(extentHeight / resolution)
  ).flatten({ background: { r: 255, g: 255, b: 255 } })
  if (options.outputPath) {
    return result.toFile(options.outputPath)
  } else if (options.format) {
    return result.toFormat(options.format).toBuffer()
  } else {
    throw new Error('Missing option "outputPath" or "format".')
  }
}

function fixIds(n) {
  if (n.id) {
    n.setAttributeNS('http://www.w3.org/2000/svg', 'id', n.id)
  }
  if (n.childNodes) {
    for (let i = 0; i < n.childNodes.length; i++) {
      fixIds(n.childNodes[i])
    }
  }
}

module.exports = {
    renderSvg,
    render,
}