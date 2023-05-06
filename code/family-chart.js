// https://donatso.github.io/family-chart/ v0.0.0-beta-1 Copyright 2023 Donat Soric
(function (global, factory) {
typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('d3')) :
typeof define === 'function' && define.amd ? define(['d3'], factory) :
(global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.f3 = factory(global.f3));
})(this, (function (_d3) { 'use strict';

function _interopNamespace(e) {
if (e && e.__esModule) return e;
var n = Object.create(null);
if (e) {
Object.keys(e).forEach(function (k) {
if (k !== 'default') {
var d = Object.getOwnPropertyDescriptor(e, k);
Object.defineProperty(n, k, d.get ? d : {
enumerable: true,
get: function () { return e[k]; }
});
}
});
}
n["default"] = e;
return Object.freeze(n);
}

var _d3__namespace = /*#__PURE__*/_interopNamespace(_d3);

var d3 = typeof window === "object" && !!window.d3 ? window.d3 : _d3__namespace;

function sortChildrenWithSpouses(data) {
  data.forEach(datum => {
    if (!datum.rels.children) return
    datum.rels.children.sort((a, b) => {
      const a_d = data.find(d => d.id === a),
        b_d = data.find(d => d.id === b),
        a_p2 = otherParent(a_d, datum, data) || {},
        b_p2 = otherParent(b_d, datum, data) || {},
        a_i = datum.rels.spouses.indexOf(a_p2.id),
        b_i = datum.rels.spouses.indexOf(b_p2.id);

      if (datum.data.gender === "M") return a_i - b_i
      else return b_i - a_i
    });
  });
}

function otherParent(d, p1, data) {
  return data.find(d0 => (d0.id !== p1.id) && ((d0.id === d.rels.mother) || (d0.id === d.rels.father)))
}

function calculateEnterAndExitPositions(d, entering, exiting) {
  d.exiting = exiting;
  if (entering) {
    if (d.depth === 0 && !d.spouse) {d._x = d.x; d._y = d.y;}
    else if (d.spouse) {d._x = d.spouse.x; d._y = d.spouse.y;}
    else if (d.is_ancestry) {d._x = d.parent.x; d._y = d.parent.y;}
    else {d._x = d.psx; d._y = d.parent.y;}
  } else if (exiting) {
    const x = d.x > 0 ? 1 : -1,
      y = d.y > 0 ? 1 : -1;
    {d._x = d.x+400*x; d._y = d.y+400*y;}
  }
}

function toggleRels(tree_datum, hide_rels) {
  const
    rels = hide_rels ? 'rels' : '_rels',
    rels_ = hide_rels ? '_rels' : 'rels';
  
  if (tree_datum.is_ancestry || tree_datum.data.main) {showHideAncestry('father'); showHideAncestry('mother');}
  else {showHideChildren();}

  function showHideAncestry(rel_type) {
    if (!tree_datum.data[rels] || !tree_datum.data[rels][rel_type]) return
    if (!tree_datum.data[rels_]) tree_datum.data[rels_] = {};
    tree_datum.data[rels_][rel_type] = tree_datum.data[rels][rel_type];
    delete tree_datum.data[rels][rel_type];
  }

  function showHideChildren() {
    if (!tree_datum.data[rels] || !tree_datum.data[rels].children) return
    const
      children = tree_datum.data[rels].children.slice(0),
      spouses = tree_datum.spouse ? [tree_datum.spouse] : tree_datum.spouses || [];

    [tree_datum, ...spouses].forEach(sp => children.forEach(ch_id => {
      if (sp.data[rels].children.includes(ch_id)) {
        if (!sp.data[rels_]) sp.data[rels_] = {};
        if (!sp.data[rels_].children) sp.data[rels_].children = [];
        sp.data[rels_].children.push(ch_id);
        sp.data[rels].children.splice(sp.data[rels].children.indexOf(ch_id), 1);
      }
    }));
  }
}

function toggleAllRels(tree_data, hide_rels) {
  tree_data.forEach(d => {d.data.hide_rels = hide_rels; toggleRels(d, hide_rels);});
}

function checkIfRelativesConnectedWithoutPerson(datum, data_stash) {
  const r = datum.rels,
    r_ids = [r.father, r.mother, ...(r.spouses || []), ...(r.children || [])].filter(r_id => !!r_id),
    rels_not_to_main = [];

  for (let i = 0; i < r_ids.length; i++) {
    const line = findPersonLineToMain(data_stash.find(d => d.id === r_ids[i]), [datum]);
    if (!line) {rels_not_to_main.push(r_ids[i]); break;}
  }
  return rels_not_to_main.length === 0;

  function findPersonLineToMain(datum, without_persons) {
    let line;
    if (isM(datum)) line = [datum];
    checkIfAnyRelIsMain(datum, [datum]);
    return line

    function checkIfAnyRelIsMain(d0, history) {
      if (line) return
      history = [...history, d0];
      runAllRels(check);
      if (!line) runAllRels(checkRels);

      function runAllRels(f) {
        const r = d0.rels;
        [r.father, r.mother, ...(r.spouses || []), ...(r.children || [])]
          .filter(d_id => (d_id && ![...without_persons, ...history].find(d => d.id === d_id)))
          .forEach(d_id => f(d_id));
      }

      function check(d_id) {
        if (isM(d_id)) line = history;
      }

      function checkRels(d_id) {
        const person = data_stash.find(d => d.id === d_id);
        checkIfAnyRelIsMain(person, history);
      }
    }
  }
  function isM(d0) {return typeof d0 === 'object' ? d0.id === data_stash[0].id : d0 === data_stash[0].id}  // todo: make main more exact
}

function moveToAddToAdded(datum, data_stash) {
  delete datum.to_add;
  return datum
}

function removeToAdd(datum, data_stash) {
  deletePerson(datum, data_stash);
  return false
}

function deletePerson(datum, data_stash) {
  if (!checkIfRelativesConnectedWithoutPerson(datum, data_stash)) return {success: false, error: 'checkIfRelativesConnectedWithoutPerson'}
  executeDelete();
  return {success: true};

  function executeDelete() {
    data_stash.forEach(d => {
      for (let k in d.rels) {
        if (!d.rels.hasOwnProperty(k)) continue
        if (d.rels[k] === datum.id) {
          delete d.rels[k];
        } else if (Array.isArray(d.rels[k]) && d.rels[k].includes(datum.id)) {
          d.rels[k].splice(d.rels[k].findIndex(did => did === datum.id), 1);
        }
      }
    });
    data_stash.splice(data_stash.findIndex(d => d.id === datum.id), 1);
    data_stash.forEach(d => {if (d.to_add) deletePerson(d, data_stash);});  // full update of tree
    if (data_stash.length === 0) data_stash.push(createTreeDataWithMainNode({}).data[0]);
  }
}

function manualZoom({amount, svg, transition_time=500}) {
  const zoom = svg.__zoomObj;
  d3.select(svg).transition().duration(transition_time || 0).delay(transition_time ? 100 : 0)  // delay 100 because of weird error of undefined something in d3 zoom
    .call(zoom.scaleBy, amount);
}

function isAllRelativeDisplayed(d, data) {
  const r = d.data.rels,
    all_rels = [r.father, r.mother, ...(r.spouses || []), ...(r.children || [])].filter(v => v);
  return all_rels.every(rel_id => data.some(d => d.data.id === rel_id))
}

function generateUUID() {
  var d = new Date().getTime();
  var d2 = (performance && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16;
    if(d > 0){//Use timestamp until depleted
      r = (d + r)%16 | 0;
      d = Math.floor(d/16);
    } else {//Use microseconds since page-load if supported
      r = (d2 + r)%16 | 0;
      d2 = Math.floor(d2/16);
    }
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function handleRelsOfNewDatum({datum, data_stash, rel_type, rel_datum}) {
  if (rel_type === "daughter" || rel_type === "son") addChild(datum);
  else if (rel_type === "father" || rel_type === "mother") addParent(datum);
  else if (rel_type === "spouse") addSpouse(datum);

  function addChild(datum) {
    if (datum.data.other_parent) {
      addChildToSpouseAndParentToChild(datum.data.other_parent);
      delete datum.data.other_parent;
    }
    datum.rels[rel_datum.data.gender === 'M' ? 'father' : 'mother'] = rel_datum.id;
    if (!rel_datum.rels.children) rel_datum.rels.children = [];
    rel_datum.rels.children.push(datum.id);
    return datum

    function addChildToSpouseAndParentToChild(spouse_id) {
      if (spouse_id === "_new") spouse_id = addOtherParent().id;

      const spouse = data_stash.find(d => d.id === spouse_id);
      datum.rels[spouse.data.gender === 'M' ? 'father' : 'mother'] = spouse.id;
      if (!spouse.rels.hasOwnProperty('children')) spouse.rels.children = [];
      spouse.rels.children.push(datum.id);

      function addOtherParent() {
        const new_spouse = createNewPersonWithGenderFromRel({rel_type: "spouse", rel_datum});
        addSpouse(new_spouse);
        addNewPerson({data_stash, datum: new_spouse});
        return new_spouse
      }
    }
  }

  function addParent(datum) {
    const is_father = datum.data.gender === "M",
      parent_to_add_id = rel_datum.rels[is_father ? 'father' : 'mother'];
    if (parent_to_add_id) removeToAdd(data_stash.find(d => d.id === parent_to_add_id), data_stash);
    addNewParent();

    function addNewParent() {
      rel_datum.rels[is_father ? 'father' : 'mother'] = datum.id;
      handleSpouse();
      datum.rels.children = [rel_datum.id];
      return datum

      function handleSpouse() {
        const spouse_id = rel_datum.rels[!is_father ? 'father' : 'mother'];
        if (!spouse_id) return
        const spouse = data_stash.find(d => d.id === spouse_id);
        datum.rels.spouses = [spouse_id];
        if (!spouse.rels.spouses) spouse.rels.spouses = [];
        spouse.rels.spouses.push(datum.id);
        return spouse
      }
    }
  }

  function addSpouse(datum) {
    removeIfToAdd();
    if (!rel_datum.rels.spouses) rel_datum.rels.spouses = [];
    rel_datum.rels.spouses.push(datum.id);
    datum.rels.spouses = [rel_datum.id];

    function removeIfToAdd() {
      if (!rel_datum.rels.spouses) return
      rel_datum.rels.spouses.forEach(spouse_id => {
        const spouse = data_stash.find(d => d.id === spouse_id);
        if (spouse.to_add) removeToAdd(spouse, data_stash);
      });
    }
  }
}

function createNewPerson({data, rels}) {
  return {id: generateUUID(), data: data || {}, rels: rels || {}}
}

function createNewPersonWithGenderFromRel({data, rel_type, rel_datum}) {
  const gender = getGenderFromRelative(rel_datum, rel_type);
  data = Object.assign(data || {}, {gender});
  return createNewPerson({data})

  function getGenderFromRelative(rel_datum, rel_type) {
    return (["daughter", "mother"].includes(rel_type) || rel_type === "spouse" && rel_datum.data.gender === "M") ? "F" : "M"
  }
}

function addNewPerson({data_stash, datum}) {
  data_stash.push(datum);
}

function createTreeDataWithMainNode({data, version}) {
  return {data: [createNewPerson({data})], version}
}

function addNewPersonAndHandleRels({datum, data_stash, rel_type, rel_datum}) {
  addNewPerson({data_stash, datum});
  handleRelsOfNewDatum({datum, data_stash, rel_type, rel_datum});
}

function CalculateTree$1({data_stash, main_id=null, is_vertical=true, node_separation=250, level_separation=150}) {
  data_stash = createRelsToAdd(data_stash);
  sortChildrenWithSpouses(data_stash);
  const main = main_id !== null ? data_stash.find(d => d.id === main_id) : data_stash[0],
    tree_children = calculateTreePositions(main, 'children', false),
    tree_parents = calculateTreePositions(main, 'parents', true);

  data_stash.forEach(d => d.main = d === main);
  levelOutEachSide(tree_parents, tree_children);
  const tree = mergeSides(tree_parents, tree_children);
  setupChildrenAndParents({tree});
  setupSpouses({tree, node_separation});
  nodePositioning({tree, is_vertical});

  const dim = calculateTreeDim(tree, node_separation, level_separation, is_vertical);

  return {data: tree, data_stash, dim}

  function calculateTreePositions(datum, rt, is_ancestry) {
    const hierarchyGetter = rt === "children" ? hierarchyGetterChildren : hierarchyGetterParents,
      d3_tree = d3.tree().nodeSize([node_separation, level_separation]).separation(separation),
      root = d3.hierarchy(datum, hierarchyGetter);
    d3_tree(root);
    return root.descendants()

    function separation(a, b) {
      let offset = 1;
      if (!is_ancestry) {
        if (!sameParent(a, b)) offset+=.25;
        if (someSpouses(a,b)) offset+=offsetOnPartners(a,b);
        if (sameParent(a, b) && !sameBothParents(a,b)) offset+=.125;
      }
      return offset
    }
    function sameParent(a, b) {return a.parent == b.parent}
    function sameBothParents(a, b) {return (a.data.rels.father === b.data.rels.father) && (a.data.rels.mother === b.data.rels.mother)}
    function hasSpouses(d) {return d.data.rels.spouses && d.data.rels.spouses.length > 0}
    function someSpouses(a, b) {return hasSpouses(a) || hasSpouses(b)}

    function hierarchyGetterChildren(d) {
      return [...(d.rels.children || [])].map(id => data_stash.find(d => d.id === id))
    }

    function hierarchyGetterParents(d) {
      return [d.rels.father, d.rels.mother]
        .filter(d => d).map(id => data_stash.find(d => d.id === id))
    }

    function offsetOnPartners(a,b) {
      return (Math.max((a.data.rels.spouses || []).length, (b.data.rels.spouses || []).length))*.5+.5
    }
  }

  function levelOutEachSide(parents, children) {
    const mid_diff = (parents[0].x - children[0].x) / 2;
    parents.forEach(d => d.x-=mid_diff);
    children.forEach(d => d.x+=mid_diff);
  }

  function mergeSides(parents, children) {
    parents.forEach(d => {d.is_ancestry = true;});
    parents.forEach(d => d.depth === 1 ? d.parent = children[0] : null);

    return [...children, ...parents.slice(1)];
  }
  function nodePositioning({tree, is_vertical}) {
    tree.forEach(d => {
      d.y *= (d.is_ancestry ? -1 : 1);
      if (!is_vertical) {
        const d_x = d.x; d.x = d.y; d.y = d_x;
      }
    });
  }

  function setupSpouses({tree, node_separation}) {
    for (let i = tree.length; i--;) {
      const d = tree[i];
      if (!d.is_ancestry && d.data.rels.spouses && d.data.rels.spouses.length > 0){
        const side = d.data.data.gender === "M" ? -1 : 1;  // female on right
        d.x += d.data.rels.spouses.length/2*node_separation*side;
        d.data.rels.spouses.forEach((sp_id, i) => {
          const spouse = {data: data_stash.find(d0 => d0.id === sp_id), added: true};

          spouse.x = d.x-(node_separation*(i+1))*side;
          spouse.y = d.y;
          spouse.sx = i > 0 ? spouse.x : spouse.x + (node_separation/2)*side;
          spouse.depth = d.depth;
          spouse.spouse = d;
          if (!d.spouses) d.spouses = [];
          d.spouses.push(spouse);
          tree.push(spouse);

          tree.forEach(d0 => (
            (d0.data.rels.father === d.data.id && d0.data.rels.mother === spouse.data.id) ||
            (d0.data.rels.mother === d.data.id && d0.data.rels.father === spouse.data.id)
            ) ? d0.psx = spouse.sx : null
          );
        });
      }
      if (d.parents && d.parents.length === 2) {
        const p1 = d.parents[0],
          p2 = d.parents[1],
          midd = p1.x - (p1.x - p2.x)/2,
          x = (d,sp) => midd + (node_separation/2)*(d.x < sp.x ? 1 : -1);

        p2.x = x(p1, p2); p1.x = x(p2, p1);
      }
    }
  }

  function setupChildrenAndParents({tree}) {
    tree.forEach(d0 => {
      delete d0.children;
      tree.forEach(d1 => {
        if (d1.parent === d0) {
          if (d1.is_ancestry) {
            if (!d0.parents) d0.parents = [];
            d0.parents.push(d1);
          } else {
            if (!d0.children) d0.children = [];
            d0.children.push(d1);
          }
        }
      });
    });
  }

  function calculateTreeDim(tree, node_separation, level_separation, is_vertical) {
    if (!is_vertical) [node_separation, level_separation] = [level_separation, node_separation];
    const w_extent = d3.extent(tree, d => d.x),
      h_extent = d3.extent(tree, d => d.y);
    return {
      width: w_extent[1] - w_extent[0]+node_separation, height: h_extent[1] - h_extent[0]+level_separation, x_off: -w_extent[0]+node_separation/2, y_off: -h_extent[0]+level_separation/2
    }
  }

  function createRelsToAdd(data) {
    const to_add_spouses = [];
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      if (d.rels.children && d.rels.children.length > 0) {
        if (!d.rels.spouses) d.rels.spouses = [];
        const is_father = d.data.gender === "M";
        let spouse;

        d.rels.children.forEach(d0 => {
          const child = data.find(d1 => d1.id === d0);
          if (child.rels[is_father ? 'father' : 'mother'] !== d.id) return
          if (child.rels[!is_father ? 'father' : 'mother']) return
          if (!spouse) {
            spouse = createToAddSpouse(d);
            d.rels.spouses.push(spouse.id);
          }
          spouse.rels.children.push(child.id);
          child.rels[!is_father ? 'father' : 'mother'] = spouse.id;
        });
      }
    }
    to_add_spouses.forEach(d => data.push(d));
    return data

    function createToAddSpouse(d) {
      const spouse = createNewPerson({
        data: {gender: d.data.gender === "M" ? "F" : "M"},
        rels: {spouses: [d.id], children: []}
      });
      spouse.to_add = true;
      to_add_spouses.push(spouse);
      return spouse
    }
  }

}

function setupSvg(svg, zoom_polite) {
  setupZoom();

  function setupZoom() {
    if (svg.__zoom) return
    const view = svg.querySelector('.view'),
      zoom = d3.zoom().on("zoom", zoomed);

    d3.select(svg).call(zoom);
    svg.__zoomObj = zoom;

    if (zoom_polite) zoom.filter(zoomFilter);

    function zoomed(e) {
      d3.select(view).attr("transform", e.transform);
    }

    function zoomFilter(e) {
      if (e.type === "wheel" && !e.ctrlKey) return false
      else if (e.touches && e.touches.length < 2) return false
      else return true
    }
  }
}

function positionTree({t, svg, transition_time=2000}) {
  const zoom = svg.__zoomObj;

  // d3.select(svg).call(zoom.transform, d3.zoomIdentity.translate(x*k, y*k))

  d3.select(svg).transition().duration(transition_time || 0).delay(transition_time ? 100 : 0)  // delay 100 because of weird error of undefined something in d3 zoom
    .call(zoom.transform, d3.zoomIdentity.scale(t.k).translate(t.x, t.y));
}

function treeFit({svg, svg_dim, tree_dim, with_transition, transition_time}) {
  const t = calculateTreeFit(svg_dim, tree_dim);
  positionTree({t, svg, with_transition, transition_time});
}

function calculateTreeFit(svg_dim, tree_dim) {
  let k = Math.min(svg_dim.width / tree_dim.width, svg_dim.height / tree_dim.height),
    x = tree_dim.x_off + (svg_dim.width - tree_dim.width*k)/k/2,
    y = tree_dim.y_off + (svg_dim.height - tree_dim.height*k)/k/2;

  if (k>1) {x*=k;y*=k;k=1;}
  return {k,x,y}
}

function mainToMiddle({datum, svg, svg_dim, scale, transition_time}) {
  const k = scale || 1, x = svg_dim.width/2-datum.x*k, y = svg_dim.height/2-datum.y,
    t = {k, x: x/k, y: y/k};
  positionTree({t, svg, with_transition: true, transition_time});
}

function createPath(d, is_) {
  const line = d3.line().curve(d3.curveMonotoneY),
    lineCurve = d3.line().curve(d3.curveBasis),
    path_data = is_ ? d._d() : d.d;

  if (!d.curve) return line(path_data)
  else if (d.curve === true) return lineCurve(path_data)
}

function createLinks({d, tree, is_vertical}) {
  const links = [];

  if (d.data.rels.spouses && d.data.rels.spouses.length > 0) handleSpouse({d});
  handleAncestrySide({d});
  handleProgenySide({d});

  return links;

  function handleAncestrySide({d}) {
    if (!d.parents || d.parents.length !== 2) return
    const p1 = d.parents[0], p2 = d.parents[1];

    const p = {x: getMid(p1, p2, 'x'), y: getMid(p1, p2, 'y')};

    links.push({
      d: Link(d, p),
      _d: () => {
        const _d = {x: d.x, y: d.y},
          _p = {x: d.x, y: d.y};
        return Link(_d, _p)
      },
      curve: true, id: linkId(d, d.parents[0], d.parents[1]), depth: d.depth+1, is_ancestry: true
    });
  }


  function handleProgenySide({d}) {
    if (!d.children || d.children.length === 0) return

    d.children.forEach((child, i) => {
      const other_parent = otherParent(child, d, tree),
        sx = other_parent.sx;

      links.push({
        d: Link(child, {x: sx, y: d.y}),
        _d: () => Link({x: sx, y: d.y}, {x: _or(child, 'x'), y: _or(child, 'y')}),
        curve: true, id: linkId(child, d, other_parent), depth: d.depth+1
      });
    });
  }


  function handleSpouse({d}) {
    d.data.rels.spouses.forEach(sp_id => {
      const spouse = tree.find(d0 => d0.data.id === sp_id);
      if (!spouse || d.spouse) return
      links.push({
        d: [[d.x, d.y], [spouse.x, spouse.y]],
        _d: () => [
          d.is_ancestry ? [_or(d, 'x')-.0001, _or(d, 'y')] : [d.x, d.y], // add -.0001 to line to have some length if d.x === spouse.x
          d.is_ancestry ? [_or(spouse, 'x'), _or(spouse, 'y')] : [d.x-.0001, d.y]
        ],
        curve: false, id: [d.data.id, spouse.data.id].join(", "), depth: d.depth, spouse: true, is_ancestry: spouse.is_ancestry
      });
    });
  }

  ///
  function getMid(d1, d2, side, is_) {
    if (is_) return _or(d1, side) - (_or(d1, side) - _or(d2, side))/2
    else return d1[side] - (d1[side] - d2[side])/2
  }

  function _or(d, k) {
   return d.hasOwnProperty('_'+k) ? d['_'+k] : d[k]
  }

  function Link(d, p) {
    const hy = (d.y + (p.y - d.y) / 2);
    return [
      [d.x, d.y],
      [d.x, hy],
      [d.x, hy],
      [p.x, hy],
      [p.x, hy],
      [p.x, p.y],
    ]
  }

  function linkId(...args) {
    return args.map(d => d.data.id).sort().join(", ")  // make unique id
  }

  function otherParent(d, p1, data) {
    return data.find(d0 => (d0.data.id !== p1.data.id) && ((d0.data.id === d.data.rels.mother) || (d0.data.id === d.data.rels.father)))
  }
}

function CardBody({d,card_dim,card_display}) {
  return {template: (`
    <g class="card-body">
      <rect width="${card_dim.w}" height="${card_dim.h}" class="card-body-rect" />
      <g transform="translate(${card_dim.text_x}, ${card_dim.text_y})">
        <text clip-path="url(#card_text_clip)">
          ${Array.isArray(card_display) ? card_display.map(cd => `<tspan x="${0}" dy="${14}">${cd(d.data)}</tspan>`).join('\n') : card_display(d.data)}
        </text>
        <rect width="${card_dim.w-card_dim.text_x-10}" height="${card_dim.h-20}" style="mask: url(#fade)" class="text-overflow-mask" /> 
      </g>
    </g>
  `)
  }
}

function CardBodyAddNew({d,card_dim,card_add,label}) {
  return {template: (`
    <g class="card-body ${card_add ? 'card_add' : 'card-unknown'}">
      <rect class="card-body-rect" width="${card_dim.w}" height="${card_dim.h}" fill="rgb(59, 85, 96)" />
      <text transform="translate(${card_dim.w/2}, ${card_dim.h/2})" text-anchor="middle" fill="#fff">
        <tspan font-size="18" dy="${8}">${label}</tspan>
      </text>
    </g>
  `)
  }
}

function CardBodyOutline({d,card_dim, is_new}) {
  return {template: (`
    <rect width="${card_dim.w}" height="${card_dim.h}" rx="4" ry="4" class="card-outline ${(d.data.main && !is_new) ? 'card-main-outline' : ''} ${is_new ? 'card-new-outline' : ''}" />
  `)
  }
}

function PencilIcon({d,card_dim,x,y}) {
  return ({template: (`
    <g transform="translate(${x || card_dim.w-20},${y || card_dim.h-20})scale(.6)" style="cursor: pointer" class="card_edit pencil_icon">
      <circle fill="rgba(0,0,0,0)" r="17" cx="8.5" cy="8.5" />
      <path fill="currentColor" transform="translate(-1.5, -1.5)"
         d="M19.082,2.123L17.749,0.79c-1.052-1.052-2.766-1.054-3.819,0L1.925,12.794c-0.06,0.06-0.104,0.135-0.127,0.216
          l-1.778,6.224c-0.05,0.175-0.001,0.363,0.127,0.491c0.095,0.095,0.223,0.146,0.354,0.146c0.046,0,0.092-0.006,0.137-0.02
          l6.224-1.778c0.082-0.023,0.156-0.066,0.216-0.127L19.082,5.942C20.134,4.89,20.134,3.176,19.082,2.123z M3.076,13.057l9.428-9.428
          l3.738,3.739l-9.428,9.428L3.076,13.057z M2.566,13.961l3.345,3.344l-4.683,1.339L2.566,13.961z M18.375,5.235L16.95,6.66
          l-3.738-3.739l1.425-1.425c0.664-0.663,1.741-0.664,2.405,0l1.333,1.333C19.038,3.493,19.038,4.572,18.375,5.235z"/>
    </g>
  `)})
}

function HideIcon({d,card_dim}) {
  return ({template: (`
    <g transform="translate(${card_dim.w-50},${card_dim.h-20})scale(.035)" style="cursor: pointer" class="card_hide_rels hide_rels_icon">
      <circle fill="rgba(0,0,0,0)" r="256" cx="256" cy="256" />
      <g fill="currentColor">
        <path d="m34,256l26.2,26.2c108,108 283.7,108 391.7,0l26.1-26.2-26.2-26.2c-108-108-283.7-108-391.7,0l-26.1,
          26.2zm222,126.2c-75.8,0-151.6-28.9-209.3-86.6l-32.9-32.9c-3.7-3.7-3.7-9.7 0-13.5l32.9-32.9c115.4-115.4 303.2-115.4 418.6,
          0l32.9,32.9c3.7,3.7 3.7,9.7 0,13.5l-32.9,32.9c-57.7,57.7-133.5,86.6-209.3,86.6z"/>
        <path d="m256,183.5c-40,0-72.5,32.5-72.5,72.5s32.5,72.5 72.5,72.5c40,0 72.5-32.5 72.5-72.5s-32.5-72.5-72.5-72.5zm0,
          164c-50.5,0-91.5-41.1-91.5-91.5 0-50.5 41.1-91.5 91.5-91.5s91.5,41.1 91.5,91.5c0,50.5-41,91.5-91.5,91.5z"/>
      </g>
    </g>
  `)})
}

function MiniTree({d,card_dim}) {
  return ({template: (`
    <g class="card_family_tree" style="cursor: pointer">
      <rect x="-31" y="-25" width="72" height="15" fill="rgba(0,0,0,0)"></rect>
      <g transform="translate(${card_dim.w*.8},6)scale(.9)">
        <rect x="-31" y="-25" width="72" height="15" fill="rgba(0,0,0,0)"></rect>
        <line y2="-17.5" stroke="#fff" />
        <line x1="-20" x2="20" y1="-17.5" y2="-17.5" stroke="#fff" />
        <rect x="-31" y="-25" width="25" height="15" rx="5" ry="5" class="card-male" />
        <rect x="6" y="-25" width="25" height="15" rx="5" ry="5" class="card-female" />
      </g>
    </g>
  `)})
}

function PlusIcon({d,card_dim,x,y}) {
  return ({template: (`
    <g class="card_add_relative">
      <g transform="translate(${x || card_dim.w/2},${y || card_dim.h})scale(.13)">
        <circle r="80" cx="40" cy="40" fill="rgba(0,0,0,0)" />
        <g transform="translate(-10, -8)">
          <line
            x1="10" x2="90" y1="50" y2="50"
            stroke="currentColor" stroke-width="15" stroke-linecap="round"
          />
          <line
            x1="50" x2="50" y1="10" y2="90"
            stroke="currentColor" stroke-width="15" stroke-linecap="round"
          />
        </g>
      </g>
    </g>
  `)})
}

function LinkBreakIcon({x,y,rt,closed}) {
  return ({template: (`
    <g style="
          transform: translate(-12.2px, -.5px);
          cursor: pointer;
        " 
        fill="currentColor" class="card_break_link${closed ? ' closed' : ''}"
      >
      <g style="transform: translate(${x}px,${y}px)scale(.02)rotate(${rt+'deg'})">
        <rect width="1000" height="700" y="150" style="opacity: 0" />
        <g class="link_upper">
          <g>
            <path d="M616.3,426.4c19,4.5,38.1-7.4,42.6-26.4c4.4-19-7.4-38-26.5-42.5L522.5,332c-18,11.1-53.9,33.4-53.9,33.4l80.4,18.6c-7.8,4.9-19.5,12.1-31.3,19.4L616.3,426.4L616.3,426.4z"/>
            <path d="M727.4,244.2c-50.2-11.6-100.3,3.3-135.7,35.4c28.6,22.6,64.5,30.2,116.4,51.3l141,32.6c23.9,5.6,56.6,47.2,51.1,71l-4.1,17c-5.6,23.7-47.3,56.4-71.2,51l-143.4-33.2c-66.8-8.6-104.1-16.6-132.9-7.5c17.4,44.9,55.9,80.8,106.5,92.4L800.9,588c81.3,18.8,162.3-31.5,181.2-112.4l4-17c18.8-81.1-31.7-161.8-112.9-180.6L727.4,244.2z"/>
          </g>
        </g>
        <g class="link_lower">
          <path d="M421.2,384.9l-128,127.6c-13.9,13.8-13.9,36.2,0,50s36.3,13.8,50.2,0.1l136.2-135.8v-36.7l-58.4,58.1V384.9L421.2,384.9z"/>
          <path d="M204.6,742.8c-17.4,17.3-63.3,17.2-80.6,0.1l-12.3-12.3c-17.3-17.3,0.6-81.2,17.9-98.5l100.2-99.9c12.5-14.9,45.8-40.8,66.1-103.7c-47.7-9.4-98.9,4.2-135.8,40.9L54.2,575c-58.9,58.8-58.9,154,0,212.8L66.6,800c58.9,58.8,154.5,58.8,213.4,0l105.8-105.6c38.4-38.3,51.3-91.9,39.7-141c-44,22.7-89,62.3-116,84.8L204.6,742.8z"/>
        </g>
        <g class="link_particles">
          <path d="M351.9,248.4l-26.5,63.4l80.6,30.1L351.9,248.4z"/>
          <path d="M529.3,208l-43,26.6l35.4,52.3L529.3,208z"/>
          <path d="M426.6,158.8l-44-2.9l61.7,134.6L426.6,158.8z"/>
        </g>
      </g>
    </g>
  `)})
}

function LinkBreakIconWrapper({d,card_dim}) {
  let g = "",
    r = d.data.rels, _r = d.data._rels || {},
    closed = d.data.hide_rels,
    areParents = r => r.father || r.mother,
    areChildren = r => r.children && r.children.length > 0;
  if ((d.is_ancestry || d.data.main) && (areParents(r) || areParents(_r))) {g+=LinkBreakIcon({x:card_dim.w/2,y:0, rt: -45, closed}).template;}
  if (!d.is_ancestry && d.added) {
    const sp = d.spouse, sp_r = sp.data.rels, _sp_r = sp.data._rels || {};
    if ((areChildren(r) || areChildren(_r)) && (areChildren(sp_r) || areChildren(_sp_r))) {
      g+=LinkBreakIcon({x:d.sx - d.x + card_dim.w/2 +24.4,y: (d.x !== d.sx ? card_dim.h/2 : card_dim.h)+1, rt: 135, closed}).template;
    }
  }
  return g
}

function CardImage({d, image, card_dim, maleIcon, femaleIcon}) {
  return ({template: (`
    <g style="transform: translate(${card_dim.img_x}px,${card_dim.img_y}px);" class="card_image" clip-path="url(#card_image_clip)">
      ${image 
        ? `<image href="${image}" height="${card_dim.img_h}" width="${card_dim.img_w}" preserveAspectRatio="xMidYMin slice" />`
        : (d.data.data.gender === "F" && !!femaleIcon) ? femaleIcon({card_dim}) 
        : (d.data.data.gender === "M" && !!maleIcon) ? maleIcon({card_dim}) 
        : GenderlessIcon()
      }      
    </g>
  `)})

  function GenderlessIcon() {
    return (`
      <g class="genderless-icon">
        <rect height="${card_dim.img_h}" width="${card_dim.img_w}" fill="rgb(59, 85, 96)" />
        <g transform="scale(${card_dim.img_w*0.001616})">
         <path transform="translate(50,40)" fill="lightgrey" d="M256 288c79.5 0 144-64.5 144-144S335.5 0 256 0 112 
            64.5 112 144s64.5 144 144 144zm128 32h-55.1c-22.2 10.2-46.9 16-72.9 16s-50.6-5.8-72.9-16H128C57.3 320 0 377.3 
            0 448v16c0 26.5 21.5 48 48 48h416c26.5 0 48-21.5 48-48v-16c0-70.7-57.3-128-128-128z" />
        </g>
      </g>
    `)
  }
}

function CalculateTree({datum, data_stash, card_dim, labels}) {
  const sx = card_dim.w+40, y = card_dim.h+50,
    lbls = labels || {};
  datum = datum ? datum : {id: "0", data: {fn: "FN", ln: "LN", gender: "M"}};
  const data = [
    {x: 0, y: 0, data: datum},
    {x: -100, y: -y, data: {rel_type: 'father', data: {label: lbls.father || "Add father", gender: "M"}}},
    {x: 100, y: -y, data: {rel_type: 'mother', data: {label: lbls.mother || "Add mother", gender: "F"}}},

    {x: sx, y: 0, data: {rel_type: 'spouse', data: {label: lbls.spouse || "Add spouse", gender: "F"}}},

    {x: -100, y: y, data: {rel_type: 'son', data: {label: lbls.son || "Add son", gender: "M"}}},
    {x: 100, y: y, data: {rel_type: 'daughter', data: {label: lbls.daughter || "Add daughter", gender: "F"}}},
  ].filter(d => shouldAddRel(d.data.rel_type));

  function shouldAddRel(rel_type) {
    if (rel_type === 'father') return !datum.rels.father || data_stash.find(d => d.id === datum.rels.father).to_add
    else if (rel_type === 'mother') return !datum.rels.mother || data_stash.find(d => d.id === datum.rels.mother).to_add
    else return true
  }

  return {data}
}

function View(tree, {store, data_stash, cont, datum, card_dim, cardEditForm, scale}) {
  const svg_dim = cont.getBoundingClientRect(),
    tree_fit = calculateTreeFit(svg_dim),
    mounted = (node) => {
      addEventListeners(node);
    };

  return {
    template: (`
      <svg id="family-tree-svg" style="width: 100%; height: 100%">
        <rect width="${svg_dim.width}" height="${svg_dim.height}" fill="transparent" />
        <g class="view">
          <g transform="translate(${tree_fit.x}, ${tree_fit.y})scale(${tree_fit.k})">
            ${tree.data.slice(1).map((d, i) => Link({d, is_vertical: !["spouse"].includes(d.data.rel_type)}).template)}
            ${tree.data.slice(1).map((d, i) => Card({d}).template)}
          </g>
        </g>
      </svg>
    `),
    mounted
  }

  function calculateTreeFit(svg_dim) {
    const k = scale || 1;
    return {k, x:svg_dim.width/2, y: svg_dim.height/2}
  }

  function Card({d, is_main}) {
    const [w, h] = is_main ? [160, 60] : [160, 40],
      pos = {x: d.x, y: d.y};

    return {template: (`
      <g transform="translate(${pos.x}, ${pos.y})" class="card" data-rel_type="${d.data.rel_type}" style="cursor: pointer">
        <g transform="translate(${-w / 2}, ${-h / 2})">
          ${CardBody({d,w,h}).template}
        </g>
      </g>
    `)
    }

    function CardBody({d,w,h}) {
      const color_class = d.data.data.gender === 'M' ? 'card-male' : d.data.data.gender === 'F' ? 'card-female' : 'card-genderless';
      return {template: (`
        <g>
          <rect width="${w}" height="${h}" fill="#fff" rx="${10}" ${d.data.main ? 'stroke="#000"' : ''} class="${color_class}" />
          <text transform="translate(${0}, ${h / 4})">
            <tspan x="${10}" dy="${14}">${d.data.data.label}</tspan>
          </text>
        </g>
      `)
      }
    }
  }

  function Link({d, is_vertical}) {
    return {template: (`
      <path d="${createPath()}" fill="none" stroke="#fff" />
    `)}

    function createPath() {
      const {w,h} = card_dim;
      let parent = (is_vertical && d.y < 0)
        ? {x: 0, y: -h/2}
        : (is_vertical && d.y > 0)
        ? {x: 0, y: h/2}
        : (!is_vertical && d.x < 0)
        ? {x: -w/2, y: 0}
        : (!is_vertical && d.x > 0)
        ? {x: w/2, y: 0}
        : {x: 0, y: 0};


      if (is_vertical) {
        return (
          "M" + d.x + "," + d.y
          + "C" + (d.x) + "," + (d.y + (d.y < 0 ? 50 : -50))
          + " " + (parent.x) + "," + (parent.y + (d.y < 0 ? -50 : 50))
          + " " + parent.x + "," + parent.y
        )
      } else {
        const s = d.x > 0 ? +1 : -1;
        return (
          "M" + d.x + "," + d.y
          + "C" + (parent.x + 50*s) + "," + d.y
          + " " + (parent.x + 150*s) + "," + parent.y
          + " " + parent.x + "," + parent.y
        )
      }
    }
  }

  function addEventListeners(view) {
    view.addEventListener("click", e => {
      const node = e.target;
      handleCardClick(node) || view.remove();
    });

    function handleCardClick(node) {
      if (!node.closest('.card')) return
      const card = node.closest('.card'),
        rel_type = card.getAttribute("data-rel_type"),
        rel_datum = datum,
        new_datum = createNewPersonWithGenderFromRel({rel_datum, rel_type}),
        postSubmit = () => {
          view.remove();
          addNewPerson({data_stash, datum: new_datum});
          handleRelsOfNewDatum({datum: new_datum, data_stash, rel_datum, rel_type});
          store.update.tree();
        };
      cardEditForm({datum: new_datum, rel_datum, rel_type, postSubmit, store});
      return true
    }
  }

}

function AddRelativeTree(props) {
  const tree = CalculateTree(props),
    view = View(tree, props);

  const div_add_relative = document.createElement("div");
  div_add_relative.style.cssText = "width: 100%; height: 100%; position: absolute; top: 0; left: 0;background-color: rgba(0,0,0,.3);opacity: 0";
  div_add_relative.innerHTML = view.template;

  props.cont.appendChild(div_add_relative);
  view.mounted(div_add_relative);
  d3.select(div_add_relative).transition().duration(props.transition_time).delay(props.transition_time/4).style("opacity", 1);
}

function cardChangeMain(store, {card, d}) {
  toggleAllRels(store.getTree().data, false);
  store.update.mainId(d.data.id);
  store.update.tree({tree_position: 'inherit'});
  return true
}

function cardEdit(store, {card, d, cardEditForm}) {
  const datum = d.data,
    postSubmit = (props) => {
      if (datum.to_add) moveToAddToAdded(datum, store.getData());
      if (props && props.delete) {
        if (datum.main) store.update.mainId(null);
        deletePerson(datum, store.getData());
      }
      store.update.tree();
    };
  cardEditForm({datum, postSubmit, store});
}

function cardShowHideRels(store, {card, d}) {
  d.data.hide_rels = !d.data.hide_rels;
  toggleRels(d, d.data.hide_rels);
  store.update.tree({tree_position: 'inherit'});
}

function Card(props) {
  props = setupProps(props);
  const store = props.store;
  setupSvgDefs();

  return function ({node, d}) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", 'g'),
      gender_class = d.data.data.gender === 'M' ? 'card-male' : d.data.data.gender === 'F' ? 'card-female' : 'card-genderless',
      card_dim = props.card_dim,
      show_mini_tree = !isAllRelativeDisplayed(d, store.state.tree.data),
      unknown_lbl = props.cardEditForm ? 'ADD' : 'UNKNOWN',

      mini_tree = () => !d.data.to_add && show_mini_tree ? MiniTree({d,card_dim}).template : '',
      card_body_outline = () => CardBodyOutline({d,card_dim,is_new:d.data.to_add}).template,
      card_body = () => !d.data.to_add ? CardBody({d,card_dim, card_display: props.card_display}).template : CardBodyAddNew({d,card_dim, card_add: props.cardEditForm, label: unknown_lbl}).template,
      card_image = () => !d.data.to_add ? CardImage({d, image: d.data.data.avatar || null, card_dim, maleIcon: null, femaleIcon: null}).template : '',
      edit_icon = () => !d.data.to_add && props.cardEditForm ? PencilIcon({card_dim, x: card_dim.w-46, y: card_dim.h-20}).template : '',
      add_icon = () => !d.data.to_add && props.cardEditForm ? PlusIcon({card_dim, x: card_dim.w-26, y: card_dim.h-20}).template : '',
      link_break_icon = () => LinkBreakIconWrapper({d,card_dim}),
      custom_elements = () => props.custom_elements ? props.custom_elements.map(d => d.el).join('\n') : '';

    el.innerHTML = (`
      <g class="card ${gender_class}" data-id="${d.data.id}" data-cy="card">
        <g transform="translate(${-card_dim.w / 2}, ${-card_dim.h / 2})">
          ${props.mini_tree ? mini_tree() : ''}
          ${card_body_outline()}
          <g clip-path="url(#card_clip)">
            ${card_body()}
            ${card_image()}
            ${edit_icon()}
            ${add_icon()}
            ${custom_elements()}
          </g>
          ${props.link_break ? link_break_icon() : ''}
        </g>
      </g>
    `);
    setupListeners(el, d, store);

    return el
  }

  function setupListeners(el, d, store) {
    let p;

    p = el.querySelector(".card");
    if (p) p.addEventListener("click", (e) => {e.stopPropagation();cardChangeMain(store, {card:el, d});});

    p = el.querySelector(".card_edit");
    if (p && props.cardEditForm) p.addEventListener("click", (e) => {e.stopPropagation();cardEdit(store, {card:el, d, cardEditForm: props.cardEditForm});});

    p = el.querySelector(".card_add");
    if (p && props.cardEditForm) p.addEventListener("click", (e) => {e.stopPropagation();cardEdit(store, {card:el, d, cardEditForm: props.cardEditForm});});

    p = el.querySelector(".card_add_relative");
    if (p) p.addEventListener("click", (e) => {e.stopPropagation();props.addRelative({d});});

    p = el.querySelector(".card_family_tree");
    if (p) p.addEventListener("click", (e) => {e.stopPropagation();cardChangeMain(store, {card:el, d});});

    p = el.querySelector(".card_break_link");
    if (p) p.addEventListener("click", (e) => {e.stopPropagation();cardShowHideRels(store, {card:el, d});});

    for (let i = 0; i < (props.custom_elements || []).length; i++) {
      const datum = props.custom_elements[i];
      p = el.querySelector(datum.query);
      if (p) p.addEventListener("click", (e) => {e.stopPropagation();datum.lis(store, {card:el, d});});
    }
  }

  function setupSvgDefs() {
    if (props.svg.querySelector("defs#f3CardDef")) return
    const card_dim = props.card_dim;
    props.svg.insertAdjacentHTML('afterbegin', (`
      <defs id="f3CardDef">
        <linearGradient id="fadeGrad">
          <stop offset="0.9" stop-color="white" stop-opacity="0"/>
          <stop offset=".91" stop-color="white" stop-opacity=".5"/>
          <stop offset="1" stop-color="white" stop-opacity="1"/>
        </linearGradient>
        <mask id="fade" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#fadeGrad)"/></mask>
        <clipPath id="card_clip"><path d="${curvedRectPath({w:card_dim.w, h:card_dim.h}, 5)}"></clipPath>
        <clipPath id="card_text_clip"><rect width="${card_dim.w-card_dim.text_x-10}" height="${card_dim.h-10}"></rect></clipPath>
        <clipPath id="card_image_clip"><path d="M0,0 Q 0,0 0,0 H${card_dim.img_w} V${card_dim.img_h} H0 Q 0,${card_dim.img_h} 0,${card_dim.img_h} z"></clipPath>
        <clipPath id="card_image_clip_curved"><path d="${curvedRectPath({w: card_dim.img_w, h:card_dim.img_h}, 5, ['rx', 'ry'])}"></clipPath>
      </defs>
    `));

    function curvedRectPath(dim, curve, no_curve_corners) {
      const {w,h} = dim,
        c = curve,
        ncc = no_curve_corners || [],
        ncc_check = (corner) => ncc.includes(corner),
        lx = ncc_check('lx') ? `M0,0` : `M0,${c} Q 0,0 5,0`,
        rx = ncc_check('rx') ? `H${w}` : `H${w-c} Q ${w},0 ${w},5`,
        ry = ncc_check('ry') ? `V${h}` : `V${h-c} Q ${w},${h} ${w-c},${h}`,
        ly = ncc_check('ly') ? `H0` : `H${c} Q 0,${h} 0,${h-c}`;

      return (`${lx} ${rx} ${ry} ${ly} z`)
    }
  }

  function setupProps(props) {
    const default_props = {
      mini_tree: true,
      link_break: true,
      card_dim: {w:220,h:70,text_x:75,text_y:15,img_w:60,img_h:60,img_x:5,img_y:5}
    };
    if (!props) props = {};
    for (const k in default_props) {
      if (typeof props[k] === 'undefined') props[k] = default_props[k];
    }
    return props
  }
}

function d3AnimationView({store, cont, Card: Card$1}) {
  const svg = createSvg();
  setupSvg(svg, store.state.zoom_polite);

  return {update: updateView, svg, setCard: card => Card$1 = card}

  function updateView(props) {
    if (!props) props = {};
    const tree = store.state.tree,
      view = d3.select(svg).select(".view"),
      tree_position = props.tree_position || 'fit',
      transition_time = props.hasOwnProperty('transition_time') ? props.transition_time : 2000;

    updateCards();
    updateLinks();
    if (props.initial) treeFit({svg, svg_dim: svg.getBoundingClientRect(), tree_dim: tree.dim, transition_time: 0});
    else if (tree_position === 'fit') treeFit({svg, svg_dim: svg.getBoundingClientRect(), tree_dim: tree.dim, transition_time});
    else if (tree_position === 'main_to_middle') mainToMiddle({datum: tree.data[0], svg, svg_dim: svg.getBoundingClientRect(), scale: props.scale, transition_time});
    else ;

    return true

    function updateLinks() {
      const links_data = tree.data.reduce((acc, d) => acc.concat(createLinks({d, tree:tree.data})), []),
        link = view.select(".links_view").selectAll("path.link").data(links_data, d => d.id),
        link_exit = link.exit(),
        link_enter = link.enter().append("path").attr("class", "link"),
        link_update = link_enter.merge(link);

      link_exit.each(linkExit);
      link_enter.each(linkEnter);
      link_update.each(linkUpdate);

      function linkEnter(d) {
        d3.select(this).attr("fill", "none").attr("stroke", "#fff").style("opacity", 0)
          .attr("d", createPath(d, true));
      }

      function linkUpdate(d) {
        const path = d3.select(this);
        const delay = calculateDelay(d);
        path.transition('path').duration(transition_time).delay(delay).attr("d", createPath(d)).style("opacity", 1);
      }

      function linkExit(d) {
        const path = d3.select(this);
        path.transition('op').duration(800).style("opacity", 0);
        path.transition('path').duration(transition_time).attr("d", createPath(d, true))
          .on("end", () => path.remove());
      }

    }

    function updateCards() {
      const card = view.select(".cards_view").selectAll("g.card_cont").data(tree.data, d => d.data.id),
        card_exit = card.exit(),
        card_enter = card.enter().append("g").attr("class", "card_cont"),
        card_update = card_enter.merge(card);

      card_exit.each(d => calculateEnterAndExitPositions(d, false, true));
      card_enter.each(d => calculateEnterAndExitPositions(d, true, false));

      card_exit.each(cardExit);
      card.each(cardUpdateNoEnter);
      card_enter.each(cardEnter);
      card_update.each(cardUpdate);

      function cardEnter(d) {
        d3.select(this)
          .attr("transform", `translate(${d._x}, ${d._y})`)
          .style("opacity", 0)
          .node().appendChild(CardElement(this, d));
      }

      function cardUpdateNoEnter(d) {}

      function cardUpdate(d) {
        this.innerHTML = "";
        this.appendChild(CardElement(this, d));
        const delay = calculateDelay(d);
        d3.select(this).transition().duration(transition_time).delay(delay).attr("transform", `translate(${d.x}, ${d.y})`).style("opacity", 1);
      }

      function cardExit(d) {
        const g = d3.select(this);
        g.transition().duration(transition_time).style("opacity", 0).attr("transform", `translate(${d._x}, ${d._y})`)
          .on("end", () => g.remove());
      }

      function CardElement(node, d) {
        if (Card$1) return Card$1({node, d})
        else return Card({store, svg})({node, d})
      }
    }

    function calculateDelay(d) {
      if (!props.initial) return 0
      const delay_level = 800,
        ancestry_levels = Math.max(...tree.data.map(d=>d.is_ancestry ? d.depth : 0));
      let delay = d.depth*delay_level;
      if ((d.depth !== 0 || !!d.spouse) && !d.is_ancestry) {
        delay+=(ancestry_levels)*delay_level;  // after ancestry
        if (d.spouse) delay+=delay_level;  // spouse after bloodline
        delay+=(d.depth)*delay_level;  // double the delay for each level because of additional spouse delay
      }
      return delay
    }

  }

  function createSvg() {
    const svg_dim = cont.getBoundingClientRect(),
      svg_html = (`
        <svg class="main_svg">
          <rect width="${svg_dim.width}" height="${svg_dim.height}" fill="transparent" />
          <g class="view">
            <g class="links_view"></g>
            <g class="cards_view"></g>
          </g>
          <g style="transform: translate(100%, 100%)">
            <g class="fit_screen_icon cursor-pointer" style="transform: translate(-50px, -50px); display: none">
              <rect width="27" height="27" stroke-dasharray="${27/2}" stroke-dashoffset="${27/4}" 
                style="stroke:#fff;stroke-width:4px;fill:transparent;"/>
              <circle r="5" cx="${27/2}" cy="${27/2}" style="fill:#fff" />          
            </g>
          </g>
        </svg>
      `);
    const fake_cont = document.createElement("div");
    fake_cont.innerHTML = svg_html;
    const svg = fake_cont.firstElementChild;
    cont.innerHTML = "";
    cont.appendChild(svg);

    return svg
  }
}

function createStore(initial_state) {
  let onUpdate;
  const state = initial_state,
    update = {
      tree: (props) => {
        state.tree = calcTree();
        if (onUpdate) onUpdate(props);
      },
      mainId: main_id => state.main_id = main_id,
      data: data => state.data = data
    },
    getData = () => state.data,
    getTree = () => state.tree,
    setOnUpdate = (f) => onUpdate = f,
    methods = {};

  return {state, update, getData, getTree, setOnUpdate, methods}


  function calcTree() {
    return CalculateTree$1({
      data_stash: state.data, main_id: state.main_id,
      node_separation: state.node_separation, level_separation: state.level_separation
    })
  }
}

function AddRelative({store, cont, card_dim, cardEditForm, labels}) {
  return function ({d, scale}) {
    const transition_time = 1000;

    if (!scale && window.innerWidth < 650) scale = window.innerWidth / 650;
    toggleAllRels(store.getTree().data, false);
    store.update.mainId(d.data.id);
    store.update.tree({tree_position: 'main_to_middle', transition_time, scale});
    const props = {
      store,
      data_stash: store.getData(),
      cont,
      datum: d.data,
      transition_time,
      scale,
      card_dim,
      cardEditForm,
      labels
    };
    AddRelativeTree(props);
  }
}

var handlers = /*#__PURE__*/Object.freeze({
__proto__: null,
moveToAddToAdded: moveToAddToAdded,
removeToAdd: removeToAdd,
deletePerson: deletePerson,
manualZoom: manualZoom,
isAllRelativeDisplayed: isAllRelativeDisplayed,
generateUUID: generateUUID,
cardChangeMain: cardChangeMain,
cardEdit: cardEdit,
cardShowHideRels: cardShowHideRels,
handleRelsOfNewDatum: handleRelsOfNewDatum,
createNewPerson: createNewPerson,
createNewPersonWithGenderFromRel: createNewPersonWithGenderFromRel,
addNewPerson: addNewPerson,
createTreeDataWithMainNode: createTreeDataWithMainNode,
addNewPersonAndHandleRels: addNewPersonAndHandleRels,
checkIfRelativesConnectedWithoutPerson: checkIfRelativesConnectedWithoutPerson,
AddRelative: AddRelative
});

var elements = /*#__PURE__*/Object.freeze({
__proto__: null,
CardBody: CardBody,
CardBodyAddNew: CardBodyAddNew,
CardBodyOutline: CardBodyOutline,
PencilIcon: PencilIcon,
HideIcon: HideIcon,
MiniTree: MiniTree,
PlusIcon: PlusIcon,
LinkBreakIcon: LinkBreakIcon,
LinkBreakIconWrapper: LinkBreakIconWrapper,
CardImage: CardImage,
Card: Card
});

var index = {
  CalculateTree: CalculateTree$1,
  createStore,
  d3AnimationView,
  handlers,
  elements
};

return index;

}));
