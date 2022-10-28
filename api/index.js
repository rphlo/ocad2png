#! /usr/bin/env node 
const fileUpload = require('express-fileupload');
const express = require('express')
const stream = require('stream')
const { readOcad } = require('ocad2geojson')
const OcadTiler = require('ocad-tiler')
const fetch = require('node-fetch')
const proj4 = require('proj4')
const {saveKMZ} = require('./helpers')
const { render } = require('./ocad_render')

const app = express()

app.use(fileUpload({
    createParentPath: true
}));

async function getProj4Def(crs) {
    const resp = await fetch(`https://epsg.io/${crs}.proj4`);
    return resp.text()
}

const getMap = async (req, res, next) => {
    if(!req.files?.ocad_file) {
       return res.status(400).send('no file sent')
    }
    if (!['png', 'kmz'].includes(req.body.type)){
       return res.status(400).send('invalid output format')
    }
    const uploadedFile = req.files.ocad_file;

    const ocadFile = await readOcad(uploadedFile.data);
    const mapCrs = ocadFile.getCrs();
    const proj4Def = await getProj4Def(mapCrs.code);
    const bounds = ocadFile.getBounds()
    const projectedBounds = ocadFile.getBounds(mapCrs.toProjectedCoord.bind(mapCrs))
    
    proj4.defs('WGS84', "+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees");
    proj4.defs('OcadFile', proj4Def);

    const northEast = proj4('OcadFile', 'WGS84', [projectedBounds[2], projectedBounds[3]])
    const northWest = proj4('OcadFile', 'WGS84', [projectedBounds[0], projectedBounds[3]])
    const southWest = proj4('OcadFile', 'WGS84', [projectedBounds[0], projectedBounds[1]])
    const southEast = proj4('OcadFile', 'WGS84', [projectedBounds[2], projectedBounds[1]])

    const tiler = new OcadTiler(ocadFile)
    tileBounds = tiler.bounds
    const imgBlob = await render(tiler, tileBounds, 1, {
        format: "png",
        exportHidden: false,
        applyGrivation: false,
    })
    let filename = ""
    let mime = ""
    let out = null;

    if (!req.body.type || req.body.type === 'png') {
        out = imgBlob
        mime = 'image/png'
        filename = uploadedFile.name.slice(0, -4) + "_" + northWest[1] + "_" + northWest[0] + "_" + northEast[1] + "_" + northEast[0] + "_" + southEast[1] + "_" + southEast[0] + "_" + southWest[1] + "_" + southWest[0] + "_" +".png"
    } else if(req.body.type === 'kmz') {
        const mapName = uploadedFile.name.slice(0, -4)
        out = await saveKMZ(
            mapName,
            {
                top_left: {lat: northWest[1], lon: northWest[0]},
                top_right: {lat: northEast[1], lon: northEast[0]},
                bottom_right: {lat: southEast[1], lon: southEast[0]},
                bottom_left: {lat: southWest[1], lon: southWest[0]},
            },
            imgBlob
        )
        mime = 'application/vnd.google-earth.kmz'
        filename = `${mapName}.kmz`
    } else {
        return res.status(400).send('invalid type' )
    }

    const readStream = new stream.PassThrough()
    readStream.end(out)

    res.set('Content-Type', mime + '; charset=utf-8')
    res.set('Content-Disposition', "attachment; filename*=UTF-8''" + escape(filename))
    readStream.pipe(res)
}

app.use(express.urlencoded({extended: true}))
app.use(express.json())

app.post('/api/get-map', getMap)

module.exports = app