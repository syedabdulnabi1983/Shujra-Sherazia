import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Select, TextField,
  Typography, Checkbox, FormControlLabel,
} from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import api from '../utils/api';
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

// Static pages HTML for print
const adamToMuhammadHTML = `
  <div class="print-page" style="font-family: 'Poppins', sans-serif; padding: 20px;">
    <h2>Shajra Hazrat Adam (A.S) to Hazrat Muhammad (S.A.W)</h2>
    <p>Yahan shajra likha jayega...</p>
    <p style="color: gray;">(Under Construction)</p>
  </div>
`;

const aliToSheraziHTML = `
  <div class="print-page" style="font-family: 'Poppins', sans-serif; padding: 20px;">
    <h2>Shajra Hazrat Ali (A.S) to Syed Muhammad Malook Shah Sherazi</h2>
    <p>Yahan shajra likha jayega...</p>
    <p style="color: gray;">(Under Construction)</p>
  </div>
`;

const historyHTML = `
  <div class="print-page" style="font-family: 'Poppins', sans-serif; padding: 20px;">
    <h2>History</h2>
    <p>Family history details...</p>
    <p style="color: gray;">(Under Construction)</p>
  </div>
`;

function TreeView({ user }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const zoomRef = useRef(null);

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
  const [printOptions, setPrintOptions] = useState({
    adam: false,
    ali: false,
    tree: true,
    history: false,
  });

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsMember, setDetailsMember] = useState(null);

  const token = localStorage.getItem('token');
  const role = user?.role;
  const canAdd = role === 'admin' || role === 'member';
  const canEditDelete = role === 'admin';

  const toggleNode = useCallback((nodeId) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const expandAll = () => setCollapsedNodes(new Set());
  const collapseAll = () => {
    if (members.length === 0) return;
    const root = members.find(m => !m.parent_id && !m.spouse_id) || members[0];
    const build = pid => members.filter(m => m.parent_id === pid && !m.spouse_id).map(c => ({ ...c, children: build(c.id) }));
    const rootNode = d3.hierarchy({ ...root, children: build(root.id) });
    const ids = [];
    rootNode.each(n => { if (n.children && n.children.length > 0) ids.push(n.data.id); });
    setCollapsedNodes(new Set(ids));
  };

  const zoomIn = () => d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.5);
  const zoomOut = () => d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 0.7);
  const zoomReset = () => d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.transform, d3.zoomIdentity);

  const openDetails = useCallback((member) => {
    if (canEditDelete) return;
    setDetailsMember(member);
    setDetailsOpen(true);
    if (member.photo) {
      const img = new Image();
      img.src = `/uploads/${member.photo}`;
    }
  }, [canEditDelete]);

  const handlePrintFromDetails = () => {
    if (!detailsMember) return;
    setDetailsOpen(false);
    setPrintMember(detailsMember);
    setPrintOptions({ adam: false, ali: false, tree: true, history: false });
    setPrintDialogOpen(true);
  };

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
    } 
    else if (relation === 'sibling') {
      newData.parent_id = member.parent_id || '';
      const parent = members.find(m => m.id === member.parent_id);
      if (parent) {
        newData.father_name = parent.name || '';
        newData.mother_name = parent.wife_name || '';
      }
      setAddDialogTitle(`Add Bhai/Behan of ${member.name}`);
    } 
    else if (relation === 'wife') {
      newData.spouse_id = member.id;
      setAddDialogTitle(`Add Bivi of ${member.name}`);
    }

    setPopupMember(null);
    setNewMember(newData);
    setOpen(true);
  }, [members]);

  const loadData = useCallback(async () => {
    try {
      const res = await api.get('/api/tree');
      const nodes = res.data;
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
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getGenerationText = useCallback((member) => {
    if (!member || members.length === 0) return 'N/A';
    const root = members.find(m => !m.parent_id && !m.spouse_id) || members[0];
    if (member.id === root.id) return '1st Generation';
    let count = 0;
    let cur = member;
    while (cur?.parent_id) {
      count++;
      cur = members.find(m => m.id === cur.parent_id);
      if (!cur) break;
      if (cur.id === root.id) break;
    }
    const gen = count + 1;
    const suffix = gen === 1 ? 'st' : gen === 2 ? 'nd' : gen === 3 ? 'rd' : 'th';
    return `${gen}${suffix} Generation`;
  }, [members]);

  // D3 tree drawing
  const drawTree = useCallback((svgNode, data, collapseSet = new Set(), editable = true) => {
    const svg = d3.select(svgNode);
    svg.selectAll('*').remove();

    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'linkGradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#2E7D32');
    gradient.append('stop').attr('offset', '50%').attr('stop-color', '#c9a84c');
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#2E7D32');

    const isMobile = window.innerWidth < 768;
    const boxW = isMobile ? 220 : 270;
    const boxH = isMobile ? 180 : 210;
    const nodeW = isMobile ? 300 : 380;
    const nodeH = isMobile ? 240 : 270;
    const fontSize = isMobile ? '10px' : '12px';
    const small = isMobile ? '8px' : '10px';
    const padding = 300;

    const rootMember = data.find(m => !m.parent_id && !m.spouse_id) || data[0];
    if (!rootMember) return;

    const build = pid => data.filter(m => m.parent_id === pid && !m.spouse_id).map(c => ({ ...c, children: build(c.id) }));
    let root = d3.hierarchy({ ...rootMember, children: build(rootMember.id) });

    root.each(n => {
      if (collapseSet.has(n.data.id) && n.children) {
        n._children = n.children;
        n.children = null;
      }
    });

    const tree = d3.tree().nodeSize([nodeW, nodeH]);
    tree(root);
    const nodes = root.descendants();
    const links = root.links();

    const minX = d3.min(nodes, d => d.x) || 0, maxX = d3.max(nodes, d => d.x) || 0;
    const minY = d3.min(nodes, d => d.y) || 0, maxY = d3.max(nodes, d => d.y) || 0;
    const width = Math.max(maxX - minX + padding * 2 + boxW, 800);
    const height = Math.max(maxY - minY + padding * 2 + boxH, 600);

    svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);
    const g = svg.append('g');

    const zoom = d3.zoom().scaleExtent([0.1, 12]).on('zoom', e => g.attr('transform', `translate(${e.transform.x}, ${e.transform.y}) scale(${e.transform.k})`));
    svg.call(zoom);
    const initialTransform = d3.zoomIdentity.translate(width / 2 - (minX + maxX) / 2, height / 2 - (minY + maxY) / 2).scale(1.3);
    svg.call(zoom.transform, initialTransform);
    if (editable) zoomRef.current = zoom;

    const getAncestors = (id) => {
      const anc = [];
      let cur = data.find(m => m.id === id);
      while (cur?.parent_id) {
        const p = data.find(m => m.id === cur.parent_id);
        if (!p) break;
        anc.push(p.id);
        cur = p;
      }
      return anc;
    };

    const calcAge = (b, d) => {
      const birthYear = b ? parseInt(b) : null;
      const deathYear = d ? parseInt(d) : null;
      if (birthYear && deathYear) return `${deathYear - birthYear}y`;
      if (birthYear) return `${new Date().getFullYear() - birthYear}y`;
      return '';
    };

    // Links
    g.selectAll('.link').data(links, d => d.target.data.id)
      .join(enter => enter.append('path')
          .attr('fill', 'none')
          .attr('stroke', 'url(#linkGradient)')
          .attr('stroke-width', 2.5)
          .attr('d', d => { const sx = d.source.x, sy = d.source.y + boxH, tx = d.target.x, ty = d.target.y, my = (sy + ty) / 2; return `M${sx},${sy} L${sx},${my} L${tx},${my} L${tx},${ty}`; }),
        update => update.transition().duration(500)
          .attr('stroke', 'url(#linkGradient)')
          .attr('d', d => { const sx = d.source.x, sy = d.source.y + boxH, tx = d.target.x, ty = d.target.y, my = (sy + ty) / 2; return `M${sx},${sy} L${sx},${my} L${tx},${my} L${tx},${ty}`; }),
        exit => exit.remove());

    // Nodes
    const nodeGroup = g.selectAll('.node').data(nodes, d => d.data.id)
      .join(enter => {
          const gEnter = enter.append('g').attr('class', 'node')
            .attr('transform', d => `translate(${d.x - boxW / 2}, ${d.y})`);

          gEnter.append('rect').attr('class', 'node-card')
            .attr('width', boxW).attr('height', boxH).attr('rx', 12).attr('ry', 12)
            .attr('fill', '#ffffffcc')
            .attr('stroke', d => d.data.is_alive ? '#2E7D32' : '#999')
            .attr('stroke-width', 2.5)
            .attr('cursor', 'pointer');

          gEnter.append('rect').attr('width', boxW).attr('height', 6).attr('rx', 3)
            .attr('fill', d => d.data.is_alive ? '#2E7D32' : '#999');

          gEnter.append('foreignObject')
            .attr('width', boxW - 20).attr('height', boxH - 60).attr('x', 10).attr('y', 10)
            .append('xhtml:div').attr('class', 'node-content')
            .style('width', '100%').style('height', '100%')
            .style('display', 'flex')
            .style('flex-direction', 'column').style('align-items', 'center').style('justify-content', 'center')
            .style('text-align', 'center').style('font-size', fontSize).style('color', d => d.data.is_alive ? '#333' : '#999')
            .html(d => {
              const name = d.data.name;
              const father = d.data.father_name ? `<span style="font-size:${small}">(s/o ${d.data.father_name})</span>` : '';
              const birth = d.data.birth_date || '', death = d.data.death_date || '';
              const years = birth || death ? `<div style="font-size:${small}">${birth}${death ? '-' + death : ''}</div>` : '';
              const age = calcAge(d.data.birth_date, d.data.death_date);
              const ageStr = age ? `<div style="font-size:${small};color:#FF9800">Age: ${age}</div>` : '';
              const status = d.data.is_alive ? '<span class="alive-badge">Alive</span>' : '<span class="deceased-badge">🕌</span>';
              const urdu = d.data.urdu_name ? `<div class="urdu-name">${d.data.urdu_name}</div>` : '';
              const spouseLine = d.data.spouse_name ? `<div class="spouse-sticker">💍 ${d.data.spouse_name}</div>` : '';
              return `<b>${name}</b>${father}${urdu}<div>${status}</div>${years}${ageStr}${spouseLine}`;
            });

          gEnter.each(function(d) {
            const div = d3.select(this).select('.node-content');
            if (!div.empty()) d._originalHTML = div.html();
          });

          gEnter.on('click', (event, d) => {
            event.stopPropagation();
            if (!canEditDelete) openDetails(d.data);
          });

          if (canEditDelete) {
            gEnter.on('dblclick', (event, d) => {
              event.stopPropagation();
              const rect = event.currentTarget.getBoundingClientRect();
              setPopupMember(d.data);
              setPopupAnchor({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
            });
          }

          gEnter.each(function(d) {
            const hasChildren = (d.children && d.children.length > 0) || (d._children && d._children.length > 0);
            if (hasChildren) {
              const btnGroup = d3.select(this).append('g').attr('class', 'toggle-btn').attr('transform', 'translate(6,14)')
                .attr('cursor', 'pointer').on('click', (event) => { event.stopPropagation(); toggleNode(d.data.id); });
              btnGroup.append('circle').attr('r', 10).attr('fill', '#fff').attr('stroke', '#555').attr('stroke-width', 1.5);
              btnGroup.append('text').attr('text-anchor', 'middle').attr('dy', '0.35em').attr('font-size', '14px')
                .attr('font-weight', 'bold').attr('fill', '#333').text(d.children ? '–' : '+');
            }

            if (canAdd) {
              const addControl = (symbol, x, color, onClick, title) => {
                const ctrl = d3.select(this).append('g')
                  .attr('transform', `translate(${x}, ${boxH - 32})`)
                  .attr('cursor', 'pointer')
                  .on('click', (event) => { event.stopPropagation(); onClick(d); });
                ctrl.append('rect').attr('width', 46).attr('height', 24).attr('rx', 12).attr('fill', '#fff').attr('stroke', color).attr('stroke-width', 1.4);
                ctrl.append('text').attr('x', 23).attr('y', 17).attr('text-anchor', 'middle').attr('font-size', '16px').attr('font-weight', 700).attr('fill', color).text(symbol).append('title').text(title);
              };

              addControl('\u2193', 18, '#2E7D32', (node) => openAddMemberForm('child', node.data), 'Child add karein');
              addControl('\u2194', boxW / 2 - 23, '#1565C0', (node) => openAddMemberForm('sibling', node.data), 'Sibling add karein');
              addControl('\u2661', boxW - 64, '#C2185B', (node) => openAddMemberForm('wife', node.data), 'Bivi add karein');
            }
          });

          return gEnter;
        },
        update => update.transition().duration(500).attr('transform', d => `translate(${d.x - boxW / 2}, ${d.y})`),
        exit => exit.remove()
      );

    nodeGroup.on('mouseenter', function(event, d) {
      const ancIds = getAncestors(d.data.id);
      g.selectAll('.node rect.node-card')
        .attr('stroke', n => ancIds.includes(n.data.id) ? '#4fc3f7' : n.data.is_alive ? '#2E7D32' : '#999')
        .attr('fill', n => ancIds.includes(n.data.id) ? '#e1f5fe' : '#ffffffcc');

      if (d.data.photo) {
        d3.select(this).select('.node-content')
          .html(`<img src="/uploads/${d.data.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" />`);
      }
    }).on('mouseleave', function(event, d) {
      g.selectAll('.node rect.node-card')
        .attr('stroke', n => n.data.is_alive ? '#2E7D32' : '#999')
        .attr('fill', '#ffffffcc');

      if (d._originalHTML) {
        d3.select(this).select('.node-content').html(d._originalHTML);
      }
    });
  }, [canAdd, canEditDelete, openDetails, toggleNode, openAddMemberForm]);

  useEffect(() => {
    if (members.length > 0) {
      drawTree(svgRef.current, members, collapsedNodes, true);
    } else {
      d3.select(svgRef.current).selectAll('*').remove();
    }
  }, [members, collapsedNodes, drawTree]);

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
      await api.post('/api/tree', fd, { headers: { 'x-auth-token': token, 'Content-Type': 'multipart/form-data' } });
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
      await api.put(`/api/tree/${editingMember.id}`, fd, { headers: { 'x-auth-token': token, 'Content-Type': 'multipart/form-data' } });
      setEditOpen(false);
      loadData();
    } catch (err) { alert(err.response?.data?.msg || 'Failed to update'); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Kya aap "${name}" ko delete karna chahte hain?`)) return;
    try {
      await api.delete(`/api/tree/${id}`, { headers: { 'x-auth-token': token } });
      setPopupMember(null);
      loadData();
    } catch (err) { alert(err.response?.data?.msg || 'Delete failed'); }
  };

  const handlePrint = useCallback(() => {
    setPrintDialogOpen(false);
    if (!printMember) return;

    const memberId = printMember.id;
    const fatherId = printMember.parent_id;
    const father = members.find(m => m.id === fatherId);
    const motherName = printMember.mother_name || 'N/A';
    const spouseName = printMember.spouse_name || printMember.wife_name || 'N/A';

    const childrenCount = members.filter(m => m.parent_id === memberId).length;
    const siblings = fatherId ? members.filter(m => m.parent_id === fatherId && m.id !== memberId) : [];
    const siblingsCount = siblings.length;

    let unclesCount = 0;
    if (father && father.parent_id) {
      const grandParentId = father.parent_id;
      unclesCount = members.filter(m => m.parent_id === grandParentId && m.id !== father.id).length;
    }

    const ancestors = [];
    let cur = printMember;
    while (cur && cur.parent_id) {
      const parent = members.find(m => m.id === cur.parent_id);
      if (!parent) break;
      ancestors.push(parent.name || 'Unknown');
      cur = parent;
    }
    const ancestorsLine = ancestors.length > 0 ? ancestors.join(' → ') : 'None';

    const generation = getGenerationText(printMember);
    const photoUrl = printMember.photo ? `/uploads/${printMember.photo}` : null;

    const treeHTML = `
      <div class="print-page" style="font-family: 'Poppins', sans-serif; padding: 20px;">
        <h2 style="color:#2E7D32;">Family Tree – ${printMember.name}</h2>
        ${photoUrl ? `<div style="text-align:center;margin-bottom:10px;"><img src="${photoUrl}" style="max-width:150px;max-height:150px;border-radius:8px;" /></div>` : ''}
        <table style="width:100%; border-collapse: collapse;">
          <tr><td style="padding:8px; font-weight:bold;">Father</td><td>${father ? father.name : 'N/A'}</td></tr>
          <tr><td style="padding:8px; font-weight:bold;">Mother</td><td>${motherName}</td></tr>
          <tr><td style="padding:8px; font-weight:bold;">Spouse</td><td>${spouseName}</td></tr>
          <tr><td style="padding:8px; font-weight:bold;">Sons / Children</td><td>${childrenCount}</td></tr>
          <tr><td style="padding:8px; font-weight:bold;">Brothers / Siblings</td><td>${siblingsCount}</td></tr>
          <tr><td style="padding:8px; font-weight:bold;">Paternal Uncles</td><td>${unclesCount}</td></tr>
          <tr><td style="padding:8px; font-weight:bold;">Ancestors</td><td>${ancestorsLine}</td></tr>
          <tr><td style="padding:8px; font-weight:bold;">Generation</td><td>${generation}</td></tr>
        </table>
        <p style="color: gray; margin-top: 20px;">Note: Counts are based on available family records.</p>
      </div>
    `;

    let html = '';
    if (printOptions.adam) html += adamToMuhammadHTML;
    if (printOptions.ali) html += aliToSheraziHTML;
    if (printOptions.history) html += historyHTML;
    if (printOptions.tree) html += treeHTML;

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
  }, [printMember, members, printOptions, getGenerationText]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e) => { e.preventDefault(); e.deltaY > 0 ? zoomOut() : zoomIn(); };
    container.addEventListener('wheel', handleWheel, { passive: false });
    const handleKeyDown = (e) => { if (e.key === '+' || e.key === '=') zoomIn(); if (e.key === '-' || e.key === '_') zoomOut(); };
    container.addEventListener('keydown', handleKeyDown);
    return () => { container.removeEventListener('wheel', handleWheel); container.removeEventListener('keydown', handleKeyDown); };
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div id="print-container" style={{ display: 'none', position: 'absolute', top: 0, left: 0, width: '100%', background: 'white', zIndex: 9999 }}></div>

      <div className="control-bar">
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
                  <img src={`/uploads/${detailsMember.photo}`} alt={detailsMember.name} style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }} />
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

      <Dialog open={printDialogOpen} onClose={() => setPrintDialogOpen(false)}>
        <DialogTitle>Print / Download Options</DialogTitle>
        <DialogContent>
          <FormControlLabel
            control={<Checkbox checked={printOptions.adam} onChange={e => setPrintOptions(prev => ({ ...prev, adam: e.target.checked }))} />}
            label="Shajra Adam (A.S) to Muhammad (S.A.W)"
          />
          <FormControlLabel
            control={<Checkbox checked={printOptions.ali} onChange={e => setPrintOptions(prev => ({ ...prev, ali: e.target.checked }))} />}
            label="Shajra Ali (A.S) to Sherazi Sahib"
          />
          <FormControlLabel
            control={<Checkbox checked={printOptions.tree} onChange={e => setPrintOptions(prev => ({ ...prev, tree: e.target.checked }))} />}
            label="Family Tree (selected member)"
          />
          <FormControlLabel
            control={<Checkbox checked={printOptions.history} onChange={e => setPrintOptions(prev => ({ ...prev, history: e.target.checked }))} />}
            label="History"
          />
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