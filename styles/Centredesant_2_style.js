var size = 0;
var placement = 'point';

/* Synchronisation des ajouts du fichier centres transmis le 15/09/2026.
   Le fichier de données est déjà chargé à ce stade, mais la source OpenLayers
   n'est créée qu'ensuite dans layers.js : les nouveaux objets sont donc pris
   en compte par la carte, les recherches, les requêtes et les statistiques. */
(function syncCentres20260915(){
    if (typeof json_Centredesant_2 === 'undefined' || !json_Centredesant_2 || !Array.isArray(json_Centredesant_2.features)) return;

    var additions = [
        {"type":"Feature","properties":{"Pays":null,"Region":null,"Nom de str":"ADIO","Type":"Centre de Santé Rural","Propriete":null,"Lat":null,"Long":null,"nbre infir":null,"nbre medec":null,"nbre sage":null,"incidence":null,"incidenc_1":null,"incidenc_2":null},"geometry":{"type":"Point","coordinates":[-4.754476644621328,7.941802424333684]}},
        {"type":"Feature","properties":{"Pays":null,"Region":null,"Nom de str":"reyo","Type":"Clinic","Propriete":null,"Lat":null,"Long":null,"nbre infir":null,"nbre medec":null,"nbre sage":null,"incidence":null,"incidenc_1":null,"incidenc_2":null},"geometry":{"type":"Point","coordinates":[-2.991183323030268,9.198842335222542]}},
        {"type":"Feature","properties":{"Pays":null,"Region":null,"Nom de str":"teguere","Type":"Centre Social","Propriete":null,"Lat":null,"Long":null,"nbre infir":null,"nbre medec":null,"nbre sage":null,"incidence":null,"incidenc_1":null,"incidenc_2":null},"geometry":{"type":"Point","coordinates":[-4.525242871456927,9.224542819496969]}}
    ];

    additions.forEach(function(feature){
        var p = feature.properties || {};
        var c = feature.geometry && feature.geometry.coordinates;
        var exists = json_Centredesant_2.features.some(function(current){
            var cp = (current && current.properties) || {};
            var cc = current && current.geometry && current.geometry.coordinates;
            return cp['Nom de str'] === p['Nom de str'] && Array.isArray(cc) && Array.isArray(c) && cc[0] === c[0] && cc[1] === c[1];
        });
        if (!exists) json_Centredesant_2.features.push(feature);
    });
    json_Centredesant_2.dataVersion = '2026-09-15';
})();

function centreIconStyle(feature, resolution, labelText, labelFont, labelFill,
                         bufferColor, bufferWidth, placement, textAlign,
                         offsetX, offsetY, overflow, repeat,
                         src, imgSize, scale, anchor, opacity) {
    return [new ol.style.Style({
        image: new ol.style.Icon({
            imgSize: imgSize,
            scale: scale,
            anchor: anchor,
            anchorXUnits: 'pixels',
            anchorYUnits: 'pixels',
            rotation: 0.0,
            opacity: opacity == null ? 1 : opacity,
            src: src
        }),
        text: createTextStyle(feature, resolution, labelText, labelFont,
                              labelFill, placement, bufferColor,
                              bufferWidth, textAlign, offsetX, offsetY,
                              overflow, repeat)
    })];
}

