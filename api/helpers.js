const JSZip = require('jszip');

const getKml = (name, corners_coords) => {
    return `<?xml version="1.0" encoding="utf-8"?>
  <kml xmlns="http://www.opengis.net/kml/2.2"
        xmlns:gx="http://www.google.com/kml/ext/2.2">
    <Document>
      <Folder>
        <name>${decodeURIComponent(escape(name))}</name>
        <GroundOverlay>
          <name>${decodeURIComponent(escape(name))}</name>
          <drawOrder>50</drawOrder>
          <Icon>
            <href>files/doc.png</href>
          </Icon>
          <altitudeMode>clampToGround</altitudeMode>
          <gx:LatLonQuad>
            <coordinates>
              ${corners_coords.bottom_left.lon},${corners_coords.bottom_left.lat} ${corners_coords.bottom_right.lon},${corners_coords.bottom_right.lat} ${corners_coords.top_right.lon},${corners_coords.top_right.lat} ${corners_coords.top_left.lon},${corners_coords.top_left.lat}
            </coordinates>
          </gx:LatLonQuad>
        </GroundOverlay>
      </Folder>
    </Document>
  </kml>`;
  }
  
  const saveKMZ = async (name, bound, imgBlob) => {
    var zip = new JSZip();
    zip.file("doc.kml", getKml(name, bound));
    var img = zip.folder("files");
    img.file("doc.png", imgBlob);
    return zip.generateAsync({type:"nodebuffer"})
      .then(function(content) {
          return content;
      });
  }

  module.exports = {
      saveKMZ
  }