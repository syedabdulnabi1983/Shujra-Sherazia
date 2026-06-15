import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Select, TextField,
  Typography,
} from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import axios from 'axios';
import * as d3 from 'd3';

function AdamToMuhammad({ user }) {
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
  const isAdmin = user && user.role === 'admin';

  // ─── LOAD CHAIN (MERGED) ───
  const loadChain = useCallback(async () => {
    try {
      const [prophetsRes, aliRes] = await Promise.all([
        axios.get('/api/prophets'),
        axios.get('/api/ali-sherazia'),   // '/api/tree' bhi use kar sakte hain
      ]);

      let prophetsData = prophetsRes.data;
      let aliData = aliRes.data;

      // Hazrat Ali (A.S) dhundho family_tree (aliData) mein
      const aliNode = aliData.find(n => n.name === 'Hazrat Ali (A.S)');
      if (!aliNode) {
        console.warn('Hazrat Ali (A.S) not found in family_tree');
        setChain(prophetsData);
        setLoading(false);
        return;
      }

      // Abu Talib dhundho prophets_chain mein
      const abuTalib = prophetsData.find(n => n.name === 'Abu Talib');
      if (!abuTalib) {
        console.warn('Abu Talib not found in prophets_chain');
        setChain(prophetsData);
        setLoading(false);
        return;
      }

      // Ali ki generation set karo (Abu Talib + 1)
      const aliGeneration = (abuTalib.generation_number || 0) + 1;
      aliNode.generation_number = aliGeneration;
      aliNode.parent_id = abuTalib.id;

      // Ali ke bachay (Hasan, Hussain, etc.) aliData se nikalo
      const aliChildren = aliData.filter(n => n.parent_id === aliNode.id);
      aliChildren.forEach(child => {
        child.generation_number = aliGeneration + 1;
        child.parent_id = aliNode.id;  // Ali ki original id (family_tree wali)
      });

      // Prophets data ke saath Ali aur uske bachay jodo
      const merged = [...prophetsData, aliNode, ...aliChildren];

      // Agar chahen to Motton Shah aur Sherazia bhi jod sakte hain (extra step)
      // ...

      setChain(merged);
    } catch (err) {
      console.error('Error loading chain:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadChain(); }, [loadChain]);

  // ─── HELPER: Get Father Name ───
  const getFatherName = useCallback((node) => {
    if (!node?.parent_id) return null;
    const father = chain.find(n => n.id === node.parent_id);
    return father ? father.name : null;
  }, [chain]);

  // ─── SPLIT DATA ───
  const horizontalChain = chain.filter(n => n.generation_number <= 78);
  const verticalChain = chain.filter(n => n.generation_number >= 79);

  // ─── ADD CHILD ───
  const handleAddChild = (parentId) => {
    if (!isAdmin) return;
    setAddingParentId(parentId);
    const parentNode = chain.find(n => n.id === parentId);
    let nextGen = 1;
    if (parentNode && parentNode.generation_number != null) {
      const genNum = parseInt(parentNode.generation_number);
      if (!isNaN(genNum)) nextGen = genNum + 1;
    }
    setEditData({
      ...emptyMember,
      generation_number: nextGen,
      parent_id: parentId,
      father_name: parentNode ? parentNode.name : '',
      mother_name: parentNode ? (parentNode.wife_name || '') : '',
    });
    setAddOpen(true);
  };

  const handleAddSubmit = async () => {
    if (!isAdmin) return;
    if (!editData.name.trim()) { alert('Name is required'); return; }
    if (!editData.parent_id) { alert('Parent ID is missing'); return; }

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
      await axios.post('/api/prophets', fd, {
        headers: { 'x-auth-token': token, 'Content-Type': 'multipart/form-data' },
      });
      setAddOpen(false);
      setEditData(emptyMember);
      loadChain();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to add');
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
    if (!editData.name.trim()) { alert('Name is required'); return; }
    const fd = new FormData();
    fd.append('name', editData.name);
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
      // PUT /api/prophets/:id – sirf prophets_chain mein edit karega, family_tree wale ko nahi
      await axios.put(`/api/prophets/${editingNode.id}`, fd, {
        headers: { 'x-auth-token': token, 'Content-Type': 'multipart/form-data' },
      });
      setEditOpen(false);
      loadChain();
    } catch (err) {
      alert(err.response?.data?.msg || 'Update failed');
    }
  };

  // ─── DELETE ───
  const handleDeleteNode = useCallback(async (nodeId, nodeName) => {
    if (!isAdmin) return;
    if (!window.confirm(`Delete "${nodeName}"?`)) return;
    try {
      await axios.delete(`/api/prophets/${nodeId}`, {
        headers: { 'x-auth-token': token }
      });
      loadChain();
    } catch (err) {
      alert(err.response?.data?.msg || 'Delete failed');
    }
  }, [isAdmin, token, loadChain]);

  // ─── SMART FONT SIZING ───
  const calculateFontSize = (name, father, wife, info, boxWidth, boxHeight, isMuhammad) => {
    let baseSize = isMuhammad ? 20 : 14;
    const minSize = isMuhammad ? 12 : 8;
    
    let text = name || '';
    if (father) text += father;
    if (wife) text += wife;
    if (info) text += info;
    
    const charCount = text.length;
    const charsPerLine = isMuhammad ? 25 : (boxWidth < 250 ? 12 : 18);
    const lines = Math.ceil(charCount / charsPerLine);
    
    let adjustedSize = baseSize;
    if (lines > 3) {
      adjustedSize = Math.max(minSize, baseSize - (lines - 3) * 1.5);
    }
    if (charCount > 50) {
      adjustedSize = Math.max(minSize, adjustedSize - 2);
    }
    
    const maxLinesFit = Math.floor(boxHeight / (adjustedSize * 1.4));
    if (lines > maxLinesFit) {
      adjustedSize = Math.max(minSize, adjustedSize - (lines - maxLinesFit) * 1.2);
    }
    
    return adjustedSize;
  };

  // ─── D3 TREE DRAWING (HORIZONTAL + VERTICAL) ───
  const drawCombined = useCallback(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    if (chain.length === 0) return;

    const boxW = 280, boxH = 230;
    const hBoxW = 210, hBoxH = 200;
    const gapX = 40, gapY = 60;
    const pad = 60;
    const solidColor = '#2E7D32';
    const lineWidth = 2.5;

    // Horizontal grid (Gen 1-78)
    const hNodesPerRow = 5;
    const hPositions = horizontalChain.map((_, i) => ({
      x: (i % hNodesPerRow) * (hBoxW + gapX),
      y: Math.floor(i / hNodesPerRow) * (hBoxH + gapY),
    }));
    const hRows = Math.ceil(horizontalChain.length / hNodesPerRow);
    const gridWidth = hNodesPerRow * (hBoxW + gapX) - gapX + pad * 2;
    const gridHeight = hRows * (hBoxH + gapY) - gapY + pad * 2;

    // Build parent-child map for vertical chain
    const parentChildrenMap = new Map();
    verticalChain.forEach(node => {
      if (node.parent_id) {
        if (!parentChildrenMap.has(node.parent_id)) {
          parentChildrenMap.set(node.parent_id, []);
        }
        parentChildrenMap.get(node.parent_id).push(node);
      }
    });

    // Assign tree positions
    const treePositions = new Map();
    const roots = verticalChain.filter(node => !node.parent_id || !verticalChain.some(n => n.id === node.parent_id));
    let currentY = gridHeight + 200;
    let currentX = 100;
    const rowGap = 150;
    
    const positionNode = (node, depth, parentX) => {
      const isMuhammad = node.name && node.name.includes('Muhammad');
      const w = isMuhammad ? 340 : boxW;
      const h = isMuhammad ? 280 : boxH;
      
      const children = parentChildrenMap.get(node.id) || [];
      if (children.length === 0) {
        const x = parentX !== undefined ? parentX : currentX;
        treePositions.set(node.id, { x: x, y: currentY + depth * (h + rowGap), depth, w, h });
        if (parentX === undefined) {
          currentX += w + gapX;
        }
        return 1;
      } else {
        let childX = currentX;
        const childPositions = [];
        children.forEach(child => {
          positionNode(child, depth + 1);
          childPositions.push({ child, x: childX });
          childX += (w + gapX);
        });
        const minChildX = Math.min(...childPositions.map(p => p.x));
        const maxChildX = Math.max(...childPositions.map(p => p.x));
        const parentXPos = (minChildX + maxChildX) / 2;
        treePositions.set(node.id, { x: parentXPos, y: currentY + depth * (h + rowGap), depth, w, h });
        return children.length;
      }
    };
    
    roots.forEach(root => {
      positionNode(root, 0);
    });
    
    let maxDepth = 0;
    treePositions.forEach(pos => { if (pos.depth > maxDepth) maxDepth = pos.depth; });
    const vStartY = gridHeight + 200;
    treePositions.forEach(pos => {
      pos.y = vStartY + pos.depth * (pos.h + rowGap);
    });
    
    const nodePositions = {};
    treePositions.forEach((pos, id) => {
      nodePositions[id] = pos;
    });

    const maxVWidth = Math.max(...Array.from(treePositions.values()).map(p => p.x + p.w + gapX));
    const totalWidth = Math.max(gridWidth, maxVWidth + pad * 2);
    const totalHeight = vStartY + (maxDepth + 1) * (boxH + rowGap) + pad;

    svg.attr('width', totalWidth).attr('height', totalHeight)
      .attr('viewBox', `0 0 ${totalWidth} ${totalHeight}`);

    const mainGroup = svg.append('g');

    const zoom = d3.zoom().scaleExtent([0.1, 12]).on('zoom', (e) => {
      mainGroup.attr('transform', `translate(${e.transform.x}, ${e.transform.y}) scale(${e.transform.k})`);
    });
    svg.call(zoom);
    const initTransform = d3.zoomIdentity.translate(totalWidth/2 - gridWidth/2, 50).scale(0.85);
    svg.call(zoom.transform, initTransform);
    zoomRef.current = zoom;

    // Helper to draw a node (with admin buttons)
    const drawNode = (g, node, x, y, w, h, isHorizontal) => {
      const gNode = g.append('g').attr('transform', `translate(${x}, ${y})`);
      const isMuhammad = node.name && node.name.includes('Muhammad');

      gNode.append('rect')
        .attr('width', w).attr('height', h)
        .attr('rx', 10).attr('ry', 10)
        .attr('fill', isMuhammad ? '#fdf6e3' : '#ffffffcc')
        .attr('stroke', isMuhammad ? '#D4AF37' : solidColor)
        .attr('stroke-width', isMuhammad ? 4 : 2);

      gNode.append('rect')
        .attr('width', w).attr('height', isMuhammad ? 8 : 5)
        .attr('rx', 2).attr('fill', isMuhammad ? '#D4AF37' : solidColor);

      const father = getFatherName(node);
      const fatherLine = father ? `bin ${father}` : '';
      const wifeLine = node.wife_name ? `💍 ${node.wife_name}` : '';

      const fontSize = calculateFontSize(node.name, fatherLine, wifeLine, node.info, w, h, isMuhammad);

      gNode.append('foreignObject')
        .attr('width', w - 16).attr('height', h - 40)
        .attr('x', 8).attr('y', 8)
        .append('xhtml:div')
        .style('width', '100%').style('height', '100%')
        .style('display', 'flex').style('flex-direction', 'column')
        .style('align-items', 'center').style('justify-content', 'center')
        .style('text-align', 'center')
        .style('font-size', `${fontSize}px`)
        .style('line-height', '1.2')
        .html(`<b>${node.name}</b>${fatherLine ? `<br/><span style="font-size:${fontSize-1}px;color:#1565C0;">${fatherLine}</span>` : ''}${wifeLine ? `<br/><span style="font-size:${fontSize-1}px;color:#C2185B;">${wifeLine}</span>` : ''}<br/><span style="font-size:${fontSize-2}px;color:#555;">Gen: ${node.generation_number}</span>${node.info ? `<br/><span style="font-size:${fontSize-2}px;color:#777;">${node.info}</span>` : ''}`);

      if (isAdmin) {
        // ADD CHILD BUTTON (+)
        const addGroup = gNode.append('g')
          .attr('transform', `translate(${w - 36}, ${h - 36})`)
          .attr('cursor', 'pointer')
          .on('click', (e) => { e.stopPropagation(); handleAddChild(node.id); });
        addGroup.append('circle').attr('r', 14).attr('fill', '#2E7D32')
          .attr('stroke', '#fff').attr('stroke-width', 2);
        addGroup.append('text').attr('x', 0).attr('y', 5)
          .attr('text-anchor', 'middle').attr('font-size', '16px')
          .attr('fill', '#fff').attr('font-weight', 'bold').text('+');

        // EDIT BUTTON (✎)
        const editGroup = gNode.append('g')
          .attr('transform', `translate(${w - 68}, ${h - 28})`)
          .attr('cursor', 'pointer')
          .on('click', (e) => { e.stopPropagation(); handleEdit(node); });
        editGroup.append('rect').attr('width', 26).attr('height', 18).attr('rx', 8)
          .attr('fill', '#fff').attr('stroke', '#1565C0').attr('stroke-width', 1.2);
        editGroup.append('text').attr('x', 13).attr('y', 14)
          .attr('text-anchor', 'middle').attr('font-size', '12px')
          .attr('font-weight', 'bold').attr('fill', '#1565C0').text('✎');

        // DELETE BUTTON (✕)
        const delGroup = gNode.append('g')
          .attr('transform', `translate(${w - 36}, 6)`)
          .attr('cursor', 'pointer')
          .on('click', (e) => { e.stopPropagation(); handleDeleteNode(node.id, node.name); });
        delGroup.append('rect').attr('width', 28).attr('height', 20).attr('rx', 6)
          .attr('fill', '#fff').attr('stroke', '#d32f2f').attr('stroke-width', 1.5);
        delGroup.append('text').attr('x', 14).attr('y', 15)
          .attr('text-anchor', 'middle').attr('font-size', '14px')
          .attr('font-weight', 'bold').attr('fill', '#d32f2f').text('✕');
      }
    };

    // ─── DRAW HORIZONTAL NODES ───
    const hGroup = mainGroup.append('g');
    horizontalChain.forEach((node, i) => {
      const { x, y } = hPositions[i];
      drawNode(hGroup, node, x + pad, y + pad, hBoxW, hBoxH, true);
    });

    // ─── CONNECTORS FROM HORIZONTAL TO VERTICAL ───
    horizontalChain.forEach(parentNode => {
      const children = verticalChain.filter(n => n.parent_id === parentNode.id);
      if (children.length === 0) return;

      const parentIdx = horizontalChain.findIndex(n => n.id === parentNode.id);
      if (parentIdx === -1) return;
      const parentPos = hPositions[parentIdx];
      const parentCenterX = parentPos.x + pad + hBoxW / 2;
      const parentBottomY = parentPos.y + pad + hBoxH;

      const childPositions = children.map(child => nodePositions[child.id]).filter(p => p);
      if (childPositions.length === 0) return;

      const childCenterXList = childPositions.map(p => p.x + p.w / 2);
      const childTopYList = childPositions.map(p => p.y);
      const minChildY = Math.min(...childTopYList);

      if (childPositions.length === 1) {
        const childCenterX = childCenterXList[0];
        const childTopY = childTopYList[0];
        mainGroup.append('path')
          .attr('fill', 'none')
          .attr('stroke', solidColor)
          .attr('stroke-width', lineWidth)
          .attr('d', `M${parentCenterX},${parentBottomY} L${childCenterX},${childTopY}`);
      } else {
        const midY = parentBottomY + (minChildY - parentBottomY) / 2;

        mainGroup.append('path')
          .attr('fill', 'none')
          .attr('stroke', solidColor)
          .attr('stroke-width', lineWidth)
          .attr('d', `M${parentCenterX},${parentBottomY} L${parentCenterX},${midY}`);

        const minX = Math.min(...childCenterXList);
        const maxX = Math.max(...childCenterXList);
        mainGroup.append('path')
          .attr('fill', 'none')
          .attr('stroke', solidColor)
          .attr('stroke-width', lineWidth)
          .attr('d', `M${minX},${midY} L${maxX},${midY}`);

        childPositions.forEach((pos) => {
          const childCenterX = pos.x + pos.w / 2;
          const childTopY = pos.y;
          mainGroup.append('path')
            .attr('fill', 'none')
            .attr('stroke', solidColor)
            .attr('stroke-width', lineWidth)
            .attr('d', `M${childCenterX},${midY} L${childCenterX},${childTopY}`);
        });
      }
    });

    // ─── DRAW VERTICAL NODES ───
    const vGroup = mainGroup.append('g');
    verticalChain.forEach(node => {
      const pos = nodePositions[node.id];
      if (!pos) return;
      drawNode(vGroup, node, pos.x, pos.y, pos.w, pos.h, false);
    });

    // ─── CONNECTORS BETWEEN VERTICAL NODES ───
    verticalChain.forEach(parentNode => {
      const parentPos = nodePositions[parentNode.id];
      if (!parentPos) return;
      const children = verticalChain.filter(n => n.parent_id === parentNode.id);
      if (children.length === 0) return;

      const parentCenterX = parentPos.x + parentPos.w / 2;
      const parentBottomY = parentPos.y + parentPos.h;

      const childPositions = children.map(child => nodePositions[child.id]).filter(p => p);
      if (childPositions.length === 0) return;

      const childCenterXList = childPositions.map(p => p.x + p.w / 2);
      const childTopYList = childPositions.map(p => p.y);
      const minChildY = Math.min(...childTopYList);

      if (childPositions.length === 1) {
        const childCenterX = childCenterXList[0];
        const childTopY = childTopYList[0];
        mainGroup.append('path')
          .attr('fill', 'none')
          .attr('stroke', solidColor)
          .attr('stroke-width', lineWidth)
          .attr('d', `M${parentCenterX},${parentBottomY} L${childCenterX},${childTopY}`);
      } else {
        const midY = parentBottomY + (minChildY - parentBottomY) / 2;

        mainGroup.append('path')
          .attr('fill', 'none')
          .attr('stroke', solidColor)
          .attr('stroke-width', lineWidth)
          .attr('d', `M${parentCenterX},${parentBottomY} L${parentCenterX},${midY}`);

        const minX = Math.min(...childCenterXList);
        const maxX = Math.max(...childCenterXList);
        mainGroup.append('path')
          .attr('fill', 'none')
          .attr('stroke', solidColor)
          .attr('stroke-width', lineWidth)
          .attr('d', `M${minX},${midY} L${maxX},${midY}`);

        childPositions.forEach((pos) => {
          const childCenterX = pos.x + pos.w / 2;
          const childTopY = pos.y;
          mainGroup.append('path')
            .attr('fill', 'none')
            .attr('stroke', solidColor)
            .attr('stroke-width', lineWidth)
            .attr('d', `M${childCenterX},${midY} L${childCenterX},${childTopY}`);
        });
      }
    });

  }, [horizontalChain, verticalChain, isAdmin, getFatherName, handleEdit, handleAddChild, handleDeleteNode, chain]);

  useEffect(() => {
    if (chain.length > 0) drawCombined();
    else if (!loading) d3.select(svgRef.current).selectAll('*').remove();
  }, [chain, drawCombined, loading]);

  const zoomIn = () => { if (zoomRef.current) d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.5); };
  const zoomOut = () => { if (zoomRef.current) d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 0.7); };
  const zoomReset = () => { if (zoomRef.current) d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.transform, d3.zoomIdentity); };

  if (loading) return <Typography sx={{ textAlign: 'center', mt: 4 }}>Loading...</Typography>;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Typography variant="h5" align="center" sx={{ mt: 2, mb: 1, color: '#2E7D32', fontWeight: 'bold' }}>
        Chain: Hazrat Adam (AS) to Hazrat Muhammad Mustafa (PBUH)
      </Typography>

      <div ref={containerRef} className="tree-bg" style={{ flex: 1, overflow: 'auto', padding: '10px' }}>
        <svg ref={svgRef} style={{ display: 'block', width: '100%', minHeight: '100%' }} />
      </div>

      <div className="control-bar">
        <button onClick={zoomOut} title="Zoom Out"><ZoomOutIcon fontSize="inherit" /></button>
        <button onClick={zoomReset} title="Reset Zoom"><CenterFocusStrongIcon fontSize="inherit" /></button>
        <button onClick={zoomIn} title="Zoom In"><ZoomInIcon fontSize="inherit" /></button>
      </div>

      {/* EDIT DIALOG */}
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
          <input type="file" accept="image/*" onChange={e => setEditData({ ...editData, photo: e.target.files[0] })} style={{ marginTop: 8 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSubmit}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* ADD DIALOG */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#2E7D32', color: 'white' }}>Add Child</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label="Name *" margin="normal" value={editData.name}
            onChange={e => {
              const newName = e.target.value;
              setEditData(prev => {
                const newWife = (prev.wife_name === '' || prev.wife_name.startsWith('W/o '))
                  ? `W/o ${newName}`
                  : prev.wife_name;
                return { ...prev, name: newName, wife_name: newWife };
              });
            }} />
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
          <TextField fullWidth label="Birth Year" margin="normal" value={editData.birth_year} onChange={e => setEditData({ ...editData, birth_year: e.target.value })} placeholder="e.g. 570" />
          <TextField fullWidth label="Death Year" margin="normal" value={editData.death_year} onChange={e => { const val = e.target.value; setEditData(prev => ({ ...prev, death_year: val, ...(val.trim() !== '' && { is_alive: false }) })); }} placeholder="Leave blank if alive" />
          <TextField fullWidth label="Additional Info" margin="normal" multiline rows={2} value={editData.info} onChange={e => setEditData({ ...editData, info: e.target.value })} />
          <input type="file" accept="image/*" onChange={e => setEditData({ ...editData, photo: e.target.files[0] })} style={{ marginTop: 8 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddSubmit}>Add</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default AdamToMuhammad;