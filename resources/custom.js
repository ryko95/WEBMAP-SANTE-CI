(function(){
  'use strict';

  const FIELD_LABELS = {
    'Pays':'Pays','Region':'Région','Nom de str':'Nom de la structure','Type':'Type de structure','Propriete':'Propriété',
    'Lat':'Latitude','Long':'Longitude','nbre infir':"Nombre d'infirmiers",'nbre medec':'Nombre de médecins','nbre sage':'Nombre de sages-femmes',
    'incidence':'Incidence paludisme','incidenc_1':'Incidence VIH/SIDA','incidenc_2':'Incidence choléra',
    'REG_SAN':'Région sanitaire liée','DIST_SAN':'District sanitaire lié','PCODE_SAN':'Code région sanitaire lié',
    'LAYER':'Type de zone','DISTRICT':'District','CL_DISTRIC':'Chef-lieu du district','CL_REGION_':'Chef-lieu de région','REGION2010':'Région 2010',
    'PCODE1':'Code district','ZONE_HUM':'Zone humanitaire','PAYS':'Pays','DATE_CREAT':'Date de création','DATE_MAJ':'Date de mise à jour',
    'REG_2012':'Région sanitaire','PCODE2':'Code région','LENGTH':'Périmètre','SHAPE_AREA':'Superficie','pop':'Population','Typemenage':'Type de ménage','Ethnie':'Ethnie'
  };

  const layerDefs = {
    centers: {
      label:'Centre de santé', shortLabel:'Centres de santé', layer:lyr_Centredesant_2, source:jsonSource_Centredesant_2,
      nameFields:['Nom de str','REG_SAN','Type'], chartField:'Type', icon:'fas fa-hospital',
      exportFields:['Nom de str','REG_SAN','DIST_SAN','Type','Propriete','nbre infir','nbre medec','nbre sage','incidence','incidenc_1','incidenc_2','Lat','Long']
    },
    regions: {
      label:'Région sanitaire', shortLabel:'Régions sanitaires', layer:lyr_Rgionsanitaire_1, source:jsonSource_Rgionsanitaire_1,
      nameFields:['REG_2012','CL_REGION_','DISTRICT'], chartField:'DISTRICT', icon:'fas fa-draw-polygon',
      exportFields:['REG_2012','DISTRICT','CL_REGION_','ZONE_HUM','pop','SHAPE_AREA','PCODE2','DATE_MAJ']
    }
  };

  const numericFields = {
    centers:new Set(['Lat','Long','nbre infir','nbre medec','nbre sage','incidence','incidenc_1','incidenc_2']),
    regions:new Set(['LENGTH','SHAPE_AREA','pop'])
  };

  const queryUi = {
    centers:{enabled:'queryCentersEnabled', logic:'logicCenters', criteria:'centerCriteriaContainer', add:'addCenterCriterion'},
    regions:{enabled:'queryRegionsEnabled', logic:'logicRegions', criteria:'regionCriteriaContainer', add:'addRegionCriterion'}
  };

  const initialExtent = [-1384488.942715, 468064.452860, 151463.501001, 1221366.812377];
  const queryHighlightSource = new ol.source.Vector();
  const queryHighlightLayer = new ol.layer.Vector({
    source: queryHighlightSource,
    declutter: false,
    style: function(feature){
      const geom = feature.getGeometry();
      const type = geom ? geom.getType() : '';
      if (type === 'Point' || type === 'MultiPoint') {
        return new ol.style.Style({
          image:new ol.style.Circle({radius:9,fill:new ol.style.Fill({color:'#ffd400'}),stroke:new ol.style.Stroke({color:'#7f6500',width:2.5})}),
          zIndex:9999
        });
      }
      return new ol.style.Style({
        stroke:new ol.style.Stroke({color:'#ffd400',width:4}),
        fill:new ol.style.Fill({color:'rgba(255,212,0,.28)'}),
        zIndex:9999
      });
    },
    zIndex:9999
  });
  map.addLayer(queryHighlightLayer);

  const el = id => document.getElementById(id);
  const searchLayer = el('searchLayer');
  const searchField = el('searchField');
  const searchInput = el('entitySearch');
  const searchSuggestions = el('searchSuggestions');
  const resultCount = el('resultCount');
  const resultsList = el('resultsList');
  const statsSummary = el('statsSummary');
  const statsChart = el('statsChart');
  let currentResults = {centers:[], regions:[]};
  let lastOperation = null;
  let exportBusy = false;

  function normalize(v){return String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
  function parseNumber(v){
    if(v===null || v===undefined || v==='') return NaN;
    if(typeof v === 'number') return v;
    return Number(String(v).replace(/\s/g,'').replace(',','.'));
  }
  function fmt(n,dec=0){return Number.isFinite(n) ? n.toLocaleString('fr-FR',{maximumFractionDigits:dec,minimumFractionDigits:dec}) : '—';}
  function labelOf(field){return FIELD_LABELS[field] || field;}
  function escapeHtml(v){return String(v==null?'':v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function xmlEscape(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');}
  function getFields(key){
    const fs=layerDefs[key].source.getFeatures();
    if(!fs.length) return [];
    return fs[0].getKeys().filter(k=>k!=='geometry');
  }
  function isNumeric(key,field){return numericFields[key].has(field);}
  function totalResults(results=currentResults){return (results.centers||[]).length+(results.regions||[]).length;}
  function cloneForHighlight(feature){return feature.clone();}
  function nowLabel(){return new Date().toLocaleString('fr-FR');}
  function fileStamp(){const d=new Date(), p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;}

  function distinctValues(key,field,limit=250){
    const values=[], seen=new Set();
    layerDefs[key].source.getFeatures().forEach(f=>{
      const raw=f.get(field);
      if(raw===null||raw===undefined||String(raw).trim()==='') return;
      const txt=String(raw).trim(), norm=normalize(txt);
      if(seen.has(norm)) return;
      seen.add(norm);values.push(txt);
    });
    values.sort((a,b)=>{
      if(isNumeric(key,field)){const na=parseNumber(a),nb=parseNumber(b);if(Number.isFinite(na)&&Number.isFinite(nb))return na-nb;}
      return a.localeCompare(b,'fr',{numeric:true,sensitivity:'base'});
    });
    return values.slice(0,limit);
  }

  function numericRangeHint(key,field){
    if(!isNumeric(key,field)) return '';
    const nums=layerDefs[key].source.getFeatures().map(f=>parseNumber(f.get(field))).filter(Number.isFinite);
    if(!nums.length) return '';
    return `Plage observée : ${fmt(Math.min(...nums),2)} à ${fmt(Math.max(...nums),2)}`;
  }

  function suggestionValues(key,field,typed='',limit=12){
    const q=normalize(typed);
    if(field==='*'){
      const fields=getFields(key), out=[], seen=new Set();
      const preferred=[...(layerDefs[key].nameFields||[]),...fields.filter(f=>!(layerDefs[key].nameFields||[]).includes(f))];
      for(const fld of preferred){
        for(const value of distinctValues(key,fld,5000)){
          const n=normalize(value);
          if((!q||n.includes(q))&&!seen.has(n)){seen.add(n);out.push({value,field:fld});if(out.length>=limit)return out;}
        }
      }
      return out;
    }
    return distinctValues(key,field,5000).filter(v=>!q||normalize(v).includes(q)).slice(0,limit).map(value=>({value,field}));
  }

  function closeSuggestionBox(box,input){
    if(!box)return;box.innerHTML='';box.classList.remove('show');
    if(input)input.setAttribute('aria-expanded','false');
  }

  function renderSuggestionBox(box,input,key,field,onPick,typed=''){
    if(!box||!input)return;
    const items=suggestionValues(key,field,typed,12);
    if(!items.length){closeSuggestionBox(box,input);return;}
    box.innerHTML=items.map((it,i)=>`<button type="button" class="suggestion-item${i===0?' active':''}" data-index="${i}" data-value="${escapeHtml(it.value)}"><span>${escapeHtml(it.value)}</span><small>${escapeHtml(labelOf(it.field))}</small></button>`).join('');
    box.classList.add('show');input.setAttribute('aria-expanded','true');
    [...box.querySelectorAll('.suggestion-item')].forEach((btn,i)=>btn.addEventListener('mousedown',e=>{e.preventDefault();onPick(items[i]);closeSuggestionBox(box,input);}));
  }

  function wireAutocompleteKeyboard(input,box,onEnter){
    input.addEventListener('keydown',e=>{
      const items=[...box.querySelectorAll('.suggestion-item')];
      if((e.key==='ArrowDown'||e.key==='ArrowUp')&&items.length){
        e.preventDefault();let idx=items.findIndex(x=>x.classList.contains('active'));if(idx<0)idx=0;
        idx=e.key==='ArrowDown'?(idx+1)%items.length:(idx-1+items.length)%items.length;
        items.forEach(x=>x.classList.remove('active'));items[idx].classList.add('active');items[idx].scrollIntoView({block:'nearest'});return;
      }
      if(e.key==='Enter'&&items.length&&box.classList.contains('show')){
        const active=box.querySelector('.suggestion-item.active')||items[0];
        if(active){e.preventDefault();active.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));if(onEnter)onEnter();return;}
      }
      if(e.key==='Escape'){closeSuggestionBox(box,input);return;}
      if(e.key==='Enter'&&onEnter)onEnter();
    });
  }

  function populateSearchFields(){
    const key=searchLayer.value;searchField.innerHTML='';
    const all=document.createElement('option');all.value='*';all.textContent='Toutes les variables';searchField.appendChild(all);
    getFields(key).forEach(f=>{const o=document.createElement('option');o.value=f;o.textContent=labelOf(f);searchField.appendChild(o);});
    const preferred=(layerDefs[key].nameFields||[])[0];searchField.value=preferred&&getFields(key).includes(preferred)?preferred:'*';
    searchInput.value='';closeSuggestionBox(searchSuggestions,searchInput);updateSearchHint();
  }

  function updateSearchHint(){
    const key=searchLayer.value,field=searchField.value;
    const range=field&&field!=='*'?numericRangeHint(key,field):'';
    el('searchHint').textContent=field==='*'?'La recherche parcourt toutes les variables. Commencez à saisir pour voir des propositions.':`Propositions pour « ${labelOf(field)} »${range?' — '+range:''}.`;
  }

  function showSearchSuggestions(){
    const key=searchLayer.value,field=searchField.value||'*';
    renderSuggestionBox(searchSuggestions,searchInput,key,field,it=>{searchInput.value=it.value;},searchInput.value);
  }

  function populateSearchLayer(){
    searchLayer.innerHTML='';
    Object.entries(layerDefs).forEach(([key,d])=>{
      const o=document.createElement('option');o.value=key;o.textContent=d.label;searchLayer.appendChild(o);
    });
    searchLayer.value='centers';
    populateSearchFields();
  }

  function createCriterion(key){
    const cfg=queryUi[key], containerEl=el(cfg.criteria);
    const row=document.createElement('div');
    row.className='criterion';
    row.dataset.layer=key;
    row.innerHTML=`<button class="remove-criterion" title="Supprimer"><i class="fas fa-times"></i></button>
      <div class="criterion-grid"><select class="field-select"></select><select class="operator-select"></select></div>
      <div class="criterion-value-wrap">
        <div class="criterion-autocomplete"><input class="value-one" placeholder="Choisir ou saisir une valeur" autocomplete="off"><div class="suggestion-box criterion-suggestions-one" role="listbox"></div></div>
        <div class="criterion-autocomplete value-two-wrap" style="display:none"><input class="value-two" placeholder="Valeur max" autocomplete="off"><div class="suggestion-box criterion-suggestions-two" role="listbox"></div></div>
      </div>
      <div class="criterion-hint micro-copy"></div>`;
    const fieldSel=row.querySelector('.field-select');
    getFields(key).forEach(f=>{const o=document.createElement('option');o.value=f;o.textContent=labelOf(f);fieldSel.appendChild(o);});

    const valueOne=row.querySelector('.value-one'),valueTwo=row.querySelector('.value-two');
    const suggOne=row.querySelector('.criterion-suggestions-one'),suggTwo=row.querySelector('.criterion-suggestions-two');
    const valueTwoWrap=row.querySelector('.value-two-wrap'),hint=row.querySelector('.criterion-hint');

    function updateCriterionHint(){
      const field=fieldSel.value,range=numericRangeHint(key,field);
      const vals=distinctValues(key,field,5000);
      hint.innerHTML=isNumeric(key,field)
        ? `<i class="fas fa-lightbulb"></i> ${escapeHtml(range||'Saisissez une valeur numérique.')}`
        : `<i class="fas fa-lightbulb"></i> ${fmt(vals.length)} valeur${vals.length>1?'s':''} disponible${vals.length>1?'s':''}. Cliquez dans la zone de saisie pour voir les propositions.`;
    }
    function showCriterionSuggestions(input,box){
      renderSuggestionBox(box,input,key,fieldSel.value,it=>{input.value=it.value;},input.value);
    }
    function updateOps(){
      const numeric=isNumeric(key,fieldSel.value), op=row.querySelector('.operator-select');
      op.innerHTML='';
      const opts=numeric
        ? [['=','='],['!=','≠'],['>','>'],['>=','≥'],['<','<'],['<=','≤'],['between','Entre']]
        : [['contains','Contient'],['=','Égal à'],['!=','Différent de'],['starts','Commence par']];
      opts.forEach(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;op.appendChild(o);});
      valueOne.value='';valueTwo.value='';closeSuggestionBox(suggOne,valueOne);closeSuggestionBox(suggTwo,valueTwo);
      updateBetween();updateCriterionHint();
    }
    function updateBetween(){
      const yes=row.querySelector('.operator-select').value==='between';
      row.classList.toggle('between',yes);
      valueTwoWrap.style.display=yes?'block':'none';
      if(!yes){valueTwo.value='';closeSuggestionBox(suggTwo,valueTwo);}
    }
    fieldSel.addEventListener('change',updateOps);
    row.querySelector('.operator-select').addEventListener('change',updateBetween);
    [valueOne,valueTwo].forEach((input,idx)=>{
      const box=idx===0?suggOne:suggTwo;
      input.addEventListener('focus',()=>showCriterionSuggestions(input,box));
      input.addEventListener('input',()=>showCriterionSuggestions(input,box));
      wireAutocompleteKeyboard(input,box,null);
      input.addEventListener('blur',()=>setTimeout(()=>closeSuggestionBox(box,input),120));
    });
    row.querySelector('.remove-criterion').addEventListener('click',()=>{
      row.remove();
      if(!containerEl.children.length) createCriterion(key);
    });
    containerEl.appendChild(row);
    updateOps();
  }

  function criterionMatches(feature,row,key){
    const field=row.querySelector('.field-select').value;
    const op=row.querySelector('.operator-select').value;
    const raw=feature.get(field);
    const v1=row.querySelector('.value-one').value;
    const v2=row.querySelector('.value-two').value;
    if(isNumeric(key,field)){
      const a=parseNumber(raw), b=parseNumber(v1), c=parseNumber(v2);
      if(!Number.isFinite(a) || !Number.isFinite(b)) return false;
      if(op==='=')return a===b;
      if(op==='!=')return a!==b;
      if(op==='>')return a>b;
      if(op==='>=')return a>=b;
      if(op==='<')return a<b;
      if(op==='<=')return a<=b;
      if(op==='between')return Number.isFinite(c)&&a>=Math.min(b,c)&&a<=Math.max(b,c);
      return false;
    }
    const a=normalize(raw), b=normalize(v1);
    if(!b) return false;
    if(op==='contains') return a.includes(b);
    if(op==='=') return a===b;
    if(op==='!=') return a!==b;
    if(op==='starts') return a.startsWith(b);
    return false;
  }

  function validCriteriaRows(key){
    return [...el(queryUi[key].criteria).querySelectorAll('.criterion')]
      .filter(r=>r.querySelector('.value-one').value.trim()!=='');
  }

  function queryOneLayer(key){
    if(!el(queryUi[key].enabled).checked) return [];
    const rows=validCriteriaRows(key);
    if(!rows.length) return [];
    const logic=el(queryUi[key].logic).value;
    return layerDefs[key].source.getFeatures().filter(f=>logic==='AND' ? rows.every(r=>criterionMatches(f,r,key)) : rows.some(r=>criterionMatches(f,r,key)));
  }

  function distinctRegionNames(features){
    return [...new Set((features||[]).map(f=>String(f.get('REG_2012')||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr',{sensitivity:'base'}));
  }

  function filterCentersByRegions(centers,regions){
    const selected=new Set(distinctRegionNames(regions).map(normalize));
    if(!selected.size) return [];
    return (centers||[]).filter(f=>selected.has(normalize(f.get('REG_SAN'))));
  }

  function relationalQueryResults(){
    const centersActive=el(queryUi.centers.enabled).checked;
    const regionsActive=el(queryUi.regions.enabled).checked;
    const centerRows=validCriteriaRows('centers');
    const regionRows=validCriteriaRows('regions');
    const regionFilterActive=regionsActive&&regionRows.length>0;
    const centerFilterActive=centersActive&&centerRows.length>0;

    const regions=regionFilterActive?queryOneLayer('regions'):[];
    let centers=[];
    if(centersActive){
      if(centerFilterActive) centers=queryOneLayer('centers');
      else if(regionFilterActive) centers=layerDefs.centers.source.getFeatures().slice();
    }
    if(regionFilterActive&&centersActive) centers=filterCentersByRegions(centers,regions);

    return {
      results:{centers,regions},
      relationApplied:Boolean(regionFilterActive&&centersActive),
      regionFilterActive,centerFilterActive,
      selectedRegionNames:distinctRegionNames(regions)
    };
  }

  function describeCriterion(row,key){
    const field=row.querySelector('.field-select').value;
    const opSel=row.querySelector('.operator-select');
    const op=opSel.options[opSel.selectedIndex] ? opSel.options[opSel.selectedIndex].text : opSel.value;
    const v1=row.querySelector('.value-one').value.trim();
    const v2=row.querySelector('.value-two').value.trim();
    return `${labelOf(field)} ${op} ${v1}${opSel.value==='between'&&v2?` et ${v2}`:''}`;
  }

  function buildQueryDescription(){
    const parts=[];
    ['centers','regions'].forEach(key=>{
      if(!el(queryUi[key].enabled).checked) return;
      const rows=validCriteriaRows(key);
      if(!rows.length) return;
      const logic=el(queryUi[key].logic).value==='AND'?' ET ':' OU ';
      parts.push(`${layerDefs[key].label} : ${rows.map(r=>describeCriterion(r,key)).join(logic)}`);
    });
    return parts.join(' | ');
  }

  function executeQuery(){
    const centersActive=el(queryUi.centers.enabled).checked;
    const regionsActive=el(queryUi.regions.enabled).checked;
    const centerRows=validCriteriaRows('centers');
    const regionRows=validCriteriaRows('regions');
    const anyValid=(centersActive&&centerRows.length)||(regionsActive&&regionRows.length);
    if(!anyValid){
      renderResults({centers:[],regions:[]},'Saisissez au moins un critère dans une couche activée.');
      showStats({centers:layerDefs.centers.source.getFeatures(),regions:layerDefs.regions.source.getFeatures()},'Données complètes');
      clearSelection(false);
      setExportEnabled(false);
      return;
    }
    const rel=relationalQueryResults();
    const results=rel.results;
    let description=buildQueryDescription()||'Requête attributaire';
    if(rel.relationApplied){
      const names=rel.selectedRegionNames.join(', ')||'aucune région correspondante';
      description+=` | RELATION SPATIALE : centres limités aux régions sanitaires sélectionnées (${names})`;
    }
    lastOperation={
      type:rel.relationApplied?'Requête relationnelle spatiale':'Requête simultanée',
      description,date:nowLabel(),results,relationApplied:rel.relationApplied,
      selectedRegionNames:rel.selectedRegionNames
    };
    const status=rel.relationApplied
      ? `Requête liée : ${results.centers.length} centre${results.centers.length>1?'s':''} dans ${rel.selectedRegionNames.length} région${rel.selectedRegionNames.length>1?'s':''} sanitaire${rel.selectedRegionNames.length>1?'s':''}`
      : `Requête : ${totalResults(results)} résultat${totalResults(results)>1?'s':''}`;
    applySelection(results,status);
  }

  function executeSearch(){
    const key=searchLayer.value,field=searchField.value||'*';
    const q=normalize(searchInput.value);
    if(!q){renderResults({centers:[],regions:[]},'Saisissez ou choisissez une proposition.');showSearchSuggestions();return;}
    const fields=field==='*'?getFields(key):[field];
    const found=layerDefs[key].source.getFeatures().filter(f=>fields.some(k=>normalize(f.get(k)).includes(q)));
    const results={centers:[],regions:[]};results[key]=found;
    const fieldLabel=field==='*'?'Toutes les variables':labelOf(field);
    lastOperation={type:'Recherche',description:`${layerDefs[key].label} — ${fieldLabel} : « ${searchInput.value.trim()} »`,date:nowLabel(),results};
    closeSuggestionBox(searchSuggestions,searchInput);
    applySelection(results,`Recherche : ${found.length} résultat${found.length>1?'s':''}`);
  }

  function clearSelection(resetOperation=true){
    queryHighlightSource.clear();
    currentResults={centers:[],regions:[]};
    if(resetOperation) lastOperation=null;
    el('selectionStatus').classList.remove('active');
    el('selectionStatus').innerHTML='<span class="status-dot"></span> Aucune sélection';
    setExportEnabled(false);
  }

  function resultExtent(results=currentResults){
    const extent=ol.extent.createEmpty();
    let has=false;
    ['centers','regions'].forEach(key=>(results[key]||[]).forEach(f=>{
      const g=f.getGeometry();if(g){ol.extent.extend(extent,g.getExtent());has=true;}
    }));
    return has?extent:null;
  }

  function fitResults(results=currentResults,animate=true){
    const extent=resultExtent(results);if(!extent)return;
    const mixed=(results.centers||[]).length&&(results.regions||[]).length;
    const maxZoom=mixed||((results.regions||[]).length)?10:14;
    map.getView().fit(extent,{padding:[90,90,90,90],maxZoom,duration:animate?650:0});
  }

  function applySelection(results,status){
    queryHighlightSource.clear();
    currentResults={centers:[...(results.centers||[])],regions:[...(results.regions||[])]};
    ['regions','centers'].forEach(key=>queryHighlightSource.addFeatures(currentResults[key].map(cloneForHighlight)));
    if(totalResults()){
      fitResults(currentResults,true);
      el('selectionStatus').classList.add('active');
      el('selectionStatus').innerHTML=`<span class="status-dot"></span> ${escapeHtml(status)}`;
    }else{
      el('selectionStatus').classList.remove('active');
      el('selectionStatus').innerHTML='<span class="status-dot"></span> Aucun résultat';
    }
    renderResults(currentResults);
    showStats(currentResults,'Résultats sélectionnés');
    setExportEnabled(totalResults()>0);
  }

  function featureTitle(f,key){
    for(const k of layerDefs[key].nameFields){
      const v=f.get(k);if(v!==null&&v!==undefined&&String(v).trim()!=='') return String(v);
    }
    return layerDefs[key].label;
  }
  function featureSub(f,key){
    if(key==='centers') return [f.get('Type'),f.get('REG_SAN')?`Région sanitaire : ${f.get('REG_SAN')}`:f.get('Region'),f.get('Propriete')].filter(Boolean).join(' • ');
    return [f.get('DISTRICT'),f.get('ZONE_HUM')].filter(Boolean).join(' • ');
  }

  function renderResults(results,message){
    const total=totalResults(results);
    resultCount.textContent=total;
    resultsList.innerHTML='';
    if(!total){
      resultsList.innerHTML=`<div class="empty-state"><i class="fas fa-info-circle"></i><span>${escapeHtml(message||'Aucun résultat.')}</span></div>`;
      return;
    }
    ['centers','regions'].forEach(key=>{
      const features=results[key]||[];
      if(!features.length)return;
      const group=document.createElement('div');group.className='result-group-title';
      group.innerHTML=`<i class="${layerDefs[key].icon}"></i><span>${layerDefs[key].shortLabel}</span><b>${features.length}</b>`;
      resultsList.appendChild(group);
      features.slice(0,40).forEach(f=>{
        const item=document.createElement('div');item.className='result-item';
        item.innerHTML=`<div class="result-title">${escapeHtml(featureTitle(f,key))}</div><div class="result-sub">${escapeHtml(featureSub(f,key)||'Entité cartographique')}</div>`;
        item.addEventListener('click',()=>focusFeature(f,key));
        resultsList.appendChild(item);
      });
      if(features.length>40){
        const more=document.createElement('div');more.className='more-results';more.textContent=`+ ${features.length-40} autres ${layerDefs[key].shortLabel.toLowerCase()} sur la carte`;resultsList.appendChild(more);
      }
    });
  }

  function focusFeature(feature,key){
    const ex=feature.getGeometry().getExtent();
    map.getView().fit(ex,{padding:[130,130,130,130],maxZoom:key==='centers'?16:12,duration:500});
    const coord=ol.extent.getCenter(ex);showFeaturePopup(feature,key,coord);
  }

  function showFeaturePopup(f,key,coord){
    const fields=key==='centers'
      ? ['Nom de str','REG_SAN','DIST_SAN','Type','Propriete','nbre infir','nbre medec','nbre sage','incidence','incidenc_1','incidenc_2']
      : ['REG_2012','DISTRICT','CL_REGION_','ZONE_HUM','pop','SHAPE_AREA'];
    let html=`<div style="min-width:235px"><div style="font-weight:900;color:#9d2b3a;margin-bottom:7px">${escapeHtml(featureTitle(f,key))}</div><table style="width:100%;border-collapse:collapse">`;
    fields.forEach(k=>{
      const v=f.get(k);if(v!==null&&v!==undefined&&String(v)!=='') html+=`<tr><td style="padding:3px 5px;color:#80676c;font-weight:700">${escapeHtml(labelOf(k))}</td><td style="padding:3px 5px;text-align:right">${escapeHtml(v)}</td></tr>`;
    });
    html+='</table></div>';
    content.innerHTML=html;container.style.display='block';overlayPopup.setPosition(coord);
  }

  function sumField(features,field){return features.reduce((s,f)=>{const n=parseNumber(f.get(field));return s+(Number.isFinite(n)?n:0);},0);}
  function avgField(features,field){const a=features.map(f=>parseNumber(f.get(field))).filter(Number.isFinite);return a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN;}
  function statRows(results=currentResults){
    const c=results.centers||[], r=results.regions||[];
    return [
      ['Centres de santé sélectionnés',c.length],
      ['Régions sanitaires distinctes',distinctRegionNames(r).length],
      ['Infirmiers (somme)',sumField(c,'nbre infir')],
      ['Médecins (somme)',sumField(c,'nbre medec')],
      ['Sages-femmes (somme)',sumField(c,'nbre sage')],
      ['Incidence paludisme moyenne',avgField(c,'incidence')],
      ['Incidence VIH/SIDA moyenne',avgField(c,'incidenc_1')],
      ['Incidence choléra moyenne',avgField(c,'incidenc_2')],
      ['Population des régions sélectionnées',sumField(r,'pop')],
      ['Superficie cumulée des régions',sumField(r,'SHAPE_AREA')],
      ['Districts distincts',new Set(r.map(f=>f.get('DISTRICT')).filter(Boolean)).size]
    ];
  }

  function showStats(results,label){
    const c=results.centers||[], r=results.regions||[];
    statsSummary.innerHTML='';
    const cards=[
      ['Centres',fmt(c.length)],['Régions',fmt(distinctRegionNames(r).length)],
      ['Infirmiers',fmt(sumField(c,'nbre infir'))],['Médecins',fmt(sumField(c,'nbre medec'))],
      ['Sages-femmes',fmt(sumField(c,'nbre sage'))],['Population',fmt(sumField(r,'pop'))]
    ];
    const title=document.createElement('div');title.className='stats-context';title.textContent=label||'Statistiques';statsSummary.appendChild(title);
    cards.forEach(([l,v],i)=>{
      const d=document.createElement('div');d.className='stat-card'+(i<2?' emphasis':'');
      d.innerHTML=`<span>${escapeHtml(l)}</span><strong>${escapeHtml(v)}</strong>`;statsSummary.appendChild(d);
    });
    showDistribution(results);
  }

  function distributionHtml(key,features){
    if(!features.length)return '';
    const field=layerDefs[key].chartField, counts={};
    features.forEach(f=>{const v=f.get(field)||'Non renseigné';counts[v]=(counts[v]||0)+1;});
    const entries=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,6), max=entries.length?entries[0][1]:1;
    return `<div class="chart-title">${escapeHtml(layerDefs[key].shortLabel)} — répartition par ${escapeHtml(labelOf(field))}</div>`+
      entries.map(([k,v])=>`<div class="bar-row"><div class="bar-label" title="${escapeHtml(k)}">${escapeHtml(k)}</div><div class="bar-track"><div class="bar-fill" style="width:${(v/max*100).toFixed(1)}%"></div></div><div class="bar-value">${v}</div></div>`).join('');
  }

  function showDistribution(results){
    statsChart.innerHTML=distributionHtml('centers',results.centers||[])+distributionHtml('regions',results.regions||[]);
  }

  function resetCriteria(){
    ['centers','regions'].forEach(key=>{
      el(queryUi[key].criteria).innerHTML='';createCriterion(key);el(queryUi[key].enabled).checked=true;
    });
    clearSelection(true);
    showStats({centers:layerDefs.centers.source.getFeatures(),regions:layerDefs.regions.source.getFeatures()},'Données complètes');
    renderResults({centers:[],regions:[]},'Prêt pour une nouvelle requête simultanée.');
  }

  function buildLayerControls(){
    const ctrl=el('layerControls');ctrl.innerHTML='';
    const defs=[['Fond OpenStreetMap',lyr_OSMStandard_0,'fas fa-map'],['Région sanitaire',lyr_Rgionsanitaire_1,'fas fa-draw-polygon'],['Centre de santé',lyr_Centredesant_2,'fas fa-hospital']];
    defs.forEach(([name,layer,icon])=>{
      const card=document.createElement('div');card.className='layer-card';
      card.innerHTML=`<div class="layer-line"><input type="checkbox" ${layer.getVisible()?'checked':''}><div class="layer-icon"><i class="${icon}"></i></div><div class="layer-name">${name}</div></div><div class="opacity-row"><span>Opacité</span><input type="range" min="0" max="100" value="${Math.round(layer.getOpacity()*100)}"><b>${Math.round(layer.getOpacity()*100)}%</b></div>`;
      const check=card.querySelector('input[type=checkbox]'),range=card.querySelector('input[type=range]'),val=card.querySelector('.opacity-row b');
      check.addEventListener('change',()=>layer.setVisible(check.checked));
      range.addEventListener('input',()=>{layer.setOpacity(Number(range.value)/100);val.textContent=range.value+'%';});
      ctrl.appendChild(card);
    });
  }

  function setExportEnabled(enabled){
    ['exportPdf','exportExcel'].forEach(id=>{const b=el(id);if(b)b.disabled=!enabled||exportBusy;});
    const note=el('exportNote');
    if(note) note.innerHTML=enabled?'<strong>PDF :</strong> carte + synthèse + tableaux paginés. <strong>Excel :</strong> synthèse + carte + statistiques + listes détaillées.':'Lancez une requête ou une recherche pour activer les exports.';
  }

  function setExportBusy(busy,label){
    exportBusy=busy;
    ['exportPdf','exportExcel'].forEach(id=>{const b=el(id);if(b)b.disabled=busy||totalResults()===0;});
    const status=el('exportStatus');
    if(status){status.classList.toggle('show',busy);status.innerHTML=busy?`<i class="fas fa-circle-notch fa-spin"></i> ${escapeHtml(label||'Préparation de l’export…')}`:'';}
  }

  function featureExtent(features){
    const ext=[Infinity,Infinity,-Infinity,-Infinity];
    (features||[]).forEach(f=>{
      const g=f&&f.getGeometry?f.getGeometry():null;if(!g)return;
      const e=g.getExtent();
      if(!e||e.length<4)return;
      ext[0]=Math.min(ext[0],e[0]);ext[1]=Math.min(ext[1],e[1]);ext[2]=Math.max(ext[2],e[2]);ext[3]=Math.max(ext[3],e[3]);
    });
    return ext.every(Number.isFinite)?ext:null;
  }

  function extentIntersects(a,b){return !!a&&!!b&&a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];}

  function relatedRegionsForExport(){
    const selected=currentResults.regions||[];
    if(selected.length)return selected;
    const names=new Set((currentResults.centers||[]).map(f=>norm(f.get('REG_SAN'))).filter(Boolean));
    if(!names.size)return [];
    return layerDefs.regions.source.getFeatures().filter(f=>names.has(norm(f.get('REG_2012'))));
  }

  function paddedExtent(ext){
    if(!ext)return initialExtent?initialExtent.slice():[-950000,450000,-350000,1200000];
    let [minx,miny,maxx,maxy]=ext;let w=maxx-minx,h=maxy-miny;
    if(w<1000){minx-=25000;maxx+=25000;w=maxx-minx;}
    if(h<1000){miny-=25000;maxy+=25000;h=maxy-miny;}
    const pad=Math.max(w,h)*0.10;
    return [minx-pad,miny-pad,maxx+pad,maxy+pad];
  }

  function drawExportGeometry(ctx,geom,toPx,fill,stroke,lineWidth){
    if(!geom)return;
    const type=geom.getType();
    const polygonPath=(rings)=>{
      ctx.beginPath();
      rings.forEach(ring=>ring.forEach((c,i)=>{const p=toPx(c);if(i===0)ctx.moveTo(p[0],p[1]);else ctx.lineTo(p[0],p[1]);}));
      ctx.closePath();
      if(fill){ctx.fillStyle=fill;ctx.fill('evenodd');}
      if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth||1;ctx.stroke();}
    };
    if(type==='Polygon')polygonPath(geom.getCoordinates());
    else if(type==='MultiPolygon')geom.getCoordinates().forEach(poly=>polygonPath(poly));
    else if(type==='LineString'){
      const cs=geom.getCoordinates();ctx.beginPath();cs.forEach((c,i)=>{const p=toPx(c);i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]);});ctx.strokeStyle=stroke||'#999';ctx.lineWidth=lineWidth||1;ctx.stroke();
    }else if(type==='MultiLineString')geom.getCoordinates().forEach(line=>{
      ctx.beginPath();line.forEach((c,i)=>{const p=toPx(c);i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]);});ctx.strokeStyle=stroke||'#999';ctx.lineWidth=lineWidth||1;ctx.stroke();
    });
  }

  function exportLabelCoordinate(feature){
    const g=feature&&feature.getGeometry?feature.getGeometry():null;if(!g)return null;
    const type=g.getType();
    if(type==='Point')return g.getCoordinates();
    if(type==='Polygon'&&g.getInteriorPoint)return g.getInteriorPoint().getCoordinates();
    if(type==='MultiPolygon'&&g.getInteriorPoints){const pts=g.getInteriorPoints().getCoordinates();return pts&&pts.length?pts[0]:null;}
    const e=g.getExtent();return e?[(e[0]+e[2])/2,(e[1]+e[3])/2]:null;
  }

  function buildExportMapCanvas(){
    const canvas=document.createElement('canvas');canvas.width=1400;canvas.height=820;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);

    // En-tête
    ctx.fillStyle='#d92d3a';ctx.fillRect(0,0,canvas.width,62);
    ctx.fillStyle='#ffffff';ctx.font='bold 24px Arial, sans-serif';ctx.fillText("WEBMAP OFFRE DE SOIN EN COTE D'IVOIRE",34,39);
    ctx.font='13px Arial, sans-serif';ctx.fillText('Carte des entités sélectionnées - export autonome',900,38);

    const selectedRegions=relatedRegionsForExport();
    const selectedCenters=currentResults.centers||[];
    const selectionFeatures=[...selectedRegions,...selectedCenters];
    const extent=paddedExtent(featureExtent(selectionFeatures));

    const mapBox={x:28,y:88,w:1080,h:690};
    const legendBox={x:1132,y:96,w:240,h:300};
    ctx.fillStyle='#fffafb';ctx.fillRect(mapBox.x,mapBox.y,mapBox.w,mapBox.h);
    ctx.strokeStyle='#e5c9cd';ctx.lineWidth=1.5;ctx.strokeRect(mapBox.x,mapBox.y,mapBox.w,mapBox.h);

    const ew=Math.max(1,extent[2]-extent[0]),eh=Math.max(1,extent[3]-extent[1]);
    const scale=Math.min((mapBox.w-28)/ew,(mapBox.h-28)/eh);
    const ox=mapBox.x+(mapBox.w-ew*scale)/2;
    const oy=mapBox.y+(mapBox.h-eh*scale)/2;
    const toPx=(c)=>[ox+(c[0]-extent[0])*scale,oy+(extent[3]-c[1])*scale];

    // Contexte : limites sanitaires visibles dans l'emprise
    const allRegions=layerDefs.regions.source.getFeatures();
    const selectedSet=new Set(selectedRegions);
    allRegions.forEach(f=>{
      const g=f.getGeometry();if(!g||!extentIntersects(g.getExtent(),extent))return;
      drawExportGeometry(ctx,g,toPx,selectedSet.has(f)?'#ffe96a':'#fff1f3',selectedSet.has(f)?'#b71329':'#d7aab1',selectedSet.has(f)?3.2:1.1);
    });

    // Centres sélectionnés
    selectedCenters.forEach(f=>{
      const g=f.getGeometry();if(!g||g.getType()!=='Point')return;
      const p=toPx(g.getCoordinates());
      ctx.beginPath();ctx.arc(p[0],p[1],6.5,0,Math.PI*2);ctx.fillStyle='#ffdf24';ctx.fill();ctx.strokeStyle='#8d1021';ctx.lineWidth=2.2;ctx.stroke();
    });

    // Libellés des régions sélectionnées
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 12px Arial, sans-serif';
    selectedRegions.slice(0,18).forEach(f=>{
      const c=exportLabelCoordinate(f);if(!c)return;const p=toPx(c);const txt=String(f.get('REG_2012')||'').trim();if(!txt)return;
      ctx.lineWidth=3;ctx.strokeStyle='rgba(255,255,255,.95)';ctx.strokeText(txt,p[0],p[1]);ctx.fillStyle='#7b1320';ctx.fillText(txt,p[0],p[1]);
    });
    ctx.textAlign='left';ctx.textBaseline='alphabetic';

    // Légende
    ctx.fillStyle='#ffffff';ctx.strokeStyle='#e5c9cd';ctx.lineWidth=1.2;ctx.fillRect(legendBox.x,legendBox.y,legendBox.w,legendBox.h);ctx.strokeRect(legendBox.x,legendBox.y,legendBox.w,legendBox.h);
    ctx.fillStyle='#8e2634';ctx.font='bold 17px Arial, sans-serif';ctx.fillText('LÉGENDE',legendBox.x+18,legendBox.y+30);
    let yy=legendBox.y+66;
    ctx.fillStyle='#ffe96a';ctx.strokeStyle='#b71329';ctx.lineWidth=2.5;ctx.fillRect(legendBox.x+18,yy-14,28,18);ctx.strokeRect(legendBox.x+18,yy-14,28,18);
    ctx.fillStyle='#3a2b2e';ctx.font='13px Arial, sans-serif';ctx.fillText('Région sanitaire retenue',legendBox.x+58,yy);yy+=38;
    ctx.beginPath();ctx.arc(legendBox.x+32,yy-5,6.5,0,Math.PI*2);ctx.fillStyle='#ffdf24';ctx.fill();ctx.strokeStyle='#8d1021';ctx.lineWidth=2.2;ctx.stroke();ctx.fillStyle='#3a2b2e';ctx.fillText('Centre de santé retenu',legendBox.x+58,yy);yy+=40;
    ctx.fillStyle='#fff1f3';ctx.strokeStyle='#d7aab1';ctx.lineWidth=1.2;ctx.fillRect(legendBox.x+18,yy-14,28,18);ctx.strokeRect(legendBox.x+18,yy-14,28,18);ctx.fillStyle='#3a2b2e';ctx.fillText('Autre région (contexte)',legendBox.x+58,yy);yy+=46;

    ctx.fillStyle='#8e2634';ctx.font='bold 14px Arial, sans-serif';ctx.fillText('SÉLECTION',legendBox.x+18,yy);yy+=26;
    ctx.fillStyle='#3a2b2e';ctx.font='13px Arial, sans-serif';ctx.fillText(`${selectedCenters.length} centre(s) de santé`,legendBox.x+18,yy);yy+=23;
    ctx.fillText(`${selectedRegions.length} région(s) sanitaire(s)`,legendBox.x+18,yy);yy+=23;
    if(lastOperation&&lastOperation.relationApplied){ctx.fillStyle='#7b1320';ctx.font='bold 12px Arial, sans-serif';ctx.fillText('Filtrage spatial actif',legendBox.x+18,yy);}

    ctx.fillStyle='#6e5a5e';ctx.font='11px Arial, sans-serif';ctx.fillText(`Généré le ${nowLabel()} - carte vectorielle autonome`,34,806);
    return canvas;
  }

  function captureMapJpeg(){
    const canvas=buildExportMapCanvas();
    const dataUrl=canvas.toDataURL('image/jpeg',0.92);
    return {dataUrl,width:canvas.width,height:canvas.height,basemap:false,vectorExport:true};
  }

  function dataUrlBytes(dataUrl){
    const base64=dataUrl.split(',')[1]||'';const bin=atob(base64);const out=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out;
  }
  function downloadBlob(blob,filename){
    if(!blob||!blob.size)throw new Error('Fichier exporté vide');
    if(window.navigator&&typeof window.navigator.msSaveOrOpenBlob==='function'){
      window.navigator.msSaveOrOpenBlob(blob,filename);return;
    }
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=filename;a.style.display='none';a.rel='noopener';
    document.body.appendChild(a);
    if(typeof a.download==='string')a.click();
    else window.open(url,'_blank','noopener');
    a.remove();
    // Délai long : certains navigateurs n'ont pas encore commencé à lire le Blob juste après le clic.
    window.setTimeout(()=>URL.revokeObjectURL(url),30000);
  }

  /* -------------------------- PDF natif -------------------------- */
  function latin1Bytes(str){
    const repl={'€':128,'‚':130,'ƒ':131,'„':132,'…':133,'†':134,'‡':135,'ˆ':136,'‰':137,'Š':138,'‹':139,'Œ':140,'Ž':142,'‘':145,'’':146,'“':147,'”':148,'•':149,'–':150,'—':151,'˜':152,'™':153,'š':154,'›':155,'œ':156,'ž':158,'Ÿ':159};
    const arr=[];for(const ch of String(str)){const c=ch.charCodeAt(0);if(c<=255)arr.push(c);else if(repl[ch]!=null)arr.push(repl[ch]);else arr.push(63);}return new Uint8Array(arr);
  }
  function concatBytes(parts){let len=0;parts.forEach(p=>len+=p.length);const out=new Uint8Array(len);let off=0;parts.forEach(p=>{out.set(p,off);off+=p.length;});return out;}
  function asciiBytes(s){return new TextEncoder().encode(s);}
  function pdfEsc(s){return String(s==null?'':s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)').replace(/[\r\n]+/g,' ');}
  function truncateText(s,n){s=String(s==null?'':s);return s.length>n?s.slice(0,Math.max(1,n-1))+'…':s;}
  function pdfText(cmds,x,y,size,text,bold=false,color=[0.18,0.12,0.14]){
    cmds.push(`${color[0]} ${color[1]} ${color[2]} rg BT /${bold?'F2':'F1'} ${size} Tf 1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm (${pdfEsc(text)}) Tj ET`);
  }
  function pdfRect(cmds,x,y,w,h,fill,stroke){
    if(fill)cmds.push(`${fill[0]} ${fill[1]} ${fill[2]} rg`);if(stroke)cmds.push(`${stroke[0]} ${stroke[1]} ${stroke[2]} RG`);
    cmds.push(`${x} ${y} ${w} ${h} re ${fill&&stroke?'B':fill?'f':'S'}`);
  }
  function wrapApprox(text,maxChars){
    const words=String(text||'').split(/\s+/), lines=[];let line='';
    words.forEach(w=>{const test=line?line+' '+w:w;if(test.length>maxChars&&line){lines.push(line);line=w;}else line=test;});if(line)lines.push(line);return lines.length?lines:[''];
  }
  function buildPdfPages(mapInfo){
    const pages=[];
    const stats=statRows(currentResults);
    const op=lastOperation||{type:'Sélection cartographique',description:'Entités sélectionnées',date:nowLabel(),relationApplied:false,selectedRegionNames:[]};
    const selectedNames=(op.selectedRegionNames&&op.selectedRegionNames.length)?op.selectedRegionNames:distinctRegionNames(currentResults.regions);
    const first=[];
    pdfRect(first,0,545,842,50,[0.86,0.17,0.24],null);
    pdfText(first,35,570,18,"WEBMAP OFFRE DE SOIN EN COTE D'IVOIRE",true,[1,1,1]);
    pdfText(first,35,551,9,`${op.type} — ${op.date}`,false,[1,1,1]);

    let dy=526;
    wrapApprox(op.description,112).slice(0,2).forEach(line=>{pdfText(first,35,dy,8.5,line,false);dy-=12;});
    const relationText=op.relationApplied
      ? `RELATION SPATIALE ACTIVE : ${currentResults.centers.length} centre(s) retenu(s) uniquement dans ${selectedNames.length} région(s) sanitaire(s) sélectionnée(s).`
      : 'Relation spatiale : non appliquée à cette opération.';
    pdfRect(first,35,474,772,30,op.relationApplied?[1.00,0.95,0.78]:[0.97,0.95,0.95],[0.91,0.77,0.38]);
    pdfText(first,43,491,8.3,truncateText(relationText,145),true,op.relationApplied?[0.39,0.27,0.02]:[0.42,0.35,0.36]);
    if(selectedNames.length){
      const namesLine=`Région(s) sanitaire(s) : ${selectedNames.join(', ')}`;
      pdfText(first,43,479,7.2,truncateText(namesLine,170),false,[0.39,0.30,0.18]);
    }

    const imgW=772, imgH=Math.min(218,imgW*(mapInfo.height/mapInfo.width));
    const imgY=246;
    first.push(`q ${imgW.toFixed(1)} 0 0 ${imgH.toFixed(1)} 35 ${imgY.toFixed(1)} cm /Im1 Do Q`);
    pdfRect(first,35,imgY,imgW,imgH,null,[0.85,0.75,0.77]);
    pdfText(first,35,229,11,'Statistiques de synthèse',true,[0.48,0.10,0.15]);
    const statCols=[35,285,535];
    stats.slice(0,11).forEach((row,i)=>{
      const col=i%3,rowIdx=Math.floor(i/3),x=statCols[col],y=207-rowIdx*31;
      pdfText(first,x,y,6.7,truncateText(row[0],38),false,[0.43,0.34,0.36]);
      const decimals=row[0].includes('moyenne')?2:(row[0].includes('Superficie')?2:0);
      pdfText(first,x,y-12,11.5,Number.isFinite(row[1])?fmt(row[1],decimals):'—',true,[0.55,0.12,0.18]);
    });
    if(mapInfo.vectorExport) pdfText(first,35,49,6.6,'Carte exportée en mode vectoriel autonome : régions et centres sélectionnés, sans dépendance aux tuiles OpenStreetMap.',false,[0.45,0.35,0.37]);
    pdfText(first,35,28,6.5,'Export généré depuis la webmap interactive — Page 1',false,[0.45,0.35,0.37]);
    pages.push(first.join('\n'));

    function addTablePages(key){
      const features=currentResults[key]||[];if(!features.length)return;
      const isCenters=key==='centers';
      const headers=isCenters
        ? ['N°','Nom','Rég. san.','District san.','Type','Propriété','Inf.','Méd.','SF','Palu.','VIH','Chol.']
        : ['N°','Région sanitaire','District','Chef-lieu','Zone hum.','Population','Superficie'];
      const widths=isCenters?[26,150,90,95,92,60,38,38,38,55,45,45]:[28,175,120,125,110,105,109];
      const rows=features.map((f,i)=>isCenters
        ? [i+1,f.get('Nom de str'),f.get('REG_SAN'),f.get('DIST_SAN'),f.get('Type'),f.get('Propriete'),f.get('nbre infir'),f.get('nbre medec'),f.get('nbre sage'),f.get('incidence'),f.get('incidenc_1'),f.get('incidenc_2')]
        : [i+1,f.get('REG_2012'),f.get('DISTRICT'),f.get('CL_REGION_'),f.get('ZONE_HUM'),f.get('pop'),f.get('SHAPE_AREA')]);
      const perPage=23;
      for(let start=0;start<rows.length;start+=perPage){
        const cmds=[];const pageNo=pages.length+1;
        pdfRect(cmds,0,545,842,50,[0.86,0.17,0.24],null);
        pdfText(cmds,35,568,15,`${layerDefs[key].shortLabel} sélectionné${features.length>1?'s':''}`,true,[1,1,1]);
        const relLabel=isCenters&&op.relationApplied?` — filtrage spatial sur : ${selectedNames.join(', ')}`:'';
        pdfText(cmds,35,551,7.5,truncateText(`${start+1} à ${Math.min(start+perPage,rows.length)} sur ${rows.length}${relLabel}`,150),false,[1,1,1]);
        let x=35,y=516;pdfRect(cmds,35,y,772,22,[0.98,0.90,0.91],[0.80,0.68,0.70]);
        headers.forEach((h,idx)=>{pdfText(cmds,x+3,y+7,6.6,truncateText(h,19),true,[0.45,0.08,0.13]);x+=widths[idx];});
        y-=22;
        rows.slice(start,start+perPage).forEach((row,ri)=>{
          x=35;const fill=ri%2===0?[1,0.99,0.99]:[0.98,0.96,0.97];pdfRect(cmds,35,y,772,20,fill,[0.90,0.84,0.85]);
          row.forEach((v,idx)=>{const maxChars=Math.max(4,Math.floor(widths[idx]/5.2));pdfText(cmds,x+3,y+6,6.2,truncateText(v==null?'':v,maxChars),false);x+=widths[idx];});
          y-=20;
        });
        pdfText(cmds,35,24,6.5,`WEBMAP OFFRE DE SOIN EN COTE D'IVOIRE — ${nowLabel()} — Page ${pageNo}`,false,[0.48,0.39,0.41]);
        pages.push(cmds.join('\n'));
      }
    }
    addTablePages('centers');addTablePages('regions');
    return pages;
  }

  function buildPdfBlob(mapInfo){
    const jpeg=dataUrlBytes(mapInfo.dataUrl);
    const pageContents=buildPdfPages(mapInfo);
    const objectParts={};
    objectParts[1]=latin1Bytes('<< /Type /Catalog /Pages 2 0 R >>');
    const pageIds=[];for(let i=0;i<pageContents.length;i++)pageIds.push(6+i*2);
    objectParts[2]=latin1Bytes(`<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);
    objectParts[3]=latin1Bytes('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    objectParts[4]=latin1Bytes('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    objectParts[5]=concatBytes([latin1Bytes(`<< /Type /XObject /Subtype /Image /Width ${mapInfo.width} /Height ${mapInfo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),jpeg,latin1Bytes('\nendstream')]);
    pageContents.forEach((content,i)=>{
      const pageId=6+i*2, streamId=pageId+1, usesImage=i===0;
      objectParts[pageId]=latin1Bytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${usesImage?' /XObject << /Im1 5 0 R >>':''} >> /Contents ${streamId} 0 R >>`);
      const bytes=latin1Bytes(content);objectParts[streamId]=concatBytes([latin1Bytes(`<< /Length ${bytes.length} >>\nstream\n`),bytes,latin1Bytes('\nendstream')]);
    });
    const maxId=5+pageContents.length*2;const parts=[latin1Bytes('%PDF-1.4\n%âãÏÓ\n')],offsets=[0];let offset=parts[0].length;
    for(let id=1;id<=maxId;id++){
      offsets[id]=offset;const body=concatBytes([latin1Bytes(`${id} 0 obj\n`),objectParts[id],latin1Bytes('\nendobj\n')]);parts.push(body);offset+=body.length;
    }
    const xrefOffset=offset;let xref=`xref\n0 ${maxId+1}\n0000000000 65535 f \n`;
    for(let id=1;id<=maxId;id++)xref+=`${String(offsets[id]).padStart(10,'0')} 00000 n \n`;
    xref+=`trailer\n<< /Size ${maxId+1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    parts.push(latin1Bytes(xref));
    return new Blob([concatBytes(parts)],{type:'application/pdf'});
  }

  /* -------------------------- XLSX natif -------------------------- */
  const CRC_TABLE=(function(){const table=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;table[n]=c>>>0;}return table;})();
  function crc32(bytes){let c=0xffffffff;for(let i=0;i<bytes.length;i++)c=CRC_TABLE[(c^bytes[i])&0xff]^(c>>>8);return (c^0xffffffff)>>>0;}
  function le16(n){return new Uint8Array([n&255,(n>>>8)&255]);}
  function le32(n){return new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]);}
  function dosDateTime(d=new Date()){
    const time=((d.getHours()&31)<<11)|((d.getMinutes()&63)<<5)|((Math.floor(d.getSeconds()/2))&31);
    const date=(((d.getFullYear()-1980)&127)<<9)|(((d.getMonth()+1)&15)<<5)|(d.getDate()&31);
    return {time,date};
  }
  function zipStore(files){
    const locals=[],centrals=[];let offset=0;const dt=dosDateTime();
    files.forEach(file=>{
      const name=asciiBytes(file.name);const data=file.data instanceof Uint8Array?file.data:new TextEncoder().encode(file.data);const crc=crc32(data);
      const local=concatBytes([le32(0x04034b50),le16(20),le16(0),le16(0),le16(dt.time),le16(dt.date),le32(crc),le32(data.length),le32(data.length),le16(name.length),le16(0),name,data]);
      locals.push(local);
      const central=concatBytes([le32(0x02014b50),le16(20),le16(20),le16(0),le16(0),le16(dt.time),le16(dt.date),le32(crc),le32(data.length),le32(data.length),le16(name.length),le16(0),le16(0),le16(0),le16(0),le32(0),le32(offset),name]);
      centrals.push(central);offset+=local.length;
    });
    const centralSize=centrals.reduce((s,b)=>s+b.length,0),centralOffset=offset;
    const end=concatBytes([le32(0x06054b50),le16(0),le16(0),le16(files.length),le16(files.length),le32(centralSize),le32(centralOffset),le16(0)]);
    return concatBytes([...locals,...centrals,end]);
  }
  function colName(n){let s='';while(n>0){n--;s=String.fromCharCode(65+(n%26))+s;n=Math.floor(n/26);}return s;}
  function xlsxCell(ref,value,style=0){
    if(value===null||value===undefined||value==='')return `<c r="${ref}"${style?` s="${style}"`:''}/>`;
    const num=parseNumber(value);
    if(typeof value==='number'&&Number.isFinite(value))return `<c r="${ref}"${style?` s="${style}"`:''}><v>${value}</v></c>`;
    return `<c r="${ref}" t="inlineStr"${style?` s="${style}"`:''}><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
  }
  function worksheetXml(rows,widths,drawing=false,merges=[],options={}){
    let maxCols=1;const rowXml=rows.map((row,ri)=>{
      maxCols=Math.max(maxCols,row.length);const cells=row.map((item,ci)=>{
        const obj=(item&&typeof item==='object'&&!Array.isArray(item))?item:{v:item};return xlsxCell(`${colName(ci+1)}${ri+1}`,obj.v,obj.s||0);
      }).join('');return `<row r="${ri+1}"${ri===0?' ht="28" customHeight="1"':''}>${cells}</row>`;
    }).join('');
    const colXml=(widths||[]).map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('');
    const mergeXml=merges.length?`<mergeCells count="${merges.length}">${merges.map(m=>`<mergeCell ref="${m}"/>`).join('')}</mergeCells>`:'';
    const freeze=options.freezeRows?`<pane ySplit="${options.freezeRows}" topLeftCell="A${options.freezeRows+1}" activePane="bottomLeft" state="frozen"/>`:'';
    const autoFilter=options.autoFilter?`<autoFilter ref="${options.autoFilter}"/>`:'';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:${colName(maxCols)}${Math.max(1,rows.length)}"/><sheetViews><sheetView workbookViewId="0">${freeze}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${colXml}</cols><sheetData>${rowXml}</sheetData>${autoFilter}${mergeXml}${drawing?'<drawing r:id="rId1"/>':''}</worksheet>`;
  }

  function buildXlsxBlob(mapInfo){
    const op=lastOperation||{type:'Sélection cartographique',description:'Entités sélectionnées',date:nowLabel(),relationApplied:false,selectedRegionNames:[]};
    const stats=statRows(currentResults);
    const selectedNames=(op.selectedRegionNames&&op.selectedRegionNames.length)?op.selectedRegionNames:distinctRegionNames(currentResults.regions);
    const relationText=op.relationApplied
      ? `ACTIVE — centres limités spatialement aux régions : ${selectedNames.join(', ')}`
      : 'Non appliquée pour cette opération';

    const summaryRows=[
      [{v:"WEBMAP OFFRE DE SOIN EN COTE D'IVOIRE",s:2}],
      [{v:`${op.type} — ${op.date}`,s:3}],
      [{v:op.description,s:3}],
      [{v:`RELATION SPATIALE : ${relationText}`,s:3}],
      [{v:`RÉGIONS SANITAIRES SÉLECTIONNÉES : ${selectedNames.length?selectedNames.join(', '):'Aucune'}`,s:3}],
      [],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],
      [{v:'INDICATEURS CLÉS',s:1}],
      [{v:'Centres sélectionnés',s:1},{v:currentResults.centers.length},{v:'Régions sanitaires distinctes',s:1},{v:selectedNames.length}],
      [{v:'Infirmiers',s:1},{v:sumField(currentResults.centers,'nbre infir')},{v:'Médecins',s:1},{v:sumField(currentResults.centers,'nbre medec')}],
      [{v:'Sages-femmes',s:1},{v:sumField(currentResults.centers,'nbre sage')},{v:'Population régions',s:1},{v:sumField(currentResults.regions,'pop')}]
    ];
    if(mapInfo.vectorExport)summaryRows.push([{v:"Carte exportée en mode vectoriel autonome : limites sanitaires et entités sélectionnées intégrées sans dépendance aux tuiles OpenStreetMap.",s:3}]);

    const statsRows=[
      [{v:'STATISTIQUES DE SYNTHÈSE',s:2}],
      [{v:`Opération : ${op.type}`,s:3}],
      [{v:`Régions : ${selectedNames.length?selectedNames.join(', '):'Aucune'}`,s:3}],
      [],
      [{v:'Indicateur',s:1},{v:'Valeur',s:1}],
      ...stats.map(([l,v])=>[{v:l},{v:Number.isFinite(v)?v:''}])
    ];

    const centerFields=layerDefs.centers.exportFields;
    const regionFields=layerDefs.regions.exportFields;
    const centerRows=[
      [{v:'N°',s:1},...centerFields.map(f=>({v:labelOf(f),s:1}))],
      ...(currentResults.centers||[]).map((f,i)=>[{v:i+1},...centerFields.map(k=>{
        const raw=f.get(k);return {v:isNumeric('centers',k)&&Number.isFinite(parseNumber(raw))?parseNumber(raw):raw};
      })])
    ];
    const regionRows=[
      [{v:'N°',s:1},...regionFields.map(f=>({v:labelOf(f),s:1}))],
      ...(currentResults.regions||[]).map((f,i)=>[{v:i+1},...regionFields.map(k=>{
        const raw=f.get(k);return {v:isNumeric('regions',k)&&Number.isFinite(parseNumber(raw))?parseNumber(raw):raw};
      })])
    ];

    const summaryMerges=['A1:H1','A2:H2','A3:H3','A4:H4','A5:H5','A25:H25'];
    const sheet1=worksheetXml(summaryRows,[28,22,25,22,20,18,18,18],true,summaryMerges,{freezeRows:5});
    const sheet2=worksheetXml(statsRows,[42,24],false,['A1:B1','A2:B2','A3:B3'],{freezeRows:5,autoFilter:`A5:B${statsRows.length}`});
    const sheet3=worksheetXml(centerRows,[7,34,22,24,22,18,12,12,12,18,18,18,14,14],false,[],{freezeRows:1,autoFilter:`A1:${colName(centerRows[0].length)}${centerRows.length}`});
    const sheet4=worksheetXml(regionRows,[7,26,20,22,18,16,18,16,16],false,[],{freezeRows:1,autoFilter:`A1:${colName(regionRows[0].length)}${regionRows.length}`});

    const files=[
      {name:'[Content_Types].xml',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet4.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`},
      {name:'_rels/.rels',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`},
      {name:'docProps/core.xml',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>WEBMAP OFFRE DE SOIN EN COTE D'IVOIRE — Résultats relationnels</dc:title><dc:creator>Webmap interactive</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created></cp:coreProperties>`},
      {name:'docProps/app.xml',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>WEBMAP</Application></Properties>`},
      {name:'xl/workbook.xml',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Synthèse" sheetId="1" r:id="rId1"/><sheet name="Statistiques" sheetId="2" r:id="rId2"/><sheet name="Centres de santé" sheetId="3" r:id="rId3"/><sheet name="Régions sanitaires" sheetId="4" r:id="rId4"/></sheets></workbook>`},
      {name:'xl/_rels/workbook.xml.rels',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet4.xml"/><Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`},
      {name:'xl/styles.xml',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FF8E2634"/><sz val="16"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE74C5B"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF1F3"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFE5C9CD"/></left><right style="thin"><color rgb="FFE5C9CD"/></right><top style="thin"><color rgb="FFE5C9CD"/></top><bottom style="thin"><color rgb="FFE5C9CD"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`},
      {name:'xl/worksheets/sheet1.xml',data:sheet1},{name:'xl/worksheets/sheet2.xml',data:sheet2},{name:'xl/worksheets/sheet3.xml',data:sheet3},{name:'xl/worksheets/sheet4.xml',data:sheet4},
      {name:'xl/worksheets/_rels/sheet1.xml.rels',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`},
      {name:'xl/drawings/drawing1.xml',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>5</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>8</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>23</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Carte des entités sélectionnées"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>`},
      {name:'xl/drawings/_rels/drawing1.xml.rels',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.jpeg"/></Relationships>`},
      {name:'xl/media/image1.jpeg',data:dataUrlBytes(mapInfo.dataUrl)}
    ];
    return new Blob([zipStore(files)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }

  function setExportFeedback(message,isError=false){
    const status=el('exportStatus');if(!status)return;
    status.classList.add('show');
    status.innerHTML=`<i class="fas ${isError?'fa-exclamation-triangle':'fa-check-circle'}"></i> ${escapeHtml(message)}`;
    window.setTimeout(()=>{if(!exportBusy){status.classList.remove('show');status.innerHTML='';}},5500);
  }

  function exportPdf(){
    if(!totalResults()||exportBusy)return;
    try{
      setExportBusy(true,'Création du PDF…');
      const mapInfo=captureMapJpeg();
      const blob=buildPdfBlob(mapInfo);
      if(!blob||blob.size<1000)throw new Error('PDF vide ou incomplet');
      downloadBlob(blob,`WEBMAP_RESULTATS_RELIES_${fileStamp()}.pdf`);
      setExportBusy(false);setExportEnabled(true);setExportFeedback(`PDF généré (${Math.round(blob.size/1024)} Ko).`);
    }catch(err){
      console.error('EXPORT PDF',err);setExportBusy(false);setExportEnabled(totalResults()>0);setExportFeedback('Échec de l’export PDF : '+(err&&err.message?err.message:'erreur inconnue'),true);
      alert("L'export PDF a échoué. Détail : "+(err&&err.message?err.message:'erreur inconnue'));
    }
  }

  function exportExcel(){
    if(!totalResults()||exportBusy)return;
    try{
      setExportBusy(true,'Création du fichier Excel…');
      const mapInfo=captureMapJpeg();
      const blob=buildXlsxBlob(mapInfo);
      if(!blob||blob.size<1500)throw new Error('Classeur Excel vide ou incomplet');
      downloadBlob(blob,`WEBMAP_RESULTATS_RELIES_${fileStamp()}.xlsx`);
      setExportBusy(false);setExportEnabled(true);setExportFeedback(`Excel généré (${Math.round(blob.size/1024)} Ko).`);
    }catch(err){
      console.error('EXPORT EXCEL',err);setExportBusy(false);setExportEnabled(totalResults()>0);setExportFeedback('Échec de l’export Excel : '+(err&&err.message?err.message:'erreur inconnue'),true);
      alert("L'export Excel a échoué. Détail : "+(err&&err.message?err.message:'erreur inconnue'));
    }
  }

  function wireUi(){
    populateSearchLayer();buildLayerControls();createCriterion('centers');createCriterion('regions');
    el('centerTotal').textContent=fmt(layerDefs.centers.source.getFeatures().length);
    el('regionTotal').textContent=fmt(layerDefs.regions.source.getFeatures().length);
    showStats({centers:layerDefs.centers.source.getFeatures(),regions:layerDefs.regions.source.getFeatures()},'Données complètes');
    setExportEnabled(false);

    el(queryUi.centers.add).addEventListener('click',()=>createCriterion('centers'));
    el(queryUi.regions.add).addEventListener('click',()=>createCriterion('regions'));
    el('runQuery').addEventListener('click',executeQuery);
    el('resetQuery').addEventListener('click',resetCriteria);
    el('searchBtn').addEventListener('click',executeSearch);
    searchLayer.addEventListener('change',populateSearchFields);
    searchField.addEventListener('change',()=>{searchInput.value='';closeSuggestionBox(searchSuggestions,searchInput);updateSearchHint();showSearchSuggestions();});
    searchInput.addEventListener('focus',showSearchSuggestions);
    searchInput.addEventListener('input',showSearchSuggestions);
    searchInput.addEventListener('blur',()=>setTimeout(()=>closeSuggestionBox(searchSuggestions,searchInput),120));
    wireAutocompleteKeyboard(searchInput,searchSuggestions,executeSearch);
    el('exportPdf').addEventListener('click',exportPdf);
    el('exportExcel').addEventListener('click',exportExcel);
    el('fitAllBtn').addEventListener('click',()=>map.getView().fit(initialExtent,{padding:[35,35,35,35],duration:600}));
    el('clearHighlightBtn').addEventListener('click',()=>{
      clearSelection(true);renderResults({centers:[],regions:[]},'Sélection effacée.');showStats({centers:layerDefs.centers.source.getFeatures(),regions:layerDefs.regions.source.getFeatures()},'Données complètes');
    });
    el('toggleLeft').addEventListener('click',()=>el('leftPanel').classList.toggle('open'));
    el('toggleRight').addEventListener('click',()=>el('rightPanel').classList.toggle('open'));
    window.addEventListener('resize',()=>setTimeout(()=>map.updateSize(),60));
    map.once('rendercomplete',()=>map.updateSize());
  }

  wireUi();
})();
