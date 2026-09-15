// Mise à jour de la couche Centres de santé — 15/09/2026
// Ajouts détectés dans le fichier transmis par l'utilisateur.
(function () {
    'use strict';

    if (typeof json_Centredesant_2 === 'undefined' || !json_Centredesant_2 || !Array.isArray(json_Centredesant_2.features)) {
        console.error('Mise à jour centres de santé impossible : json_Centredesant_2 indisponible.');
        return;
    }

    var additions = [
        {
            "type":"Feature",
            "properties":{
                "Pays":null,
                "Region":null,
                "Nom de str":"ADIO",
                "Type":"Centre de Santé Rural",
                "Propriete":null,
                "Lat":null,
                "Long":null,
                "nbre infir":null,
                "nbre medec":null,
                "nbre sage":null,
                "incidence":null,
                "incidenc_1":null,
                "incidenc_2":null
            },
            "geometry":{"type":"Point","coordinates":[-4.754476644621328,7.941802424333684]}
        },
        {
            "type":"Feature",
            "properties":{
                "Pays":null,
                "Region":null,
                "Nom de str":"reyo",
                "Type":"Clinic",
                "Propriete":null,
                "Lat":null,
                "Long":null,
                "nbre infir":null,
                "nbre medec":null,
                "nbre sage":null,
                "incidence":null,
                "incidenc_1":null,
                "incidenc_2":null
            },
            "geometry":{"type":"Point","coordinates":[-2.991183323030268,9.198842335222542]}
        },
        {
            "type":"Feature",
            "properties":{
                "Pays":null,
                "Region":null,
                "Nom de str":"teguere",
                "Type":"Centre Social",
                "Propriete":null,
                "Lat":null,
                "Long":null,
                "nbre infir":null,
                "nbre medec":null,
                "nbre sage":null,
                "incidence":null,
                "incidenc_1":null,
                "incidenc_2":null
            },
            "geometry":{"type":"Point","coordinates":[-4.525242871456927,9.224542819496969]}
        }
    ];

    function sameRecord(a, b) {
        var ap = (a && a.properties) || {};
        var bp = (b && b.properties) || {};
        if ((ap['Nom de str'] || '') !== (bp['Nom de str'] || '')) return false;
        var ac = a && a.geometry && a.geometry.coordinates;
        var bc = b && b.geometry && b.geometry.coordinates;
        return Array.isArray(ac) && Array.isArray(bc) && ac[0] === bc[0] && ac[1] === bc[1];
    }

    additions.forEach(function (feature) {
        var exists = json_Centredesant_2.features.some(function (current) {
            return sameRecord(current, feature);
        });
        if (!exists) json_Centredesant_2.features.push(feature);
    });

    json_Centredesant_2.dataVersion = '2026-09-15';
})();
