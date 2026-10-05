var size = 0;
var placement = 'point';

// Les centres sont chargés depuis layers/Centredesant_2.js.

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
            return centreIconStyle(feature, resolution, labelText, labelFont, labelFill, bufferColor, bufferWidth, placement, textAlign, offsetX, offsetY, overflow, repeat, 'styles/centre_social.svg', [64,64], 0.075, [32,32], 1);
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
