import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
  TextField, Typography,
} from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import axios from 'axios';
import * as d3 from 'd3';

function AdamToMuhammad({ user }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  const [chain, setChain] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [editData, setEditData] = useState({ name: '', generation_number: '', info: '', parent_id: '' });
  const [newData, setNewData] = useState({ name: '', generation_number: '', info: '', parent_id: '' });

  const token = localStorage.getItem('token');
  const isAdmin = user && user.role === 'admin';

  // ─── Load data ───
  const loadChain = useCallback(async () => {
    try {
      const res = await axios.get('/api/prophets');
      setChain(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadChain(); }, [loadChain]);

  // Helper: father name
  const getFatherName = (node) => {
    if (!node?.parent_id) return null;
    const father = chain.find(n => n.id === node.parent_id);
    return father ? father.name : null;
  };

  // ─── Admin handlers ───
  const handleAddAfter = (node) => {
    setNewData({
      name: '',
      generation_number: node.generation_number + 1,
      info: '',
      parent_id: node.id,
    });
    setOpen(true);
  };

  const handleEdit = (node) => {
    setEditingNode(node);
    setEditData({
      name: node.name,
      generation_number: node.generation_number,
      info: node.info || '',
      parent_id: node.parent_id || '',
    });
    setEditOpen(true);
  };

  const handleDelete = async (node) => {
    if (!window.confirm(`Delete ${node.name}?`)) return;
    try {
      await axios.delete(`/api/prophets/${node.id}`, { headers: { 'x-auth-token': token } });
      loadChain();
    } catch (err) { alert('Delete failed'); }
  };

  const handleAddSubmit = async () => {
    if (!newData.name.trim() || !newData.generation_number) {
      alert('Name and Generation Number are required');
      return;
    }
    try {
      await axios.post('/api/prophets', newData, { headers: { 'x-auth-token': token } });
      setOpen(false);
      loadChain();
    } catch (err) { alert(err.response?.data?.msg || 'Add failed'); }
  };

  const handleEditSubmit = async () => {
    try {
      await axios.put(`/api/prophets/${editingNode.id}`, editData, { headers: { 'x-auth-token': token } });
      setEditOpen(false);
      loadChain();
    } catch (err) { alert('Update failed'); }
  };

  // ─── Snake layout (5 per row), zoom, scroll ───
  const drawSnake = useCallback(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    if (chain.length === 0) return;

    const boxW = 200;          // ✅ chhota box
    const boxH = 140;          // ✅ height kam
    const gapX = 30;
    const gapY = 50;
    const nodesPerRow = 5;
    const padding = 30;

    const positions = chain.map((_, i) => {
      const row = Math.floor(i / nodesPerRow);
      const col = i % nodesPerRow;
      return {
        x: col * (boxW + gapX),
        y: row * (boxH + gapY),
      };
    });

    const maxRow = Math.floor((chain.length - 1) / nodesPerRow);
    const contentWidth = Math.min(chain.length, nodesPerRow) * (boxW + gapX) - gapX + padding * 2;
    const contentHeight = (maxRow + 1) * (boxH + gapY) - gapY + padding * 2;

    const availWidth = contentWidth;   // full width, scroll handles horizontal overflow if needed
    const availHeight = Math.max(contentHeight, 500); // minimum 500px

    // Apply zoom
    const scaledWidth = contentWidth * zoom;
    const scaledHeight = contentHeight * zoom;

    svg.attr('width', scaledWidth).attr('height', scaledHeight)
       .attr('viewBox', `0 0 ${scaledWidth} ${scaledHeight}`);

    const g = svg.append('g')
      .attr('transform', `translate(${padding * zoom}, ${padding * zoom}) scale(${zoom})`);

    // Nodes
    chain.forEach((node, i) => {
      const { x, y } = positions[i];
      const gNode = g.append('g').attr('class', 'node').attr('transform', `translate(${x}, ${y})`);

      // Card background
      gNode.append('rect')
        .attr('width', boxW).attr('height', boxH)
        .attr('rx', 10).attr('ry', 10)
        .attr('fill', '#ffffffcc')
        .attr('stroke', '#2E7D32')
        .attr('stroke-width', 2);

      gNode.append('rect')
        .attr('width', boxW).attr('height', 5).attr('rx', 2)
        .attr('fill', '#2E7D32');

      // Text with father name
      const fatherName = getFatherName(node);
      const fatherLine = fatherName ? `<br/><span style="font-size:9px;color:#1565C0;">bin ${fatherName}</span>` : '';

      gNode.append('foreignObject')
        .attr('width', boxW - 16).attr('height', boxH - 40)
        .attr('x', 8).attr('y', 8)
        .append('xhtml:div')
        .style('width', '100%').style('height', '100%')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('align-items', 'center')
        .style('justify-content', 'center')
        .style('text-align', 'center')
        .style('font-size', '11px')
        .style('line-height', '1.2')
        .style('overflow', 'hidden')
        .html(`<b>${node.name}</b>${fatherLine}<br/><span style="font-size:9px;color:#555;">Gen: ${node.generation_number}</span>${node.info ? `<br/><span style="font-size:9px;color:#777;">${node.info}</span>` : ''}`);

      // Admin buttons
      if (isAdmin) {
        const btnY = boxH - 25;
        // Add child button
        gNode.append('g')
          .attr('transform', `translate(${boxW - 36}, ${btnY})`)
          .attr('cursor', 'pointer')
          .on('click', (event) => { event.stopPropagation(); handleAddAfter(node); })
          .append('rect')
          .attr('width', 26).attr('height', 18).attr('rx', 8)
          .attr('fill', '#fff').attr('stroke', '#2E7D32').attr('stroke-width', 1.2);
        gNode.select('g:last-child').append('text')
          .attr('x', 13).attr('y', 14)
          .attr('text-anchor', 'middle')
          .attr('font-size', '12px')
          .attr('font-weight', 'bold')
          .attr('fill', '#2E7D32')
          .text('+');

        // Edit button
        gNode.append('g')
          .attr('transform', `translate(${boxW - 68}, ${btnY})`)
          .attr('cursor', 'pointer')
          .on('click', (event) => { event.stopPropagation(); handleEdit(node); })
          .append('rect')
          .attr('width', 26).attr('height', 18).attr('rx', 8)
          .attr('fill', '#fff').attr('stroke', '#1565C0').attr('stroke-width', 1.2);
        gNode.select('g:last-child').append('text')
          .attr('x', 13).attr('y', 14)
          .attr('text-anchor', 'middle')
          .attr('font-size', '12px')
          .attr('font-weight', 'bold')
          .attr('fill', '#1565C0')
          .text('✎');

        // Delete button
        gNode.append('g')
          .attr('transform', `translate(${boxW - 100}, ${btnY})`)
          .attr('cursor', 'pointer')
          .on('click', (event) => { event.stopPropagation(); handleDelete(node); })
          .append('rect')
          .attr('width', 26).attr('height', 18).attr('rx', 8)
          .attr('fill', '#fff').attr('stroke', '#C2185B').attr('stroke-width', 1.2);
        gNode.select('g:last-child').append('text')
          .attr('x', 13).attr('y', 14)
          .attr('text-anchor', 'middle')
          .attr('font-size', '12px')
          .attr('font-weight', 'bold')
          .attr('fill', '#C2185B')
          .text('✕');
      }
    });
  }, [chain, isAdmin, zoom]);

  useEffect(() => {
    if (chain.length > 0) drawSnake();
    else if (!loading) d3.select(svgRef.current).selectAll('*').remove();
  }, [chain, drawSnake, loading]);

  // ─── Zoom handlers (working) ───
  const zoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const zoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.4));
  const zoomReset = () => setZoom(1);

  if (loading) return <Typography sx={{ textAlign: 'center', mt: 4 }}>Loading...</Typography>;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" align="center" sx={{ mt: 2, mb: 2, color: '#2E7D32', fontWeight: 'bold' }}>
        Shajra: Hazrat Adam (A.S) to Hazrat Muhammad (S.A.W)
      </Typography>

      {chain.length === 0 && !loading && (
        <Typography sx={{ textAlign: 'center', mt: 4 }}>
          No entries yet. {isAdmin && 'Please add the first entry using the admin panel.'}
        </Typography>
      )}

      {/* ✅ Container with vertical scroll */}
      <div ref={containerRef} style={{ flex: 1, overflow: 'auto', padding: '10px' }}>
        <svg ref={svgRef} style={{ display: 'block', width: '100%', minHeight: '100%' }} />
      </div>

      {/* ✅ Control bar with zoom buttons */}
      <div className="control-bar">
        <button onClick={zoomOut} title="Zoom Out"><ZoomOutIcon fontSize="inherit" /></button>
        <button onClick={zoomReset} title="Reset Zoom"><CenterFocusStrongIcon fontSize="inherit" /></button>
        <button onClick={zoomIn} title="Zoom In"><ZoomInIcon fontSize="inherit" /></button>
        {isAdmin && <button onClick={() => handleAddAfter(chain[0] || {})} title="Add First">+ Add</button>}
      </div>

      {/* Add Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#2E7D32', color: 'white' }}>Add Prophet / Ancestor</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Name *" margin="normal" value={newData.name} onChange={e => setNewData({ ...newData, name: e.target.value })} />
          <TextField fullWidth label="Generation Number *" type="number" margin="normal" value={newData.generation_number} onChange={e => setNewData({ ...newData, generation_number: e.target.value })} />
          <TextField fullWidth label="Info" margin="normal" value={newData.info} onChange={e => setNewData({ ...newData, info: e.target.value })} />
          <TextField fullWidth label="Parent ID (optional)" margin="normal" value={newData.parent_id} onChange={e => setNewData({ ...newData, parent_id: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddSubmit}>Add</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1565C0', color: 'white' }}>Edit</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Name *" margin="normal" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} />
          <TextField fullWidth label="Generation Number *" type="number" margin="normal" value={editData.generation_number} onChange={e => setEditData({ ...editData, generation_number: e.target.value })} />
          <TextField fullWidth label="Info" margin="normal" value={editData.info} onChange={e => setEditData({ ...editData, info: e.target.value })} />
          <TextField fullWidth label="Parent ID" margin="normal" value={editData.parent_id} onChange={e => setEditData({ ...editData, parent_id: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSubmit}>Save</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default AdamToMuhammad;