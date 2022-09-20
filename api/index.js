#! /usr/bin/env node 
const fileUpload = require('express-fileupload');
const express = require('express')
const stream = require('stream')
const { readOcad } = require('ocad2geojson')
const OcadTiler = require('ocad-tiler')

const { render } = require('./ocad_render')

const app = express()

app.use(fileUpload({
    createParentPath: true
}));

const getMap = async (req, res, next) => {
    if(!req.files?.ocad_file) {
       return res.status(400).send('no file sent')
    }
    if (!['png'].includes(req.body.type)){
       return res.status(400).send('invalid output format')
    }
    const uploadedFile = req.files.ocad_file;
    const filename = uploadedFile.name.slice(0, -3) + "png"

    const ocadFile = await readOcad(uploadedFile.data);

    const tiler = new OcadTiler(ocadFile)
    const bounds = tiler.bounds

    const out = await render(tiler, bounds, 1, {
        format: "png",
        exportHidden: false,
        applyGrivation: false,
    })
    const readStream = new stream.PassThrough()
    readStream.end(out)
    res.set('Content-disposition', 'attachment; filename="' + filename.replace(/\\/g, '_').replace(/"/g, '\\"') + '"')
    res.set('Content-Type', "application/png")
    readStream.pipe(res)
}

app.use(express.urlencoded({extended: true}))
app.use(express.json())

app.post('/api/get-map', getMap)

module.exports = app