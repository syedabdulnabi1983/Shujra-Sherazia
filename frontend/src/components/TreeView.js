import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, FormControl, InputLabel, AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import axios from 'axios';
import * as d3 from 'd3';

function TreeView() {
  const { khandanId } = useParams();
  const [members, setMembers] = useState([]);
  const [khandan, setKhandan] = useState(null);
  const [open, setOpen] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', gender: 'male', parent_id: '' });
  const [selectedMember, setSelectedMember] = useState(null);
  const svgRef = useRef();
  const containerRef = useRef();
  const zoomRef = useRef(null);
  const baseSvgWidth = useRef(0);
  const baseSvgHeight = useRef(0);
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, [khandanId]);
  useEffect(() => { if (members.length > 0) drawTree(); }, [members]);

  const loadData = async () => {
    try {
      const kRes = await axios.get('http://localhost:5000/api/tree/khandans');
      const currentKhandan = kRes.data.find(k => k.id === parseInt(khandanId));
      setKhandan(currentKhandan);
      const mRes = await axios.get(`http://localhost:5000/api/tree/tree/${khandanId}`);
      setMembers(mRes.data);
    } catch (err) { console.log(err); }
  };

  const addMember = async () => {
    try {
      const dataToSend = { ...newMember, khandan_id: parseInt(khandanId), parent_id: newMember.parent_id ? parseInt(newMember.parent_id) : null };
      await axios.post('http://localhost:5000/api/tree/member', dataToSend, { headers: { Authorization: `Bearer ${token}` } });
      setOpen(false); setNewMember({ name: '', gender: 'male', parent_id: '' }); loadData();
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
  };

  const addSpouse = async (memberData) => {
    try {
      const name = window.prompt(`"${memberData.name}" ki BV ka naam likhein:`);
      if (!name) return;
      await axios.post('http://localhost:5000/api/tree/member', { name, gender: 'female', khandan_id: parseInt(khandanId), spouse_id: memberData.id }, { headers: { Authorization: `Bearer ${token}` } });
      setSelectedMember(null); loadData();
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
  };

  const addChildMember = async (parentId) => {
    try {
      const name = window.prompt('Bachay ka naam likhein:'); if (!name) return;
      const gender = window.confirm('OK for Male, Cancel for Female') ? 'male' : 'female';
      await axios.post('http://localhost:5000/api/tree/member', { name, gender, khandan_id: parseInt(khandanId), parent_id: parentId }, { headers: { Authorization: `Bearer ${token}` } });
      setSelectedMember(null); loadData();
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
  };

  const addSiblingMember = async (memberData) => {
    try {
      if (!memberData.parent_id) { alert('Ye root member hai, parent nahi hai.'); return; }
      const name = window.prompt('Bhai/Behan ka naam likhein:'); if (!name) return;
      const gender = window.confirm('OK for Male, Cancel for Female') ? 'male' : 'female';
      await axios.post('http://localhost:5000/api/tree/member', { name, gender, khandan_id: parseInt(khandanId), parent_id: memberData.parent_id }, { headers: { Authorization: `Bearer ${token}` } });
      setSelectedMember(null); loadData();
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
  };

  const deleteMember = async (id) => {
    if (!window.confirm('Delete karna hai?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/admin/members/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setSelectedMember(null); loadData();
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
  };

  const getAncestors = (memberId) => {
    const ancestors = []; let current = members.find(m => m.id === memberId);
    if (!current) return ancestors;
    while (current && current.parent_id) {
      const parent = members.find(m => m.id === current.parent_id);
      if (parent) { ancestors.push(parent.id); current = parent; } else break;
    }
    return ancestors;
  };

  const getSpouses = (memberId) => members.filter(m => m.spouse_id === memberId);

  const zoomIn = () => { if (svgRef.current && zoomRef.current) d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.3); };
  const zoomOut = () => { if (svgRef.current && zoomRef.current) d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 0.7); };
  const zoomReset = () => { if (svgRef.current && zoomRef.current) d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.transform, d3.zoomIdentity); };

  const drawTree = () => {
    const svg = d3.select(svgRef.current); svg.selectAll('*').remove();
    const isMobile = window.innerWidth < 768;
    const boxW = isMobile ? 140 : 200, boxH = isMobile ? 85 : 105;
    const nodeW = isMobile ? 250 : 340, nodeH = isMobile ? 200 : 240;
    const fontSize = isMobile ? '10px' : '12px', smallFont = isMobile ? '7px' : '9px';
    const PADDING = 350;

    const rootMember = members.find(m => !m.parent_id) || members[0];
    if (!rootMember) return;

    const buildHierarchy = (pid) => {
      const children = members.filter(m => m.parent_id === pid && !m.spouse_id);
      return children.map(c => ({ ...c, children: buildHierarchy(c.id) }));
    };

    const root = d3.hierarchy({ ...rootMember, children: buildHierarchy(rootMember.id) });
    const treeLayout = d3.tree().nodeSize([nodeW, nodeH]); treeLayout(root);
    const nodesArray = root.descendants();
    const minX = d3.min(nodesArray, d => d.x), maxX = d3.max(nodesArray, d => d.x);
    const minY = d3.min(nodesArray, d => d.y), maxY = d3.max(nodesArray, d => d.y);
    const svgWidth = (maxX - minX) + (PADDING * 2) + boxW + 250;
    const svgHeight = (maxY - minY) + (PADDING * 2) + boxH;
    baseSvgWidth.current = svgWidth; baseSvgHeight.current = svgHeight;
    svg.attr('width', svgWidth).attr('height', svgHeight).attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`).style('display', 'block');

    const g = svg.append('g').attr('transform', `translate(${-minX + PADDING}, ${-minY + PADDING})`);
    const zoom = d3.zoom().scaleExtent([0.5, 10]).on('zoom', (event) => {
      const { x, y, k } = event.transform;
      g.attr('transform', `translate(${x}, ${y}) scale(${k})`);
      svg.attr('width', baseSvgWidth.current * k).attr('height', baseSvgHeight.current * k);
    });
    svg.call(zoom); zoomRef.current = zoom;

    // Links
    g.selectAll('.link').data(root.links()).enter().append('path').attr('d', d => {
      const sx = d.source.x, sy = d.source.y + boxH, tx = d.target.x, ty = d.target.y, midY = (sy + ty) / 2;
      return `M${sx},${sy} L${sx},${midY} L${tx},${midY} L${tx},${ty}`;
    }).attr('fill', 'none').attr('stroke', '#aaa').attr('stroke-width', 2).attr('stroke-linecap', 'round');

    // Nodes
    const nodes = g.selectAll('.node').data(nodesArray).enter().append('g').attr('class', 'node').attr('transform', d => `translate(${d.x - boxW/2}, ${d.y})`);
    nodes.append('rect').attr('width', boxW).attr('height', boxH).attr('rx', 8).attr('ry', 8).attr('fill', '#fff').attr('stroke', d => d.data.gender === 'female' ? '#E91E63' : '#2E7D32').attr('stroke-width', 2.5).attr('filter', 'drop-shadow(2px 2px 4px rgba(0,0,0,0.15))').attr('cursor', 'pointer');
    nodes.append('rect').attr('width', boxW).attr('height', 5).attr('rx', 3).attr('fill', d => d.data.gender === 'female' ? '#E91E63' : '#2E7D32');
    nodes.append('foreignObject').attr('width', boxW - 10).attr('height', boxH - 45).attr('x', 5).attr('y', 10).append('xhtml:div').style('width', (boxW - 10) + 'px').style('height', (boxH - 45) + 'px').style('display', 'flex').style('align-items', 'center').style('justify-content', 'center').style('text-align', 'center').style('font-family', 'Arial').style('font-size', fontSize).style('font-weight', 'bold').style('color', '#1a1a1a').style('word-wrap', 'break-word').text(d => d.data.name);
    nodes.append('text').attr('x', boxW / 2).attr('y', boxH - 22).attr('text-anchor', 'middle').attr('fill', d => d.data.gender === 'female' ? '#E91E63' : '#2E7D32').attr('font-size', smallFont).text(d => d.data.gender === 'male' ? 'Male' : 'Female');

    // ========== ❤️ HEART ICON WITH TOOLTIP ==========
    nodes.each(function(d) {
      const spouses = getSpouses(d.data.id);
      if (spouses.length > 0) {
        const spouseNames = spouses.map(s => s.name).join(', ');
        const heart = d3.select(this).append('text')
          .attr('x', boxW - 16).attr('y', 18)
          .attr('text-anchor', 'middle')
          .attr('font-size', '13px')
          .attr('cursor', 'default')
          .text(spouses.length === 1 ? '❤️' : '❤️' + spouses.length);

        // SVG Title element for hover tooltip
        heart.append('title').text('💍 BV: ' + spouseNames);
      }
    });

    // ========== 4 ARROWS ==========
    const arrowY = boxH + 10;
    nodes.append('text').attr('x', -20).attr('y', arrowY).attr('text-anchor', 'middle').attr('font-size', '14px').attr('cursor', 'pointer').attr('fill', '#2196F3').text('⬅️').on('click', (e, d) => { e.stopPropagation(); if (token && (role === 'admin' || role === 'member')) addSiblingMember(d.data); }).append('title').text('Bhai/Behan');
    nodes.append('text').attr('x', boxW / 2).attr('y', arrowY).attr('text-anchor', 'middle').attr('font-size', '16px').attr('cursor', 'pointer').attr('fill', '#4CAF50').text('⬇️').on('click', (e, d) => { e.stopPropagation(); if (token && (role === 'admin' || role === 'member')) addChildMember(d.data.id); }).append('title').text('Bacha');
    nodes.append('text').attr('x', boxW + 20).attr('y', arrowY).attr('text-anchor', 'middle').attr('font-size', '14px').attr('cursor', 'pointer').attr('fill', '#2196F3').text('➡️').on('click', (e, d) => { e.stopPropagation(); if (token && (role === 'admin' || role === 'member')) addSiblingMember(d.data); }).append('title').text('Bhai/Behan');

    // 💍 Spouse Add Arrow
    nodes.each(function(d) {
      if (d.data.gender === 'male') {
        const spouses = getSpouses(d.data.id);
        const icon = d3.select(this).append('text')
          .attr('x', boxW + 46).attr('y', 14).attr('text-anchor', 'middle')
          .attr('font-size', '12px').attr('cursor', 'pointer')
          .attr('fill', '#E91E63')
          .text(spouses.length === 0 ? '💍' : '💍+')
          .on('click', (e, d2) => { e.stopPropagation(); if (token && (role === 'admin' || role === 'member')) addSpouse(d2.data); });
        icon.append('title').text(spouses.length === 0 ? 'BV Add Karein' : 'Mazeed BV Add Karein');
      }
    });

    // HOVER
    nodes.on('mouseenter', function(e, d) {
      d3.select(this).select('rect:first-of-type').attr('stroke', '#FF6F00').attr('stroke-width', 4);
      const ancestors = getAncestors(d.data.id);
      g.selectAll('.node').each(function(nd) { if (ancestors.includes(nd.data.id)) { d3.select(this).select('rect:first-of-type').attr('stroke', '#FF9800').attr('stroke-width', 3).attr('fill', '#FFF3E0'); } });
      g.selectAll('.link').each(function(ld) { if (ancestors.includes(ld.target.data.id)) { d3.select(this).attr('stroke', '#FF9800').attr('stroke-width', 3); } });
    }).on('mouseleave', function() {
      g.selectAll('.node rect:first-of-type').attr('stroke', d => d.data.gender === 'female' ? '#E91E63' : '#2E7D32').attr('stroke-width', 2.5).attr('fill', '#fff');
      g.selectAll('.link').attr('stroke', '#aaa').attr('stroke-width', 2);
    }).on('click', (e, d) => { e.stopPropagation(); setSelectedMember(d.data); });
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" sx={{ bgcolor: '#2E7D32', flexShrink: 0 }}>
        <Toolbar sx={{ flexWrap: 'wrap', gap: 0.5, py: 0.5 }}>
          <IconButton color="inherit" onClick={() => navigate(-1)} edge="start" size="small"><ArrowBackIcon /></IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, fontSize: { xs: '0.9rem', sm: '1.25rem' } }}>🌳 {khandan?.khandan_name || 'Family Tree'}</Typography>
          <IconButton color="inherit" onClick={zoomOut} size="small"><ZoomOutIcon /></IconButton>
          <IconButton color="inherit" onClick={zoomReset} size="small"><CenterFocusStrongIcon /></IconButton>
          <IconButton color="inherit" onClick={zoomIn} size="small"><ZoomInIcon /></IconButton>
          {token && (role === 'admin' || role === 'member') && (
            <Button variant="contained" onClick={() => setOpen(true)} size="small" sx={{ bgcolor: 'white', color: '#2E7D32', fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>+ Add Member</Button>
          )}
        </Toolbar>
      </AppBar>
      <div ref={containerRef} style={{ flexGrow: 1, overflow: 'auto', background: '#f5f5f5', width: '100%', height: '100%' }}>
        <svg ref={svgRef} style={{ display: 'block', cursor: 'grab' }}></svg>
      </div>
      {selectedMember && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: '#333', color: '#fff', padding: '8px 16px', borderRadius: 20, display: 'flex', gap: 10, alignItems: 'center', zIndex: 1000, fontSize: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span>👤 {selectedMember.name}</span>
          {token && (role === 'admin' || role === 'member') && (
            <>
              {selectedMember.gender === 'male' && <Button size="small" variant="outlined" sx={{ color: '#E91E63', borderColor: '#E91E63', fontSize: '11px' }} onClick={() => addSpouse(selectedMember)}>💍 BV</Button>}
              <Button size="small" variant="outlined" sx={{ color: '#fff', borderColor: '#fff', fontSize: '11px' }} onClick={() => addSiblingMember(selectedMember)}>⬅️➡️ Sibling</Button>
              <Button size="small" variant="outlined" sx={{ color: '#fff', borderColor: '#fff', fontSize: '11px' }} onClick={() => addChildMember(selectedMember.id)}>⬇️ Child</Button>
              {role === 'admin' && <Button size="small" variant="outlined" sx={{ color: '#ff5252', borderColor: '#ff5252', fontSize: '11px' }} onClick={() => deleteMember(selectedMember.id)}>🗑 Delete</Button>}
            </>
          )}
          <Button size="small" sx={{ color: '#aaa', fontSize: '11px' }} onClick={() => setSelectedMember(null)}>✕</Button>
        </div>
      )}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle sx={{ bgcolor: '#2E7D32', color: 'white' }}>Naya Member Add Karein</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField fullWidth label="Naam" margin="normal" value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })} />
          <FormControl fullWidth margin="normal"><InputLabel>Gender</InputLabel><Select value={newMember.gender} onChange={e => setNewMember({ ...newMember, gender: e.target.value })}><MenuItem value="male">Male</MenuItem><MenuItem value="female">Female</MenuItem></Select></FormControl>
          <FormControl fullWidth margin="normal"><InputLabel>Parent</InputLabel><Select value={newMember.parent_id} onChange={e => setNewMember({ ...newMember, parent_id: e.target.value })}><MenuItem value="">-- Koi Nahi (Root) --</MenuItem>{members.map(m => (<MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>))}</Select></FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="contained" onClick={addMember} sx={{ bgcolor: '#2E7D32' }}>Add Member</Button></DialogActions>
      </Dialog>
    </div>
  );
}

export default TreeView;