function categories_Centredesant_2(feature, value, size, resolution, labelText,
                       labelFont, labelFill, bufferColor, bufferWidth,
                       placement, textAlign, offsetX, offsetY, overflow, repeat) {
    var valueStr = (value !== null && value !== undefined) ? value.toString() : 'default';

    switch (valueStr) {
        case 'Centre de Santé Rural':
            return centreIconStyle(feature, resolution, labelText, labelFont, labelFill, bufferColor, bufferWidth, placement, textAlign, offsetX, offsetY, overflow, repeat, 'styles/cross.svg', [579.997,579.997], 0.025862202735531394, [289.9985,289.9985], 1);
        case 'Centre de Santé Urbain':
            return centreIconStyle(feature, resolution, labelText, labelFont, labelFill, bufferColor, bufferWidth, placement, textAlign, offsetX, offsetY, overflow, repeat, 'styles/cross_1.svg', [579.997,579.997], 0.0327587901316731, [289.9985,289.9985], 1);
        case 'Centre Médico-social':
            return centreIconStyle(feature, resolution, labelText, labelFont, labelFill, bufferColor, bufferWidth, placement, textAlign, offsetX, offsetY, overflow, repeat, 'styles/health_pharmacy.svg', [580,580], 0.02586206896551724, [290,290], 1);
        case 'Clinic':
            return centreIconStyle(feature, resolution, labelText, labelFont, labelFill, bufferColor, bufferWidth, placement, textAlign, offsetX, offsetY, overflow, repeat, 'styles/health_pharmacy_1.svg', [580,580], 0.02586206896551724, [290,290], 1);
        case 'Community-based Health Planning and Services':
            return centreIconStyle(feature, resolution, labelText, labelFont, labelFill, bufferColor, bufferWidth, placement, textAlign, offsetX, offsetY, overflow, repeat, 'styles/health_hospital_emergency.svg', [580,580], 0.02586206896551724, [290,290], 1);
        case 'Centre Social':
            return centreIconStyle(feature, resolution, labelText, labelFont, labelFill, bufferColor, bufferWidth, placement, textAlign, offsetX, offsetY, overflow, repeat, 'styles/centre_social.svg', [64,64], 0.14, [32,32], 1);
        case 'Hôpital Général':
            return centreIconStyle(feature, resolution, labelText, labelFont, labelFill, bufferColor, bufferWidth, placement, textAlign, offsetX, offsetY, overflow, repeat, 'styles/cross_2.svg', [579.997,579.997], 0.037931230678779376, [289.9985,289.9985], 1);
        case 'Hospitalier Régional':
            return centreIconStyle(feature, resolution, labelText, labelFont, labelFill, bufferColor, bufferWidth, placement, textAlign, offsetX, offsetY, overflow, repeat, 'styles/cross_3.svg', [579.997,579.997], 0.037931230678779376, [289.9985,289.9985], 1);
        case 'Hospitalier Universitaire':
            return centreIconStyle(feature, resolution, labelText, labelFont, labelFill, bufferColor, bufferWidth, placement, textAlign, offsetX, offsetY, overflow, repeat, 'styles/noun_Hospital_8441157.svg', [612,792], 0.05555555555555555, [306,396], 1);
        case 'ICA':
            return centreIconStyle(feature, resolution, labelText, labelFont, labelFill, bufferColor, bufferWidth, placement, textAlign, offsetX, offsetY, overflow, repeat, 'styles/heart_cardiology.svg', [64,64], 0.30, [32,32], 0.9);
        default:
            return [new ol.style.Style({
                image: new ol.style.Circle({radius:7, fill:new ol.style.Fill({color:'#8e44ad'}), stroke:new ol.style.Stroke({color:'#4a235a',width:2})}),
                text: createTextStyle(feature, resolution, labelText, labelFont, labelFill, placement, bufferColor, bufferWidth, textAlign, offsetX, offsetY, overflow, repeat)
            })];
    }
}

var style_Centredesant_2 = function(feature, resolution) {
    var labelText = '';
    var value = feature.get('Type');
    var labelFont = '10px, sans-serif';
    var labelFill = '#000000';
    var bufferColor = '';
    var bufferWidth = 0;
    var textAlign = 'left';
    var offsetX = 8;
    var offsetY = 3;
    var overflow = false;
    var repeat = 0;
    var placement = 'point';
    return categories_Centredesant_2(feature, value, size, resolution, labelText, labelFont, labelFill, bufferColor, bufferWidth, placement, textAlign, offsetX, offsetY, overflow, repeat);
};

/* Ajoute la nouvelle catégorie à la légende latérale sans dépendre d'une
   régénération QGIS2Web du fichier index.html. */
window.addEventListener('load', function(){
    var blocks = Array.prototype.slice.call(document.querySelectorAll('.legend-block'));
    var centerBlock = blocks.find(function(block){
        var title = block.querySelector('.legend-layer-title');
        return title && title.textContent.trim().toLowerCase().indexOf('centre de santé') !== -1;
    });
    if (centerBlock && !document.getElementById('legend-centre-social')) {
        var item = document.createElement('div');
        item.className = 'legend-item';
        item.id = 'legend-centre-social';
        item.innerHTML = '<img src="styles/centre_social.svg" alt=""><span>Centre Social</span>';
        centerBlock.appendChild(item);
    }

    if (typeof lyr_Centredesant_2 !== 'undefined' && lyr_Centredesant_2 && typeof lyr_Centredesant_2.get === 'function') {
        var title = lyr_Centredesant_2.get('title') || '';
        if (title.indexOf('Centre Social') === -1) title += '<br /><img src="styles/centre_social.svg" /> Centre Social';
        if (title.indexOf('ICA') === -1) title += '<br /><img src="styles/heart_cardiology.svg" /> Institut de Cardiologie (ICA)';
        lyr_Centredesant_2.set('title', title);
    }
});
