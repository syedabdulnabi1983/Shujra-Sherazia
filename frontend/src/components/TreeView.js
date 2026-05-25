import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AppBar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import axios from 'axios';
import * as d3 from 'd3';

const API_BASE_URL = 'http://localhost:5001/api';

const emptyMember = {
  name: '',
  gender: 'male',
  parent_id: '',
  spouse_id: '',
  father_name: '',
  mother_name: '',
  spouse_name: '',
  birth_year: '',
  death_year: '',
  remarks: '',
  is_alive: true,
};

function memberToFormData(member) {
  return {
    name: member?.name ?? '',
    gender: member?.gender ?? 'male',
    parent_id: member?.parent_id ?? '',
    spouse_id: member?.spouse_id ?? '',
    father_name: member?.father_name ?? '',
    mother_name: member?.mother_name ?? '',
    spouse_name: member?.spouse_name ?? '',
    birth_year: member?.birth_year ?? '',
    death_year: member?.death_year ?? '',
    remarks: member?.remarks ?? '',
    is_alive: member?.is_alive ?? true,
  };
}

function TreeView({ user, onLogout }) {
  const { khandanId } = useParams();
  const navigate = useNavigate();
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const zoomRef = useRef(null);

  const [members, setMembers] = useState([]);
  const [khandan, setKhandan] = useState(null);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [editData, setEditData] = useState(emptyMember);
  const [newMember, setNewMember] = useState(emptyMember);
  const [addDialogTitle, setAddDialogTitle] = useState('Add Member');
  const [popupMember, setPopupMember] = useState(null);
  const [popupAnchor, setPopupAnchor] = useState({ x: 0, y: 0 });
  const [error, setError] = useState('');

  const token = localStorage.getItem('token');
  const role = user?.role || localStorage.getItem('role');
  const authConfig = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

  useEffect(() => {
    loadData();
  }, [khandanId]);

  useEffect(() => {
    if (members.length > 0) {
      drawTree();
    } else if (svgRef.current) {
      d3.select(svgRef.current).selectAll('*').remove();
    }
  }, [members, role]);

  const loadData = async () => {
    try {
      setError('');
      let targetId = khandanId;
      const kRes = await axios.get(`${API_BASE_URL}/tree/khandans`);
      const khandans = Array.isArray(kRes.data) ? kRes.data : [];

      if (!targetId && khandans.length > 0) {
        targetId = khandans[0].id;
      }

      const selectedKhandan = khandans.find((item) => item.id === Number(targetId)) || khandans[0] || null;
      setKhandan(selectedKhandan);

      if (!selectedKhandan) {
        setMembers([]);
        setError('No khandan found. Please create one from the backend/admin API.');
        return;
      }

      const mRes = await axios.get(`${API_BASE_URL}/tree/tree/${selectedKhandan.id}`);
      setMembers(Array.isArray(mRes.data) ? mRes.data : []);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load family tree');
    }
  };

  const addMember = async () => {
    if (!newMember.name.trim()) {
      alert('Name required');
      return;
    }

    try {
      await axios.post(
        `${API_BASE_URL}/tree/member`,
        {
          ...newMember,
          khandan_id: khandan?.id,
          parent_id: newMember.parent_id || null,
          spouse_id: newMember.spouse_id || null,
          birth_year: newMember.birth_year || null,
          death_year: newMember.death_year || null,
          is_alive: newMember.is_alive && !newMember.death_year,
        },
        authConfig
      );
      setOpen(false);
      setAddDialogTitle('Add Member');
      setNewMember({ ...emptyMember });
      await loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error adding member');
    }
  };

  const updateMember = async () => {
    if (!editData.name.trim()) {
      alert('Name required');
      return;
    }

    try {
      await axios.put(
        `${API_BASE_URL}/tree/member/${editingMember.id}`,
        {
          ...editData,
          parent_id: editData.parent_id || null,
          spouse_id: editData.spouse_id || null,
          birth_year: editData.birth_year || null,
          death_year: editData.death_year || null,
          is_alive: editData.is_alive && !editData.death_year,
        },
        authConfig
      );
      setEditOpen(false);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error updating member');
    }
  };

  const deleteMember = async (id, name) => {
    if (!window.confirm(`Kya aap "${name}" ko delete karna chahte hain?`)) {
      return;
    }

    try {
      const response = await axios.delete(`${API_BASE_URL}/admin/members/${id}`, authConfig);
      if (response.data.success) {
        setPopupMember(null);
        await loadData();
      } else {
        alert(response.data.message || 'Delete failed');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const openAddMemberForm = (relation, member = null) => {
    const relationDefaults = {
      child: {
        title: member ? `Add Child of ${member.name}` : 'Add Child',
        data: { parent_id: member?.id ?? '' },
      },
      sibling: {
        title: member ? `Add Bhai/Behan of ${member.name}` : 'Add Bhai/Behan',
        data: { parent_id: member?.parent_id ?? '' },
      },
      wife: {
        title: member ? `Add Bivi of ${member.name}` : 'Add Bivi',
        data: {
          gender: member?.gender === 'female' ? 'male' : 'female',
          spouse_id: member?.id ?? '',
        },
      },
      member: {
        title: 'Add Member',
        data: {},
      },
    };

    const config = relationDefaults[relation] || relationDefaults.member;
    setPopupMember(null);
    setAddDialogTitle(config.title);
    setNewMember({ ...emptyMember, ...config.data });
    setOpen(true);
  };

  const createRegistrationCode = async () => {
    const manualCode = window.prompt('Member registration code likhein, ya blank chhor dein auto code ke liye:');

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/codes`, { code: manualCode || '' }, authConfig);
      alert(`Member registration code: ${response.data.code.code}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Unable to create registration code');
    }
  };

  const getAncestors = (id) => {
    const ancestors = [];
    let current = members.find((member) => member.id === id);

    while (current?.parent_id) {
      const parentId = current.parent_id;
      const parent = members.find((member) => member.id === parentId);
      if (!parent) break;
      ancestors.push(parent.id);
      current = parent;
    }

    return ancestors;
  };

  const getSpouses = (id) => members.filter((member) => member.spouse_id === id);

  const calcAge = (birth, death) => {
    if (!birth) return '';
    return death ? `${death - birth}y` : `${new Date().getFullYear() - birth}y`;
  };

  const zoomIn = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.2);
    }
  };

  const zoomOut = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 0.8);
    }
  };

  const zoomReset = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.transform, d3.zoomIdentity);
    }
  };

  const handleDoubleClick = (event, node) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setPopupMember(node.data);
    setPopupAnchor({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
  };

  const drawTree = () => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const isMobile = window.innerWidth < 768;
    const boxW = isMobile ? 200 : 260;
    const boxH = isMobile ? 150 : 165;
    const nodeW = isMobile ? 280 : 360;
    const nodeH = isMobile ? 210 : 245;
    const fontSize = isMobile ? '11px' : '13px';
    const small = isMobile ? '9px' : '11px';
    const padding = 300;

    const rootMember = members.find((member) => !member.parent_id && !member.spouse_id) || members[0];
    if (!rootMember) return;

    const build = (parentId) =>
      members
        .filter((member) => member.parent_id === parentId && !member.spouse_id)
        .map((child) => ({ ...child, children: build(child.id) }));

    const root = d3.hierarchy({ ...rootMember, children: build(rootMember.id) });
    d3.tree().nodeSize([nodeW, nodeH])(root);
    const nodes = root.descendants();

    const minX = d3.min(nodes, (node) => node.x) || 0;
    const maxX = d3.max(nodes, (node) => node.x) || 0;
    const minY = d3.min(nodes, (node) => node.y) || 0;
    const maxY = d3.max(nodes, (node) => node.y) || 0;

    const width = Math.max(maxX - minX + padding * 2 + boxW, containerRef.current?.clientWidth || 1200);
    const height = Math.max(maxY - minY + padding * 2 + boxH, containerRef.current?.clientHeight || 800);

    svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg
      .append('g')
      .attr('transform', `translate(${width / 2 - (minX + maxX) / 2}, ${height / 2 - (minY + maxY) / 2})`);

    const zoom = d3.zoom().scaleExtent([0.3, 3]).on('zoom', (event) => {
      g.attr('transform', `translate(${event.transform.x}, ${event.transform.y}) scale(${event.transform.k})`);
    });
    svg.call(zoom);
    zoomRef.current = zoom;

    g.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('d', (link) => {
        const sx = link.source.x;
        const sy = link.source.y + boxH;
        const tx = link.target.x;
        const ty = link.target.y;
        const my = (sy + ty) / 2;
        return `M${sx},${sy} L${sx},${my} L${tx},${my} L${tx},${ty}`;
      })
      .attr('fill', 'none')
      .attr('stroke', '#aaa')
      .attr('stroke-width', 2);

    const nodeGroup = g
      .selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (node) => `translate(${node.x - boxW / 2}, ${node.y})`)
      .on('dblclick', handleDoubleClick);

    nodeGroup
      .append('rect')
      .attr('width', boxW)
      .attr('height', boxH)
      .attr('rx', 10)
      .attr('ry', 10)
      .attr('fill', (node) => (node.data.is_alive ? '#fff' : '#f5f5f5'))
      .attr('stroke', (node) => (node.data.is_alive ? (node.data.gender === 'female' ? '#E91E63' : '#2E7D32') : '#999'))
      .attr('stroke-width', 2.5)
      .attr('cursor', 'pointer');

    nodeGroup
      .append('rect')
      .attr('width', boxW)
      .attr('height', 6)
      .attr('rx', 3)
      .attr('fill', (node) => (node.data.is_alive ? (node.data.gender === 'female' ? '#E91E63' : '#2E7D32') : '#999'));

    nodeGroup
      .append('foreignObject')
      .attr('width', boxW - 20)
      .attr('height', boxH - 62)
      .attr('x', 10)
      .attr('y', 10)
      .append('xhtml:div')
      .style('width', '100%')
      .style('height', '100%')
      .style('display', 'flex')
      .style('flex-direction', 'column')
      .style('align-items', 'center')
      .style('justify-content', 'center')
      .style('text-align', 'center')
      .style('font-size', fontSize)
      .style('color', (node) => (node.data.is_alive ? '#333' : '#999'))
      .html((node) => {
        const age = calcAge(node.data.birth_year, node.data.death_year);
        const statusText = node.data.is_alive ? 'Alive' : 'Deceased';
        return `<b>${node.data.name}</b>
          <div style="font-size:${small}">${statusText}</div>
          ${node.data.father_name ? `<div style="font-size:${small}">Father: ${node.data.father_name}</div>` : ''}
          ${node.data.birth_year ? `<div style="font-size:${small}">${node.data.birth_year}${node.data.death_year ? `-${node.data.death_year}` : ''}</div>` : ''}
          ${age ? `<div style="font-size:${small};color:#FF9800">Age: ${age}</div>` : ''}`;
      });

    nodeGroup
      .append('text')
      .attr('x', boxW / 2)
      .attr('y', boxH - 42)
      .attr('text-anchor', 'middle')
      .attr('font-size', small)
      .attr('fill', (node) => (node.data.is_alive ? (node.data.gender === 'female' ? '#E91E63' : '#2E7D32') : '#999'))
      .text((node) => (node.data.gender === 'male' ? 'Male' : 'Female'));

    nodeGroup.each(function appendSpouseMarker(node) {
      const spouses = getSpouses(node.data.id);
      if (spouses.length) {
        d3.select(this)
          .append('text')
          .attr('x', boxW - 20)
          .attr('y', 25)
          .attr('text-anchor', 'middle')
          .attr('font-size', '16px')
          .text('\u2661')
          .append('title')
          .text(spouses.map((spouse) => spouse.name).join(', '));
      }
    });

    if (role === 'admin') {
      const addControl = (symbol, x, color, onClick, title) => {
        const control = nodeGroup
          .append('g')
          .attr('transform', `translate(${x}, ${boxH - 32})`)
          .attr('cursor', 'pointer')
          .on('click', onClick);

        control
          .append('rect')
          .attr('width', 46)
          .attr('height', 24)
          .attr('rx', 12)
          .attr('fill', '#fff')
          .attr('stroke', color)
          .attr('stroke-width', 1.4);

        control
          .append('text')
          .attr('x', 23)
          .attr('y', 17)
          .attr('text-anchor', 'middle')
          .attr('font-size', '16px')
          .attr('font-weight', 700)
          .attr('fill', color)
          .text(symbol)
          .append('title')
          .text(title);
      };

      addControl('\u2193', 18, '#2E7D32', (event, node) => {
        event.stopPropagation();
        openAddMemberForm('child', node.data);
      }, 'Child add karein');

      addControl('\u2194', boxW / 2 - 23, '#1565C0', (event, node) => {
        event.stopPropagation();
        openAddMemberForm('sibling', node.data);
      }, 'Sibling add karein');

      addControl('\u2661', boxW - 64, '#C2185B', (event, node) => {
        event.stopPropagation();
        openAddMemberForm('wife', node.data);
      }, 'Bivi add karein');
    }

    nodeGroup
      .on('mouseenter', function onEnter(event, node) {
        d3.select(this).select('rect').attr('stroke', '#FF6F00').attr('stroke-width', 4);
        const ancestors = getAncestors(node.data.id);

        g.selectAll('.node').each(function markAncestor(ancestorNode) {
          if (ancestors.includes(ancestorNode.data.id)) {
            d3.select(this).select('rect').attr('stroke', '#FF9800').attr('stroke-width', 3).attr('fill', '#FFF3E0');
          }
        });
      })
      .on('mouseleave', () => {
        g.selectAll('.node rect')
          .attr('stroke', (node) => (node.data.is_alive ? (node.data.gender === 'female' ? '#E91E63' : '#2E7D32') : '#999'))
          .attr('stroke-width', 2.5)
          .attr('fill', (node) => (node.data.is_alive ? '#fff' : '#f5f5f5'));
      });
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" sx={{ bgcolor: '#2E7D32', flexShrink: 0 }}>
        <Toolbar sx={{ flexWrap: 'wrap', gap: 0.5 }}>
          <IconButton color="inherit" onClick={() => navigate('/')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {khandan?.khandan_name || 'Family Tree'}
          </Typography>
          <IconButton color="inherit" onClick={zoomOut}>
            <ZoomOutIcon />
          </IconButton>
          <IconButton color="inherit" onClick={zoomReset}>
            <CenterFocusStrongIcon />
          </IconButton>
          <IconButton color="inherit" onClick={zoomIn}>
            <ZoomInIcon />
          </IconButton>
          {role === 'admin' && (
            <Button variant="contained" onClick={() => openAddMemberForm('member')} size="small" sx={{ bgcolor: 'white', color: '#2E7D32' }}>
              Add Member
            </Button>
          )}
          {role === 'admin' && (
            <Button variant="contained" onClick={createRegistrationCode} size="small" sx={{ bgcolor: 'white', color: '#1565C0' }}>
              Create Code
            </Button>
          )}
          {user && (
            <Typography variant="body2" sx={{ color: 'white', ml: 1 }}>
              {user.name} ({user.role})
            </Typography>
          )}
          <Button variant="outlined" onClick={onLogout} size="small" sx={{ color: 'white', borderColor: 'white' }}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      {error && <div style={{ padding: 12, color: '#b00020', background: '#ffebee' }}>{error}</div>}

      <div ref={containerRef} style={{ flex: 1, overflow: 'auto', background: '#f5f5f5', position: 'relative' }}>
        {members.length === 0 && !error && (
          <div style={{ padding: 24 }}>
            <Typography variant="h6" gutterBottom>No family members yet</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Start your family tree by adding the first person from the frontend.
            </Typography>
            {role === 'admin' && (
              <Button variant="contained" onClick={() => openAddMemberForm('member')}>
                Add First Member
              </Button>
            )}
          </div>
        )}
        <svg ref={svgRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      </div>

      {popupMember && role === 'admin' && (
        <div
          style={{
            position: 'fixed',
            left: popupAnchor.x - 90,
            top: popupAnchor.y,
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '10px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            border: '1px solid #ddd',
            minWidth: '180px',
          }}
        >
          <strong style={{ fontSize: '13px', color: '#333' }}>{popupMember.name}</strong>
          <button
            onClick={() => {
              setEditingMember(popupMember);
              setEditData(memberToFormData(popupMember));
              setEditOpen(true);
              setPopupMember(null);
            }}
          >
            Edit
          </button>
          {role === 'admin' && <button onClick={() => deleteMember(popupMember.id, popupMember.name)}>Delete</button>}
          <button onClick={() => setPopupMember(null)}>Band</button>
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#2E7D32', color: 'white' }}>{addDialogTitle}</DialogTitle>
        <DialogContent>
          <MemberForm data={newMember} setData={setNewMember} members={members} showSpouse />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={addMember}>Add</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1565C0', color: 'white' }}>Edit {editingMember?.name}</DialogTitle>
        <DialogContent>
          <MemberForm data={editData} setData={setEditData} members={members.filter((member) => member.id !== editingMember?.id)} showSpouse />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={updateMember}>Save</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

function MemberForm({ data, setData, members, showSpouse = false }) {
  return (
    <>
      <TextField fullWidth label="Name" margin="normal" value={data.name} onChange={(event) => setData({ ...data, name: event.target.value })} />
      <FormControl fullWidth margin="normal">
        <InputLabel>Gender</InputLabel>
        <Select value={data.gender} label="Gender" onChange={(event) => setData({ ...data, gender: event.target.value })}>
          <MenuItem value="male">Male</MenuItem>
          <MenuItem value="female">Female</MenuItem>
        </Select>
      </FormControl>
      <TextField fullWidth label="Father Name" margin="normal" value={data.father_name} onChange={(event) => setData({ ...data, father_name: event.target.value })} />
      <TextField fullWidth label="Mother Name" margin="normal" value={data.mother_name} onChange={(event) => setData({ ...data, mother_name: event.target.value })} />
      <FormControl fullWidth margin="normal">
        <InputLabel>Parent</InputLabel>
        <Select value={data.parent_id} label="Parent" onChange={(event) => setData({ ...data, parent_id: event.target.value })}>
          <MenuItem value="">None</MenuItem>
          {members.map((member) => (
            <MenuItem key={member.id} value={member.id}>{member.name}</MenuItem>
          ))}
        </Select>
      </FormControl>
      {showSpouse && (
        <>
          <FormControl fullWidth margin="normal">
            <InputLabel>Bivi</InputLabel>
            <Select value={data.spouse_id} label="Bivi" onChange={(event) => setData({ ...data, spouse_id: event.target.value })}>
              <MenuItem value="">None</MenuItem>
              {members.map((member) => (
                <MenuItem key={member.id} value={member.id}>{member.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField fullWidth label="Bivi Name" margin="normal" value={data.spouse_name} onChange={(event) => setData({ ...data, spouse_name: event.target.value })} />
        </>
      )}
      <FormControl fullWidth margin="normal">
        <InputLabel>Status</InputLabel>
        <Select value={data.is_alive ? 'alive' : 'deceased'} label="Status" onChange={(event) => setData({ ...data, is_alive: event.target.value === 'alive' })}>
          <MenuItem value="alive">Alive</MenuItem>
          <MenuItem value="deceased">Deceased</MenuItem>
        </Select>
      </FormControl>
      <TextField fullWidth label="Birth Year" type="number" margin="normal" value={data.birth_year} onChange={(event) => setData({ ...data, birth_year: event.target.value })} />
      <TextField fullWidth label="Death Year" type="number" margin="normal" value={data.death_year} onChange={(event) => setData({ ...data, death_year: event.target.value })} />
      <TextField fullWidth label="Remarks" margin="normal" multiline rows={2} value={data.remarks} onChange={(event) => setData({ ...data, remarks: event.target.value })} />
    </>
  );
}

export default TreeView;

