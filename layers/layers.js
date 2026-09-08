var wms_layers = [];


        var lyr_OSMStandard_0 = new ol.layer.Tile({
            'title': 'OSM Standard',
            'opacity': 1.000000,
            
            
            source: new ol.source.XYZ({
            crossOrigin: 'anonymous',
            attributions: '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors, CC-BY-SA</a>',
                url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
            })
        });
var format_Rgionsanitaire_1 = new ol.format.GeoJSON();
var features_Rgionsanitaire_1 = format_Rgionsanitaire_1.readFeatures(json_Rgionsanitaire_1, 
            {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'});
var jsonSource_Rgionsanitaire_1 = new ol.source.Vector({
    attributions: ' ',
});
jsonSource_Rgionsanitaire_1.addFeatures(features_Rgionsanitaire_1);
var lyr_Rgionsanitaire_1 = new ol.layer.Vector({
                declutter: false,
                source:jsonSource_Rgionsanitaire_1, 
                style: style_Rgionsanitaire_1,
                popuplayertitle: 'Région sanitaire',
                interactive: true,
                title: '<img src="styles/legend/Rgionsanitaire_1.png" /> Région sanitaire'
            });
var format_Centredesant_2 = new ol.format.GeoJSON();
var features_Centredesant_2 = format_Centredesant_2.readFeatures(json_Centredesant_2, 
            {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'});
var jsonSource_Centredesant_2 = new ol.source.Vector({
    attributions: ' ',
});
jsonSource_Centredesant_2.addFeatures(features_Centredesant_2);
var lyr_Centredesant_2 = new ol.layer.Vector({
                declutter: false,
                source:jsonSource_Centredesant_2, 
                style: style_Centredesant_2,
                popuplayertitle: 'Centre de santé',
                interactive: true,
    title: 'Centre de santé<br />\
    <img src="styles/legend/Centredesant_2_0.png" /> Centre de Santé Rural<br />\
    <img src="styles/legend/Centredesant_2_1.png" /> Centre de Santé Urbain<br />\
    <img src="styles/legend/Centredesant_2_2.png" /> Centre Médico-social<br />\
    <img src="styles/legend/Centredesant_2_3.png" /> Clinic<br />\
    <img src="styles/legend/Centredesant_2_4.png" /> Centre de Santé communautaire<br />\
    <img src="styles/legend/Centredesant_2_5.png" /> Hôpital Général<br />\
    <img src="styles/legend/Centredesant_2_6.png" /> Centre Hospitalier Régional<br />\
    <img src="styles/legend/Centredesant_2_7.png" /> Centre Hospitalier Universitaire<br />' });

lyr_OSMStandard_0.setVisible(true);lyr_Rgionsanitaire_1.setVisible(true);lyr_Centredesant_2.setVisible(true);
var layersList = [lyr_OSMStandard_0,lyr_Rgionsanitaire_1,lyr_Centredesant_2];
lyr_Rgionsanitaire_1.set('fieldAliases', {'LAYER': 'LAYER', 'DISTRICT': 'DISTRICT', 'CL_DISTRIC': 'CL_DISTRIC', 'CL_REGION_': 'CL_REGION_', 'REGION2010': 'REGION2010', 'PCODE1': 'PCODE1', 'ZONE_HUM': 'ZONE_HUM', 'PAYS': 'PAYS', 'DATE_CREAT': 'DATE_CREAT', 'DATE_MAJ': 'DATE_MAJ', 'REG_2012': 'REG_2012', 'PCODE2': 'PCODE2', 'LENGTH': 'LENGTH', 'SHAPE_AREA': 'SHAPE_AREA', 'xlabel': 'xlabel', 'ylabel': 'ylabel', 'xylabel': 'xylabel', 'pop': 'pop', 'Typemenage': 'Typemenage', 'Ethnie': 'Ethnie', });
lyr_Centredesant_2.set('fieldAliases', {'Pays': 'Pays', 'Region': 'Region', 'Nom de str': 'Nom de str', 'Type': 'Type', 'Propriete': 'Propriete', 'Lat': 'Lat', 'Long': 'Long', 'nbre infir': 'nbre infir', 'nbre medec': 'nbre medec', 'nbre sage': 'nbre sage', 'incidence': 'incidence', 'incidenc_1': 'incidenc_1', 'incidenc_2': 'incidenc_2', 'REG_SAN': 'Région sanitaire liée', 'DIST_SAN': 'District sanitaire lié', 'PCODE_SAN': 'Code région sanitaire lié', });
lyr_Rgionsanitaire_1.set('fieldImages', {'LAYER': 'TextEdit', 'DISTRICT': 'TextEdit', 'CL_DISTRIC': 'TextEdit', 'CL_REGION_': 'TextEdit', 'REGION2010': 'TextEdit', 'PCODE1': 'TextEdit', 'ZONE_HUM': 'TextEdit', 'PAYS': 'TextEdit', 'DATE_CREAT': 'TextEdit', 'DATE_MAJ': 'TextEdit', 'REG_2012': 'TextEdit', 'PCODE2': 'TextEdit', 'LENGTH': 'TextEdit', 'SHAPE_AREA': 'TextEdit', 'xlabel': 'TextEdit', 'ylabel': 'TextEdit', 'xylabel': 'TextEdit', 'pop': 'TextEdit', 'Typemenage': 'TextEdit', 'Ethnie': 'TextEdit', });
lyr_Centredesant_2.set('fieldImages', {'Pays': 'TextEdit', 'Region': 'TextEdit', 'Nom de str': 'TextEdit', 'Type': 'TextEdit', 'Propriete': 'TextEdit', 'Lat': 'TextEdit', 'Long': 'TextEdit', 'nbre infir': 'TextEdit', 'nbre medec': 'TextEdit', 'nbre sage': 'TextEdit', 'incidence': 'TextEdit', 'incidenc_1': 'TextEdit', 'incidenc_2': 'TextEdit', 'REG_SAN': 'TextEdit', 'DIST_SAN': 'TextEdit', 'PCODE_SAN': 'TextEdit', });
lyr_Rgionsanitaire_1.set('fieldLabels', {'LAYER': 'no label', 'DISTRICT': 'no label', 'CL_DISTRIC': 'no label', 'CL_REGION_': 'no label', 'REGION2010': 'no label', 'PCODE1': 'no label', 'ZONE_HUM': 'no label', 'PAYS': 'no label', 'DATE_CREAT': 'no label', 'DATE_MAJ': 'no label', 'REG_2012': 'no label', 'PCODE2': 'no label', 'LENGTH': 'no label', 'SHAPE_AREA': 'no label', 'xlabel': 'no label', 'ylabel': 'no label', 'xylabel': 'no label', 'pop': 'no label', 'Typemenage': 'no label', 'Ethnie': 'no label', });
lyr_Centredesant_2.set('fieldLabels', {'Pays': 'no label', 'Region': 'no label', 'Nom de str': 'no label', 'Type': 'no label', 'Propriete': 'no label', 'Lat': 'no label', 'Long': 'no label', 'nbre infir': 'no label', 'nbre medec': 'no label', 'nbre sage': 'no label', 'incidence': 'no label', 'incidenc_1': 'no label', 'incidenc_2': 'no label', 'REG_SAN': 'no label', 'DIST_SAN': 'no label', 'PCODE_SAN': 'no label', });
lyr_Centredesant_2.on('precompose', function(evt) {
    evt.context.globalCompositeOperation = 'normal';
});