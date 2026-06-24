import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Select, TextField,
  Typography, FormControlLabel, Radio, RadioGroup,
  Paper, List, ListItemButton, ListItemText, ClickAwayListener,
} from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import SearchIcon from '@mui/icons-material/Search';
import axios from 'axios';
import * as d3 from 'd3';

const emptyMember = {
  name: '',
  parent_id: '',
  spouse_id: '',
  father_name: '',
  mother_name: '',
  wife_name: '',
  urdu_name: '',
  birth_date: '',
  death_date: '',
  info: '',
  photo: null,
  is_alive: true,
};

function TreeView({ user }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const zoomRef = useRef(null);
  const nodePositionsRef = useRef({});

  const [members, setMembers] = useState([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [editData, setEditData] = useState(emptyMember);
  const [newMember, setNewMember] = useState(emptyMember);
  const [addDialogTitle, setAddDialogTitle] = useState('Add Member');
  const [popupMember, setPopupMember] = useState(null);
  const [popupAnchor, setPopupAnchor] = useState({ x: 0, y: 0 });
  const [collapsedNodes, setCollapsedNodes] = useState(new Set());

  const [printMember, setPrintMember] = useState(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printMode, setPrintMode] = useState('malook');

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsMember, setDetailsMember] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);

  const token = localStorage.getItem('token');
  const role = user?.role;
  const canAdd = role === 'admin' || role === 'member';
  const canEditDelete = role === 'admin';

  // ---------- collapse toggle ----------
  const toggleNode = useCallback((nodeId) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  // ---------- safe zoom controls ----------
  const zoomIn = () => { if (zoomRef.current) d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.5); };
  const zoomOut = () => { if (zoomRef.current) d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 0.7); };
  const zoomReset = () => { if (zoomRef.current) d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.transform, d3.zoomIdentity); };

  // ---------- open details popup (non-admin) ----------
  const openDetails = useCallback((member) => {
    if (canEditDelete) return;
    setDetailsMember(member);
    setDetailsOpen(true);
  }, [canEditDelete]);

  const handlePrintFromDetails = () => {
    if (!detailsMember) return;
    setDetailsOpen(false);
    setPrintMember(detailsMember);
    setPrintMode('malook');
    setPrintDialogOpen(true);
  };

  // ---------- open add form ----------
  const openAddMemberForm = useCallback((relation, member = null) => {
    if (!member) {
      setAddDialogTitle('Add Member');
      setNewMember({ ...emptyMember });
      setOpen(true);
      return;
    }
    let newData = { ...emptyMember };
    if (relation === 'child') {
      newData.parent_id = member.id;
      newData.father_name = member.name || '';
      newData.mother_name = member.wife_name || '';
      setAddDialogTitle(`Add Child of ${member.name}`);
    } else if (relation === 'sibling') {
      newData.parent_id = member.parent_id || '';
      const parent = members.find(m => m.id === member.parent_id);
      if (parent) {
        newData.father_name = parent.name || '';
        newData.mother_name = parent.wife_name || '';
      }
      setAddDialogTitle(`Add Bhai/Behan of ${member.name}`);
    } else if (relation === 'wife') {
      newData.spouse_id = member.id;
      setAddDialogTitle(`Add Bivi of ${member.name}`);
    }
    setPopupMember(null);
    setNewMember(newData);
    setOpen(true);
  }, [members]);

  // ---------- load tree data ----------
  const loadData = useCallback(async () => {
    try {
      const res = await axios.get('/api/tree');
      const nodes = Array.isArray(res.data) ? res.data : [];
      const processed = nodes.map(n => ({
        ...n,
        is_alive: n.is_alive !== undefined ? n.is_alive : !n.death_date,
        father_name: n.father_name || '',
        mother_name: n.mother_name || '',
        wife_name: n.wife_name || '',
        urdu_name: n.urdu_name || '',
        birth_date: n.birth_date ? n.birth_date.split('-')[0] : '',
        death_date: n.death_date ? n.death_date.split('-')[0] : '',
        info: n.info || '',
        photo: n.photo || null,
        spouse_name: n.spouse_name_db || n.wife_name || '',
        spouse_node_id: n.spouse_node_id || null,
      }));
      setMembers(processed);
    } catch (err) {
      console.error('Failed to load tree:', err);
      setMembers([]);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ---------- relative generation from Malook Shah ----------
  const getRelativeGen = useCallback((member) => {
    if (!member || members.length === 0) return 'N/A';
    const malook = members.find(m => m.name?.includes('Malook Shah'));
    const root = malook || (members.find(m => !m.parent_id && !m.spouse_id) || members[0]);
    if (member.generation_number != null && root.generation_number != null) {
      const gen = (member.generation_number - root.generation_number) + 1;
      if (gen >= 1) return gen;
    }
    if (member.id === root.id) return 1;
    let count = 0;
    let cur = member;
    while (cur?.parent_id) {
      count++;
      cur = members.find(m => m.id === cur.parent_id);
      if (!cur) break;
      if (cur.id === root.id) break;
    }
    return count + 1;
  }, [members]);

  // ---------- Search filter (with relative gen) ----------
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    const q = searchQuery.toLowerCase();
    const results = members
      .filter(m => m.name.toLowerCase().includes(q))
      .map(m => ({
        id: m.id,
        name: m.name,
        genRelative: getRelativeGen(m),
        genText: (() => {
          const g = getRelativeGen(m);
          if (g === 'N/A') return 'N/A';
          const suffix = g === 1 ? 'st' : g === 2 ? 'nd' : g === 3 ? 'rd' : 'th';
          return `${g}${suffix} Generation`;
        })(),
      }))
      .sort((a, b) => (a.genRelative === 'N/A' ? 0 : a.genRelative) - (b.genRelative === 'N/A' ? 0 : b.genRelative))
      .slice(0, 20);
    setSearchResults(results);
    setSearchOpen(results.length > 0);
  }, [searchQuery, members, getRelativeGen]);

  // ---------- Zoom to node ----------
  const zoomToNode = useCallback((nodeId) => {
    const pos = nodePositionsRef.current[nodeId];
    if (!pos || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    const width = svg.attr('width');
    const height = svg.attr('height');
    const scale = 20;
    const centerX = pos.x + pos.w / 2;
    const centerY = pos.y + pos.h / 2;
    const transform = d3.zoomIdentity.translate(width / 2, height / 2).scale(scale).translate(-centerX, -centerY);
    svg.transition().duration(750).call(zoomRef.current.transform, transform);
  }, []);

  // ---------- generation text for detail popup ----------
  const getGenerationText = useCallback((member) => {
    if (!member || members.length === 0) return 'N/A';
    const g = getRelativeGen(member);
    if (g === 'N/A') return 'N/A';
    const suffix = g === 1 ? 'st' : g === 2 ? 'nd' : g === 3 ? 'rd' : 'th';
    return `${g}${suffix} Generation`;
  }, [members, getRelativeGen]);

  // ---------- D3 tree drawing ----------
  const drawTree = useCallback((svgNode, data, collapseSet = new Set(), editable = true) => {
    const svg = d3.select(svgNode);
    svg.selectAll('*').remove();
    const solidColor = '#2E7D32';
    const isMobile = window.innerWidth < 768;
    const boxW = isMobile ? 220 : 270, boxH = isMobile ? 180 : 210, nodeW = isMobile ? 300 : 380, nodeH = isMobile ? 240 : 270;
    const fontSize = isMobile ? '10px' : '12px', small = isMobile ? '8px' : '10px', padding = 300;
    const rootMember = data.find(m => !m.parent_id && !m.spouse_id) || data[0];
    if (!rootMember) return;
    const build = pid => data.filter(m => m.parent_id === pid && !m.spouse_id).map(c => ({ ...c, children: build(c.id) }));
    let root = d3.hierarchy({ ...rootMember, children: build(rootMember.id) });
    root.each(n => { if (collapseSet.has(n.data.id) && n.children) { n._children = n.children; n.children = null; } });
    const tree = d3.tree().nodeSize([nodeW, nodeH]);
    tree(root);
    const nodes = root.descendants(), links = root.links();
    const posMap = {};
    nodes.forEach(n => posMap[n.data.id] = { x: n.x - boxW/2, y: n.y, w: boxW, h: boxH });
    nodePositionsRef.current = posMap;
    const minX = d3.min(nodes, d => d.x)||0, maxX = d3.max(nodes, d => d.x)||0, minY = d3.min(nodes, d => d.y)||0, maxY = d3.max(nodes, d => d.y)||0;
    const width = Math.max(maxX - minX + padding*2 + boxW, 800), height = Math.max(maxY - minY + padding*2 + boxH, 600);
    svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);
    const g = svg.append('g');
    const zoom = d3.zoom().scaleExtent([0.01, 50]).on('zoom', e => g.attr('transform', `translate(${e.transform.x}, ${e.transform.y}) scale(${e.transform.k})`));
    svg.call(zoom);
    svg.call(zoom.transform, d3.zoomIdentity.translate(width/2 - (minX+maxX)/2, height/2 - (minY+maxY)/2).scale(1.3));
    if (editable) zoomRef.current = zoom;

    const getAncestors = (id) => { const anc=[]; let pid=data.find(m=>m.id===id)?.parent_id; while(pid){ anc.push(pid); pid=data.find(m=>m.id===pid)?.parent_id; } return anc; };
    const calcAge = (b,d) => { const by=parseInt(b), dy=parseInt(d); if(by&&dy) return `${dy-by}y`; if(by) return `${new Date().getFullYear()-by}y`; return ''; };

    g.selectAll('.link').data(links, d=>d.target.data.id)
      .join(enter=>enter.append('path').attr('fill','none').attr('stroke',solidColor).attr('stroke-width',3).attr('d',d=>{ const sx=d.source.x,sy=d.source.y+boxH,tx=d.target.x,ty=d.target.y,my=(sy+ty)/2; return `M${sx},${sy} L${sx},${my} L${tx},${my} L${tx},${ty}`; }),
            update=>update.transition().duration(500).attr('d',d=>{ const sx=d.source.x,sy=d.source.y+boxH,tx=d.target.x,ty=d.target.y,my=(sy+ty)/2; return `M${sx},${sy} L${sx},${my} L${tx},${my} L${tx},${ty}`; }),
            exit=>exit.remove());

    const nodeGroup = g.selectAll('.node').data(nodes, d=>d.data.id)
      .join(enter=>{
        const gEnter = enter.append('g').attr('class','node').attr('transform',d=>`translate(${d.x-boxW/2}, ${d.y})`);
        gEnter.append('rect').attr('class','node-card').attr('width',boxW).attr('height',boxH).attr('rx',12).attr('ry',12).attr('fill','#ffffffcc').attr('stroke',d=>d.data.is_alive?solidColor:'#999').attr('stroke-width',2.5).attr('cursor','pointer');
        gEnter.append('rect').attr('width',boxW).attr('height',6).attr('rx',3).attr('fill',d=>d.data.is_alive?solidColor:'#999');
        gEnter.append('foreignObject').attr('width',boxW-20).attr('height',boxH-60).attr('x',10).attr('y',10)
          .append('xhtml:div').attr('class','node-content').style('width','100%').style('height','100%').style('display','flex').style('flex-direction','column').style('align-items','center').style('justify-content','center').style('text-align','center').style('font-size',fontSize).style('color',d=>d.data.is_alive?'#333':'#999')
          .html(d=>{
            const name=d.data.name, father=d.data.father_name?`<span style="font-size:${small}">(s/o ${d.data.father_name})</span>`:'';
            const birth=d.data.birth_date||'', death=d.data.death_date||'';
            const years=birth||death?`<div style="font-size:${small}">${birth}${death?'-'+death:''}</div>`:'';
            const age=calcAge(d.data.birth_date,d.data.death_date), ageStr=age?`<div style="font-size:${small};color:#FF9800">Age: ${age}</div>`:'';
            const status=d.data.is_alive?'<span class="alive-badge">Alive</span>':'<span class="deceased-badge">🕌</span>';
            const urdu=d.data.urdu_name?`<div class="urdu-name">${d.data.urdu_name}</div>`:'';
            const spouseLine=d.data.spouse_name?`<div class="spouse-sticker">💍 ${d.data.spouse_name}</div>`:'';
            return `<b>${name}</b>${father}${urdu}<div>${status}</div>${years}${ageStr}${spouseLine}`;
          });
        gEnter.each(function(d){ const div=d3.select(this).select('.node-content'); if(!div.empty()) d._originalHTML=div.html(); });
        gEnter.on('click',(event,d)=>{ event.stopPropagation(); if(!canEditDelete) openDetails(d.data); });
        if(canEditDelete){ gEnter.on('dblclick',(event,d)=>{ event.stopPropagation(); const rect=event.currentTarget.getBoundingClientRect(); setPopupMember(d.data); setPopupAnchor({x:rect.left+rect.width/2, y:rect.bottom+8}); }); }
        gEnter.each(function(d){
          const hasChildren=(d.children&&d.children.length>0)||(d._children&&d._children.length>0);
          if(hasChildren){ const btnGrp=d3.select(this).append('g').attr('class','toggle-btn').attr('transform','translate(6,14)').attr('cursor','pointer').on('click',event=>{ event.stopPropagation(); toggleNode(d.data.id); }); btnGrp.append('circle').attr('r',10).attr('fill','#fff').attr('stroke','#555').attr('stroke-width',1.5); btnGrp.append('text').attr('text-anchor','middle').attr('dy','0.35em').attr('font-size','14px').attr('font-weight','bold').attr('fill','#333').text(d.children?'–':'+'); }
          if(canAdd){
            const addCtrl=(symbol,x,color,onClick,title)=>{ const ctrl=d3.select(this).append('g').attr('transform',`translate(${x}, ${boxH-32})`).attr('cursor','pointer').on('click',event=>{ event.stopPropagation(); onClick(d); }); ctrl.append('rect').attr('width',46).attr('height',24).attr('rx',12).attr('fill','#fff').attr('stroke',color).attr('stroke-width',1.4); ctrl.append('text').attr('x',23).attr('y',17).attr('text-anchor','middle').attr('font-size','16px').attr('font-weight',700).attr('fill',color).text(symbol).append('title').text(title); };
            addCtrl('\u2193',18,solidColor,(node)=>openAddMemberForm('child',node.data),'Child add karein');
            addCtrl('\u2194',boxW/2-23,'#1565C0',(node)=>openAddMemberForm('sibling',node.data),'Sibling add karein');
            addCtrl('\u2661',boxW-64,'#C2185B',(node)=>openAddMemberForm('wife',node.data),'Bivi add karein');
          }
        });
        return gEnter;
      },
      update=>update.transition().duration(500).attr('transform',d=>`translate(${d.x-boxW/2}, ${d.y})`),
      exit=>exit.remove());

    nodeGroup.on('mouseenter',function(event,d){
      const ancIds=getAncestors(d.data.id);
      g.selectAll('.node rect.node-card').attr('stroke',n=>ancIds.includes(n.data.id)?'#4fc3f7':n.data.is_alive?solidColor:'#999').attr('fill',n=>ancIds.includes(n.data.id)?'#e1f5fe':'#ffffffcc');
      if(d.data.photo){ const photoSrc=d.data.photo.startsWith('http')?d.data.photo:`/uploads/${d.data.photo}`; d3.select(this).select('.node-content').html(`<img src="${photoSrc}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" />`); }
    }).on('mouseleave',function(event,d){
      g.selectAll('.node rect.node-card').attr('stroke',n=>n.data.is_alive?solidColor:'#999').attr('fill','#ffffffcc');
      if(d._originalHTML) d3.select(this).select('.node-content').html(d._originalHTML);
    });
  }, [canAdd,canEditDelete,openDetails,toggleNode,openAddMemberForm]);

  useEffect(()=>{ if(members.length>0) drawTree(svgRef.current,members,collapsedNodes,true); else d3.select(svgRef.current).selectAll('*').remove(); },[members,collapsedNodes,drawTree]);

  // ---------- CRUD handlers ----------
  const handleAddMember = async () => {
    if (!newMember.name.trim()) { alert('Name required'); return; }
    const fd = new FormData();
    fd.append('name', newMember.name);
    if (newMember.parent_id) fd.append('parent_id', newMember.parent_id);
    if (newMember.spouse_id) fd.append('spouse_id', newMember.spouse_id);
    fd.append('father_name', newMember.father_name);
    fd.append('mother_name', newMember.mother_name);
    fd.append('wife_name', newMember.wife_name);
    fd.append('urdu_name', newMember.urdu_name);
    fd.append('birth_date', newMember.birth_date || '');
    fd.append('death_date', newMember.death_date || '');
    fd.append('is_alive', newMember.is_alive);
    fd.append('info', newMember.info);
    if (newMember.photo) fd.append('photo', newMember.photo);
    try {
      await axios.post('/api/tree', fd, { headers: { 'x-auth-token': token, 'Content-Type': 'multipart/form-data' } });
      setOpen(false);
      loadData();
    } catch (err) { alert(err.response?.data?.msg || 'Failed to add'); }
  };

  const handleEditMember = async () => {
    if (!editData.name.trim()) { alert('Name required'); return; }
    const fd = new FormData();
    fd.append('name', editData.name);
    if (editData.parent_id) fd.append('parent_id', editData.parent_id);
    if (editData.spouse_id) fd.append('spouse_id', editData.spouse_id);
    fd.append('father_name', editData.father_name);
    fd.append('mother_name', editData.mother_name);
    fd.append('wife_name', editData.wife_name);
    fd.append('urdu_name', editData.urdu_name);
    fd.append('birth_date', editData.birth_date || '');
    fd.append('death_date', editData.death_date || '');
    fd.append('is_alive', editData.is_alive);
    fd.append('info', editData.info);
    if (editData.photo) fd.append('photo', editData.photo);
    try {
      await axios.put(`/api/tree/${editingMember.id}`, fd, { headers: { 'x-auth-token': token, 'Content-Type': 'multipart/form-data' } });
      setEditOpen(false);
      loadData();
    } catch (err) { alert(err.response?.data?.msg || 'Failed to update'); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Kya aap "${name}" ko delete karna chahte hain?`)) return;
    try {
      await axios.delete(`/api/tree/${id}`, { headers: { 'x-auth-token': token } });
      setPopupMember(null);
      loadData();
    } catch (err) { alert(err.response?.data?.msg || 'Delete failed'); }
  };

  // ---------- PRINT HANDLER (FIXED: ID mapping + robust root matching) ----------
  const handlePrint = useCallback(async () => {
    setPrintDialogOpen(false);
    if (!printMember) return;
    try {
      const res = await axios.get('/api/whole-data');
      const wholeData = res.data;

      // Root names
      const rootNames = {
        adam: 'Hazrat Adam (A.S)',
        ali: 'Hazrat Ali Karamullah Wajahu',
        malook: 'Hazrat Syed Muhammad Malook Shah Sherazi RA',
      };
      const rootName = rootNames[printMode];
      const root = wholeData.find(m => m.name === rootName);
      if (!root) { alert(`Root "${rootName}" not found.`); return; }

      // ==== ID MAPPING ====
      let searchId = printMember.id;
      if (printMember.source === 'tree_nodes') searchId = printMember.id + 100000;
      else if (printMember.source === 'ali_sherazia') searchId = printMember.id + 50000;
      // prophets ki id same rehti hai

      let cur = wholeData.find(m => m.id === searchId);
      if (!cur) {
        const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ');
        cur = wholeData.find(m => norm(m.name) === norm(printMember.name));
      }
      if (!cur) { alert(`Member "${printMember.name}" not found.`); return; }

      const selectedNode = cur;
      const map = {}; wholeData.forEach(m => map[m.id] = m);

      // Path
      const path = [];
      let current = selectedNode;
      while (current) {
        path.push(current);
        if (current.id === root.id) break;
        current = map[current.parent_id];
        if (!current) break;
      }
      if (path.length === 0 || path[path.length - 1].id !== root.id) {
        alert(`${printMember.name} is not a descendant of ${root.name}.`);
        return;
      }
      path.reverse();

      const isProphetOrImam = (name, source) => {
        if (source === 'prophets') return true;
        const lower = name.toLowerCase();
        return lower.includes('imam') || (lower.includes('hazrat') && (lower.includes('muhammad') || lower.includes('ali') || lower.includes('hussain') || lower.includes('hasan')));
      };

      const chainStr = path.map((node, idx) => {
        const gen = printMode === 'adam' ? node.generation_number : (node.generation_number - root.generation_number + 1);
        const bold = isProphetOrImam(node.name, node.source);
        return `<span style="font-weight:${bold ? 'bold' : 'normal'}">${gen}. ${node.name}</span>`;
      }).join(' => ');

      const memberId = selectedNode.id;
      const fatherId = selectedNode.parent_id;
      const father = fatherId ? wholeData.find(m => m.id === fatherId) : null;
      const motherName = selectedNode.mother_name || 'N/A';
      const spouseName = selectedNode.spouse_name_db || selectedNode.wife_name || 'N/A';
      const childrenCount = wholeData.filter(m => m.parent_id === memberId).length;
      const siblings = fatherId ? wholeData.filter(m => m.parent_id === fatherId && m.id !== memberId) : [];
      const siblingsCount = siblings.length;
      let unclesCount = 0;
      if (father && father.parent_id) {
        unclesCount = wholeData.filter(m => m.parent_id === father.parent_id && m.id !== father.id).length;
      }

      const photoUrl = selectedNode.photo 
        ? (selectedNode.photo.startsWith('http') ? selectedNode.photo : `/uploads/${selectedNode.photo}`) 
        : null;

      const detailsHTML = `
        <div style="margin-top:14px;border-top:2px solid #2E7D32;padding-top:10px;font-size:11px;">
          <h3 style="color:#2E7D32;margin:0 0 8px;font-size:13px;">Selected Member Details</h3>
          ${photoUrl ? `<div style="text-align:center;margin-bottom:8px;"><img src="${photoUrl}" style="max-width:100px;max-height:100px;border-radius:6px;" /></div>` : ''}
          <table style="width:100%; border-collapse: collapse; font-size:11px;">
            <tr><td style="padding:5px; font-weight:bold; border-bottom:1px solid #ddd;">Name</td><td style="border-bottom:1px solid #ddd;">${selectedNode.name}</td></tr>
            <tr><td style="padding:5px; font-weight:bold; border-bottom:1px solid #ddd;">Father</td><td style="border-bottom:1px solid #ddd;">${father ? father.name : (selectedNode.father_name || 'N/A')}</td></tr>
            <tr><td style="padding:5px; font-weight:bold; border-bottom:1px solid #ddd;">Mother</td><td style="border-bottom:1px solid #ddd;">${motherName}</td></tr>
            <tr><td style="padding:5px; font-weight:bold; border-bottom:1px solid #ddd;">Spouse</td><td style="border-bottom:1px solid #ddd;">${spouseName}</td></tr>
            <tr><td style="padding:5px; font-weight:bold; border-bottom:1px solid #ddd;">Children</td><td style="border-bottom:1px solid #ddd;">${childrenCount}</td></tr>
            <tr><td style="padding:5px; font-weight:bold; border-bottom:1px solid #ddd;">Siblings</td><td style="border-bottom:1px solid #ddd;">${siblingsCount}</td></tr>
            <tr><td style="padding:5px; font-weight:bold; border-bottom:1px solid #ddd;">Paternal Uncles</td><td style="border-bottom:1px solid #ddd;">${unclesCount}</td></tr>
          </table>
        </div>
      `;

      const html = `
        <div class="print-page" style="font-family:'Poppins', sans-serif; padding:15px; color:#1f2a1f; font-size:11px;">
          <h2 style="color:#2E7D32;margin:0 0 5px;font-size:15px;">Lineage from ${root.name}</h2>
          <p style="font-size:11px; line-height:1.6; word-break: break-word; margin:0 0 10px;">${chainStr}</p>
          ${detailsHTML}
          <p style="color:gray; margin-top:12px; font-size:10px;">Generated from unified family records.</p>
        </div>
      `;

      const container = document.getElementById('print-container');
      if (container) {
        container.style.display = 'block';
        container.innerHTML = html;
        requestAnimationFrame(() => {
          window.print();
          window.addEventListener('afterprint', () => {
            container.style.display = 'none';
          }, { once: true });
        });
      }
    } catch (err) {
      console.error('Print lineage error:', err);
      alert('Failed to load whole data for print.');
    }
  }, [printMember, printMode]);

  // ---------- Wheel & keyboard events ----------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e) => { e.preventDefault(); e.deltaY > 0 ? zoomOut() : zoomIn(); };
    container.addEventListener('wheel', handleWheel, { passive: false });
    const handleKeyDown = (e) => { if (e.key === '+' || e.key === '=') zoomIn(); if (e.key === '-' || e.key === '_') zoomOut(); };
    container.addEventListener('keydown', handleKeyDown);
    return () => { container.removeEventListener('wheel', handleWheel); container.removeEventListener('keydown', handleKeyDown); };
  }, []);

  // ---------- render ----------
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div id="print-container" style={{ display: 'none', position: 'absolute', top: 0, left: 0, width: '100%', background: 'white', zIndex: 9999 }}></div>

      {/* Fixed search box */}
      <div style={{ position: 'fixed', top: 10, left: 10, zIndex: 1200, width: 260 }}>
        <Paper elevation={4} style={{ borderRadius: 8 }}>
          <TextField
            size="small"
            placeholder="Search name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.5, color: 'gray' }} />,
            }}
            fullWidth
            variant="outlined"
          />
          {searchOpen && (
            <ClickAwayListener onClickAway={() => setSearchOpen(false)}>
              <div style={{ maxHeight: 250, overflow: 'auto' }}>
                <List dense>
                  {searchResults.map((item) => (
                    <ListItemButton
                      key={item.id}
                      onClick={() => {
                        setSearchQuery(item.name);
                        setSearchOpen(false);
                        zoomToNode(item.id);
                      }}
                    >
                      <ListItemText
                        primary={item.name}
                        secondary={item.genText}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </div>
            </ClickAwayListener>
          )}
        </Paper>
      </div>

      {/* Control bar */}
      <div className="control-bar" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', background: '#fafafa', borderBottom: '1px solid #ddd' }}>
        <button onClick={zoomOut} title="Zoom Out"><ZoomOutIcon fontSize="inherit" /></button>
        <button onClick={zoomReset} title="Reset Zoom"><CenterFocusStrongIcon fontSize="inherit" /></button>
        <button onClick={zoomIn} title="Zoom In"><ZoomInIcon fontSize="inherit" /></button>
        {canAdd && <button onClick={() => openAddMemberForm('member')} title="Add Member">+ Add</button>}
      </div>

      <div ref={containerRef} className="tree-bg" style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {members.length === 0 && (
          <div style={{ padding: 24 }}>
            <Typography variant="h6" gutterBottom>No family members yet</Typography>
            {canAdd && <Button variant="contained" onClick={() => openAddMemberForm('member')} color="success">Add First Member</Button>}
          </div>
        )}
        <svg ref={svgRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      </div>

      <div className="footer">© {new Date().getFullYear()} Sherazia Family Tree. All Rights Reserved.</div>

      {popupMember && canEditDelete && (
        <div style={{ position: 'fixed', left: popupAnchor.x - 90, top: popupAnchor.y, background: 'white', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: 10, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8, border: '1px solid #ddd', minWidth: 180 }}>
          <strong>{popupMember.name}</strong>
          <button onClick={() => { setEditingMember(popupMember); setEditData({ ...popupMember, photo: null }); setEditOpen(true); setPopupMember(null); }}>Edit</button>
          <button onClick={() => handleDelete(popupMember.id, popupMember.name)}>Delete</button>
          <button onClick={() => setPopupMember(null)}>Band</button>
        </div>
      )}

      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1565C0', color: 'white' }}>{detailsMember?.name || 'Member Details'}</DialogTitle>
        <DialogContent>
          {detailsMember && (
            <>
              <table style={{ width: '100%' }}>
                <tbody>
                  <tr><td><strong>Name</strong></td><td>{detailsMember.name}</td></tr>
                  <tr><td><strong>Father</strong></td><td>{detailsMember.father_name || 'N/A'}</td></tr>
                  <tr><td><strong>Mother</strong></td><td>{detailsMember.mother_name || 'N/A'}</td></tr>
                  <tr><td><strong>Spouse</strong></td><td>{detailsMember.spouse_name || detailsMember.wife_name || 'N/A'}</td></tr>
                  <tr><td><strong>Status</strong></td><td>{detailsMember.is_alive ? 'Alive' : 'Deceased'}</td></tr>
                  <tr><td><strong>Birth</strong></td><td>{detailsMember.birth_date || 'Unknown'}</td></tr>
                  <tr><td><strong>Death</strong></td><td>{detailsMember.is_alive ? 'N/A' : detailsMember.death_date || 'Unknown'}</td></tr>
                  <tr><td><strong>Additional Info</strong></td><td>{detailsMember.info || 'None'}</td></tr>
                  <tr><td><strong>Generation</strong></td><td>{getGenerationText(detailsMember)}</td></tr>
                </tbody>
              </table>
              {detailsMember.photo && (
                <div style={{ textAlign: 'center', marginTop: 10 }}>
                  <img 
                    src={detailsMember.photo.startsWith('http') ? detailsMember.photo : `/uploads/${detailsMember.photo}`} 
                    alt={detailsMember.name} 
                    style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }} 
                  />
                </div>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          <Button variant="contained" onClick={handlePrintFromDetails}>Print / Download PDF</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#2E7D32', color: 'white' }}>{addDialogTitle}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Name *" margin="normal" value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })} />
          <TextField fullWidth label="Father's Name" margin="normal" value={newMember.father_name} onChange={e => setNewMember({ ...newMember, father_name: e.target.value })} />
          <TextField fullWidth label="Mother's Name" margin="normal" value={newMember.mother_name} onChange={e => setNewMember({ ...newMember, mother_name: e.target.value })} />
          <TextField fullWidth label="Wife's Name" margin="normal" value={newMember.wife_name} onChange={e => setNewMember({ ...newMember, wife_name: e.target.value })} />
          <TextField fullWidth label="Urdu Name" margin="normal" value={newMember.urdu_name} onChange={e => setNewMember({ ...newMember, urdu_name: e.target.value })} />
          <FormControl fullWidth margin="normal">
            <InputLabel id="add-status-label">Status</InputLabel>
            <Select labelId="add-status-label" value={newMember.is_alive ? 'alive' : 'deceased'} label="Status" onChange={e => setNewMember({ ...newMember, is_alive: e.target.value === 'alive' })}>
              <MenuItem value="alive">Alive</MenuItem>
              <MenuItem value="deceased">Deceased</MenuItem>
            </Select>
          </FormControl>
          <TextField fullWidth label="Birth Year (optional)" margin="normal" value={newMember.birth_date} onChange={e => setNewMember({ ...newMember, birth_date: e.target.value })} placeholder="e.g., 1850" />
          <TextField fullWidth label="Death Year (optional)" margin="normal" value={newMember.death_date} onChange={e => { const val = e.target.value; setNewMember(prev => ({ ...prev, death_date: val, ...(val.trim() !== '' && { is_alive: false }) })); }} placeholder="Leave empty if alive, or enter year (0000 = unknown)" />
          <TextField fullWidth label="Additional Info" margin="normal" multiline rows={2} value={newMember.info} onChange={e => setNewMember({ ...newMember, info: e.target.value })} />
          <input type="file" accept="image/*" onChange={e => setNewMember({ ...newMember, photo: e.target.files[0] })} style={{ marginTop: 8 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddMember}>Add</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1565C0', color: 'white' }}>Edit {editingMember?.name}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Name *" margin="normal" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} />
          <TextField fullWidth label="Father's Name" margin="normal" value={editData.father_name} onChange={e => setEditData({ ...editData, father_name: e.target.value })} />
          <TextField fullWidth label="Mother's Name" margin="normal" value={editData.mother_name} onChange={e => setEditData({ ...editData, mother_name: e.target.value })} />
          <TextField fullWidth label="Wife's Name" margin="normal" value={editData.wife_name} onChange={e => setEditData({ ...editData, wife_name: e.target.value })} />
          <TextField fullWidth label="Urdu Name" margin="normal" value={editData.urdu_name} onChange={e => setEditData({ ...editData, urdu_name: e.target.value })} />
          <FormControl fullWidth margin="normal">
            <InputLabel id="edit-status-label">Status</InputLabel>
            <Select labelId="edit-status-label" value={editData.is_alive ? 'alive' : 'deceased'} label="Status" onChange={e => setEditData({ ...editData, is_alive: e.target.value === 'alive' })}>
              <MenuItem value="alive">Alive</MenuItem>
              <MenuItem value="deceased">Deceased</MenuItem>
            </Select>
          </FormControl>
          <TextField fullWidth label="Birth Year (optional)" margin="normal" value={editData.birth_date} onChange={e => setEditData({ ...editData, birth_date: e.target.value })} placeholder="e.g., 1850" />
          <TextField fullWidth label="Death Year (optional)" margin="normal" value={editData.death_date} onChange={e => { const val = e.target.value; setEditData(prev => ({ ...prev, death_date: val, ...(val.trim() !== '' && { is_alive: false }) })); }} placeholder="Leave empty if alive, or enter year (0000 = unknown)" />
          <TextField fullWidth label="Additional Info" margin="normal" multiline rows={2} value={editData.info} onChange={e => setEditData({ ...editData, info: e.target.value })} />
          <input type="file" accept="image/*" onChange={e => setEditData({ ...editData, photo: e.target.files[0] })} style={{ marginTop: 8 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditMember}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Print Dialog with Adam/Ali/Malook */}
      <Dialog open={printDialogOpen} onClose={() => setPrintDialogOpen(false)}>
        <DialogTitle>Print / Download Options</DialogTitle>
        <DialogContent>
          <RadioGroup value={printMode} onChange={e => setPrintMode(e.target.value)}>
            <FormControlLabel value="adam" control={<Radio />} label="Hazrat Adam (A.S) se selected member tak" />
            <FormControlLabel value="ali" control={<Radio />} label="Hazrat Ali (A.S) se selected member tak" />
            <FormControlLabel value="malook" control={<Radio />} label="Malook Shah se selected member tak" />
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handlePrint}>Print / Download PDF</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default TreeView;