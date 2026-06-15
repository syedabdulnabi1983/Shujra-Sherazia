import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Select, TextField,
  Typography,
} from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import RefreshIcon from '@mui/icons-material/Refresh';
import axios from 'axios';
import * as d3 from 'd3';

function AliToSherazi({ user }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const zoomRef = useRef(null);

  const [chain, setChain] = useState([]);
  const [loading, setLoading] = useState(true);

  const emptyMember = {
    name: '', generation_number: '', info: '', parent_id: '',
    father_name: '', mother_name: '', wife_name: '', urdu_name: '',
    birth_year: '', death_year: '', is_alive: true, photo: null,
  };

  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [addingParentId, setAddingParentId] = useState(null);
  const [editData, setEditData] = useState(emptyMember);

  const token = localStorage.getItem('token');
  const isAdmin = user && user.email === 'admin@shujra.com';

  // ─── FETCH DATA ───
  const loadChain = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/ali-sherazia');
      setChain(res.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadChain(); }, [loadChain]);

  const getFatherName = useCallback((node) => {
    if (!node?.parent_id) return null;
    const father = chain.find(n => n.id === node.parent_id);
    return father ? father.name : null;
  }, [chain]);

  // ─── ADD CHILD ───
  const handleAddChild = (parentId) => {
    if (!isAdmin) return;
    setAddingParentId(parentId);
    const parentNode = chain.find(n => n.id === parentId);
    let nextGen = 81;
    if (parentNode && parentNode.generation_number != null) {
      const genNum = parseInt(parentNode.generation_number);
      if (!isNaN(genNum)) {
        nextGen = genNum + 1;
      }
    }
    setEditData({
      ...emptyMember,
      generation_number: nextGen,
      parent_id: parentId,
      father_name: parentNode ? parentNode.name : '',
    });
    setAddOpen(true);
  };

  const handleAddSubmit = async () => {
    if (!isAdmin) return;
    if (!editData.name.trim()) {
      alert('Name is required');
      return;
    }
    if (!editData.parent_id) {
      alert('Parent ID is missing. Please click the "+" button again.');
      return;
    }
    if (editData.generation_number === '' || isNaN(parseInt(editData.generation_number))) {
      alert('Generation number is required and must be a valid number');
      return;
    }
    
    const fd = new FormData();
    fd.append('name', editData.name.trim());
    fd.append('generation_number', editData.generation_number);
    fd.append('parent_id', editData.parent_id);
    fd.append('info', editData.info || '');
    fd.append('father_name', editData.father_name || '');
    fd.append('mother_name', editData.mother_name || '');
    fd.append('wife_name', editData.wife_name || '');
    fd.append('urdu_name', editData.urdu_name || '');
    fd.append('birth_year', editData.birth_year || '');
    fd.append('death_year', editData.death_year || '');
    fd.append('is_alive', editData.is_alive);
    if (editData.photo) fd.append('photo', editData.photo);

    try {
      await axios.post('/api/ali-sherazia', fd, {
        headers: { 'x-auth-token': token, 'Content-Type': 'multipart/form-data' },
      });
      setAddOpen(false);
      setEditData(emptyMember);
      loadChain();
    } catch (err) {
      console.error('Add error:', err);
      alert(err.response?.data?.msg || 'Failed to add node');
    }
  };

  // ─── EDIT ───
  const handleEdit = useCallback((node) => {
    if (!isAdmin) return;
    setEditingNode(node);
    setEditData({
      ...emptyMember,
      name: node.name || '',
      generation_number: node.generation_number || '',
      info: node.info || '',
      parent_id: node.parent_id || '',
      father_name: node.father_name || '',
      mother_name: node.mother_name || '',
      wife_name: node.wife_name || '',
      urdu_name: node.urdu_name || '',
      birth_year: node.birth_year || '',
      death_year: node.death_year || '',
      is_alive: node.is_alive !== undefined ? node.is_alive : true,
      photo: null,
    });
    setEditOpen(true);
  }, [isAdmin]);

  const handleEditSubmit = async () => {
    if (!isAdmin) return;
    if (!editData.name.trim() || !editData.generation_number) {
      alert('Name and generation number are required');
      return;
    }
    const fd = new FormData();
    fd.append('name', editData.name.trim());
    fd.append('generation_number', editData.generation_number);
    fd.append('info', editData.info || '');
    fd.append('parent_id', editData.parent_id || '');
    fd.append('father_name', editData.father_name || '');
    fd.append('mother_name', editData.mother_name || '');
    fd.append('wife_name', editData.wife_name || '');
    fd.append('urdu_name', editData.urdu_name || '');
    fd.append('birth_year', editData.birth_year || '');
    fd.append('death_year', editData.death_year || '');
    fd.append('is_alive', editData.is_alive);
    if (editData.photo) fd.append('photo', editData.photo);
    try {
      await axios.put(`/api/ali-sherazia/${editingNode.id}`, fd, {
        headers: { 'x-auth-token': token, 'Content-Type': 'multipart/form-data' },
      });
      setEditOpen(false);
      setEditData(emptyMember);
      loadChain();
    } catch (err) {
      alert(err.response?.data?.msg || 'Update failed');
    }
  };

  // ─── DELETE NODE ───
  const handleDeleteNode = useCallback(async (nodeId, nodeName) => {
    if (!isAdmin) return;
    if (!window.confirm(`Are you sure you want to delete "${nodeName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await axios.delete(`/api/ali-sherazia/${nodeId}`, {
        headers: { 'x-auth-token': token }
      });
      loadChain();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to delete node');
    }
  }, [isAdmin, token, loadChain]);

  // ─── CALCULATE FONT SIZE ───
  const calculateFontSize = (content, boxWidth, boxHeight, isAli = false) => {
    let baseSize = isAli ? 20 : 16;
    const minSize = isAli ? 14 : 10;
    const maxSize = isAli ? 26 : 20;
    const textLength = content.replace(/<[^>]*>/g, '').length;
    let adjustedSize = baseSize;
    if (textLength > 30) {
      adjustedSize = Math.max(minSize, baseSize - (textLength - 30) * 0.15);
    } else if (textLength < 10) {
      adjustedSize = Math.min(maxSize, baseSize + 2);
    }
    const maxCharsPerLine = Math.floor(boxWidth / (adjustedSize * 0.6));
    const lines = Math.ceil(textLength / maxCharsPerLine);
    const maxLinesFit = Math.floor(boxHeight / (adjustedSize * 1.5));
    if (lines > maxLinesFit) {
      adjustedSize = Math.max(minSize, adjustedSize - (lines - maxLinesFit) * 1.5);
    }
    return Math.round(adjustedSize);
  };

  // ─── DRAW (ALL NODES) ───
  const drawCombined = useCallback(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    
    if (chain.length === 0) {
      const width = 800, height = 400;
      svg.attr('width', width).attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`);
      svg.append('text')
        .attr('x', '50%')
        .attr('y', '50%')
        .attr('text-anchor', 'middle')
        .attr('font-size', '24px')
        .attr('fill', '#888')
        .text('Add nodes using Admin Panel');
      return;
    }

    // ─── IDENTIFY NODES ───
    const ali = chain.find(n => n.name.includes('Ali ibn Abi Talib'));
    const hasan = ali ? chain.find(n => n.parent_id === ali.id && n.name.includes('Hassan')) : null;
    const hussain = ali ? chain.find(n => n.parent_id === ali.id && n.name.includes('Hussain')) : null;
    const zainulAbidin = hussain ? chain.find(n => n.parent_id === hussain.id && n.name.includes('Zainul Abidin')) : null;
    
    let addedNodes = chain.filter(n => n.id !== ali?.id && n.id !== hasan?.id && n.id !== hussain?.id);
    
    // ✅ SORTING: Generation number ke hisaab se, phir sibling_order ke hisaab se
    addedNodes = addedNodes.sort((a, b) => {
      if (a.generation_number !== b.generation_number) return a.generation_number - b.generation_number;
      // ✅ sibling_order use karo (agar 0 hai to default)
      return (a.sibling_order || 0) - (b.sibling_order || 0);
    });
    
    if (zainulAbidin) {
      addedNodes = addedNodes.filter(n => n.id !== zainulAbidin.id);
      addedNodes.unshift(zainulAbidin);
    }

    // ─── LAYOUT ───
    const vBoxW = 280, vBoxH = 220;
    const hBoxW = 240, hBoxH = 170;
    const gapX = 40, gapY = 60;
    const pad = 60;
    const hNodesPerRow = 5;

    const aliX = 200, aliY = 80;
    const childY = aliY + vBoxH + 100;
    const hasanX = aliX - vBoxW - gapX;
    const hussainX = aliX + vBoxW + gapX;

    const startY = childY + vBoxH + 100;
    const startX = pad + 50;

    // ─── POSITION MAP ───
    const nodePositions = new Map();
    if (ali) nodePositions.set(ali.id, { x: aliX, y: aliY, w: vBoxW, h: vBoxH });
    if (hasan) nodePositions.set(hasan.id, { x: hasanX, y: childY, w: vBoxW, h: vBoxH });
    if (hussain) nodePositions.set(hussain.id, { x: hussainX, y: childY, w: vBoxW, h: vBoxH });

    addedNodes.forEach((node, i) => {
      const x = startX + (i % hNodesPerRow) * (hBoxW + gapX);
      const y = startY + Math.floor(i / hNodesPerRow) * (hBoxH + gapY);
      nodePositions.set(node.id, { x, y, w: hBoxW, h: hBoxH });
    });

    // ─── SVG DIMENSIONS ───
    let maxX = 0, maxY = 0;
    nodePositions.forEach(pos => {
      if (pos.x + pos.w > maxX) maxX = pos.x + pos.w;
      if (pos.y + pos.h > maxY) maxY = pos.y + pos.h;
    });
    maxX += pad * 2;
    maxY += pad * 2;

    svg.attr('width', maxX).attr('height', maxY).attr('viewBox', `0 0 ${maxX} ${maxY}`);
    const mainGroup = svg.append('g');

    const zoom = d3.zoom().scaleExtent([0.1, 12]).on('zoom', e => {
      mainGroup.attr('transform', `translate(${e.transform.x}, ${e.transform.y}) scale(${e.transform.k})`);
    });
    svg.call(zoom);
    const initTransform = d3.zoomIdentity.translate(50, 50).scale(0.9);
    svg.call(zoom.transform, initTransform);

    // ─── CONNECTORS ───
    const lineColor = '#2E7D32';
    const lineWidth = 2.5;

    if (ali && hasan && hussain) {
      const aliBottomY = aliY + vBoxH;
      const childTopY = childY;
      const midY = (aliBottomY + childTopY) / 2;
      
      mainGroup.append('path')
        .attr('fill', 'none')
        .attr('stroke', lineColor)
        .attr('stroke-width', lineWidth)
        .attr('d', `M${aliX + vBoxW/2},${aliBottomY} L${aliX + vBoxW/2},${midY}`);
      
      const hasanCX = hasanX + vBoxW/2;
      const hussainCX = hussainX + vBoxW/2;
      mainGroup.append('path')
        .attr('fill', 'none')
        .attr('stroke', lineColor)
        .attr('stroke-width', lineWidth)
        .attr('d', `M${hasanCX},${midY} L${hussainCX},${midY}`);
      
      mainGroup.append('path')
        .attr('fill', 'none')
        .attr('stroke', lineColor)
        .attr('stroke-width', lineWidth)
        .attr('d', `M${hasanCX},${midY} L${hasanCX},${childTopY}`);
      mainGroup.append('path')
        .attr('fill', 'none')
        .attr('stroke', lineColor)
        .attr('stroke-width', lineWidth)
        .attr('d', `M${hussainCX},${midY} L${hussainCX},${childTopY}`);
    }

    // ─── DRAW NODES ───
    const drawNode = (node, x, y, w, h, isAli = false) => {
      const g = mainGroup.append('g').attr('transform', `translate(${x}, ${y})`);
      g.append('rect')
        .attr('width', w).attr('height', h)
        .attr('rx', 12).attr('ry', 12)
        .attr('fill', isAli ? '#fdf6e3' : '#ffffff')
        .attr('stroke', isAli ? '#D4AF37' : '#2E7D32')
        .attr('stroke-width', isAli ? 4 : 2.5);
      g.append('rect')
        .attr('width', w).attr('height', isAli ? 8 : 6)
        .attr('rx', 4).attr('ry', 4)
        .attr('fill', isAli ? '#D4AF37' : '#2E7D32');

      if (isAli) {
        g.append('text')
          .attr('x', w - 30).attr('y', 30)
          .attr('font-size', '24px')
          .attr('text-anchor', 'middle')
          .text('👑');
      }

      const father = node.father_name || '';
      const fatherLine = father ? `bin ${father}` : '';
      const wifeLine = node.wife_name ? `💍 ${node.wife_name}` : '';
      const genLine = `Gen: ${node.generation_number}`;
      const infoLine = node.info || '';

      let contentHtml = `<div style="font-weight:bold;">${node.name}</div>`;
      if (father) contentHtml += `<div>${fatherLine}</div>`;
      if (wifeLine) contentHtml += `<div>${wifeLine}</div>`;
      contentHtml += `<div>${genLine}</div>`;
      if (infoLine) contentHtml += `<div>${infoLine}</div>`;

      const fontSize = calculateFontSize(contentHtml, w, h, isAli);

      g.append('foreignObject')
        .attr('width', w - 40).attr('height', h - 80)
        .attr('x', 20).attr('y', 20)
        .append('xhtml:div')
        .style('width', '100%').style('height', '100%')
        .style('display', 'flex').style('flex-direction', 'column')
        .style('align-items', 'center').style('justify-content', 'center')
        .style('text-align', 'center')
        .style('font-size', `${fontSize}px`)
        .style('line-height', '1.4')
        .html(contentHtml);

      // ✅ ADMIN BUTTONS SIRF `admin@shujra.com` KE LIYE
      if (isAdmin) {
        // ─── DELETE BUTTON ───
        const deleteGroup = g.append('g')
          .attr('transform', `translate(${w - 36}, 6)`)
          .attr('cursor', 'pointer')
          .on('click', (e) => {
            e.stopPropagation();
            handleDeleteNode(node.id, node.name);
          });
        deleteGroup.append('rect')
          .attr('width', 28).attr('height', 20)
          .attr('rx', 6)
          .attr('fill', '#fff')
          .attr('stroke', '#d32f2f')
          .attr('stroke-width', 1.5);
        deleteGroup.append('text')
          .attr('x', 14).attr('y', 15)
          .attr('text-anchor', 'middle')
          .attr('font-size', '14px')
          .attr('font-weight', 'bold')
          .attr('fill', '#d32f2f')
          .text('✕');

        // ─── ADD CHILD (+) ───
        const addGroup = g.append('g')
          .attr('transform', `translate(${w - 36}, ${h - 36})`)
          .attr('cursor', 'pointer')
          .on('click', (e) => { e.stopPropagation(); handleAddChild(node.id); });
        addGroup.append('circle')
          .attr('r', 14)
          .attr('fill', '#2E7D32')
          .attr('stroke', '#fff')
          .attr('stroke-width', 2);
        addGroup.append('text')
          .attr('x', 0).attr('y', 5)
          .attr('text-anchor', 'middle')
          .attr('font-size', '16px')
          .attr('fill', '#fff')
          .attr('font-weight', 'bold')
          .text('+');

        // ─── EDIT BUTTON (✎) ───
        const editGroup = g.append('g')
          .attr('transform', `translate(${w - 68}, ${h - 28})`)
          .attr('cursor', 'pointer')
          .on('click', (e) => { e.stopPropagation(); handleEdit(node); });
        editGroup.append('rect')
          .attr('width', 26).attr('height', 18)
          .attr('rx', 8)
          .attr('fill', '#fff')
          .attr('stroke', '#1565C0')
          .attr('stroke-width', 1.2);
        editGroup.append('text')
          .attr('x', 13).attr('y', 14)
          .attr('text-anchor', 'middle')
          .attr('font-size', '12px')
          .attr('font-weight', 'bold')
          .attr('fill', '#1565C0')
          .text('✎');
      }
    };

    // Render all
    if (ali) drawNode(ali, aliX, aliY, vBoxW, vBoxH, true);
    if (hasan) drawNode(hasan, hasanX, childY, vBoxW, vBoxH);
    if (hussain) drawNode(hussain, hussainX, childY, vBoxW, vBoxH);
    addedNodes.forEach(node => {
      const pos = nodePositions.get(node.id);
      if (pos) drawNode(node, pos.x, pos.y, pos.w, pos.h);
    });

  }, [chain, isAdmin, handleAddChild, handleEdit, handleDeleteNode]);

  useEffect(() => {
    if (chain.length > 0) drawCombined();
  }, [chain, drawCombined]);

  const zoomIn = () => { if (zoomRef.current) d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.5); };
  const zoomOut = () => { if (zoomRef.current) d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 0.7); };
  const zoomReset = () => { if (zoomRef.current) d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.transform, d3.zoomIdentity); };
  const refreshData = () => { loadChain(); };

  if (loading) return <Typography sx={{ textAlign: 'center', mt: 4 }}>Loading...</Typography>;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Typography variant="h4" align="center" sx={{ mt: 2, mb: 1, color: '#1B5E20', fontWeight: 'bold' }}>
        سلسلہ: حضرت علی (ع) تا شیرازی
      </Typography>
      <div ref={containerRef} style={{ flex: 1, overflow: 'auto', padding: '10px', background: '#f5f5f5' }}>
        <svg ref={svgRef} style={{ display: 'block', width: '100%', minHeight: '100%' }} />
      </div>

      <div className="control-bar">
        <button onClick={zoomOut} title="Zoom Out"><ZoomOutIcon fontSize="inherit" /></button>
        <button onClick={zoomReset} title="Reset Zoom"><CenterFocusStrongIcon fontSize="inherit" /></button>
        <button onClick={zoomIn} title="Zoom In"><ZoomInIcon fontSize="inherit" /></button>
        <button onClick={refreshData} title="Refresh Data"><RefreshIcon fontSize="inherit" /></button>
      </div>

      {/* ─── ADD CHILD DIALOG ─── */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#2E7D32', color: 'white' }}>Add Child</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label="Name *" margin="normal" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} />
          <TextField fullWidth label="Generation Number *" type="number" margin="normal" value={editData.generation_number} onChange={e => setEditData({ ...editData, generation_number: e.target.value })} />
          <TextField fullWidth label="Mother's Name" margin="normal" value={editData.mother_name} onChange={e => setEditData({ ...editData, mother_name: e.target.value })} />
          <TextField fullWidth label="Wife's Name" margin="normal" value={editData.wife_name} onChange={e => setEditData({ ...editData, wife_name: e.target.value })} />
          <TextField fullWidth label="Urdu Name" margin="normal" value={editData.urdu_name} onChange={e => setEditData({ ...editData, urdu_name: e.target.value })} />
          <FormControl fullWidth margin="normal">
            <InputLabel>Status</InputLabel>
            <Select value={editData.is_alive ? 'alive' : 'deceased'} label="Status" onChange={e => setEditData({ ...editData, is_alive: e.target.value === 'alive' })}>
              <MenuItem value="alive">Alive</MenuItem>
              <MenuItem value="deceased">Deceased</MenuItem>
            </Select>
          </FormControl>
          <TextField fullWidth label="Additional Info" margin="normal" multiline rows={2} value={editData.info} onChange={e => setEditData({ ...editData, info: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddSubmit}>Add</Button>
        </DialogActions>
      </Dialog>

      {/* ─── EDIT DIALOG ─── */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1565C0', color: 'white' }}>Edit Node</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Name *" margin="normal" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} />
          <TextField fullWidth label="Generation Number *" type="number" margin="normal" value={editData.generation_number} onChange={e => setEditData({ ...editData, generation_number: e.target.value })} />
          <TextField fullWidth label="Father's Name" margin="normal" value={editData.father_name} onChange={e => setEditData({ ...editData, father_name: e.target.value })} />
          <TextField fullWidth label="Mother's Name" margin="normal" value={editData.mother_name} onChange={e => setEditData({ ...editData, mother_name: e.target.value })} />
          <TextField fullWidth label="Wife's Name" margin="normal" value={editData.wife_name} onChange={e => setEditData({ ...editData, wife_name: e.target.value })} />
          <TextField fullWidth label="Urdu Name" margin="normal" value={editData.urdu_name} onChange={e => setEditData({ ...editData, urdu_name: e.target.value })} />
          <FormControl fullWidth margin="normal">
            <InputLabel>Status</InputLabel>
            <Select value={editData.is_alive ? 'alive' : 'deceased'} label="Status" onChange={e => setEditData({ ...editData, is_alive: e.target.value === 'alive' })}>
              <MenuItem value="alive">Alive</MenuItem>
              <MenuItem value="deceased">Deceased</MenuItem>
            </Select>
          </FormControl>
          <TextField fullWidth label="Birth Year" margin="normal" value={editData.birth_year} onChange={e => setEditData({ ...editData, birth_year: e.target.value })} placeholder="e.g. 570" />
          <TextField fullWidth label="Death Year" margin="normal" value={editData.death_year} onChange={e => { const val = e.target.value; setEditData(prev => ({ ...prev, death_year: val, ...(val.trim() !== '' && { is_alive: false }) })); }} placeholder="Leave blank if alive" />
          <TextField fullWidth label="Additional Info" margin="normal" multiline rows={2} value={editData.info} onChange={e => setEditData({ ...editData, info: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSubmit}>Save</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default AliToSherazi;